import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';

import '../models/game.dart';
import '../state/app_state.dart';
import '../theme.dart';
import 'pad.dart';
import 'session.dart';

/// Tela de jogo: funciona em retrato e paisagem, com controle virtual e controles Bluetooth.
class PlayerScreen extends StatefulWidget {
  const PlayerScreen({
    super.key,
    required this.game,
    required this.state,
    this.useServer = true,
  });

  final Game game;
  final AppState state;

  /// false força o modo de teste de controles (sem rede).
  final bool useServer;

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> with SingleTickerProviderStateMixin {
  final PadController _pad = PadController();
  final FocusNode _focus = FocusNode();
  final ValueNotifier<int> _fps = ValueNotifier<int>(0);
  late final StreamSession _session;
  late final AnimationController _pulse;
  Timer? _inputTimer;
  Timer? _fpsTimer;
  int _frames = 0;

  @override
  void initState() {
    super.initState();
    final s = widget.state;
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _applyOrientation();
    _session = (s.hasServer && widget.useServer)
        ? GatewaySession(url: s.serverUrl, gameId: widget.game.id, profile: s.profile)
        : LocalTestSession();
    _session.start();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) s.addHistory(widget.game.id);
    });
    _inputTimer = Timer.periodic(const Duration(milliseconds: 16), (_) {
      final snap = _pad.takeIfDirty();
      if (snap != null) _session.sendInput(snap);
    });
    SchedulerBinding.instance.addTimingsCallback(_onTimings);
    _fpsTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      _fps.value = _frames;
      _frames = 0;
    });
    _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))
      ..repeat(reverse: true);
  }

  void _onTimings(List<FrameTiming> timings) {
    _frames += timings.length;
  }

  void _applyOrientation() {
    SystemChrome.setPreferredOrientations(
      widget.state.lockLandscape
          ? <DeviceOrientation>[
              DeviceOrientation.landscapeLeft,
              DeviceOrientation.landscapeRight,
            ]
          : DeviceOrientation.values,
    );
  }

  @override
  void dispose() {
    SchedulerBinding.instance.removeTimingsCallback(_onTimings);
    _inputTimer?.cancel();
    _fpsTimer?.cancel();
    _pulse.dispose();
    _focus.dispose();
    _fps.dispose();
    _session.stop();
    _session.dispose();
    _pad.dispose();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    SystemChrome.setPreferredOrientations(DeviceOrientation.values);
    super.dispose();
  }

  KeyEventResult _onKey(FocusNode node, KeyEvent e) {
    final b = kKeyToPad[e.logicalKey];
    if (b == null) return KeyEventResult.ignored;
    if (e is KeyDownEvent) {
      _pad.setButton(b, true);
    } else if (e is KeyUpEvent) {
      _pad.setButton(b, false);
    }
    return KeyEventResult.handled;
  }

  Color _stateColor(SessionState s) => switch (s) {
        SessionState.connected => NX.ok,
        SessionState.connecting || SessionState.reconnecting => NX.warn,
        SessionState.failed => NX.bad,
        SessionState.closed => NX.muted,
      };

  Widget _chip(String text, {Color? color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.black.withAlpha(150),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        text,
        style: TextStyle(color: color ?? NX.text, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }

  Widget _topBar() {
    final s = widget.state;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          tooltip: 'Sair',
          onPressed: () => Navigator.of(context).maybePop(),
          icon: const Icon(Icons.close, color: Colors.white),
          style: IconButton.styleFrom(backgroundColor: Colors.black.withAlpha(150)),
        ),
        const SizedBox(width: 6),
        if (s.showHud)
          ListenableBuilder(
            listenable: _session,
            builder: (context, _) {
              final rtt = _session.rttMs;
              final kbps = _session.bitrateKbps;
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AnimatedBuilder(
                    animation: _pulse,
                    builder: (context, _) => Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _stateColor(_session.state)
                            .withAlpha((120 + 135 * _pulse.value).round()),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  ValueListenableBuilder<int>(
                    valueListenable: _fps,
                    builder: (context, v, _) => _chip('FPS (tela) $v'),
                  ),
                  const SizedBox(width: 4),
                  _chip(rtt == null ? 'Latência —' : 'Latência $rtt ms'),
                  const SizedBox(width: 4),
                  _chip(kbps == null ? 'Bitrate —' : 'Bitrate ${(kbps / 1000).toStringAsFixed(1)} Mbps'),
                ],
              );
            },
          ),
        const SizedBox(width: 6),
        IconButton(
          tooltip: 'Ajustes',
          onPressed: _openSettings,
          icon: const Icon(Icons.tune, color: Colors.white),
          style: IconButton.styleFrom(backgroundColor: Colors.black.withAlpha(150)),
        ),
      ],
    );
  }

  Widget _videoPane() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF0B0820), Color(0xFF150F33)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: ListenableBuilder(
            listenable: _session,
            builder: (context, _) => Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  widget.game.title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: NX.text,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _session.modeLabel,
                  style: const TextStyle(color: NX.neon, fontSize: 13),
                ),
                const SizedBox(height: 4),
                Text(
                  _session.statusText,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: NX.muted, fontSize: 12),
                ),
                const SizedBox(height: 8),
                ListenableBuilder(
                  listenable: _pad,
                  builder: (context, _) {
                    final names = _pad.pressed.map((e) => e.name).join(' + ');
                    return Text(
                      names.isEmpty ? 'Nenhum botão pressionado' : names,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: NX.text, fontSize: 12),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _openSettings() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: NX.surface,
      builder: (context) => _PlayerSettingsSheet(
        state: widget.state,
        onOrientation: _applyOrientation,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      focusNode: _focus,
      autofocus: true,
      onKeyEvent: _onKey,
      child: Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: ListenableBuilder(
            listenable: widget.state,
            builder: (context, _) {
              final s = widget.state;
              final pad = VirtualGamepad(
                controller: _pad,
                family: widget.game.pad,
                opacity: s.padOpacity,
                scale: s.padScale,
                haptics: s.haptics,
              );
              return LayoutBuilder(
                builder: (context, c) {
                  final landscape = c.maxWidth > c.maxHeight;
                  if (landscape) {
                    return Stack(
                      children: [
                        Positioned.fill(child: _videoPane()),
                        Positioned.fill(child: pad),
                        Positioned(
                          top: 8,
                          left: 0,
                          right: 0,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [_topBar()],
                          ),
                        ),
                      ],
                    );
                  }
                  return Column(
                    children: [
                      AspectRatio(
                        aspectRatio: 16 / 9,
                        child: Stack(
                          children: [
                            Positioned.fill(child: _videoPane()),
                            Positioned(
                              top: 8,
                              left: 0,
                              right: 0,
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [Flexible(child: FittedBox(child: _topBar()))],
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(child: pad),
                    ],
                  );
                },
              );
            },
          ),
        ),
      ),
    );
  }
}

class _PlayerSettingsSheet extends StatelessWidget {
  const _PlayerSettingsSheet({required this.state, required this.onOrientation});

  final AppState state;
  final VoidCallback onOrientation;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: state,
      builder: (context, _) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Ajustes do jogo',
                style: TextStyle(color: NX.text, fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              const Text('Qualidade (vale na próxima conexão)', style: TextStyle(color: NX.muted)),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                children: [
                  for (final p in QualityProfile.values)
                    ChoiceChip(
                      label: Text(p.label),
                      selected: state.profile == p,
                      onSelected: (_) => state.setProfile(p),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Transparência dos botões: ${(state.padOpacity * 100).round()}%',
                style: const TextStyle(color: NX.muted),
              ),
              Slider(
                value: state.padOpacity,
                min: 0.3,
                max: 1.0,
                onChanged: state.setPadOpacity,
              ),
              Text(
                'Tamanho dos botões: ${(state.padScale * 100).round()}%',
                style: const TextStyle(color: NX.muted),
              ),
              Slider(
                value: state.padScale,
                min: 0.7,
                max: 1.4,
                onChanged: state.setPadScale,
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Vibração nos botões'),
                value: state.haptics,
                onChanged: state.setHaptics,
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Mostrar FPS, latência e bitrate'),
                value: state.showHud,
                onChanged: state.setShowHud,
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Travar em paisagem'),
                value: state.lockLandscape,
                onChanged: (v) {
                  state.setLockLandscape(v);
                  onOrientation();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
