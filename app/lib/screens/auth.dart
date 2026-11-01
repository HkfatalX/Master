import 'package:flutter/material.dart';

import '../cloud/cloud.dart';
import '../theme.dart';

bool isValidEmail(String v) => RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v.trim());

/// Entrar ou criar conta (Supabase). Opcional: o app funciona sem conta.
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _email = TextEditingController();
  final _pass = TextEditingController();
  final _user = TextEditingController();
  bool _signup = false;
  bool _busy = false;
  bool _hide = true;
  String? _error;
  String? _info;

  @override
  void dispose() {
    _email.dispose();
    _pass.dispose();
    _user.dispose();
    super.dispose();
  }

  String? _validate() {
    if (!isValidEmail(_email.text)) return 'Digite um e-mail válido.';
    if (_pass.text.length < 6) return 'A senha precisa de pelo menos 6 caracteres.';
    if (_signup) {
      final n = _user.text.trim();
      if (n.length < 2 || n.length > 24) return 'O nome de usuário precisa ter de 2 a 24 letras.';
    }
    return null;
  }

  Future<void> _submit(CloudService cloud) async {
    final v = _validate();
    if (v != null) {
      setState(() {
        _error = v;
        _info = null;
      });
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _info = null;
    });
    final r = _signup
        ? await cloud.signUp(_email.text, _pass.text, _user.text)
        : await cloud.signIn(_email.text, _pass.text);
    if (!mounted) return;
    if (!r.ok) {
      setState(() {
        _busy = false;
        _error = r.error;
      });
      return;
    }
    if (r.needsConfirmation) {
      setState(() {
        _busy = false;
        _signup = false;
        _info = 'Conta criada! Abra o e-mail que enviamos, confirme e depois entre aqui.';
      });
      return;
    }
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final cloud = CloudScope.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(_signup ? 'Criar conta' : 'Entrar')),
      body: cloud == null || !cloud.ready
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text(
                  'Login indisponível neste momento. O app continua funcionando sem conta.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: NX.muted),
                ),
              ),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                const Text(
                  'A conta é opcional. Ela guarda seus favoritos e seu histórico na nuvem para '
                  'você recuperar em outro aparelho. A senha não fica salva no celular.',
                  style: TextStyle(color: NX.muted, fontSize: 13, height: 1.4),
                ),
                const SizedBox(height: 16),
                if (_signup) ...[
                  TextField(
                    controller: _user,
                    maxLength: 24,
                    decoration: const InputDecoration(
                      labelText: 'Nome de usuário',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 4),
                ],
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  autofillHints: const [AutofillHints.email],
                  decoration: const InputDecoration(
                    labelText: 'E-mail',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _pass,
                  obscureText: _hide,
                  autocorrect: false,
                  enableSuggestions: false,
                  onSubmitted: (_) => _busy ? null : _submit(cloud),
                  decoration: InputDecoration(
                    labelText: 'Senha',
                    border: const OutlineInputBorder(),
                    suffixIcon: IconButton(
                      tooltip: _hide ? 'Mostrar senha' : 'Esconder senha',
                      icon: Icon(_hide ? Icons.visibility : Icons.visibility_off),
                      onPressed: () => setState(() => _hide = !_hide),
                    ),
                  ),
                ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Text(_error!, style: const TextStyle(color: NX.bad)),
                  ),
                if (_info != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Text(_info!, style: const TextStyle(color: NX.ok)),
                  ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _busy ? null : () => _submit(cloud),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                    backgroundColor: NX.purple,
                  ),
                  child: _busy
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(_signup ? 'Criar conta' : 'Entrar'),
                ),
                TextButton(
                  onPressed: _busy
                      ? null
                      : () => setState(() {
                            _signup = !_signup;
                            _error = null;
                            _info = null;
                          }),
                  child: Text(_signup ? 'Já tenho conta' : 'Criar uma conta'),
                ),
              ],
            ),
    );
  }
}
