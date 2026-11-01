/// Serviços de jogos. Aqui só constam fatos que o app realmente faz: abrir o app ou o site oficial.
/// Login por conta e sincronização de biblioteca NÃO estão implementados (ver docs/STATUS.md).
class GameService {
  const GameService({
    required this.name,
    required this.site,
    this.androidPackage,
    required this.note,
  });

  final String name;
  final String site;

  /// Pacote do app oficial no Android (não verificado em aparelho).
  final String? androidPackage;
  final String note;
}

const List<GameService> kServices = [
  GameService(
    name: 'Steam',
    site: 'https://store.steampowered.com',
    androidPackage: 'com.valvesoftware.android.steam.community',
    note: 'Jogos de PC. No celular, só via Steam Link ou streaming de um PC seu.',
  ),
  GameService(
    name: 'Xbox',
    site: 'https://www.xbox.com/play',
    androidPackage: 'com.microsoft.xboxone.smartglass',
    note: 'Cloud Gaming oficial pelo navegador, com assinatura Xbox quando exigida.',
  ),
  GameService(
    name: 'PlayStation',
    site: 'https://www.playstation.com',
    androidPackage: 'com.scee.psxandroid',
    note: 'O app oficial é de loja e amigos. Jogar no celular depende do Remote Play do seu console.',
  ),
  GameService(
    name: 'Epic Games',
    site: 'https://store.epicgames.com',
    androidPackage: 'com.epicgames.portal',
    note: 'Loja e biblioteca. Jogos de PC não rodam no celular sem streaming.',
  ),
  GameService(
    name: 'Roblox',
    site: 'https://www.roblox.com',
    androidPackage: 'com.roblox.client',
    note: 'Roda no celular pelo app oficial.',
  ),
  GameService(
    name: 'Nintendo',
    site: 'https://www.nintendo.com',
    note: 'Sem integração: só o site oficial.',
  ),
  GameService(
    name: 'GOG',
    site: 'https://www.gog.com',
    note: 'Sem integração: só o site oficial.',
  ),
  GameService(
    name: 'Ubisoft Connect',
    site: 'https://www.ubisoft.com',
    note: 'Sem integração: só o site oficial.',
  ),
  GameService(
    name: 'EA',
    site: 'https://www.ea.com',
    note: 'Sem integração: só o site oficial.',
  ),
  GameService(
    name: 'Battle.net',
    site: 'https://battle.net',
    note: 'Sem integração: só o site oficial.',
  ),
  GameService(
    name: 'itch.io',
    site: 'https://itch.io',
    note: 'Jogos independentes; muitos rodam no navegador.',
  ),
];
