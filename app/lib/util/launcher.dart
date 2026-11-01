import 'dart:io' show Platform;

import 'package:android_intent_plus/android_intent.dart';
import 'package:android_intent_plus/flag.dart';

/// Abre um app instalado no aparelho pelo nome do pacote.
/// Retorna false se não for Android ou se o app não estiver instalado.
Future<bool> launchInstalledApp(String package) async {
  if (!Platform.isAndroid) return false;
  try {
    final intent = AndroidIntent(
      action: 'android.intent.action.MAIN',
      category: 'android.intent.category.LAUNCHER',
      package: package,
      flags: <int>[Flag.FLAG_ACTIVITY_NEW_TASK],
    );
    await intent.launch();
    return true;
  } catch (_) {
    return false;
  }
}

/// Diz se o app (pelo pacote) pode ser aberto neste aparelho.
Future<bool> isAppInstalled(String package) async {
  if (!Platform.isAndroid) return false;
  try {
    final intent = AndroidIntent(
      action: 'android.intent.action.MAIN',
      category: 'android.intent.category.LAUNCHER',
      package: package,
    );
    return (await intent.canResolveActivity()) ?? false;
  } catch (_) {
    return false;
  }
}

/// Abre um endereço https no navegador.
Future<bool> openUrl(String url) async {
  if (!Platform.isAndroid || !url.startsWith('https://')) return false;
  try {
    final intent = AndroidIntent(
      action: 'android.intent.action.VIEW',
      data: url,
      flags: <int>[Flag.FLAG_ACTIVITY_NEW_TASK],
    );
    await intent.launch();
    return true;
  } catch (_) {
    return false;
  }
}

String formatDate(int ms) {
  final d = DateTime.fromMillisecondsSinceEpoch(ms);
  String t(int n) => n.toString().padLeft(2, '0');
  return '${t(d.day)}/${t(d.month)} ${t(d.hour)}:${t(d.minute)}';
}
