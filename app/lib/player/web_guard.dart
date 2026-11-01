String _norm(String host) {
  final h = host.toLowerCase();
  return h.startsWith('www.') ? h.substring(4) : h;
}

/// Só deixa o jogo navegar dentro do próprio site (https e mesmo domínio ou subdomínio).
/// Links para outros sites são bloqueados, para o jogo não virar um navegador aberto.
bool isAllowedNavigation(String url, String baseHost) {
  if (url == 'about:blank') return true;
  final u = Uri.tryParse(url);
  if (u == null || u.scheme != 'https' || u.host.isEmpty) return false;
  final h = _norm(u.host);
  final b = _norm(baseHost);
  return h == b || h.endsWith('.$b');
}
