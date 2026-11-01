/// Arquivo que o usuário importou (só metadados; o NEXUS não copia nem distribui jogos).
class ImportedFile {
  const ImportedFile({
    required this.name,
    required this.size,
    this.path,
    this.copied = false,
  });

  final String name;
  final int size;
  final String? path;

  /// true quando o arquivo tem uma cópia privada no armazenamento do app (para jogar dentro do app).
  final bool copied;

  String get ext {
    final i = name.lastIndexOf('.');
    if (i < 0 || i == name.length - 1) return '';
    return name.substring(i + 1).toLowerCase();
  }

  /// Chave para detectar duplicados: mesmo nome e mesmo tamanho.
  String get key => '${name.toLowerCase()}|$size';

  Map<String, dynamic> toJson() => {'n': name, 's': size, 'p': path, 'c': copied};

  static ImportedFile? fromJson(Object? j) {
    if (j is! Map) return null;
    final n = j['n'];
    final s = j['s'];
    if (n is! String || s is! int) return null;
    final p = j['p'];
    return ImportedFile(
      name: n,
      size: s,
      path: p is String ? p : null,
      copied: j['c'] == true,
    );
  }
}

/// O que sabemos sobre uma extensão: sistemas possíveis e emuladores que costumam abri-la.
class FormatInfo {
  const FormatInfo(this.systems, this.emulators);

  final List<String> systems;

  /// Nomes iguais aos de `kEmulators`.
  final List<String> emulators;
}

const Map<String, FormatInfo> kFormats = {
  'iso': FormatInfo(['PSP', 'PS1', 'PS2', 'GameCube', 'Wii'], ['PPSSPP', 'DuckStation', 'Dolphin', 'RetroArch']),
  'cso': FormatInfo(['PSP'], ['PPSSPP']),
  'pbp': FormatInfo(['PSP', 'PS1'], ['PPSSPP', 'DuckStation']),
  'cue': FormatInfo(['PS1'], ['DuckStation', 'RetroArch']),
  'bin': FormatInfo(['PS1'], ['DuckStation', 'RetroArch']),
  'chd': FormatInfo(['PS1', 'PS2'], ['DuckStation', 'RetroArch']),
  'gcm': FormatInfo(['GameCube'], ['Dolphin']),
  'gcz': FormatInfo(['GameCube', 'Wii'], ['Dolphin']),
  'rvz': FormatInfo(['GameCube', 'Wii'], ['Dolphin']),
  'wbfs': FormatInfo(['Wii'], ['Dolphin']),
  'nes': FormatInfo(['NES'], ['RetroArch']),
  'sfc': FormatInfo(['SNES'], ['RetroArch']),
  'smc': FormatInfo(['SNES'], ['RetroArch']),
  'gb': FormatInfo(['Game Boy'], ['RetroArch']),
  'gbc': FormatInfo(['Game Boy Color'], ['RetroArch']),
  'gba': FormatInfo(['Game Boy Advance'], ['RetroArch']),
  'nds': FormatInfo(['Nintendo DS'], ['RetroArch']),
  'n64': FormatInfo(['Nintendo 64'], ['RetroArch']),
  'z64': FormatInfo(['Nintendo 64'], ['RetroArch']),
  'v64': FormatInfo(['Nintendo 64'], ['RetroArch']),
  'md': FormatInfo(['Mega Drive'], ['RetroArch']),
  'gen': FormatInfo(['Mega Drive'], ['RetroArch']),
  'smd': FormatInfo(['Mega Drive'], ['RetroArch']),
};

/// Extensões que o NEXUS roda dentro do app (EmulatorJS) e o núcleo usado.
const Map<String, String> kEmuCores = {
  'nes': 'nes',
  'sfc': 'snes',
  'smc': 'snes',
  'gb': 'gb',
  'gbc': 'gb',
  'gba': 'gba',
  'md': 'segaMD',
  'gen': 'segaMD',
  'smd': 'segaMD',
};

/// Núcleo para jogar dentro do app, ou null se o formato não for suportado (ou o arquivo for inválido).
String? emuCoreFor(ImportedFile f) {
  if (f.size <= 0) return null;
  return kEmuCores[f.ext];
}

/// Tamanho máximo para guardar uma cópia privada (evita encher o armazenamento).
const int kMaxEmuCopyBytes = 64 * 1024 * 1024;

enum FileStatus { ok, unknownFormat, empty }

FileStatus statusOf(ImportedFile f) {
  if (f.size <= 0) return FileStatus.empty;
  if (!kFormats.containsKey(f.ext)) return FileStatus.unknownFormat;
  return FileStatus.ok;
}

/// Chaves que aparecem mais de uma vez na lista.
Set<String> duplicateKeys(List<ImportedFile> files) {
  final count = <String, int>{};
  for (final f in files) {
    count[f.key] = (count[f.key] ?? 0) + 1;
  }
  return {
    for (final e in count.entries)
      if (e.value > 1) e.key,
  };
}

/// Agrupa por sistema principal (o primeiro da lista da extensão); desconhecidos vão para "Outros".
Map<String, List<ImportedFile>> groupBySystem(List<ImportedFile> files) {
  final out = <String, List<ImportedFile>>{};
  for (final f in files) {
    final info = kFormats[f.ext];
    final k = info == null ? 'Outros' : info.systems.join(' / ');
    out.putIfAbsent(k, () => <ImportedFile>[]).add(f);
  }
  return out;
}

String formatSize(int bytes) {
  if (bytes < 1024) return '$bytes B';
  const units = ['KB', 'MB', 'GB'];
  var v = bytes / 1024;
  var i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return '${v.toStringAsFixed(v >= 100 ? 0 : 1)} ${units[i]}';
}
