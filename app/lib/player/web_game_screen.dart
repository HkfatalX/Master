import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../models/game.dart';
import '../state/app_state.dart';
import '../theme.dart';
import 'web_guard.dart';

/// Joga um jogo web dentro do app (navegador embutido), sem servidor e sem custo.
class WebGameScreen extends StatefulWidget {
  const WebGameScreen({super.key, required this.game, required this.state});

  final Game game;
  final AppState state;

  @override
  State<WebGameScreen> createState() => _WebGameScreenState();
}

class _WebGameScreenState extends State<WebGameScreen> {
  late final WebViewController _c;
  int _progress = 0;
  String? _error;

  @override
  void initState() {
    super.initState();
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
          },
          onWebResourceError: (e) {
            if (mounted && e.isForMainFrame == true) {
              setState(() => _error = e.description);
            }
          },
        ),
      )
      ..loadRequest(url);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) widget.state.addHistory(widget.game.id);
    });
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final nav = Navigator.of(context);
        if (await _c.canGoBack()) {
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
              Container(
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
                      tooltip: 'Recarregar',
                      icon: const Icon(Icons.refresh, color: NX.text),
                      onPressed: () => _c.reload(),
                    ),
                  ],
                ),
              ),
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
