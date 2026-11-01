import 'package:flutter_test/flutter_test.dart';
import 'package:nexus_cloud/data/catalog.dart';
import 'package:nexus_cloud/data/formats.dart';
import 'package:nexus_cloud/engine/execution.dart';

void main() {
  group('planFor', () {
    final android = gameById('supertuxkart')!;
    final pc = gameById('xonotic')!;

    test('app Android só é disponível se estiver instalado', () {
      final off = planFor(android, installed: {}, hasServer: false);
      expect(bestOption(off), isNull);
      final on = planFor(android, installed: {android.androidPackage!}, hasServer: false);
      expect(bestOption(on)?.kind, RunKind.androidApp);
    });

    test('jogo de PC exige servidor configurado', () {
      expect(bestOption(planFor(pc, installed: {}, hasServer: false)), isNull);
      expect(bestOption(planFor(pc, installed: {}, hasServer: true))?.kind, RunKind.pcStream);
    });

    test('nunca marca como disponível sem verificar', () {
      for (final g in kCatalog.where((g) => g.webUrl == null)) {
        final o = planFor(g, installed: {}, hasServer: false);
        expect(o.where((x) => x.available), isEmpty, reason: g.id);
      }
    });

    test('jogo web abre pelo navegador embutido', () {
      final web = kCatalog.where((g) => g.webUrl != null).toList();
      expect(web, isNotEmpty);
      for (final g in web) {
        expect(g.webUrl!.startsWith('https://'), isTrue, reason: g.id);
        expect(bestOption(planFor(g, installed: {}, hasServer: false))?.kind, RunKind.browser);
      }
    });
  });

  group('arquivos importados', () {
    test('extensão e status', () {
      expect(const ImportedFile(name: 'Jogo.ISO', size: 10).ext, 'iso');
      expect(statusOf(const ImportedFile(name: 'a.iso', size: 10)), FileStatus.ok);
      expect(statusOf(const ImportedFile(name: 'a.iso', size: 0)), FileStatus.empty);
      expect(statusOf(const ImportedFile(name: 'a.txt', size: 5)), FileStatus.unknownFormat);
      expect(statusOf(const ImportedFile(name: 'semextensao', size: 5)), FileStatus.unknownFormat);
    });

    test('detecta duplicados por nome e tamanho', () {
      final files = [
        const ImportedFile(name: 'A.gba', size: 100),
        const ImportedFile(name: 'a.GBA', size: 100),
        const ImportedFile(name: 'a.gba', size: 200),
      ];
      expect(duplicateKeys(files), {'a.gba|100'});
    });

    test('agrupa por sistema e guarda em JSON', () {
      final files = [
        const ImportedFile(name: 'x.gba', size: 1),
        const ImportedFile(name: 'y.nes', size: 1),
        const ImportedFile(name: 'z.xyz', size: 1),
      ];
      final g = groupBySystem(files);
      expect(g.keys, containsAll(['Game Boy Advance', 'NES', 'Outros']));
      final back = ImportedFile.fromJson(files.first.toJson());
      expect(back?.name, 'x.gba');
      expect(ImportedFile.fromJson('lixo'), isNull);
    });

    test('todo emulador citado nos formatos existe no catálogo', () {
      final names = kEmulators.map((e) => e.name).toSet();
      for (final e in kFormats.entries) {
        for (final n in e.value.emulators) {
          expect(names, contains(n), reason: '.${e.key}');
        }
      }
    });

    test('tamanho legível', () {
      expect(formatSize(512), '512 B');
      expect(formatSize(1536), '1.5 KB');
      expect(formatSize(5 * 1024 * 1024), '5.0 MB');
    });
  });
}
