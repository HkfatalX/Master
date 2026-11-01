import 'dart:convert';
import 'dart:io';

import '../version.dart';

class UpdateInfo {
  const UpdateInfo({required this.version, required this.notes, required this.url});

  final String version;
  final String notes;

  /// Endereço https do APK.
  final String url;
}

/// Converte "v0.3.1" ou "0.3.1" em [0, 3, 1]; null se não for uma versão válida.
List<int>? parseVersion(String v) {
  var t = v.trim();
  if (t.startsWith('v') || t.startsWith('V')) t = t.substring(1);
  final core = t.split(RegExp(r'[+-]')).first;
  final parts = core.split('.');
  if (parts.isEmpty || parts.length > 4) return null;
  final out = <int>[];
  for (final p in parts) {
    final n = int.tryParse(p);
    if (n == null || n < 0) return null;
    out.add(n);
  }
  return out;
}

/// >0 se a é mais nova que b; <0 se mais velha; 0 se igual; null se alguma for inválida.
int? compareVersions(String a, String b) {
  final pa = parseVersion(a);
  final pb = parseVersion(b);
  if (pa == null || pb == null) return null;
  final n = pa.length > pb.length ? pa.length : pb.length;
  for (var i = 0; i < n; i++) {
    final x = i < pa.length ? pa[i] : 0;
    final y = i < pb.length ? pb[i] : 0;
    if (x != y) return x.compareTo(y);
  }
  return 0;
}

/// Lê a resposta da API de Releases do GitHub. Retorna a atualização se for mais nova que [current]
/// e tiver um APK https; senão null.
UpdateInfo? parseRelease(Map<String, dynamic> json, String current) {
  final tag = json['tag_name'];
  if (tag is! String) return null;
  if (json['draft'] == true) return null;
  final cmp = compareVersions(tag, current);
  if (cmp == null || cmp <= 0) return null;
  final assets = json['assets'];
  if (assets is! List) return null;
  for (final a in assets) {
    if (a is! Map) continue;
    final name = a['name'];
    final url = a['browser_download_url'];
    if (name is String && name.endsWith('.apk') && url is String && url.startsWith('https://')) {
      final body = json['body'];
      return UpdateInfo(
        version: tag.startsWith('v') ? tag.substring(1) : tag,
        notes: body is String ? body : '',
        url: url,
      );
    }
  }
  return null;
}

class UpdateResult {
  const UpdateResult({this.info, this.error});

  final UpdateInfo? info;

  /// Preenchido só quando não deu para verificar (sem internet etc.).
  final String? error;

  bool get checked => error == null;
}

/// Procura uma versão mais nova do NEXUS nas Releases do repositório (sem login, sem custo).
Future<UpdateResult> checkForUpdate({String current = kAppVersion}) async {
  final client = HttpClient()..connectionTimeout = const Duration(seconds: 8);
  try {
    final req = await client
        .getUrl(Uri.parse('https://api.github.com/repos/$kReleaseRepo/releases/latest'))
        .timeout(const Duration(seconds: 10));
    req.headers.set('Accept', 'application/vnd.github+json');
    req.headers.set('User-Agent', 'NexusCloud-App');
    final res = await req.close().timeout(const Duration(seconds: 10));
    if (res.statusCode == 404) return const UpdateResult();
    if (res.statusCode != 200) {
      await res.drain<void>();
      return UpdateResult(error: 'O GitHub respondeu ${res.statusCode}.');
    }
    final body = await res.transform(utf8.decoder).join().timeout(const Duration(seconds: 10));
    final json = jsonDecode(body);
    if (json is! Map<String, dynamic>) return const UpdateResult(error: 'Resposta inesperada.');
    return UpdateResult(info: parseRelease(json, current));
  } catch (_) {
    return const UpdateResult(error: 'Não consegui verificar (sem internet?).');
  } finally {
    client.close(force: true);
  }
}
