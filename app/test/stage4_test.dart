import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:nexus_cloud/cloud/cloud.dart';
import 'package:nexus_cloud/data/formats.dart';
import 'package:nexus_cloud/emu/emu_page.dart';
import 'package:nexus_cloud/player/pad.dart';
import 'package:nexus_cloud/player/web_guard.dart';
import 'package:nexus_cloud/player/web_inject.dart';
import 'package:nexus_cloud/state/app_state.dart';
import 'package:nexus_cloud/update/update.dart';
import 'package:nexus_cloud/version.dart';

void main() {
  test('kAppVersion confere com o pubspec', () {
    final line = File('pubspec.yaml').readAsLinesSync().firstWhere((l) => l.startsWith('version:'));
    final v = line.replaceFirst('version:', '').trim().split('+').first;
    expect(kAppVersion, v);
  });

  group('atualização', () {
    test('compara versões', () {
      expect(compareVersions('v0.3.1', '0.3.0'), greaterThan(0));
      expect(compareVersions('0.10.0', '0.9.9'), greaterThan(0));
      expect(compareVersions('0.3.0', 'v0.3.0'), 0);
      expect(compareVersions('abc', '0.3.0'), isNull);
    });

    test('parseRelease só aceita versão mais nova com APK https', () {
      final json = {
        'tag_name': 'v0.4.0',
        'body': 'novidades',
        'assets': [
          {'name': 'NexusCloud.apk', 'browser_download_url': 'https://github.com/x/NexusCloud.apk'},
        ],
      };
      expect(parseRelease(json, '0.3.0')?.version, '0.4.0');
      expect(parseRelease(json, '0.4.0'), isNull);
      expect(parseRelease({...json, 'draft': true}, '0.3.0'), isNull);
      expect(
        parseRelease({
          'tag_name': 'v0.4.0',
          'assets': [
            {'name': 'NexusCloud.apk', 'browser_download_url': 'http://x/a.apk'},
          ],
        }, '0.3.0'),
        isNull,
      );
    });
  });

  test('mergeHistory mantém o mais recente por jogo', () {
    final r = mergeHistory(
      [const HistoryEntry('a', 10), const HistoryEntry('b', 5)],
      [const HistoryEntry('a', 20), const HistoryEntry('c', 1)],
    );
    expect(r.map((e) => e.gameId).toList(), ['a', 'b', 'c']);
    expect(r.first.atMs, 20);
  });

  test('friendlyAuthMessage traduz login inválido', () {
    expect(friendlyAuthMessage('Invalid login credentials'), contains('incorretos'));
  });

  group('web_inject', () {
    test('boot script traz escala e fps', () {
      final s = buildBootScript(scale: 0.5, fpsCap: 30);
      expect(s, contains('0.5'));
      expect(s, contains('30'));
      expect(s, isNot(contains('__DPR__')));
      expect(s, isNot(contains('__FPS__')));
    });

    test('KeyBridge envia só o que mudou', () {
      final sent = <String>[];
      final b = KeyBridge(keysFor(WebControls.arrowsSpace), sent.add);
      b.sync({PadButton.up});
      b.sync({PadButton.up});
      expect(sent.length, 1);
      b.sync({});
      expect(sent.length, 2);
      expect(sent.last, contains('keyup'));
    });
  });

  test('isSameOrigin só aceita a página local', () {
    expect(isSameOrigin('http://127.0.0.1:38645/play?t=x', 38645), isTrue);
    expect(isSameOrigin('http://127.0.0.1:1/play', 38645), isFalse);
    expect(isSameOrigin('https://evil.com/', 38645), isFalse);
  });

  test('buildEmuHtml escapa </script> no título', () {
    final h = buildEmuHtml(core: 'nes', title: '</script><b>', romPath: '/rom/a.nes');
    expect(h, isNot(contains('</script><b>')));
  });

  test('emuCoreFor e cópia privada', () {
    expect(emuCoreFor(const ImportedFile(name: 'a.nes', size: 10)), 'nes');
    expect(emuCoreFor(const ImportedFile(name: 'a.nes', size: 0)), isNull);
    expect(emuCoreFor(const ImportedFile(name: 'a.iso', size: 10)), isNull);
    final f = ImportedFile.fromJson(const ImportedFile(name: 'a.gba', size: 5, path: '/x', copied: true).toJson());
    expect(f?.copied, isTrue);
  });
}
