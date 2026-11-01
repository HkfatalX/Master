import 'dart:convert';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/catalog.dart';
import '../data/formats.dart';
import '../models/game.dart';

/// Perfis de desempenho. Os números são enviados ao servidor no início da sessão.
enum QualityProfile { economy, balanced, high }

extension QualityProfileX on QualityProfile {
  String get label => switch (this) {
        QualityProfile.economy => 'Econômico',
        QualityProfile.balanced => 'Equilibrado',
        QualityProfile.high => 'Alto desempenho',
      };

  int get width => switch (this) {
        QualityProfile.economy => 854,
        QualityProfile.balanced => 1280,
        QualityProfile.high => 1920,
      };

  int get height => switch (this) {
        QualityProfile.economy => 480,
        QualityProfile.balanced => 720,
        QualityProfile.high => 1080,
      };

  int get fps => switch (this) {
        QualityProfile.economy => 30,
        QualityProfile.balanced => 60,
        QualityProfile.high => 60,
      };

  int get bitrateKbps => switch (this) {
        QualityProfile.economy => 2500,
        QualityProfile.balanced => 6000,
        QualityProfile.high => 12000,
      };
}

/// Qualidade gráfica dos jogos web: escala da resolução interna.
enum GfxQuality { low, medium, high }

extension GfxQualityX on GfxQuality {
  String get label => switch (this) {
        GfxQuality.low => 'Baixa (50%)',
        GfxQuality.medium => 'Média (75%)',
        GfxQuality.high => 'Alta (100%)',
      };

  double get scale => switch (this) {
        GfxQuality.low => 0.5,
        GfxQuality.medium => 0.75,
        GfxQuality.high => 1.0,
      };
}

/// Limites de FPS oferecidos (0 = sem limite).
const List<int> kFpsCaps = [0, 30, 45, 60];

String fpsCapLabel(int v) => v == 0 ? 'Sem limite' : '$v FPS';

/// Esquema de teclas dos controles na tela dos jogos web.
enum WebControls { off, arrowsZx, wasdSpace, arrowsSpace }

extension WebControlsX on WebControls {
  String get label => switch (this) {
        WebControls.off => 'Desligado (só toque)',
        WebControls.arrowsZx => 'Setas + Z/X/C/V',
        WebControls.wasdSpace => 'WASD + Espaço/E/Q/R',
        WebControls.arrowsSpace => 'Setas + Espaço/Enter/Z/X',
      };
}

/// Ganchos para a nuvem (login opcional). O AppState não conhece o Supabase.
abstract class CloudHooks {
  void favoriteChanged(String id, bool on);
  void played(String id, int atMs);
  void renamed(String name);
}

/// Junta dois históricos mantendo o mais recente de cada jogo (máximo 20).
List<HistoryEntry> mergeHistory(List<HistoryEntry> a, List<HistoryEntry> b) {
  final best = <String, HistoryEntry>{};
  for (final h in [...a, ...b]) {
    final cur = best[h.gameId];
    if (cur == null || h.atMs > cur.atMs) best[h.gameId] = h;
  }
  final out = best.values.toList()..sort((x, y) => y.atMs.compareTo(x.atMs));
  return out.length > 20 ? out.sublist(0, 20) : out;
}

class HistoryEntry {
  const HistoryEntry(this.gameId, this.atMs);

  final String gameId;
  final int atMs;

  String encode() => '$gameId|$atMs';

  static HistoryEntry? parse(String s) {
    final i = s.lastIndexOf('|');
    if (i <= 0) return null;
    final at = int.tryParse(s.substring(i + 1));
    if (at == null) return null;
    return HistoryEntry(s.substring(0, i), at);
  }
}

class AppState extends ChangeNotifier {
  static const String defaultName = 'Jogador';

  SharedPreferences? _prefs;
  CloudHooks? hooks;

  Set<String> favorites = <String>{};
  List<HistoryEntry> history = <HistoryEntry>[];
  List<ImportedFile> files = <ImportedFile>[];
  QualityProfile profile = QualityProfile.balanced;
  bool haptics = true;
  bool showHud = true;
  bool lockLandscape = false;
  double padOpacity = 0.7;
  double padScale = 1.0;
  String serverUrl = '';
  String userName = defaultName;
  GfxQuality gfx = GfxQuality.high;
  int fpsCap = 0;
  WebControls webControls = WebControls.off;

  /// -1 = automático (usa o estilo do jogo); senão, índice de PadFamily.
  int padStyle = -1;

  bool get hasServer => serverUrl.isNotEmpty;

  List<Game> get recentGames {
    final out = <Game>[];
    for (final h in history) {
      final g = gameById(h.gameId);
      if (g != null) out.add(g);
    }
    return out;
  }

  Future<void> load() async {
    final p = await SharedPreferences.getInstance();
    _prefs = p;
    favorites = (p.getStringList('fav') ?? <String>[]).toSet();
    history = (p.getStringList('hist') ?? <String>[])
        .map(HistoryEntry.parse)
        .whereType<HistoryEntry>()
        .toList();
    files = (p.getStringList('files') ?? <String>[])
        .map((s) {
          try {
            return ImportedFile.fromJson(jsonDecode(s));
          } catch (_) {
            return null;
          }
        })
        .whereType<ImportedFile>()
        .toList();
    final pi = p.getInt('profile') ?? QualityProfile.balanced.index;
    profile = QualityProfile.values[pi.clamp(0, QualityProfile.values.length - 1)];
    haptics = p.getBool('haptics') ?? true;
    showHud = p.getBool('hud') ?? true;
    lockLandscape = p.getBool('landscape') ?? false;
    padOpacity = (p.getDouble('padOpacity') ?? 0.7).clamp(0.3, 1.0);
    padScale = (p.getDouble('padScale') ?? 1.0).clamp(0.7, 1.4);
    serverUrl = p.getString('server') ?? '';
    userName = p.getString('user') ?? defaultName;
    gfx = GfxQuality.values[(p.getInt('gfx') ?? 2).clamp(0, GfxQuality.values.length - 1)];
    final fc = p.getInt('fpsCap') ?? 0;
    fpsCap = kFpsCaps.contains(fc) ? fc : 0;
    webControls = WebControls
        .values[(p.getInt('webControls') ?? 0).clamp(0, WebControls.values.length - 1)];
    padStyle = (p.getInt('padStyle') ?? -1).clamp(-1, PadFamily.values.length - 1);
    notifyListeners();
  }

  void toggleFavorite(String id) {
    if (!favorites.remove(id)) favorites.add(id);
    _prefs?.setStringList('fav', favorites.toList());
    hooks?.favoriteChanged(id, favorites.contains(id));
    notifyListeners();
  }

  void addHistory(String gameId) {
    history.removeWhere((h) => h.gameId == gameId);
    final at = DateTime.now().millisecondsSinceEpoch;
    history.insert(0, HistoryEntry(gameId, at));
    hooks?.played(gameId, at);
    if (history.length > 20) history = history.sublist(0, 20);
    _prefs?.setStringList('hist', history.map((h) => h.encode()).toList());
    notifyListeners();
  }

  void clearHistory() {
    history = <HistoryEntry>[];
    _prefs?.setStringList('hist', <String>[]);
    notifyListeners();
  }

  void _saveFiles() {
    _prefs?.setStringList('files', files.map((f) => jsonEncode(f.toJson())).toList());
  }

  /// Adiciona arquivos e retorna quantos foram adicionados (ignora o mesmo nome+tamanho já na lista
  /// só quando vier exatamente repetido na mesma seleção; duplicados antigos aparecem marcados).
  int addFiles(List<ImportedFile> add) {
    if (add.isEmpty) return 0;
    files = [...files, ...add];
    _saveFiles();
    notifyListeners();
    return add.length;
  }

  void removeFile(ImportedFile f) {
    if (f.copied && f.path != null) {
      try {
        File(f.path!).deleteSync();
      } catch (_) {}
    }
    files = files.where((x) => !identical(x, f)).toList();
    _saveFiles();
    notifyListeners();
  }

  void setGfx(GfxQuality v) {
    gfx = v;
    _prefs?.setInt('gfx', v.index);
    notifyListeners();
  }

  void setFpsCap(int v) {
    fpsCap = kFpsCaps.contains(v) ? v : 0;
    _prefs?.setInt('fpsCap', fpsCap);
    notifyListeners();
  }

  void setWebControls(WebControls v) {
    webControls = v;
    _prefs?.setInt('webControls', v.index);
    notifyListeners();
  }

  void setPadStyle(int v) {
    padStyle = v.clamp(-1, PadFamily.values.length - 1);
    _prefs?.setInt('padStyle', padStyle);
    notifyListeners();
  }

  /// Estilo visual dos botões: o escolhido ou, se automático, o do jogo.
  PadFamily padFamilyFor(PadFamily gameDefault) =>
      padStyle < 0 ? gameDefault : PadFamily.values[padStyle];

  /// Aplica dados vindos da nuvem (união) sem disparar novos envios.
  void mergeFromCloud({Set<String>? favs, List<HistoryEntry>? hist, String? name}) {
    if (favs != null) {
      favorites = {...favorites, ...favs};
      _prefs?.setStringList('fav', favorites.toList());
    }
    if (hist != null) {
      history = mergeHistory(history, hist);
      _prefs?.setStringList('hist', history.map((h) => h.encode()).toList());
    }
    if (name != null && name.trim().length >= 2 && userName == defaultName) {
      userName = name.trim();
      _prefs?.setString('user', userName);
    }
    notifyListeners();
  }

  void setProfile(QualityProfile v) {
    profile = v;
    _prefs?.setInt('profile', v.index);
    notifyListeners();
  }

  void setHaptics(bool v) {
    haptics = v;
    _prefs?.setBool('haptics', v);
    notifyListeners();
  }

  void setShowHud(bool v) {
    showHud = v;
    _prefs?.setBool('hud', v);
    notifyListeners();
  }

  void setLockLandscape(bool v) {
    lockLandscape = v;
    _prefs?.setBool('landscape', v);
    notifyListeners();
  }

  void setPadOpacity(double v) {
    padOpacity = v;
    _prefs?.setDouble('padOpacity', v);
    notifyListeners();
  }

  void setPadScale(double v) {
    padScale = v;
    _prefs?.setDouble('padScale', v);
    notifyListeners();
  }

  void setUserName(String v) {
    final t = v.trim();
    if (t.length < 2) return;
    userName = t.length > 24 ? t.substring(0, 24) : t;
    _prefs?.setString('user', userName);
    hooks?.renamed(userName);
    notifyListeners();
  }

  /// Salva a URL do servidor. Retorna a mensagem de erro, ou null se estiver tudo certo.
  String? setServerUrl(String v) {
    final err = validateServerUrl(v);
    if (err != null) return err;
    serverUrl = v.trim();
    _prefs?.setString('server', serverUrl);
    notifyListeners();
    return null;
  }

  /// O app só aceita conexões criptografadas (wss://). Vazio remove o servidor.
  static String? validateServerUrl(String v) {
    final t = v.trim();
    if (t.isEmpty) return null;
    final u = Uri.tryParse(t);
    if (u == null || u.host.isEmpty) return 'Endereço inválido.';
    if (u.scheme != 'wss') return 'Use um endereço começando com wss:// (conexão segura).';
    return null;
  }
}

class AppScope extends InheritedNotifier<AppState> {
  const AppScope({super.key, required AppState state, required super.child})
      : super(notifier: state);

  static AppState of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope não encontrado');
    return scope!.notifier!;
  }
}
