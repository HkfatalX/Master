import 'package:flutter/material.dart';

import '../data/catalog.dart';
import '../models/game.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets/game_card.dart';

/// Pedido para abrir a biblioteca já filtrada (vindo da tela inicial).
class LibraryRequest {
  const LibraryRequest({this.id = 0, this.platform, this.query = ''});

  final int id;
  final GamePlatform? platform;
  final String query;
}

class LibraryScreen extends StatefulWidget {
  const LibraryScreen({super.key, required this.request});

  final LibraryRequest request;

  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen> {
  GamePlatform? _platform;
  late final TextEditingController _ctl;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _platform = widget.request.platform;
    _query = widget.request.query;
    _ctl = TextEditingController(text: _query);
  }

  @override
  void didUpdateWidget(LibraryScreen old) {
    super.didUpdateWidget(old);
    if (old.request.id != widget.request.id) {
      _platform = widget.request.platform;
      _query = widget.request.query;
      _ctl.text = _query;
    }
  }

  @override
  void dispose() {
    _ctl.dispose();
    super.dispose();
  }

  List<Game> get _filtered {
    final q = _query.trim().toLowerCase();
    return kCatalog.where((g) {
      if (_platform != null && g.platform != _platform) return false;
      if (q.isEmpty) return true;
      return g.title.toLowerCase().contains(q) || g.genre.toLowerCase().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    AppScope.of(context);
    final games = _filtered;
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Text(
              'Biblioteca',
              style: TextStyle(color: NX.text, fontSize: 24, fontWeight: FontWeight.w800),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: _ctl,
              onChanged: (v) => setState(() => _query = v),
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
          ),
          SizedBox(
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: [
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: const Text('Todos'),
                    selected: _platform == null,
                    onSelected: (_) => setState(() => _platform = null),
                  ),
                ),
                for (final p in GamePlatform.values)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(p.label),
                      selected: _platform == p,
                      onSelected: (_) => setState(() => _platform = p),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: games.isEmpty
                ? const _Empty(
                    'Nenhum jogo aqui ainda.\n'
                    'Jogos de consoles só aparecem quando você importar os seus próprios arquivos '
                    '(função pendente) ou tiver um servidor de streaming.',
                  )
                : GameGrid(games: games),
          ),
        ],
      ),
    );
  }
}

class FavoritesScreen extends StatelessWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final games = kCatalog.where((g) => s.favorites.contains(g.id)).toList();
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Text(
              'Favoritos',
              style: TextStyle(color: NX.text, fontSize: 24, fontWeight: FontWeight.w800),
            ),
          ),
          Expanded(
            child: games.isEmpty
                ? const _Empty('Toque no coração de um jogo para favoritar.')
                : GameGrid(games: games),
          ),
        ],
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: const TextStyle(color: NX.muted, height: 1.4),
        ),
      ),
    );
  }
}
