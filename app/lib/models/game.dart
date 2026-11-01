import 'package:flutter/material.dart';

import '../theme.dart';

enum GamePlatform { pc, ps1, ps2, ps3, ps4, psp, nintendo, xbox, android, web }

extension GamePlatformX on GamePlatform {
  String get label => switch (this) {
        GamePlatform.pc => 'PC',
        GamePlatform.ps1 => 'PS1',
        GamePlatform.ps2 => 'PS2',
        GamePlatform.ps3 => 'PS3',
        GamePlatform.ps4 => 'PS4',
        GamePlatform.psp => 'PSP',
        GamePlatform.nintendo => 'Nintendo',
        GamePlatform.xbox => 'Xbox',
        GamePlatform.android => 'Android',
        GamePlatform.web => 'Web',
      };

  IconData get icon => switch (this) {
        GamePlatform.pc => Icons.computer,
        GamePlatform.ps1 => Icons.sports_esports,
        GamePlatform.ps2 => Icons.sports_esports,
        GamePlatform.ps3 => Icons.sports_esports,
        GamePlatform.ps4 => Icons.sports_esports,
        GamePlatform.psp => Icons.videogame_asset,
        GamePlatform.nintendo => Icons.gamepad,
        GamePlatform.xbox => Icons.gamepad_outlined,
        GamePlatform.android => Icons.android,
        GamePlatform.web => Icons.public,
      };
}

/// Como o jogo é executado.
enum RunMethod { local, browser, streaming, experimental, unavailable }

extension RunMethodX on RunMethod {
  String get label => switch (this) {
        RunMethod.local => 'Local',
        RunMethod.streaming => 'Streaming',
        RunMethod.experimental => 'Experimental',
        RunMethod.browser => 'No app (web)',
        RunMethod.unavailable => 'Indisponível',
      };

  Color get color => switch (this) {
        RunMethod.local => NX.ok,
        RunMethod.streaming => NX.blue,
        RunMethod.experimental => NX.warn,
        RunMethod.browser => NX.neon,
        RunMethod.unavailable => NX.bad,
      };
}

/// Família de layout do controle virtual.
enum PadFamily { playstation, xbox, nintendo, psp, generic }

extension PadFamilyX on PadFamily {
  String get label => switch (this) {
        PadFamily.playstation => 'PlayStation',
        PadFamily.xbox => 'Xbox',
        PadFamily.nintendo => 'Nintendo',
        PadFamily.psp => 'PSP',
        PadFamily.generic => 'Genérico',
      };
}

class Game {
  const Game({
    required this.id,
    required this.title,
    required this.platform,
    required this.genre,
    required this.description,
    required this.method,
    required this.requirements,
    required this.hue,
    this.androidPackage,
    this.webUrl,
    this.pad = PadFamily.generic,
  });

  final String id;
  final String title;
  final GamePlatform platform;
  final String genre;
  final String description;
  final RunMethod method;
  final String requirements;
  final double hue;
  final String? androidPackage;

  /// Endereço https de um jogo web que abre dentro do app.
  final String? webUrl;
  final PadFamily pad;

  Color get color1 => HSLColor.fromAHSL(1, hue, 0.62, 0.32).toColor();
  Color get color2 => HSLColor.fromAHSL(1, (hue + 40) % 360, 0.7, 0.14).toColor();
}

/// Emulador instalado no aparelho que o NEXUS pode abrir.
class Emulator {
  const Emulator({
    required this.name,
    required this.package,
    required this.systems,
  });

  final String name;
  final String package;
  final String systems;
}
