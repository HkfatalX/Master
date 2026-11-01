import 'package:flutter/material.dart';

import '../data/services.dart';
import '../theme.dart';
import '../util/launcher.dart';

/// Plataformas e contas. Honesto sobre o que existe: hoje o app só abre o app ou o site oficial.
class ServicesScreen extends StatefulWidget {
  const ServicesScreen({super.key});

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  Map<String, bool> _installed = {};

  @override
  void initState() {
    super.initState();
    _detect();
  }

  Future<void> _detect() async {
    final out = <String, bool>{};
    for (final s in kServices) {
      final p = s.androidPackage;
      if (p != null) out[s.name] = await isAppInstalled(p);
    }
    if (mounted) setState(() => _installed = out);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Plataformas e contas')),
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
              'Login com conta e sincronização de biblioteca ainda não existem nesta versão. '
              'Por enquanto o NEXUS abre o app ou o site oficial de cada serviço. '
              'Ele nunca pede a senha de nenhuma conta.',
              style: TextStyle(color: NX.warn, fontSize: 13, height: 1.4),
            ),
          ),
          const SizedBox(height: 12),
          for (final s in kServices)
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
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          s.name,
                          style: const TextStyle(
                            color: NX.text,
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      const Text('Conta: não conectada', style: TextStyle(color: NX.muted, fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(s.note, style: const TextStyle(color: NX.muted, fontSize: 13)),
                  if (s.androidPackage != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        _installed[s.name] == true
                            ? 'App oficial instalado neste aparelho.'
                            : 'App oficial não encontrado neste aparelho.',
                        style: TextStyle(
                          color: _installed[s.name] == true ? NX.ok : NX.muted,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: [
                      if (s.androidPackage != null)
                        OutlinedButton(
                          onPressed: _installed[s.name] == true
                              ? () => launchInstalledApp(s.androidPackage!)
                              : null,
                          child: const Text('Abrir app'),
                        ),
                      FilledButton(
                        onPressed: () async {
                          final messenger = ScaffoldMessenger.of(context);
                          final ok = await openUrl(s.site);
                          if (!ok) {
                            messenger.showSnackBar(
                              const SnackBar(content: Text('Não consegui abrir o site.')),
                            );
                          }
                        },
                        child: const Text('Abrir site'),
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
