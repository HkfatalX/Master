enum ProviderCost { free, partial, paid }

/// Provedor externo de Cloud Gaming. O NEXUS só informa e abre o app/site oficial:
/// não consulta fila nem disponibilidade (nenhum deles oferece API pública para isso) e não simula sessões.
class CloudProvider {
  const CloudProvider({
    required this.name,
    required this.site,
    this.androidPackage,
    required this.cost,
    required this.costNote,
    required this.requirements,
    required this.limits,
    this.needsOwnPc = false,
  });

  final String name;
  final String site;
  final String? androidPackage;
  final ProviderCost cost;
  final String costNote;
  final String requirements;
  final String limits;

  /// O serviço depende de um PC do próprio usuário ligado.
  final bool needsOwnPc;
}

/// Dados conforme conhecidos; planos e preços mudam, por isso cada card manda conferir no site oficial.
const List<CloudProvider> kProviders = [
  CloudProvider(
    name: 'NVIDIA GeForce NOW',
    site: 'https://www.nvidia.com/geforce-now/',
    androidPackage: 'com.nvidia.geforcenow',
    cost: ProviderCost.partial,
    costNote: 'Existe plano gratuito com sessões limitadas e fila de espera; planos pagos reduzem os limites.',
    requirements: 'Conta NVIDIA e jogos que você já tenha em lojas compatíveis (por exemplo Steam ou Epic).',
    limits: 'Fila e tempo de sessão no plano gratuito. Disponibilidade varia por região.',
  ),
  CloudProvider(
    name: 'Xbox Cloud Gaming',
    site: 'https://www.xbox.com/play',
    androidPackage: 'com.microsoft.xboxone.smartglass',
    cost: ProviderCost.paid,
    costNote: 'Exige assinatura paga do Xbox Game Pass.',
    requirements: 'Conta Microsoft com assinatura ativa.',
    limits: 'Catálogo e disponibilidade variam por país.',
  ),
  CloudProvider(
    name: 'Steam Link',
    site: 'https://store.steampowered.com/remoteplay',
    androidPackage: 'com.valvesoftware.steamlink',
    cost: ProviderCost.free,
    costNote: 'O app é gratuito.',
    requirements: 'Um PC seu ligado, com Steam, na mesma rede ou acessível pela internet.',
    limits: 'Não serve sem um PC seu.',
    needsOwnPc: true,
  ),
];
