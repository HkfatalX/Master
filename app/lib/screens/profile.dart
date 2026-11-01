import 'package:flutter/material.dart';

import '../data/catalog.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../util/launcher.dart';
import 'game_detail.dart';
import 'settings.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  Future<void> _rename(BuildContext context, AppState s) async {
    final ctl = TextEditingController(text: s.userName);
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: NX.surface,
        title: const Text('Nome de usuário'),
        content: TextField(controller: ctl, maxLength: 24, autofocus: true),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancelar')),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(ctl.text),
            child: const Text('Salvar'),
          ),
        ],
      ),
    );
    ctl.dispose();
    if (name != null) s.setUserName(name);
  }

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
        children: [
          Center(
            child: Container(
              width: 92,
              height: 92,
              decoration: const BoxDecoration(shape: BoxShape.circle, gradient: NX.gradient),
              alignment: Alignment.center,
              child: Text(
                String.fromCharCode(s.userName.runes.first).toUpperCase(),
                style: const TextStyle(color: Colors.white, fontSize: 40, fontWeight: FontWeight.w800),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: TextButton.icon(
              onPressed: () => _rename(context, s),
              icon: const Icon(Icons.edit, size: 16),
              label: Text(s.userName, style: const TextStyle(fontSize: 20)),
            ),
          ),
          const Center(
            child: Text(
              'Perfil salvo só neste aparelho (login na nuvem ainda pendente)',
              textAlign: TextAlign.center,
              style: TextStyle(color: NX.muted, fontSize: 12),
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              _stat('Favoritos', '${s.favorites.length}'),
              const SizedBox(width: 12),
              _stat('Jogados', '${s.history.length}'),
            ],
          ),
          const SizedBox(height: 18),
          Container(
            decoration: BoxDecoration(
              color: NX.surface,
              borderRadius: BorderRadius.circular(16),
            ),
            child: ListTile(
              leading: const Icon(Icons.settings, color: NX.neon),
              title: const Text('Configurações'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => SettingsScreen(state: s)),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Histórico',
                  style: TextStyle(color: NX.text, fontSize: 18, fontWeight: FontWeight.w800),
                ),
              ),
              if (s.history.isNotEmpty)
                TextButton(onPressed: s.clearHistory, child: const Text('Limpar')),
            ],
          ),
          if (s.history.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text('Nada jogado ainda.', style: TextStyle(color: NX.muted)),
            ),
          for (final h in s.history)
            if (gameById(h.gameId) != null)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(gameById(h.gameId)!.platform.icon, color: NX.neon),
                title: Text(gameById(h.gameId)!.title),
                subtitle: Text(formatDate(h.atMs), style: const TextStyle(color: NX.muted)),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => GameDetailScreen(game: gameById(h.gameId)!),
                  ),
                ),
              ),
        ],
      ),
    );
  }

  Widget _stat(String label, String value) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: NX.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: NX.purple.withAlpha(40)),
          ),
          child: Column(
            children: [
              Text(
                value,
                style: const TextStyle(color: NX.text, fontSize: 24, fontWeight: FontWeight.w800),
              ),
              Text(label, style: const TextStyle(color: NX.muted)),
            ],
          ),
        ),
      );
}
