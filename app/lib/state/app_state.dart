import 'dart:convert';

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
  SharedPreferences? _prefs;

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
  String userName = 'Jogador';

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
    userName = p.getString('user') ?? 'Jogador';
    notifyListeners();
  }

  void toggleFavorite(String id) {
    if (!favorites.remove(id)) favorites.add(id);
    _prefs?.setStringList('fav', favorites.toList());
    notifyListeners();
  }

  void addHistory(String gameId) {
    history.removeWhere((h) => h.gameId == gameId);
    history.insert(0, HistoryEntry(gameId, DateTime.now().millisecondsSinceEpoch));
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
    files = files.where((x) => !identical(x, f)).toList();
    _saveFiles();
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
    if (t.isEmpty) return;
    userName = t.length > 24 ? t.substring(0, 24) : t;
    _prefs?.setString('user', userName);
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
