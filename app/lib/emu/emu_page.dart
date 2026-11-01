import 'dart:convert';

/// Texto seguro para dentro de <script>: JSON com '<' escapado (evita fechar a tag por um título malicioso).
String jsString(String v) => jsonEncode(v).replaceAll('<', r'\u003c');

/// Página que carrega o EmulatorJS (código aberto) e liga o jogo do usuário.
/// O núcleo do emulador é baixado do CDN oficial na primeira vez (precisa de internet).
String buildEmuHtml({
  required String core,
  required String title,
  required String romPath,
}) {
  return '''<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>NEXUS</title>
<style>
html, body { margin: 0; padding: 0; height: 100%; background: #000; overflow: hidden; }
#game { width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="game"></div>
<script>
EJS_player = '#game';
EJS_core = ${jsString(core)};
EJS_gameName = ${jsString(title)};
EJS_gameUrl = ${jsString(romPath)};
EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
EJS_startOnLoaded = true;
EJS_language = 'pt-BR';
</script>
<script src="https://cdn.emulatorjs.org/stable/data/loader.js"></script>
</body>
</html>''';
}
