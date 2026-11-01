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

## Adicionado na etapa 2
- **Mecanismo de execução** (`app/lib/engine/execution.dart`): lista as formas de executar cada jogo e só marca
  como disponível o que foi verificado (app instalado, servidor configurado). Coberto por testes.
- **Central de Jogos**: importar arquivos próprios, identificar formato por extensão, marcar vazios/desconhecidos
  e duplicados, agrupar por sistema, ver tamanho total e abrir o app do emulador associado.
  Limite: abre só o app do emulador, não o arquivo escolhido.
- **Plataformas e contas**: abre o app ou o site oficial de Steam, Xbox, PlayStation, Epic, Roblox, Nintendo,
  GOG, Ubisoft, EA, Battle.net e itch.io. **Não há login nem sincronização de biblioteca.**

## Adicionado na etapa 3 (custo zero)
- **Jogos dentro do app**: navegador embutido (WebView) abre jogos web gratuitos (Lichess, 2048, Hextris,
  A Dark Room, OpenFront, Jstris, Cookie Clicker). Sem servidor, sem custo. Só navega no próprio site do jogo;
  links externos são bloqueados. Precisa de internet. Endereços escolhidos de memória; não abertos em aparelho.
- **Provedores de nuvem**: informa custo, requisitos e limites de GeForce NOW, Xbox Cloud Gaming e Steam Link e
  abre o app/site oficial. Não consulta fila, não cria sessão, não simula disponibilidade. Conectar conta: pendente.
- **Roblox**: abre o app oficial.
- **APK sem login**: o build publica `NexusCloud.apk` na aba Releases (tag `latest`).
- O app não depende de nenhum servidor próprio. Streaming próprio continua **não funcional** (sem vídeo).

## Experimental / não verificado
- Pacotes Android do catálogo e dos emuladores foram escritos de memória; falta conferir em aparelho.
- Compilação: depende do GitHub Actions; o resultado do primeiro build ainda não foi conferido.

## Pendente
- **Vídeo por streaming.** Hoje a sessão remota conecta, mede latência e envia comandos, mas não
  exibe vídeo. Próximo passo: WebRTC (ou Moonlight/Sunshine) com decodificação por hardware.
- Analógicos de controles físicos (o Android os entrega por eventos que o Flutter não repassa;
  precisa de um pequeno código nativo).
- Contas (OAuth Steam/Microsoft) e biblioteca universal sincronizada: exigem backend para o login; não feito.
- Login, catálogo e sincronização na nuvem (Supabase não foi criado; esquema em `database/schema.sql`).
- Painel administrativo web.
- Importar seus próprios arquivos para emuladores; integração direta com cada emulador.
- Assinatura própria do APK release.
- Streaming de consoles (PS3/PS4/Xbox): só desenhado, sem implementação.

## Limites reais
- Nenhum servidor é fornecido: o jogo por streaming só funciona com um servidor que você mantém.
  Hospedagem gratuita normalmente não tem GPU.
- O app não promete 60 FPS: mostra o que mede.
