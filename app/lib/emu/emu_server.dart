import 'dart:io';
import 'dart:math';

import 'emu_page.dart';

/// Servidor HTTP só neste aparelho (127.0.0.1) que entrega a página do emulador e o arquivo do jogo
/// para o navegador embutido. Exige um código aleatório em toda requisição e nunca sai do aparelho.
class EmuServer {
  /// Porta fixa para a origem não mudar (os saves do emulador ficam presos à origem).
  static const int preferredPort = 38645;

  HttpServer? _server;
  final String token = _makeToken();
  late File _rom;
  late String _romName;
  late String _core;
  late String _title;

  static String _makeToken() {
    final r = Random.secure();
    return List.generate(16, (_) => r.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
  }

  Future<Uri> start({required File rom, required String core, required String title}) async {
    _rom = rom;
    _core = core;
    _title = title;
    _romName = rom.uri.pathSegments.last;
    try {
      _server = await HttpServer.bind(InternetAddress.loopbackIPv4, preferredPort);
    } on SocketException {
      // Porta ocupada: usa outra (os saves dessa sessão não serão reaproveitados).
      _server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    }
    _server!.listen(_handle, onError: (Object _) {});
    return Uri(
      scheme: 'http',
      host: '127.0.0.1',
      port: _server!.port,
      path: '/play',
      queryParameters: {'t': token},
    );
  }

  Future<void> _handle(HttpRequest req) async {
    final res = req.response;
    try {
      if (req.method != 'GET' || req.uri.queryParameters['t'] != token) {
        res.statusCode = HttpStatus.forbidden;
        await res.close();
        return;
      }
      final p = req.uri.path;
      if (p == '/play') {
        final html = buildEmuHtml(
          core: _core,
          title: _title,
          romPath: '/rom/${Uri.encodeComponent(_romName)}?t=$token',
        );
        res.headers.contentType = ContentType.html;
        res.headers.set('Cache-Control', 'no-store');
        res.write(html);
        await res.close();
      } else if (p.startsWith('/rom/')) {
        if (!await _rom.exists()) {
          res.statusCode = HttpStatus.notFound;
          await res.close();
          return;
        }
        res.headers.contentType = ContentType.binary;
        res.contentLength = await _rom.length();
        await res.addStream(_rom.openRead());
        await res.close();
      } else {
        res.statusCode = HttpStatus.notFound;
        await res.close();
      }
    } catch (_) {
      try {
        res.statusCode = HttpStatus.internalServerError;
        await res.close();
      } catch (_) {}
    }
  }

  Future<void> stop() async {
    try {
      await _server?.close(force: true);
    } catch (_) {}
    _server = null;
  }
}
