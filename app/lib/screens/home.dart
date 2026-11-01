import 'package:flutter/material.dart';

import '../data/catalog.dart';
import '../models/game.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../util/launcher.dart';
import '../widgets/game_card.dart';
import 'files.dart';
import 'services.dart';
import 'settings.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.onSearch, required this.onPlatform});

  final void Function(String query) onSearch;
  final void Function(GamePlatform platform) onPlatform;

  Widget _title(String text) => Padding(
        padding: const EdgeInsets.fromLTRB(0, 22, 0, 10),
        child: Text(
          text,
          style: const TextStyle(color: NX.text, fontSize: 18, fontWeight: FontWeight.w800),
        ),
      );

  Widget _row(List<Game> games) => SizedBox(
        height: 190,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: games.length,
          separatorBuilder: (_, __) => const SizedBox(width: 12),
          itemBuilder: (_, i) => SizedBox(width: 144, child: GameCard(game: games[i])),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final recent = s.recentGames;
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: const BoxDecoration(shape: BoxShape.circle, gradient: NX.gradient),
                child: const Icon(Icons.cloud, color: Colors.white),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ShaderMask(
                      shaderCallback: (r) => NX.gradient.createShader(r),
                      child: const Text(
                        'NEXUS CLOUD',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                    const Text(
                      'Jogue Tudo. Onde Quiser.',
                      style: TextStyle(color: NX.muted, fontSize: 12),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Configurações',
                icon: const Icon(Icons.settings_outlined, color: NX.text),
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => SettingsScreen(state: s)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          TextField(
            onSubmitted: onSearch,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: 'Pesquisar jogos…',
              prefixIcon: const Icon(Icons.search),
              filled: true,
              fillColor: NX.surface,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _Shortcut(
                  icon: Icons.folder_open,
                  title: 'Central de Jogos',
                  subtitle: 'Importar arquivos',
                  page: const FilesScreen(),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _Shortcut(
                  icon: Icons.hub_outlined,
                  title: 'Plataformas',
                  subtitle: 'Steam, Xbox e mais',
                  page: const ServicesScreen(),
                ),
              ),
            ],
          ),
          if (recent.isNotEmpty) ...[
            _title('Continuar jogando'),
            _row(recent.take(8).toList()),
          ],
          _title('Destaques'),
          _row(kCatalog),
          _title('Plataformas'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final p in GamePlatform.values)
                ActionChip(
                  avatar: Icon(p.icon, size: 18, color: NX.neon),
                  label: Text(p.label),
                  onPressed: () => onPlatform(p),
                ),
            ],
          ),
          _title('Emuladores neste aparelho'),
          const Text(
            'O NEXUS abre o emulador se ele estiver instalado. Você mesmo instala o emulador '
            'e importa seus jogos nele.',
            style: TextStyle(color: NX.muted, fontSize: 13),
          ),
          const SizedBox(height: 8),
          for (final e in kEmulators) _EmulatorTile(emulator: e),
        ],
      ),
    );
  }
}

class _EmulatorTile extends StatelessWidget {
  const _EmulatorTile({required this.emulator});

  final Emulator emulator;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: NX.surface,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: NX.purple.withAlpha(40)),
        ),
        child: ListTile(
          leading: const Icon(Icons.memory, color: NX.neon),
          title: Text(emulator.name),
          subtitle: Text(emulator.systems, style: const TextStyle(color: NX.muted)),
          trailing: const Icon(Icons.open_in_new, size: 18, color: NX.muted),
          onTap: () async {
            final messenger = ScaffoldMessenger.of(context);
            final ok = await launchInstalledApp(emulator.package);
            if (!ok) {
              messenger.showSnackBar(
                SnackBar(content: Text('${emulator.name} não está instalado neste aparelho.')),
              );
            }
          },
        ),
      ),
    );
  }
}

class _Shortcut extends StatelessWidget {
  const _Shortcut({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.page,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Widget page;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: NX.surface,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: NX.purple.withAlpha(60)),
      ),
      child: InkWell(
        onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page)),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: NX.neon),
              const SizedBox(height: 8),
              Text(title, style: const TextStyle(color: NX.text, fontWeight: FontWeight.w800)),
              Text(subtitle, style: const TextStyle(color: NX.muted, fontSize: 12)),
            ],
          ),
        ),
      ),
    );
  }
}
