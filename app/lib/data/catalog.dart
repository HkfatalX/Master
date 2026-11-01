import '../models/game.dart';

/// Catálogo inicial (local ao app). Só jogos livres/open source: o NEXUS não distribui
/// jogos comerciais, BIOS nem ROMs. O catálogo no backend (Supabase) ainda está pendente.
const List<Game> kCatalog = [
  Game(
    id: 'supertuxkart',
    title: 'SuperTuxKart',
    platform: GamePlatform.android,
    genre: 'Corrida',
    description: 'Corrida de kart open source, com versão nativa para Android.',
    method: RunMethod.local,
    requirements: 'Precisa estar instalado no aparelho (loja de apps ou site oficial).',
    hue: 270,
    androidPackage: 'org.supertuxkart.stk',
  ),
  Game(
    id: 'mindustry',
    title: 'Mindustry',
    platform: GamePlatform.android,
    genre: 'Estratégia',
    description: 'Defesa de torres e automação de fábricas, open source.',
    method: RunMethod.local,
    requirements: 'Precisa estar instalado no aparelho.',
    hue: 200,
    androidPackage: 'io.anuke.mindustry',
  ),
  Game(
    id: 'openttd',
    title: 'OpenTTD',
    platform: GamePlatform.android,
    genre: 'Simulação',
    description: 'Simulador de transporte open source inspirado em Transport Tycoon Deluxe.',
    method: RunMethod.local,
    requirements: 'Precisa estar instalado no aparelho.',
    hue: 150,
    androidPackage: 'org.openttd.openttd',
  ),
  Game(
    id: 'xonotic',
    title: 'Xonotic',
    platform: GamePlatform.pc,
    genre: 'Tiro em arena',
    description: 'FPS de arena rápido e gratuito para PC.',
    method: RunMethod.streaming,
    requirements: 'Um PC seu com o jogo e um host de streaming compatível, acessível por wss://.',
    hue: 15,
    pad: PadFamily.xbox,
  ),
  Game(
    id: '0ad',
    title: '0 A.D.',
    platform: GamePlatform.pc,
    genre: 'Estratégia',
    description: 'Estratégia em tempo real histórica, gratuita e open source.',
    method: RunMethod.streaming,
    requirements: 'Um PC seu com o jogo e um host de streaming compatível, acessível por wss://.',
    hue: 40,
    pad: PadFamily.generic,
  ),
  Game(
    id: 'veloren',
    title: 'Veloren',
    platform: GamePlatform.pc,
    genre: 'RPG',
    description: 'RPG multijogador de mundo voxel, open source.',
    method: RunMethod.streaming,
    requirements: 'Um PC seu com o jogo e um host de streaming compatível, acessível por wss://.',
    hue: 100,
    pad: PadFamily.xbox,
  ),
];

/// Emuladores que o app sabe abrir se estiverem instalados. Os pacotes ainda não foram
/// conferidos em aparelho real (ver docs/STATUS.md).
const List<Emulator> kEmulators = [
  Emulator(name: 'PPSSPP', package: 'org.ppsspp.ppsspp', systems: 'PSP'),
  Emulator(
    name: 'DuckStation',
    package: 'com.github.stenzek.duckstation',
    systems: 'PS1',
  ),
  Emulator(
    name: 'Dolphin',
    package: 'org.dolphinemu.dolphinemu',
    systems: 'GameCube / Wii',
  ),
  Emulator(name: 'RetroArch', package: 'com.retroarch', systems: 'Vários sistemas'),
];

Game? gameById(String id) {
  for (final g in kCatalog) {
    if (g.id == id) return g;
  }
  return null;
}
