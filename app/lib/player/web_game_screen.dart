import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../models/game.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets/prefs_panel.dart';
import 'pad.dart';
import 'web_guard.dart';
import 'web_inject.dart';

/// Joga um jogo web dentro do app (navegador embutido), sem servidor e sem custo.
/// Tem qualidade gráfica reduzível, limite de FPS e controles na tela opcionais.
class WebGameScreen extends StatefulWidget {
  const WebGameScreen({super.key, required this.game, required this.state});

  final Game game;
  final AppState state;

  @override
  State<WebGameScreen> createState() => _WebGameScreenState();
}

class _WebGameScreenState extends State<WebGameScreen> {
  late final WebViewController _c;
  final PadController _pad = PadController();
  late KeyBridge _bridge;
  late WebControls _scheme;
  int _progress = 0;
  String? _error;
  bool _full = false;

  AppState get _s => widget.state;

  void _js(String code) {
    _c.runJavaScript(code).catchError((Object _) {});
  }

  void _boot() => _js(buildBootScript(scale: _s.gfx.scale, fpsCap: _s.fpsCap));

  KeyBridge _makeBridge() => KeyBridge(keysFor(_scheme), _js);

  void _onPad() => _bridge.sync(effectiveButtons(_pad));

  void _onState() {
    if (_s.webControls != _scheme) {
      _bridge.releaseAll();
      _scheme = _s.webControls;
      _bridge = _makeBridge();
      _pad.releaseAll();
    }
    _js('window.__nxFps=${_s.fpsCap};');
  }

  @override
  void initState() {
    super.initState();
    _scheme = _s.webControls;
    _bridge = _makeBridge();
    _pad.addListener(_onPad);
    _s.addListener(_onState);
    final url = Uri.parse(widget.game.webUrl!);
    _c = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (req) {
            if (!req.isMainFrame || isAllowedNavigation(req.url, url.host)) {
              return NavigationDecision.navigate;
            }
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Link externo bloqueado por segurança.')),
              );
            }
            return NavigationDecision.prevent;
          },
          onProgress: (p) {
            if (mounted) setState(() => _progress = p);
          },
          onPageStarted: (_) {
            if (mounted) setState(() => _error = null);
            _boot();
          },
          onPageFinished: (_) => _boot(),
          onWebResourceError: (e) {
            if (mounted && e.isForMainFrame == true) {
              setState(() => _error = e.description);
            }
          },
        ),
      )
      ..loadRequest(url);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _s.addHistory(widget.game.id);
    });
  }

  @override
  void dispose() {
    _s.removeListener(_onState);
    _pad.removeListener(_onPad);
    _bridge.releaseAll();
    _pad.dispose();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  void _toggleFull() {
    setState(() => _full = !_full);
    SystemChrome.setEnabledSystemUIMode(
      _full ? SystemUiMode.immersiveSticky : SystemUiMode.edgeToEdge,
    );
  }

  void _openSettings() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: NX.surface,
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Ajustes do jogo',
                style: TextStyle(color: NX.text, fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              GraphicsPrefs(
                state: _s,
                onApply: () {
                  Navigator.of(ctx).pop();
                  _c.reload();
                },
              ),
              const Divider(height: 28),
              ControlPrefs(state: _s),
            ],
          ),
        ),
      ),
    );
  }

  Widget _topBar() {
    return Container(
      color: NX.bg,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Row(
        children: [
          IconButton(
            tooltip: 'Sair do jogo',
            icon: const Icon(Icons.close, color: NX.text),
            onPressed: () => Navigator.of(context).pop(),
          ),
          Expanded(
            child: Text(
              widget.game.title,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: NX.text, fontWeight: FontWeight.w700),
            ),
          ),
          IconButton(
            tooltip: 'Ajustes (gráficos, FPS, controles)',
            icon: const Icon(Icons.tune, color: NX.text),
            onPressed: _openSettings,
          ),
          IconButton(
            tooltip: 'Tela cheia',
            icon: const Icon(Icons.fullscreen, color: NX.text),
            onPressed: _toggleFull,
          ),
          IconButton(
            tooltip: 'Recarregar',
            icon: const Icon(Icons.refresh, color: NX.text),
            onPressed: () => _c.reload(),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final nav = Navigator.of(context);
        if (_full) {
          _toggleFull();
        } else if (await _c.canGoBack()) {
          await _c.goBack();
        } else {
          nav.pop();
        }
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Column(
            children: [
              if (!_full) _topBar(),
              if (_progress < 100)
                LinearProgressIndicator(
                  value: _progress == 0 ? null : _progress / 100,
                  minHeight: 3,
                  color: NX.purple,
                  backgroundColor: NX.surface,
                ),
              Expanded(
                child: Stack(
                  children: [
                    WebViewWidget(controller: _c),
                    if (_error != null)
                      Positioned.fill(
                        child: Container(
                          color: NX.bg,
                          padding: const EdgeInsets.all(32),
                          alignment: Alignment.center,
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.wifi_off, color: NX.muted, size: 40),
                              const SizedBox(height: 12),
                              const Text(
                                'Não consegui carregar o jogo.\nConfira sua internet.',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: NX.text),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _error!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(color: NX.muted, fontSize: 12),
                              ),
                              const SizedBox(height: 14),
                              FilledButton(
                                onPressed: () => _c.reload(),
                                child: const Text('Tentar de novo'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ListenableBuilder(
                      listenable: _s,
                      builder: (context, _) {
                        if (_s.webControls == WebControls.off) return const SizedBox.shrink();
                        return Positioned.fill(
                          child: VirtualGamepad(
                            controller: _pad,
                            family: _s.padFamilyFor(PadFamily.generic),
                            opacity: _s.padOpacity,
                            scale: _s.padScale,
                            haptics: _s.haptics,
                          ),
                        );
                      },
                    ),
                    if (_full)
                      Positioned(
                        top: 6,
                        right: 6,
                        child: IconButton(
                          tooltip: 'Sair da tela cheia',
                          icon: const Icon(Icons.fullscreen_exit, color: Colors.white),
                          style: IconButton.styleFrom(
                            backgroundColor: Colors.black.withAlpha(120),
                          ),
                          onPressed: _toggleFull,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
