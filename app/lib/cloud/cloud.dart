import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../state/app_state.dart';
import 'config.dart';

/// Traduz mensagens de erro de login para português claro (sem expor detalhes internos).
String friendlyAuthMessage(String raw) {
  final m = raw.toLowerCase();
  if (m.contains('invalid login') || m.contains('invalid credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (m.contains('not confirmed')) {
    return 'Confirme seu e-mail antes de entrar (veja a caixa de entrada e o spam).';
  }
  if (m.contains('already registered') || m.contains('already been registered')) {
    return 'Este e-mail já tem conta. Use "Entrar".';
  }
  if (m.contains('password') && (m.contains('least') || m.contains('short') || m.contains('weak'))) {
    return 'A senha precisa de pelo menos 6 caracteres.';
  }
  if (m.contains('rate limit') || m.contains('too many')) {
    return 'Muitas tentativas. Espere um pouco e tente de novo.';
  }
  if (m.contains('socket') ||
      m.contains('failed host lookup') ||
      m.contains('network') ||
      m.contains('connection') ||
      m.contains('timeout')) {
    return 'Sem conexão com a internet.';
  }
  return 'Não foi possível concluir. Tente de novo.';
}

class AuthOutcome {
  const AuthOutcome({this.error, this.needsConfirmation = false});

  final String? error;

  /// Conta criada, mas o Supabase exige confirmar o e-mail antes do primeiro login.
  final bool needsConfirmation;

  bool get ok => error == null;
}

/// Login opcional (Supabase) e sincronização de favoritos, histórico e nome.
/// O app funciona normalmente sem conta; a senha nunca é guardada no aparelho.
class CloudService extends ChangeNotifier implements CloudHooks {
  bool ready = false;
  bool syncing = false;
  String? lastError;
  DateTime? lastSync;

  AppState? _state;
  StreamSubscription<AuthState>? _sub;

  SupabaseClient? get _client => ready ? Supabase.instance.client : null;
  User? get user => _client?.auth.currentUser;
  bool get signedIn => user != null;
  String? get email => user?.email;

  Future<void> init(AppState state) async {
    _state = state;
    state.hooks = this;
    try {
      await Supabase.initialize(url: kSupabaseUrl, anonKey: kSupabaseKey)
          .timeout(const Duration(seconds: 10));
      ready = true;
      _sub = Supabase.instance.client.auth.onAuthStateChange.listen((data) {
        notifyListeners();
        if (data.event == AuthChangeEvent.signedIn) unawaited(syncAll());
      });
      if (signedIn) unawaited(syncAll());
    } catch (_) {
      ready = false;
      lastError = 'Login indisponível neste momento.';
    }
    notifyListeners();
  }

  String _msg(Object e) =>
      friendlyAuthMessage(e is AuthException ? e.message : e.toString());

  Future<AuthOutcome> signIn(String email, String password) async {
    final c = _client;
    if (c == null) return const AuthOutcome(error: 'Login indisponível neste momento.');
    try {
      await c.auth.signInWithPassword(email: email.trim(), password: password);
      return const AuthOutcome();
    } catch (e) {
      return AuthOutcome(error: _msg(e));
    }
  }

  Future<AuthOutcome> signUp(String email, String password, String username) async {
    final c = _client;
    if (c == null) return const AuthOutcome(error: 'Login indisponível neste momento.');
    try {
      final r = await c.auth.signUp(
        email: email.trim(),
        password: password,
        data: {'username': username.trim()},
      );
      return AuthOutcome(needsConfirmation: r.session == null);
    } catch (e) {
      return AuthOutcome(error: _msg(e));
    }
  }

  Future<void> signOut() async {
    try {
      await _client?.auth.signOut();
    } catch (_) {}
    lastSync = null;
    notifyListeners();
  }

  /// Junta dados locais e da nuvem (união) e envia o que só existe no aparelho.
  Future<void> syncAll() async {
    final c = _client;
    final s = _state;
    final u = user;
    if (c == null || s == null || u == null || syncing) return;
    syncing = true;
    lastError = null;
    notifyListeners();
    try {
      final favRows = (await c.from('favorites').select('game_id')) as List;
      final remoteFavs = <String>{for (final r in favRows) r['game_id'] as String};

      final histRows = (await c.from('history').select('game_id, played_at')) as List;
      final remoteHist = <HistoryEntry>[
        for (final r in histRows)
          HistoryEntry(
            r['game_id'] as String,
            DateTime.parse(r['played_at'] as String).millisecondsSinceEpoch,
          ),
      ];

      final prof = await c.from('profiles').select('username').maybeSingle();
      final remoteName = prof?['username'] as String?;

      final pushFavs = s.favorites.difference(remoteFavs);
      if (pushFavs.isNotEmpty) {
        await c.from('favorites').upsert(
          [for (final id in pushFavs) {'user_id': u.id, 'game_id': id}],
          onConflict: 'user_id,game_id',
          ignoreDuplicates: true,
        );
      }

      final remoteAt = {for (final h in remoteHist) h.gameId: h.atMs};
      final pushHist = s.history.where((h) => (remoteAt[h.gameId] ?? 0) < h.atMs).toList();
      if (pushHist.isNotEmpty) {
        await c.from('history').upsert(
          [
            for (final h in pushHist)
              {
                'user_id': u.id,
                'game_id': h.gameId,
                'played_at':
                    DateTime.fromMillisecondsSinceEpoch(h.atMs, isUtc: true).toIso8601String(),
              },
          ],
          onConflict: 'user_id,game_id',
        );
      }

      if (s.userName != AppState.defaultName && s.userName != remoteName) {
        await c.from('profiles').update({'username': s.userName}).eq('id', u.id);
      }

      s.mergeFromCloud(favs: remoteFavs, hist: remoteHist, name: remoteName);
      lastSync = DateTime.now();
    } catch (e) {
      lastError = e is AuthException
          ? friendlyAuthMessage(e.message)
          : 'Não consegui sincronizar agora (sem internet?).';
    }
    syncing = false;
    notifyListeners();
  }

  Future<void> _quiet(Future<void> Function(SupabaseClient c, User u) f) async {
    final c = _client;
    final u = user;
    if (c == null || u == null) return;
    try {
      await f(c, u);
    } catch (_) {
      // Sem internet agora: o próximo "sincronizar" envia o que faltou.
    }
  }

  @override
  void favoriteChanged(String id, bool on) {
    unawaited(_quiet((c, u) async {
      if (on) {
        await c.from('favorites').upsert(
          {'user_id': u.id, 'game_id': id},
          onConflict: 'user_id,game_id',
          ignoreDuplicates: true,
        );
      } else {
        await c.from('favorites').delete().eq('game_id', id);
      }
    }));
  }

  @override
  void played(String id, int atMs) {
    unawaited(_quiet((c, u) async {
      await c.from('history').upsert(
        {
          'user_id': u.id,
          'game_id': id,
          'played_at': DateTime.fromMillisecondsSinceEpoch(atMs, isUtc: true).toIso8601String(),
        },
        onConflict: 'user_id,game_id',
      );
    }));
  }

  @override
  void renamed(String name) {
    unawaited(_quiet((c, u) async {
      await c.from('profiles').update({'username': name}).eq('id', u.id);
    }));
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

/// Dá acesso ao serviço de nuvem (pode ser null, por exemplo em testes).
class CloudScope extends InheritedWidget {
  const CloudScope({super.key, required this.cloud, required super.child});

  final CloudService? cloud;

  static CloudService? of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<CloudScope>()?.cloud;

  @override
  bool updateShouldNotify(CloudScope old) => old.cloud != cloud;
}
