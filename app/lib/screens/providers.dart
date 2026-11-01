import 'package:flutter/material.dart';

import '../data/providers.dart';
import '../theme.dart';
import '../util/launcher.dart';

/// Gerenciador de provedores de Cloud Gaming: informa custo, requisitos e limites e abre o
/// app ou site oficial. Não consulta fila, não cria sessões e não simula disponibilidade.
class ProvidersScreen extends StatefulWidget {
  const ProvidersScreen({super.key});

  @override
  State<ProvidersScreen> createState() => _ProvidersScreenState();
}

class _ProvidersScreenState extends State<ProvidersScreen> {
  Map<String, bool> _installed = {};

  @override
  void initState() {
    super.initState();
    _detect();
  }

  Future<void> _detect() async {
    final out = <String, bool>{};
    for (final p in kProviders) {
      final pkg = p.androidPackage;
      if (pkg != null) out[p.name] = await isAppInstalled(pkg);
    }
    if (mounted) setState(() => _installed = out);
  }

  Widget _chip(String text, Color c) => Container(
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(
          color: c.withAlpha(40),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: c.withAlpha(140)),
        ),
        child: Text(text, style: TextStyle(color: c, fontSize: 11, fontWeight: FontWeight.w700)),
      );

  Widget _line(String k, String v) => Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Text.rich(
          TextSpan(
            children: [
              TextSpan(text: '$k: ', style: const TextStyle(color: NX.text, fontWeight: FontWeight.w700)),
              TextSpan(text: v, style: const TextStyle(color: NX.muted)),
            ],
          ),
          style: const TextStyle(fontSize: 13, height: 1.35),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Provedores de nuvem')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: NX.warn.withAlpha(30),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: NX.warn.withAlpha(120)),
            ),
            child: const Text(
              'Estes serviços são de terceiros e rodam no app oficial deles. O NEXUS não consulta fila '
              'nem disponibilidade (não há API pública para isso), não cria sessões e não mostra '
              'servidores que não existem. Planos e preços mudam: confira no site oficial. '
              'Conectar conta de provedor ainda não está implementado. O NEXUS nunca pede cartão.',
              style: TextStyle(color: NX.warn, fontSize: 13, height: 1.4),
            ),
          ),
          const SizedBox(height: 12),
          for (final p in kProviders)
            Container(
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
                  Text(
                    p.name,
                    style: const TextStyle(color: NX.text, fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      switch (p.cost) {
                        ProviderCost.free => _chip('Grátis', NX.ok),
                        ProviderCost.partial => _chip('Plano grátis limitado', NX.warn),
                        ProviderCost.paid => _chip('Pago', NX.bad),
                      },
                      if (p.needsOwnPc) _chip('Exige PC seu', NX.bad),
                    ],
                  ),
                  _line('Custo', p.costNote),
                  _line('Requisitos', p.requirements),
                  _line('Limites', p.limits),
                  if (p.androidPackage != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        _installed[p.name] == true
                            ? 'App oficial instalado neste aparelho.'
                            : 'App oficial não encontrado neste aparelho.',
                        style: TextStyle(
                          color: _installed[p.name] == true ? NX.ok : NX.muted,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    children: [
                      if (p.androidPackage != null)
                        OutlinedButton(
                          onPressed: _installed[p.name] == true
                              ? () => launchInstalledApp(p.androidPackage!)
                              : null,
                          child: const Text('Abrir app'),
                        ),
                      FilledButton(
                        onPressed: () async {
                          final messenger = ScaffoldMessenger.of(context);
                          final ok = await openUrl(p.site);
                          if (!ok) {
                            messenger.showSnackBar(
                              const SnackBar(content: Text('Não consegui abrir o site.')),
                            );
                          }
                        },
                        child: const Text('Abrir site oficial'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
