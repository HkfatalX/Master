import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../player/web_guard.dart';
import '../theme.dart';
import 'emu_server.dart';

/// Roda o arquivo do usuário dentro do app com o EmulatorJS (NES, SNES, Game Boy, GBA, Mega Drive).
/// Os controles na tela, o menu (salvar/carregar estado, mapear botões) e o suporte a controle
/// Bluetooth vêm do próprio EmulatorJS. Não foi testado em aparelho real.
class EmuScreen extends StatefulWidget {
  const EmuScreen({super.key, required this.file, required this.core, required this.title});

  final File file;
  final String core;
  final String title;

  @override
  State<EmuScreen> createState() => _EmuScreenState();
}

class _EmuScreenState extends State<EmuScreen> {
  final EmuServer _server = EmuServer();
  WebViewController? _c;
  int? _port;
  int _progress = 0;
  String? _error;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _start();
  }

  Future<void> _start() async {
    try {
      final uri = await _server.start(rom: widget.file, core: widget.core, title: widget.title);
      _port = uri.port;
      final c = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(Colors.black)
        ..setNavigationDelegate(
          NavigationDelegate(
            onNavigationRequest: (req) {
              if (!req.isMainFrame || isSameOrigin(req.url, _port!)) {
                return NavigationDecision.navigate;
              }
              return NavigationDecision.prevent;
            },
            onProgress: (p) {
              if (mounted) setState(() => _progress = p);
            },
            onWebResourceError: (e) {
              if (mounted && e.isForMainFrame == true) {
                setState(() => _error = e.description);
              }
            },
          ),
        )
        ..loadRequest(uri);
      if (mounted) setState(() => _c = c);
    } catch (_) {
      if (mounted) setState(() => _error = 'Não consegui iniciar o emulador.');
    }
  }

  @override
  void dispose() {
    _server.stop();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = _c;
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          if (c != null) Positioned.fill(child: SafeArea(child: WebViewWidget(controller: c))),
          if (_progress < 100 && _error == null)
            Positioned(
              left: 0,
              right: 0,
              top: 0,
              child: Column(
                children: [
                  LinearProgressIndicator(
                    value: _progress == 0 ? null : _progress / 100,
                    minHeight: 3,
                    color: NX.purple,
                    backgroundColor: NX.surface,
                  ),
                  const Padding(
                    padding: EdgeInsets.all(8),
                    child: Text(
                      'Carregando o emulador… (precisa de internet na primeira vez)',
                      style: TextStyle(color: NX.muted, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
          if (_error != null)
            Positioned.fill(
              child: Container(
                color: NX.bg,
                padding: const EdgeInsets.all(32),
                alignment: Alignment.center,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, color: NX.bad, size: 40),
                    const SizedBox(height: 12),
                    const Text(
                      'Não consegui abrir o jogo.\nConfira a internet e tente de novo.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: NX.text),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: NX.muted, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ),
          SafeArea(
            child: Align(
              alignment: Alignment.topLeft,
              child: Padding(
                padding: const EdgeInsets.all(6),
                child: IconButton(
                  tooltip: 'Sair do jogo',
                  icon: const Icon(Icons.close, color: Colors.white),
                  style: IconButton.styleFrom(backgroundColor: Colors.black.withAlpha(120)),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
