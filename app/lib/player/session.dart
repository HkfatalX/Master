import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../state/app_state.dart';

enum SessionState { connecting, connected, reconnecting, closed, failed }

/// Uma sessão de jogo. Hoje existem duas: teste local de controles e gateway remoto.
/// O vídeo (WebRTC) ainda não está implementado; veja docs/STATUS.md.
abstract class StreamSession extends ChangeNotifier {
  SessionState state = SessionState.connecting;
  int? rttMs;
  int? bitrateKbps;
  bool _disposed = false;

  String get modeLabel;
  String get statusText;

  Future<void> start();
  void sendInput(Map<String, dynamic> snapshot);
  Future<void> stop();

  @protected
  void emit() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}

/// Sem servidor: só valida os controles (toque e Bluetooth). Nada é transmitido.
class LocalTestSession extends StreamSession {
  @override
  String get modeLabel => 'Teste de controles';

  @override
  String get statusText => 'Sem servidor: nenhum jogo está sendo transmitido.';

  @override
  Future<void> start() async {
    state = SessionState.connected;
    emit();
  }

  @override
  void sendInput(Map<String, dynamic> snapshot) {}

  @override
  Future<void> stop() async {
    state = SessionState.closed;
  }
}

void _closeQuietly(WebSocketChannel? c) {
  if (c == null) return;
  c.sink.close().catchError((Object _) {});
}

/// Conexão com um servidor próprio por WebSocket seguro (wss://).
/// Envia entrada de controle, mede latência (ping/pong) e reconecta sozinha.
class GatewaySession extends StreamSession {
  GatewaySession({
    required this.url,
    required this.gameId,
    required this.profile,
  });

  static const int maxAttempts = 5;

  final String url;
  final String gameId;
  final QualityProfile profile;

  WebSocketChannel? _ch;
  StreamSubscription<dynamic>? _sub;
  Timer? _pingTimer;
  Timer? _retryTimer;
  int _attempt = 0;
  bool _stopped = false;
  String _status = 'Conectando…';

  @override
  String get modeLabel => 'Streaming remoto';

  @override
  String get statusText => _status;

  @override
  Future<void> start() => _connect();

  Future<void> _connect() async {
    if (_stopped) return;
    state = _attempt == 0 ? SessionState.connecting : SessionState.reconnecting;
    _status = _attempt == 0
        ? 'Conectando…'
        : 'Reconectando (tentativa $_attempt de $maxAttempts)…';
    emit();
    try {
      final ch = WebSocketChannel.connect(Uri.parse(url));
      _ch = ch;
      await ch.ready.timeout(const Duration(seconds: 8));
      if (_stopped) {
        _closeQuietly(ch);
        return;
      }
      _attempt = 0;
      state = SessionState.connected;
      _status = 'Conectado. Vídeo ainda não implementado (WebRTC pendente).';
      emit();
      ch.sink.add(jsonEncode({
        't': 'hello',
        'v': 1,
        'game': gameId,
        'w': profile.width,
        'h': profile.height,
        'fps': profile.fps,
        'kbps': profile.bitrateKbps,
      }));
      _sub = ch.stream.listen(
        _onMessage,
        onDone: _handleDrop,
        onError: (Object _) => _handleDrop(),
      );
      _pingTimer = Timer.periodic(const Duration(seconds: 2), (_) => _ping());
    } catch (_) {
      _handleDrop();
    }
  }

  void _handleDrop() {
    if (_stopped) return;
    _pingTimer?.cancel();
    _pingTimer = null;
    _sub?.cancel();
    _sub = null;
    _closeQuietly(_ch);
    _ch = null;
    rttMs = null;
    if (_retryTimer?.isActive ?? false) return;
    if (_attempt >= maxAttempts) {
      state = SessionState.failed;
      _status = 'Não foi possível conectar ao servidor.';
      emit();
      return;
    }
    _attempt++;
    state = SessionState.reconnecting;
    _status = 'Reconectando (tentativa $_attempt de $maxAttempts)…';
    emit();
    final seconds = math.min(1 << (_attempt - 1), 8);
    _retryTimer = Timer(Duration(seconds: seconds), _connect);
  }

  void _ping() {
    try {
      _ch?.sink.add(jsonEncode({
        't': 'ping',
        'ts': DateTime.now().millisecondsSinceEpoch,
      }));
    } catch (_) {}
  }

  void _onMessage(dynamic data) {
    if (data is! String) return;
    try {
      final m = jsonDecode(data);
      if (m is! Map) return;
      final t = m['t'];
      if (t == 'pong') {
        final ts = m['ts'];
        if (ts is int) {
          rttMs = DateTime.now().millisecondsSinceEpoch - ts;
          emit();
        }
      } else if (t == 'stats') {
        final b = m['kbps'];
        if (b is num) {
          bitrateKbps = b.round();
          emit();
        }
      }
    } catch (_) {}
  }

  @override
  void sendInput(Map<String, dynamic> snapshot) {
    if (state != SessionState.connected) return;
    try {
      _ch?.sink.add(jsonEncode({'t': 'in', ...snapshot}));
    } catch (_) {}
  }

  @override
  Future<void> stop() async {
    _stopped = true;
    _pingTimer?.cancel();
    _retryTimer?.cancel();
    _sub?.cancel();
    _closeQuietly(_ch);
    _ch = null;
    state = SessionState.closed;
    emit();
  }
}

/// Testa se o servidor aceita conexão. Retorna o tempo de conexão em ms, ou null se falhou.
Future<int?> probeServer(String url) async {
  final sw = Stopwatch()..start();
  WebSocketChannel? ch;
  try {
    ch = WebSocketChannel.connect(Uri.parse(url));
    await ch.ready.timeout(const Duration(seconds: 5));
    return sw.elapsedMilliseconds;
  } catch (_) {
    return null;
  } finally {
    _closeQuietly(ch);
  }
}
