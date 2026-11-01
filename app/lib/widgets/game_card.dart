import 'package:flutter/material.dart';

import '../models/game.dart';
import '../screens/game_detail.dart';
import '../state/app_state.dart';
import '../theme.dart';

class MethodBadge extends StatelessWidget {
  const MethodBadge(this.method, {super.key});

  final RunMethod method;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: method.color.withAlpha(45),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: method.color.withAlpha(150)),
      ),
      child: Text(
        method.label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(color: method.color, fontSize: 11, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class GameCard extends StatelessWidget {
  const GameCard({super.key, required this.game});

  final Game game;

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final fav = s.favorites.contains(game.id);
    return GestureDetector(
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => GameDetailScreen(game: game)),
      ),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          gradient: LinearGradient(
            colors: [game.color1, game.color2],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          border: Border.all(color: NX.purple.withAlpha(70)),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            Positioned(
              right: -12,
              top: 24,
              child: Icon(game.platform.icon, size: 96, color: Colors.white.withAlpha(25)),
            ),
            Positioned(
              top: 2,
              right: 2,
              child: InkResponse(
                onTap: () => s.toggleFavorite(game.id),
                radius: 22,
                child: Padding(
                  padding: const EdgeInsets.all(8),
                  child: Icon(
                    fav ? Icons.favorite : Icons.favorite_border,
                    size: 20,
                    color: fav ? NX.neon : Colors.white70,
                  ),
                ),
              ),
            ),
            Positioned(
              left: 12,
              right: 12,
              bottom: 12,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    game.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Flexible(flex: 3, child: MethodBadge(game.method)),
                      const SizedBox(width: 6),
                      Flexible(
                        flex: 2,
                        child: Text(
                          game.platform.label,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white70, fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class GameGrid extends StatelessWidget {
  const GameGrid({super.key, required this.games});

  final List<Game> games;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 190,
        childAspectRatio: 0.78,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: games.length,
      itemBuilder: (context, i) => GameCard(game: games[i]),
    );
  }
}
