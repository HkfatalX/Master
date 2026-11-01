import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/game.dart';

/// Botões em posição física (como no SDL): south = botão de baixo, east = direita etc.
enum PadButton {
  south,
  east,
  west,
  north,
  l1,
  r1,
  l2,
  r2,
  l3,
  r3,
  select,
  start,
  home,
  up,
  down,
  left,
  right,
}

/// Estado único de entrada: toque, controle Bluetooth e teclado escrevem aqui.
class PadController extends ChangeNotifier {
  final Set<PadButton> pressed = <PadButton>{};
  double lx = 0, ly = 0, rx = 0, ry = 0;
  bool _dirty = false;

  void setButton(PadButton b, bool down) {
    final changed = down ? pressed.add(b) : pressed.remove(b);
    if (changed) {
      _dirty = true;
      notifyListeners();
    }
  }

  void setDpad(bool up, bool down, bool left, bool right) {
    final before = pressed.length;
    final snapshotBefore = Set<PadButton>.of(pressed);
    void put(PadButton b, bool v) {
      if (v) {
        pressed.add(b);
      } else {
        pressed.remove(b);
      }
    }

    put(PadButton.up, up);
    put(PadButton.down, down);
    put(PadButton.left, left);
    put(PadButton.right, right);
    if (before != pressed.length || !setEquals(snapshotBefore, pressed)) {
      _dirty = true;
      notifyListeners();
    }
  }

  void setStick(bool leftStick, double x, double y) {
    if (leftStick) {
      if (lx == x && ly == y) return;
      lx = x;
      ly = y;
    } else {
      if (rx == x && ry == y) return;
      rx = x;
      ry = y;
    }
    _dirty = true;
    notifyListeners();
  }

  void releaseAll() {
    pressed.clear();
    lx = ly = rx = ry = 0;
    _dirty = true;
    notifyListeners();
  }

  static double _r(double v) => (v * 100).roundToDouble() / 100;

  /// Retorna o estado atual se mudou desde a última chamada (senão null).
  Map<String, dynamic>? takeIfDirty() {
    if (!_dirty) return null;
    _dirty = false;
    return {
      'b': pressed.map((e) => e.name).toList(),
      'ls': [_r(lx), _r(ly)],
      'rs': [_r(rx), _r(ry)],
    };
  }
}

/// Mapa de teclas/botões de controles Bluetooth que o Android entrega ao Flutter.
/// Os analógicos de controles físicos ainda não chegam ao app (ver docs/STATUS.md).
final Map<LogicalKeyboardKey, PadButton> kKeyToPad = {
  LogicalKeyboardKey.gameButtonA: PadButton.south,
  LogicalKeyboardKey.gameButtonB: PadButton.east,
  LogicalKeyboardKey.gameButtonX: PadButton.west,
  LogicalKeyboardKey.gameButtonY: PadButton.north,
  LogicalKeyboardKey.gameButtonLeft1: PadButton.l1,
  LogicalKeyboardKey.gameButtonRight1: PadButton.r1,
  LogicalKeyboardKey.gameButtonLeft2: PadButton.l2,
  LogicalKeyboardKey.gameButtonRight2: PadButton.r2,
  LogicalKeyboardKey.gameButtonThumbLeft: PadButton.l3,
  LogicalKeyboardKey.gameButtonThumbRight: PadButton.r3,
  LogicalKeyboardKey.gameButtonSelect: PadButton.select,
  LogicalKeyboardKey.gameButtonStart: PadButton.start,
  LogicalKeyboardKey.gameButtonMode: PadButton.home,
  LogicalKeyboardKey.arrowUp: PadButton.up,
  LogicalKeyboardKey.arrowDown: PadButton.down,
  LogicalKeyboardKey.arrowLeft: PadButton.left,
  LogicalKeyboardKey.arrowRight: PadButton.right,
};

// ---------------------------------------------------------------------------
// Layouts por plataforma
// ---------------------------------------------------------------------------

enum PadGlyph { cross, circle, square, triangle }

class FaceSpec {
  const FaceSpec({this.text, this.glyph, required this.color});

  final String? text;
  final PadGlyph? glyph;
  final Color color;
}

class PadSpec {
  const PadSpec({
    required this.south,
    required this.east,
    required this.west,
    required this.north,
    required this.l1,
    required this.r1,
    this.l2,
    this.r2,
    required this.select,
    required this.start,
    this.rightStick = true,
  });

  final FaceSpec south, east, west, north;
  final String l1, r1;
  final String? l2, r2;
  final String select, start;
  final bool rightStick;
}

const Color _neutral = Color(0xFFB8B3D6);

PadSpec specFor(PadFamily f) {
  switch (f) {
    case PadFamily.playstation:
      return const PadSpec(
        south: FaceSpec(glyph: PadGlyph.cross, color: Color(0xFF7AA2F7)),
        east: FaceSpec(glyph: PadGlyph.circle, color: Color(0xFFF87171)),
        west: FaceSpec(glyph: PadGlyph.square, color: Color(0xFFF28FAD)),
        north: FaceSpec(glyph: PadGlyph.triangle, color: Color(0xFF7DDC9B)),
        l1: 'L1',
        r1: 'R1',
        l2: 'L2',
        r2: 'R2',
        select: 'SELECT',
        start: 'START',
      );
    case PadFamily.xbox:
      return const PadSpec(
        south: FaceSpec(text: 'A', color: Color(0xFF4ADE80)),
        east: FaceSpec(text: 'B', color: Color(0xFFF87171)),
        west: FaceSpec(text: 'X', color: Color(0xFF60A5FA)),
        north: FaceSpec(text: 'Y', color: Color(0xFFFACC15)),
        l1: 'LB',
        r1: 'RB',
        l2: 'LT',
        r2: 'RT',
        select: 'VIEW',
        start: 'MENU',
      );
    case PadFamily.nintendo:
      return const PadSpec(
        south: FaceSpec(text: 'B', color: _neutral),
        east: FaceSpec(text: 'A', color: _neutral),
        west: FaceSpec(text: 'Y', color: _neutral),
        north: FaceSpec(text: 'X', color: _neutral),
        l1: 'L',
        r1: 'R',
        l2: 'ZL',
        r2: 'ZR',
        select: '−',
        start: '+',
      );
    case PadFamily.psp:
      return const PadSpec(
        south: FaceSpec(glyph: PadGlyph.cross, color: Color(0xFF7AA2F7)),
        east: FaceSpec(glyph: PadGlyph.circle, color: Color(0xFFF87171)),
        west: FaceSpec(glyph: PadGlyph.square, color: Color(0xFFF28FAD)),
        north: FaceSpec(glyph: PadGlyph.triangle, color: Color(0xFF7DDC9B)),
        l1: 'L',
        r1: 'R',
        select: 'SELECT',
        start: 'START',
        rightStick: false,
      );
    case PadFamily.generic:
      return const PadSpec(
        south: FaceSpec(text: 'A', color: Color(0xFF4ADE80)),
        east: FaceSpec(text: 'B', color: Color(0xFFF87171)),
        west: FaceSpec(text: 'X', color: Color(0xFF60A5FA)),
        north: FaceSpec(text: 'Y', color: Color(0xFFFACC15)),
        l1: 'L1',
        r1: 'R1',
        l2: 'L2',
        r2: 'R2',
        select: 'SELECT',
        start: 'START',
      );
  }
}

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

class GlyphPainter extends CustomPainter {
  const GlyphPainter(this.glyph, this.color);

  final PadGlyph glyph;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width * 0.14
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..color = color;
    final pad = size.width * 0.12;
    final w = size.width;
    final h = size.height;
    switch (glyph) {
      case PadGlyph.cross:
        canvas.drawLine(Offset(pad, pad), Offset(w - pad, h - pad), p);
        canvas.drawLine(Offset(w - pad, pad), Offset(pad, h - pad), p);
      case PadGlyph.circle:
        canvas.drawCircle(Offset(w / 2, h / 2), w * 0.38, p);
      case PadGlyph.square:
        canvas.drawRect(Rect.fromLTWH(pad, pad, w - 2 * pad, h - 2 * pad), p);
      case PadGlyph.triangle:
        final path = Path()
          ..moveTo(w / 2, pad)
          ..lineTo(w - pad, h - pad)
          ..lineTo(pad, h - pad)
          ..close();
        canvas.drawPath(path, p);
    }
  }

  @override
  bool shouldRepaint(GlyphPainter old) => old.glyph != glyph || old.color != color;
}

/// Botão virtual. Cada botão tem seu próprio Listener, então vários toques ao mesmo tempo funcionam.
class PadKey extends StatefulWidget {
  const PadKey({
    super.key,
    required this.width,
    required this.height,
    required this.onChange,
    required this.opacity,
    required this.haptics,
    this.text,
    this.glyph,
    this.color = _neutral,
    this.round = false,
  });

  final double width, height;
  final void Function(bool down) onChange;
  final double opacity;
  final bool haptics;
  final String? text;
  final PadGlyph? glyph;
  final Color color;
  final bool round;

  @override
  State<PadKey> createState() => _PadKeyState();
}

class _PadKeyState extends State<PadKey> {
  bool _down = false;

  void _set(bool v) {
    if (_down == v) return;
    setState(() => _down = v);
    if (v && widget.haptics) HapticFeedback.selectionClick();
    widget.onChange(v);
  }

  @override
  void dispose() {
    if (_down) widget.onChange(false);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final a = (255 * widget.opacity).round();
    final bg = _down
        ? Color.alphaBlend(Colors.white.withAlpha(70), widget.color.withAlpha(a))
        : const Color(0xFF1B1736).withAlpha(a);
    final border = widget.color.withAlpha((a * 0.9).round());
    final size = widget.width < widget.height ? widget.width : widget.height;
    Widget inner;
    if (widget.glyph != null) {
      inner = CustomPaint(
        size: Size(size * 0.4, size * 0.4),
        painter: GlyphPainter(widget.glyph!, _down ? Colors.white : widget.color),
      );
    } else {
      inner = Text(
        widget.text ?? '',
        style: TextStyle(
          color: _down ? Colors.white : widget.color,
          fontWeight: FontWeight.w800,
          fontSize: size * 0.36,
        ),
      );
    }
    return Listener(
      behavior: HitTestBehavior.opaque,
      onPointerDown: (_) => _set(true),
      onPointerUp: (_) => _set(false),
      onPointerCancel: (_) => _set(false),
      child: SizedBox(
        width: widget.width,
        height: widget.height,
        child: Padding(
          padding: const EdgeInsets.all(3),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: bg,
              shape: widget.round ? BoxShape.circle : BoxShape.rectangle,
              borderRadius: widget.round ? null : BorderRadius.circular(12),
              border: Border.all(color: border, width: 1.6),
            ),
            child: Center(child: inner),
          ),
        ),
      ),
    );
  }
}

/// Analógico virtual (um dedo por vez).
class PadStick extends StatefulWidget {
  const PadStick({
    super.key,
    required this.size,
    required this.opacity,
    required this.onChange,
  });

  final double size;
  final double opacity;
  final void Function(double x, double y) onChange;

  @override
  State<PadStick> createState() => _PadStickState();
}

class _PadStickState extends State<PadStick> {
  int? _pointer;
  Offset _v = Offset.zero;

  void _update(Offset local) {
    final r = widget.size / 2;
    var d = (local - Offset(r, r)) / r;
    final len = d.distance;
    if (len > 1) d = d / len;
    final out = len < 0.1 ? Offset.zero : d;
    setState(() => _v = d);
    widget.onChange(out.dx, out.dy);
  }

  void _end(PointerEvent e) {
    if (e.pointer != _pointer) return;
    _pointer = null;
    setState(() => _v = Offset.zero);
    widget.onChange(0, 0);
  }

  @override
  void dispose() {
    if (_pointer != null) widget.onChange(0, 0);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final a = (255 * widget.opacity).round();
    final knob = widget.size * 0.42;
    return Listener(
      behavior: HitTestBehavior.opaque,
      onPointerDown: (e) {
        if (_pointer != null) return;
        _pointer = e.pointer;
        _update(e.localPosition);
      },
      onPointerMove: (e) {
        if (e.pointer == _pointer) _update(e.localPosition);
      },
      onPointerUp: _end,
      onPointerCancel: _end,
      child: SizedBox(
        width: widget.size,
        height: widget.size,
        child: DecoratedBox(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: const Color(0xFF1B1736).withAlpha((a * 0.7).round()),
            border: Border.all(color: const Color(0xFF8B5CF6).withAlpha(a), width: 1.6),
          ),
          child: Align(
            alignment: Alignment(_v.dx, _v.dy),
            child: Container(
              width: knob,
              height: knob,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF8B5CF6).withAlpha(a),
                border: Border.all(color: Colors.white.withAlpha((a * 0.5).round())),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Direcional digital: aceita diagonais e deslizar o dedo entre direções.
class PadDpad extends StatefulWidget {
  const PadDpad({
    super.key,
    required this.size,
    required this.opacity,
    required this.onChange,
  });

  final double size;
  final double opacity;
  final void Function(bool up, bool down, bool left, bool right) onChange;

  @override
  State<PadDpad> createState() => _PadDpadState();
}

class _PadDpadState extends State<PadDpad> {
  int? _pointer;
  bool _u = false, _d = false, _l = false, _r = false;

  void _apply(bool u, bool d, bool l, bool r) {
    if (u == _u && d == _d && l == _l && r == _r) return;
    setState(() {
      _u = u;
      _d = d;
      _l = l;
      _r = r;
    });
    widget.onChange(u, d, l, r);
  }

  void _update(Offset local) {
    final c = widget.size / 2;
    final nx = (local.dx - c) / c;
    final ny = (local.dy - c) / c;
    if (nx * nx + ny * ny < 0.05) {
      _apply(false, false, false, false);
      return;
    }
    _apply(ny < -0.38, ny > 0.38, nx < -0.38, nx > 0.38);
  }

  void _end(PointerEvent e) {
    if (e.pointer != _pointer) return;
    _pointer = null;
    _apply(false, false, false, false);
  }

  @override
  void dispose() {
    if (_u || _d || _l || _r) widget.onChange(false, false, false, false);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      behavior: HitTestBehavior.opaque,
      onPointerDown: (e) {
        if (_pointer != null) return;
        _pointer = e.pointer;
        _update(e.localPosition);
      },
      onPointerMove: (e) {
        if (e.pointer == _pointer) _update(e.localPosition);
      },
      onPointerUp: _end,
      onPointerCancel: _end,
      child: CustomPaint(
        size: Size(widget.size, widget.size),
        painter: _DpadPainter(_u, _d, _l, _r, widget.opacity),
      ),
    );
  }
}

class _DpadPainter extends CustomPainter {
  const _DpadPainter(this.u, this.d, this.l, this.r, this.opacity);

  final bool u, d, l, r;
  final double opacity;

  @override
  void paint(Canvas canvas, Size s) {
    final a = (255 * opacity).round();
    final thick = s.width * 0.34;
    final len = s.width * 0.5;
    final c = s.center(Offset.zero);
    void arm(Offset center, double w, double h, bool on) {
      final rr = RRect.fromRectAndRadius(
        Rect.fromCenter(center: center, width: w, height: h),
        const Radius.circular(10),
      );
      canvas.drawRRect(
        rr,
        Paint()
          ..color = on
              ? const Color(0xFF8B5CF6).withAlpha(a)
              : const Color(0xFF1B1736).withAlpha(a),
      );
      canvas.drawRRect(
        rr,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.6
          ..color = const Color(0xFF8B5CF6).withAlpha(a),
      );
    }

    arm(Offset(c.dx, c.dy - len / 2), thick, len, u);
    arm(Offset(c.dx, c.dy + len / 2), thick, len, d);
    arm(Offset(c.dx - len / 2, c.dy), len, thick, l);
    arm(Offset(c.dx + len / 2, c.dy), len, thick, r);
    canvas.drawRect(
      Rect.fromCenter(center: c, width: thick, height: thick),
      Paint()..color = const Color(0xFF1B1736).withAlpha(a),
    );
  }

  @override
  bool shouldRepaint(_DpadPainter o) =>
      o.u != u || o.d != d || o.l != l || o.r != r || o.opacity != opacity;
}

/// Controle virtual completo. Muda de disposição sozinho entre paisagem e retrato.
class VirtualGamepad extends StatelessWidget {
  const VirtualGamepad({
    super.key,
    required this.controller,
    required this.family,
    required this.opacity,
    required this.scale,
    required this.haptics,
  });

  final PadController controller;
  final PadFamily family;
  final double opacity;
  final double scale;
  final bool haptics;

  Widget _key(PadButton b, double w, double h,
      {String? text, PadGlyph? glyph, Color color = _neutral, bool round = false}) {
    return PadKey(
      width: w,
      height: h,
      text: text,
      glyph: glyph,
      color: color,
      round: round,
      opacity: opacity,
      haptics: haptics,
      onChange: (down) => controller.setButton(b, down),
    );
  }

  Widget _face(FaceSpec f, PadButton b, double size) =>
      _key(b, size, size, text: f.text, glyph: f.glyph, color: f.color, round: true);

  Widget _faceCluster(PadSpec spec, double size) {
    final b = size * 0.42;
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        children: [
          Positioned(left: (size - b) / 2, top: 0, child: _face(spec.north, PadButton.north, b)),
          Positioned(left: (size - b) / 2, bottom: 0, child: _face(spec.south, PadButton.south, b)),
          Positioned(left: 0, top: (size - b) / 2, child: _face(spec.west, PadButton.west, b)),
          Positioned(right: 0, top: (size - b) / 2, child: _face(spec.east, PadButton.east, b)),
        ],
      ),
    );
  }

  Widget _stick(bool left, double size) => PadStick(
        size: size,
        opacity: opacity,
        onChange: (x, y) => controller.setStick(left, x, y),
      );

  Widget _dpad(double size) => PadDpad(
        size: size,
        opacity: opacity,
        onChange: controller.setDpad,
      );

  List<Widget> _shoulders(PadSpec spec, double u) {
    final w = u < 70 ? 62.0 : u * 0.9;
    final h = u < 70 ? 36.0 : u * 0.48;
    const m = 12.0;
    final out = <Widget>[];
    var left = m;
    if (spec.l2 != null) {
      out.add(Positioned(left: left, top: m, child: _key(PadButton.l2, w, h, text: spec.l2)));
      left += w + 4;
    }
    out.add(Positioned(left: left, top: m, child: _key(PadButton.l1, w, h, text: spec.l1)));
    var right = m;
    if (spec.r2 != null) {
      out.add(Positioned(right: right, top: m, child: _key(PadButton.r2, w, h, text: spec.r2)));
      right += w + 4;
    }
    out.add(Positioned(right: right, top: m, child: _key(PadButton.r1, w, h, text: spec.r1)));
    return out;
  }

  Widget _center(PadSpec spec, {required bool column}) {
    final sel = _key(PadButton.select, 74, 34, text: spec.select);
    final sta = _key(PadButton.start, 74, 34, text: spec.start);
    return column
        ? Column(mainAxisSize: MainAxisSize.min, children: [sel, sta])
        : Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [sel, const SizedBox(width: 8), sta],
          );
  }

  @override
  Widget build(BuildContext context) {
    final spec = specFor(family);
    return LayoutBuilder(
      builder: (context, c) {
        final w = c.maxWidth;
        final h = c.maxHeight;
        const m = 14.0;
        if (w >= h) {
          final u = [h * 0.30, w * 0.115, 118.0].reduce((a, b) => a < b ? a : b) * scale;
          final stickS = 1.25 * u;
          final dpadS = u;
          final faceS = 1.35 * u;
          return Stack(
            children: [
              ..._shoulders(spec, u),
              Positioned(left: m, bottom: m, child: _stick(true, stickS)),
              Positioned(left: m + stickS + 8, bottom: m + 0.12 * u, child: _dpad(dpadS)),
              Positioned(right: m, bottom: m, child: _faceCluster(spec, faceS)),
              if (spec.rightStick)
                Positioned(right: m + faceS + 8, bottom: m, child: _stick(false, stickS)),
              Positioned(
                left: 0,
                right: 0,
                bottom: m,
                child: _center(spec, column: false),
              ),
            ],
          );
        }
        final u = [w * 0.27, h * 0.20, 118.0].reduce((a, b) => a < b ? a : b) * scale;
        final stickS = 1.25 * u;
        final dpadS = u * 1.05;
        final faceS = 1.35 * u;
        final rowA = 12.0 + (u < 70 ? 36.0 : u * 0.48) + 22.0;
        return Stack(
          children: [
            ..._shoulders(spec, u),
            Positioned(left: m, top: rowA + (faceS - dpadS) / 2, child: _dpad(dpadS)),
            Positioned(right: m, top: rowA, child: _faceCluster(spec, faceS)),
            Positioned(
              left: 0,
              right: 0,
              top: rowA + (faceS - 68) / 2,
              child: _center(spec, column: true),
            ),
            Positioned(left: m, bottom: m, child: _stick(true, stickS)),
            if (spec.rightStick) Positioned(right: m, bottom: m, child: _stick(false, stickS)),
          ],
        );
      },
    );
  }
}
