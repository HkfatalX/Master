import 'package:flutter/material.dart';

import '../player/session.dart';
import '../update/update.dart';
import '../version.dart';
import '../widgets/prefs_panel.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../util/launcher.dart';

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
  bool _checking = false;
  String? _updateText;
  Color _updateColor = NX.muted;
  UpdateInfo? _update;

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

  Future<void> _checkUpdate() async {
    setState(() {
      _checking = true;
      _update = null;
      _updateText = null;
    });
    final r = await checkForUpdate();
    if (!mounted) return;
    setState(() {
      _checking = false;
      if (!r.checked) {
        _updateText = r.error;
        _updateColor = NX.bad;
      } else if (r.info == null) {
        _updateText = 'Você já está na versão mais nova.';
        _updateColor = NX.ok;
      } else {
        _update = r.info;
        _updateText = 'Nova versão ${r.info!.version} disponível.';
        _updateColor = NX.neon;
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
              const SizedBox(height: 12),
              const Text(
                'Servidores de teste (de terceiros, públicos). Servem só para testar conexão, latência e envio de '
                'comandos. Eles NÃO transmitem vídeo nem jogos.',
                style: TextStyle(color: NX.muted, fontSize: 12, height: 1.35),
              ),
              Wrap(
                spacing: 8,
                children: [
                  for (final e in kTestServers.entries)
                    ActionChip(
                      label: Text(e.key),
                      onPressed: () => setState(() => _url.text = e.value),
                    ),
                ],
              ),
              if (_probeText != null) ...[
                const SizedBox(height: 8),
                Text(_probeText!, style: TextStyle(color: _probeColor)),
              ],
            ]),
            _section('Qualidade do streaming', [
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
            _section('Gráficos e desempenho', [GraphicsPrefs(state: s)]),
            _section('Controles', [
              ControlPrefs(state: s),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Mostrar FPS, latência e bitrate'),
                value: s.showHud,
                onChanged: s.setShowHud,
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Travar em paisagem (streaming)'),
                subtitle: const Text('Desligado: o jogo gira com o aparelho'),
                value: s.lockLandscape,
                onChanged: s.setLockLandscape,
              ),
            ]),
            _section('Atualizações', [
              Text('Versão instalada: $kAppVersion', style: const TextStyle(color: NX.text)),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: _checking ? null : _checkUpdate,
                child: Text(_checking ? 'Verificando…' : 'Verificar atualizações'),
              ),
              if (_updateText != null) ...[
                const SizedBox(height: 8),
                Text(_updateText!, style: TextStyle(color: _updateColor)),
              ],
              if (_update != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: FilledButton(
                    onPressed: () => openUrl(_update!.url),
                    child: Text('Baixar versão ${_update!.version}'),
                  ),
                ),
            ]),
            _section('Sobre esta versão', [
              const Text(
                'NEXUS CLOUD $kAppVersion\n'
                'Feito (ainda não testado em aparelho real): jogos web e emulação (NES, SNES, Game Boy, GBA, '
                'Mega Drive) dentro do app, login opcional (Supabase) com favoritos e histórico sincronizados, '
                'gráficos reduzíveis, limite de FPS, variantes de controle, aviso de atualização.\n'
                'Pendente: vídeo por streaming (WebRTC) e servidor de referência, contas Steam/Xbox, '
                'PS1/PSP/N64 dentro do app, painel administrativo.',
                style: TextStyle(color: NX.muted, fontSize: 13, height: 1.4),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}

/// Servidores públicos de terceiros para testar conexão e comandos (não transmitem vídeo).
const Map<String, String> kTestServers = {
  'Eco (echo.websocket.org)': 'wss://echo.websocket.org',
  'Eco (testingapis)': 'wss://api.testingapis.com/ws/echo',
  'SondeHub (só conexão)': 'wss://api.sondahub.com/v1/utils/ws',
};
