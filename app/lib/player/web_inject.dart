import 'dart:convert';

import '../state/app_state.dart';
import 'pad.dart';

/// Tecla que um botão virtual envia para o jogo web.
class KeySpec {
  const KeySpec(this.key, this.code, this.kc);

  final String key;
  final String code;
  final int kc;
}

const _up = KeySpec('ArrowUp', 'ArrowUp', 38);
const _down = KeySpec('ArrowDown', 'ArrowDown', 40);
const _left = KeySpec('ArrowLeft', 'ArrowLeft', 37);
const _right = KeySpec('ArrowRight', 'ArrowRight', 39);
const _space = KeySpec(' ', 'Space', 32);
const _enter = KeySpec('Enter', 'Enter', 13);
const _esc = KeySpec('Escape', 'Escape', 27);

KeySpec _letter(String l) {
  final u = l.toUpperCase();
  return KeySpec(l, 'Key$u', u.codeUnitAt(0));
}

/// Esquemas de teclado para os controles na tela dos jogos web.
Map<PadButton, KeySpec> keysFor(WebControls scheme) {
  switch (scheme) {
    case WebControls.off:
      return const {};
    case WebControls.arrowsZx:
      return {
        PadButton.up: _up,
        PadButton.down: _down,
        PadButton.left: _left,
        PadButton.right: _right,
        PadButton.south: _letter('z'),
        PadButton.east: _letter('x'),
        PadButton.west: _letter('c'),
        PadButton.north: _letter('v'),
        PadButton.l1: _letter('a'),
        PadButton.r1: _letter('s'),
        PadButton.start: _enter,
        PadButton.select: _esc,
      };
    case WebControls.wasdSpace:
      return {
        PadButton.up: _letter('w'),
        PadButton.down: _letter('s'),
        PadButton.left: _letter('a'),
        PadButton.right: _letter('d'),
        PadButton.south: _space,
        PadButton.east: _letter('e'),
        PadButton.west: _letter('q'),
        PadButton.north: _letter('r'),
        PadButton.start: _enter,
        PadButton.select: _esc,
      };
    case WebControls.arrowsSpace:
      return {
        PadButton.up: _up,
        PadButton.down: _down,
        PadButton.left: _left,
        PadButton.right: _right,
        PadButton.south: _space,
        PadButton.east: _enter,
        PadButton.west: _letter('z'),
        PadButton.north: _letter('x'),
        PadButton.start: _letter('p'),
        PadButton.select: _esc,
      };
  }
}

String keyScript(String type, KeySpec k) =>
    'window.__nxKey&&window.__nxKey(${jsonEncode(type)},${jsonEncode(k.key)},'
    '${jsonEncode(k.code)},${k.kc});';

/// Botões que valem agora: os apertados mais as direções do analógico esquerdo.
Set<PadButton> effectiveButtons(PadController c) {
  final s = <PadButton>{...c.pressed};
  if (c.ly < -0.5) s.add(PadButton.up);
  if (c.ly > 0.5) s.add(PadButton.down);
  if (c.lx < -0.5) s.add(PadButton.left);
  if (c.lx > 0.5) s.add(PadButton.right);
  return s;
}

/// Converte mudanças de botões em eventos de teclado (só envia o que mudou).
class KeyBridge {
  KeyBridge(this.keys, this.run);

  final Map<PadButton, KeySpec> keys;
  final void Function(String js) run;
  final Set<PadButton> _down = <PadButton>{};

  void sync(Set<PadButton> now) {
    for (final b in now.difference(_down)) {
      final k = keys[b];
      if (k != null) run(keyScript('keydown', k));
    }
    for (final b in _down.difference(now)) {
      final k = keys[b];
      if (k != null) run(keyScript('keyup', k));
    }
    _down
      ..clear()
      ..addAll(now);
  }

  void releaseAll() => sync(<PadButton>{});
}

const String _bootTemplate = r'''
(function () {
  window.__nxFps = __FPS__;
  if (window.__nxBoot) return;
  window.__nxBoot = true;
  var scale = __DPR__;
  if (scale < 1) {
    try {
      var real = window.devicePixelRatio || 1;
      Object.defineProperty(window, 'devicePixelRatio', {
        get: function () { return real * scale; },
        configurable: true
      });
    } catch (e) {}
  }
  var raf = window.requestAnimationFrame.bind(window);
  var caf = window.cancelAnimationFrame.bind(window);
  var ids = {}, nextId = 1, lastTs = 0, curTs = -1;
  window.requestAnimationFrame = function (cb) {
    var my = nextId++;
    ids[my] = raf(function tick(ts) {
      var f = window.__nxFps | 0;
      var iv = f > 0 ? 1000 / f : 0;
      if (iv === 0 || ts === curTs || ts - lastTs >= iv - 2) {
        if (ts !== curTs) { curTs = ts; lastTs = ts; }
        delete ids[my];
        cb(ts);
      } else {
        ids[my] = raf(tick);
      }
    });
    return my;
  };
  window.cancelAnimationFrame = function (id) {
    if (ids[id] !== undefined) { caf(ids[id]); delete ids[id]; } else { caf(id); }
  };
  window.__nxKey = function (type, key, code, kc) {
    var ev;
    try {
      ev = new KeyboardEvent(type, { key: key, code: code, keyCode: kc, which: kc, bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'keyCode', { get: function () { return kc; } });
      Object.defineProperty(ev, 'which', { get: function () { return kc; } });
    } catch (e) { return; }
    var t = document.activeElement || document.body || document;
    t.dispatchEvent(ev);
  };
})();
''';

/// Script injetado nos jogos web: reduz a resolução (escala), limita FPS e cria o canal de teclas.
/// Melhor esforço: nem todo jogo respeita a escala; o limite de FPS vale para quem usa requestAnimationFrame.
String buildBootScript({required double scale, required int fpsCap}) {
  final s = scale.clamp(0.25, 1.0);
  final f = fpsCap < 0 ? 0 : fpsCap;
  return _bootTemplate.replaceAll('__DPR__', s.toString()).replaceAll('__FPS__', f.toString());
}
