import 'package:flutter/material.dart';

import '../player/session.dart';
import '../state/app_state.dart';
import '../theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key, required this.state});

  final AppState state;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final TextEditingController _url;
  String? _error;
  String? _probeText;
  Color _probeColor = NX.muted;
  bool _probing = false;

  @override
  void initState() {
    super.initState();
    _url = TextEditingController(text: widget.state.serverUrl);
  }

  @override
  void dispose() {
    _url.dispose();
    super.dispose();
  }

  void _save() {
    final err = widget.state.setServerUrl(_url.text);
    setState(() {
      _error = err;
      if (err == null) {
        _probeText = _url.text.trim().isEmpty ? 'Servidor removido.' : 'Endereço salvo.';
        _probeColor = NX.muted;
      }
    });
  }

  Future<void> _probe() async {
    final text = _url.text.trim();
    final err = AppState.validateServerUrl(text);
    if (text.isEmpty || err != null) {
      setState(() {
        _error = err ?? 'Digite o endereço do servidor.';
      });
      return;
    }
    setState(() {
      _error = null;
      _probing = true;
      _probeText = 'Testando…';
      _probeColor = NX.muted;
    });
    final ms = await probeServer(text);
    if (!mounted) return;
    setState(() {
      _probing = false;
      if (ms == null) {
        _probeText = 'Sem resposta. O servidor está ligado e acessível?';
        _probeColor = NX.bad;
      } else {
        _probeText = 'Conectou em $ms ms.';
        _probeColor = NX.ok;
      }
    });
  }

  Widget _section(String title, List<Widget> children) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: NX.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: NX.purple.withAlpha(40)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(color: NX.text, fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          ...children,
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.state;
    return Scaffold(
      appBar: AppBar(title: const Text('Configurações')),
      body: ListenableBuilder(
        listenable: s,
        builder: (context, _) => ListView(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
          children: [
            _section('Servidor de streaming', [
              const Text(
                'Endereço do seu servidor (começa com wss://). O app não aceita conexão sem criptografia.',
                style: TextStyle(color: NX.muted, fontSize: 13),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _url,
                keyboardType: TextInputType.url,
                autocorrect: false,
                decoration: InputDecoration(
                  hintText: 'wss://meu-servidor.exemplo/sessao',
                  errorText: _error,
                  border: const OutlineInputBorder(),
                ),
                onSubmitted: (_) => _save(),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  FilledButton(onPressed: _save, child: const Text('Salvar')),
                  const SizedBox(width: 10),
                  OutlinedButton(
                    onPressed: _probing ? null : _probe,
                    child: const Text('Testar conexão'),
                  ),
                ],
              ),
              if (_probeText != null) ...[
                const SizedBox(height: 8),
                Text(_probeText!, style: TextStyle(color: _probeColor)),
              ],
            ]),
            _section('Qualidade', [
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  for (final p in QualityProfile.values)
                    ChoiceChip(
                      label: Text('${p.label} · ${p.height}p'),
                      selected: s.profile == p,
                      onSelected: (_) => s.setProfile(p),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '${s.profile.width}x${s.profile.height}, ${s.profile.fps} FPS alvo, '
                '${(s.profile.bitrateKbps / 1000).toStringAsFixed(1)} Mbps alvo. '
                'Valores enviados ao servidor; o desempenho real é medido e mostrado no jogo.',
                style: const TextStyle(color: NX.muted, fontSize: 13),
              ),
            ]),
            _section('Controles', [
              Text(
                'Transparência: ${(s.padOpacity * 100).round()}%',
                style: const TextStyle(color: NX.muted),
              ),
              Slider(value: s.padOpacity, min: 0.3, max: 1.0, onChanged: s.setPadOpacity),
              Text(
                'Tamanho: ${(s.padScale * 100).round()}%',
                style: const TextStyle(color: NX.muted),
              ),
              Slider(value: s.padScale, min: 0.7, max: 1.4, onChanged: s.setPadScale),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Vibração nos botões'),
                value: s.haptics,
                onChanged: s.setHaptics,
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Mostrar FPS, latência e bitrate'),
                value: s.showHud,
                onChanged: s.setShowHud,
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Travar em paisagem'),
                subtitle: const Text('Desligado: o jogo gira com o aparelho'),
                value: s.lockLandscape,
                onChanged: s.setLockLandscape,
              ),
            ]),
            _section('Sobre esta versão', [
              const Text(
                'NEXUS CLOUD 0.1.0 (MVP)\n'
                'Pronto: biblioteca, favoritos, histórico, controles virtuais, controles Bluetooth (botões), '
                'abrir jogos Android e emuladores instalados, conexão segura com servidor, latência medida.\n'
                'Pendente: vídeo por streaming (WebRTC), login/nuvem (Supabase), painel administrativo, '
                'analógicos de controles físicos, importar seus próprios arquivos.',
                style: TextStyle(color: NX.muted, fontSize: 13, height: 1.4),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}
