import 'package:flutter/material.dart';

import '../models/game.dart';
import '../state/app_state.dart';
import '../theme.dart';

Widget _label(String t) => Padding(
      padding: const EdgeInsets.only(top: 6, bottom: 4),
      child: Text(t, style: const TextStyle(color: NX.text, fontWeight: FontWeight.w700)),
    );

Widget _note(String t) => Padding(
      padding: const EdgeInsets.only(top: 4, bottom: 6),
      child: Text(t, style: const TextStyle(color: NX.muted, fontSize: 12, height: 1.35)),
    );

/// Qualidade gráfica e limite de FPS dos jogos web.
class GraphicsPrefs extends StatelessWidget {
  const GraphicsPrefs({super.key, required this.state, this.onApply});

  final AppState state;

  /// Quando informado (dentro do jogo), mostra o botão para recarregar e aplicar a qualidade.
  final VoidCallback? onApply;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: state,
      builder: (context, _) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _label('Qualidade gráfica'),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final q in GfxQuality.values)
                ChoiceChip(
                  label: Text(q.label),
                  selected: state.gfx == q,
                  onSelected: (_) => state.setGfx(q),
                ),
            ],
          ),
          _note(
            'Reduz a resolução interna dos jogos web (menos pixels, mais leve). Vale ao abrir o '
            'jogo e pode não ter efeito em todos.',
          ),
          if (onApply != null)
            Align(
              alignment: Alignment.centerLeft,
              child: OutlinedButton.icon(
                onPressed: onApply,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Recarregar para aplicar'),
              ),
            ),
          _label('Limite de FPS'),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final f in kFpsCaps)
                ChoiceChip(
                  label: Text(fpsCapLabel(f)),
                  selected: state.fpsCap == f,
                  onSelected: (_) => state.setFpsCap(f),
                ),
            ],
          ),
          _note(
            'Limita os quadros por segundo dos jogos web para gastar menos bateria e esquentar menos. '
            'Vale na hora. Emuladores rodam na velocidade original do console; o limite não se aplica a eles.',
          ),
        ],
      ),
    );
  }
}

/// Esquema de teclas, estilo dos botões, tamanho e transparência.
class ControlPrefs extends StatelessWidget {
  const ControlPrefs({super.key, required this.state});

  final AppState state;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: state,
      builder: (context, _) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _label('Controles dos jogos web'),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final w in WebControls.values)
                ChoiceChip(
                  label: Text(w.label),
                  selected: state.webControls == w,
                  onSelected: (_) => state.setWebControls(w),
                ),
            ],
          ),
          _note(
            'Mostra botões na tela que apertam teclas no jogo. Deixe desligado nos jogos de toque '
            '(2048, Xadrez).',
          ),
          _label('Estilo dos botões'),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              ChoiceChip(
                label: const Text('Automático'),
                selected: state.padStyle < 0,
                onSelected: (_) => state.setPadStyle(-1),
              ),
              for (final f in PadFamily.values)
                ChoiceChip(
                  label: Text(f.label),
                  selected: state.padStyle == f.index,
                  onSelected: (_) => state.setPadStyle(f.index),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Transparência: ${(state.padOpacity * 100).round()}%',
            style: const TextStyle(color: NX.muted),
          ),
          Slider(
            value: state.padOpacity,
            min: 0.3,
            max: 1.0,
            onChanged: state.setPadOpacity,
          ),
          Text(
            'Tamanho: ${(state.padScale * 100).round()}%',
            style: const TextStyle(color: NX.muted),
          ),
          Slider(
            value: state.padScale,
            min: 0.7,
            max: 1.4,
            onChanged: state.setPadScale,
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Vibração nos botões'),
            value: state.haptics,
            onChanged: state.setHaptics,
          ),
        ],
      ),
    );
  }
}
