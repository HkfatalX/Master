# Status do NEXUS CLOUD (0.1.0)

Última atualização: 2026-11-01. Nada aqui foi executado em aparelho real ainda.

## Concluído (no código)
- Navegação: Início, Biblioteca, Favoritos, Perfil; pesquisa e filtro por plataforma.
- Favoritos, histórico, nome de usuário e ajustes salvos no aparelho (SharedPreferences).
- Player: gira com o aparelho; modo "travar em paisagem"; tela cheia imersiva.
- Controle virtual: botões, analógicos (multitoque), direcional com diagonais, vibração,
  transparência e tamanho ajustáveis. Layouts PlayStation, Xbox, Nintendo, PSP, genérico.
- Controle Bluetooth: botões A/B/X/Y, gatilhos, start/select e direcional entram no mesmo estado.
- Indicadores: FPS **da tela do app**, latência (ping/pong real) e bitrate (informado pelo servidor).
- Perfis Econômico / Equilibrado / Alto desempenho (valores enviados ao servidor).
- Conexão `wss://` com reconexão automática (até 5 tentativas) e teste de conexão nas Configurações.
- Abrir jogos Android e emuladores instalados pelo nome do pacote.

## Experimental / não verificado
- Pacotes Android do catálogo e dos emuladores foram escritos de memória; falta conferir em aparelho.
- Compilação: depende do GitHub Actions; o resultado do primeiro build ainda não foi conferido.

## Pendente
- **Vídeo por streaming.** Hoje a sessão remota conecta, mede latência e envia comandos, mas não
  exibe vídeo. Próximo passo: WebRTC (ou Moonlight/Sunshine) com decodificação por hardware.
- Analógicos de controles físicos (o Android os entrega por eventos que o Flutter não repassa;
  precisa de um pequeno código nativo).
- Login, catálogo e sincronização na nuvem (Supabase não foi criado; esquema em `database/schema.sql`).
- Painel administrativo web.
- Importar seus próprios arquivos para emuladores; integração direta com cada emulador.
- Assinatura própria do APK release.
- Streaming de consoles (PS3/PS4/Xbox): só desenhado, sem implementação.

## Limites reais
- Nenhum servidor é fornecido: o jogo por streaming só funciona com um servidor que você mantém.
  Hospedagem gratuita normalmente não tem GPU.
- O app não promete 60 FPS: mostra o que mede.
