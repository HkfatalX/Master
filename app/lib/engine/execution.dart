import '../models/game.dart';

/// Formas de executar um jogo, na ordem de preferência.
enum RunKind { androidApp, emulator, pcStream, officialApp, browser }

extension RunKindX on RunKind {
  String get label => switch (this) {
        RunKind.androidApp => 'Aplicativo Android instalado',
        RunKind.emulator => 'Emulador local',
        RunKind.pcStream => 'Streaming de PC remoto',
        RunKind.officialApp => 'Aplicativo oficial da plataforma',
        RunKind.browser => 'Navegador',
      };
}

/// Uma opção de execução e se ela está realmente disponível agora.
class RunOption {
  const RunOption(this.kind, this.available, this.reason);

  final RunKind kind;
  final bool available;

  /// Explica por que está (ou não) disponível.
  final String reason;
}

/// Monta a lista de opções para um jogo do catálogo.
/// [installed] são os pacotes Android detectados no aparelho; [hasServer] diz se há servidor salvo.
/// Nunca marca como disponível algo que não foi verificado.
List<RunOption> planFor(
  Game game, {
  required Set<String> installed,
  required bool hasServer,
}) {
  final out = <RunOption>[];
  final pkg = game.androidPackage;
  if (pkg != null) {
    final ok = installed.contains(pkg);
    out.add(RunOption(
      RunKind.androidApp,
      ok,
      ok ? 'Instalado neste aparelho.' : 'Não instalado neste aparelho.',
    ));
  }
  if (game.method == RunMethod.streaming) {
    out.add(RunOption(
      RunKind.pcStream,
      hasServer,
      hasServer
          ? 'Servidor configurado (a disponibilidade é checada ao conectar).'
          : 'Nenhum servidor configurado em Configurações.',
    ));
  }
  if (game.method == RunMethod.unavailable) {
    out.add(const RunOption(RunKind.pcStream, false, 'Este jogo está marcado como indisponível.'));
  }
  return out;
}

/// A melhor opção disponível, ou null se nenhuma funciona agora.
RunOption? bestOption(List<RunOption> options) {
  for (final o in options) {
    if (o.available) return o;
  }
  return null;
}
