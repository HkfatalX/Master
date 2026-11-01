import 'package:flutter/material.dart';

import '../models/game.dart';
import '../player/player_screen.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../util/launcher.dart';
import '../widgets/game_card.dart';
import 'settings.dart';

class GameDetailScreen extends StatelessWidget {
  const GameDetailScreen({super.key, required this.game});

  final Game game;

  Future<void> _play(BuildContext context, AppState s) async {
    final messenger = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);
    if (game.method == RunMethod.local && game.androidPackage != null) {
      final ok = await launchInstalledApp(game.androidPackage!);
      if (ok) {
        s.addHistory(game.id);
      } else {
        messenger.showSnackBar(
          SnackBar(content: Text('Não consegui abrir ${game.title}. Ele está instalado neste aparelho?')),
        );
      }
      return;
    }
    if (!s.hasServer) {
      if (!context.mounted) return;
      final choice = await showDialog<String>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: NX.surface,
          title: const Text('Nenhum servidor configurado'),
          content: const Text(
            'Este jogo roda por streaming e precisa de um servidor seu. '
            'Você pode configurar o endereço agora ou só testar os controles.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop('test'),
              child: const Text('Testar controles'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(ctx).pop('settings'),
              child: const Text('Configurar servidor'),
            ),
          ],
        ),
      );
      if (choice == 'settings') {
        nav.push(MaterialPageRoute<void>(builder: (_) => SettingsScreen(state: s)));
      } else if (choice == 'test') {
        nav.push(MaterialPageRoute<void>(
          builder: (_) => PlayerScreen(game: game, state: s, useServer: false),
        ));
      }
      return;
    }
    nav.push(MaterialPageRoute<void>(builder: (_) => PlayerScreen(game: game, state: s)));
  }

  Widget _row(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(width: 118, child: Text(k, style: const TextStyle(color: NX.muted))),
            Expanded(child: Text(v, style: const TextStyle(color: NX.text))),
          ],
        ),
      );

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final fav = s.favorites.contains(game.id);
    final local = game.method == RunMethod.local;
    final String availability;
    final Color availColor;
    if (local) {
      availability = 'Abre o app instalado neste aparelho (${game.androidPackage}).';
      availColor = NX.ok;
    } else if (s.hasServer) {
      availability = 'Servidor configurado. A disponibilidade é checada ao conectar.';
      availColor = NX.blue;
    } else {
      availability = 'Indisponível agora: nenhum servidor configurado.';
      availColor = NX.warn;
    }
    return Scaffold(
      appBar: AppBar(
        title: Text(game.title),
        actions: [
          IconButton(
            tooltip: fav ? 'Remover dos favoritos' : 'Favoritar',
            onPressed: () => s.toggleFavorite(game.id),
            icon: Icon(fav ? Icons.favorite : Icons.favorite_border,
                color: fav ? NX.neon : NX.text),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          Container(
            height: 170,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: LinearGradient(
                colors: [game.color1, game.color2],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              border: Border.all(color: NX.purple.withAlpha(80)),
            ),
            child: Center(
              child: Icon(game.platform.icon, size: 80, color: Colors.white.withAlpha(60)),
            ),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              MethodBadge(game.method),
              Chip(label: Text(game.platform.label)),
              Chip(label: Text(game.genre)),
            ],
          ),
          const SizedBox(height: 10),
          Text(game.description, style: const TextStyle(color: NX.text, fontSize: 15)),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: availColor.withAlpha(30),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: availColor.withAlpha(120)),
            ),
            child: Text(availability, style: TextStyle(color: availColor)),
          ),
          const SizedBox(height: 18),
          const Text(
            'Informações técnicas',
            style: TextStyle(color: NX.text, fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          _row('Plataforma', game.platform.label),
          _row('Método', game.method.label),
          _row('Controle virtual', game.pad.label),
          _row('Qualidade atual', '${s.profile.label} (${s.profile.height}p, ${s.profile.fps} FPS alvo)'),
          _row('Requisitos', game.requirements),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: FilledButton.icon(
            onPressed: () => _play(context, s),
            icon: Icon(local ? Icons.open_in_new : Icons.play_arrow),
            label: Text(local ? 'Abrir jogo' : 'Jogar por streaming'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
              backgroundColor: NX.purple,
            ),
          ),
        ),
      ),
    );
  }
}
