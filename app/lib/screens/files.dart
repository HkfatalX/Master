import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../data/catalog.dart';
import 'package:path_provider/path_provider.dart';

import '../data/formats.dart';
import '../emu/emu_screen.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../util/launcher.dart';

/// Central de Jogos: lista os arquivos que o usuário importou, identifica o formato,
/// marca inválidos e duplicados e abre o emulador associado (só o app do emulador;
/// abrir o arquivo direto no emulador ainda é pendente).
class FilesScreen extends StatelessWidget {
  const FilesScreen({super.key});

  Future<void> _pick(BuildContext context, AppState s) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final res = await FilePicker.platform.pickFiles(allowMultiple: true);
      if (res == null) return;
      final add = <ImportedFile>[];
      for (final f in res.files) {
        var path = f.path;
        var copied = false;
        final probe = ImportedFile(name: f.name, size: f.size, path: path);
        if (path != null && emuCoreFor(probe) != null && f.size <= kMaxEmuCopyBytes) {
          try {
            final dir = Directory('${(await getApplicationSupportDirectory()).path}/roms');
            await dir.create(recursive: true);
            final dest = File('${dir.path}/${DateTime.now().microsecondsSinceEpoch}_${f.name.replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '_')}');
            await File(path).copy(dest.path);
            path = dest.path;
            copied = true;
          } catch (_) {}
        }
        add.add(ImportedFile(name: f.name, size: f.size, path: path, copied: copied));
      }
      final n = s.addFiles(add);
      messenger.showSnackBar(SnackBar(content: Text('$n arquivo(s) adicionado(s).')));
    } catch (_) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Não consegui abrir o seletor de arquivos.')),
      );
    }
  }

  Widget _chip(String text, Color c) => Container(
        margin: const EdgeInsets.only(right: 6, top: 6),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(
          color: c.withAlpha(40),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: c.withAlpha(140)),
        ),
        child: Text(text, style: TextStyle(color: c, fontSize: 11, fontWeight: FontWeight.w700)),
      );

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final dups = duplicateKeys(s.files);
    final total = s.files.fold<int>(0, (a, f) => a + f.size);
    final groups = groupBySystem(s.files);
    return Scaffold(
      appBar: AppBar(title: const Text('Central de Jogos')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _pick(context, s),
        backgroundColor: NX.purple,
        icon: const Icon(Icons.add),
        label: const Text('Importar arquivos'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
        children: [
          const Text(
            'Importe arquivos que você tem direito de usar. Arquivos de console que o NEXUS '
            'sabe rodar dentro do app são copiados para a área privada dele; nada é enviado nem distribuído. BIOS e ROMs são por sua conta.',
            style: TextStyle(color: NX.muted, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _stat('Arquivos', '${s.files.length}'),
              const SizedBox(width: 12),
              _stat('Tamanho', formatSize(total)),
              const SizedBox(width: 12),
              _stat('Duplicados', '${s.files.where((f) => dups.contains(f.key)).length}'),
            ],
          ),
          if (s.files.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Center(
                child: Text(
                  'Nenhum arquivo ainda.\nToque em "Importar arquivos".',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: NX.muted),
                ),
              ),
            ),
          for (final g in groups.entries) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(0, 20, 0, 8),
              child: Text(
                g.key,
                style: const TextStyle(color: NX.text, fontSize: 16, fontWeight: FontWeight.w800),
              ),
            ),
            for (final f in g.value) _fileCard(context, s, f, dups),
          ],
        ],
      ),
    );
  }

  Widget _stat(String label, String value) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: NX.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: NX.purple.withAlpha(40)),
          ),
          child: Column(
            children: [
              Text(
                value,
                style: const TextStyle(color: NX.text, fontSize: 18, fontWeight: FontWeight.w800),
              ),
              Text(label, style: const TextStyle(color: NX.muted, fontSize: 12)),
            ],
          ),
        ),
      );

  Widget _fileCard(BuildContext context, AppState s, ImportedFile f, Set<String> dups) {
    final status = statusOf(f);
    final info = kFormats[f.ext];
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: NX.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: NX.purple.withAlpha(40)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  f.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: NX.text, fontWeight: FontWeight.w700),
                ),
              ),
              IconButton(
                tooltip: 'Remover da lista',
                onPressed: () => s.removeFile(f),
                icon: const Icon(Icons.delete_outline, color: NX.muted),
              ),
            ],
          ),
          Text(
            '${formatSize(f.size)} · .${f.ext.isEmpty ? '?' : f.ext}',
            style: const TextStyle(color: NX.muted, fontSize: 12),
          ),
          Wrap(
            children: [
              if (status == FileStatus.ok) _chip('Formato reconhecido', NX.ok),
              if (status == FileStatus.unknownFormat) _chip('Formato desconhecido', NX.warn),
              if (status == FileStatus.empty) _chip('Arquivo vazio (inválido)', NX.bad),
              if (dups.contains(f.key)) _chip('Duplicado', NX.warn),
            ],
          ),
          if (info != null) ...[
            const SizedBox(height: 8),
            Text(
              'Pode ser: ${info.systems.join(', ')}',
              style: const TextStyle(color: NX.muted, fontSize: 12),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              children: [
                if (emuCoreFor(f) != null)
                  ActionChip(
                    avatar: const Icon(Icons.play_arrow, size: 16, color: NX.neon),
                    label: const Text('Jogar no app'),
                    onPressed: () async {
                      final messenger = ScaffoldMessenger.of(context);
                      final nav = Navigator.of(context);
                      final p = f.path;
                      if (p == null || !File(p).existsSync()) {
                        messenger.showSnackBar(
                          const SnackBar(content: Text('Arquivo não encontrado. Importe de novo.')),
                        );
                        return;
                      }
                      await nav.push(MaterialPageRoute<void>(
                        builder: (_) => EmuScreen(
                          file: File(p),
                          core: emuCoreFor(f)!,
                          title: f.name,
                        ),
                      ));
                    },
                  ),
                for (final name in info.emulators)
                  ActionChip(
                    avatar: const Icon(Icons.memory, size: 16, color: NX.neon),
                    label: Text('Abrir $name'),
                    onPressed: () async {
                      final messenger = ScaffoldMessenger.of(context);
                      final emu = kEmulators.where((e) => e.name == name).toList();
                      final ok = emu.isNotEmpty && await launchInstalledApp(emu.first.package);
                      if (!ok) {
                        messenger.showSnackBar(
                          SnackBar(content: Text('$name não está instalado neste aparelho.')),
                        );
                      }
                    },
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
