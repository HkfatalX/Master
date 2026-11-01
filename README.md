# NEXUS CLOUD

**Jogue Tudo. Onde Quiser.** App Android (Flutter) que reúne seus jogos num lugar só: abre jogos e
emuladores instalados no aparelho e prepara o jogo por streaming a partir de um servidor seu.

Foco desta versão: **a parte de jogar no celular**, leve, que gira a tela (retrato e paisagem),
com controles virtuais por plataforma e suporte a controle Bluetooth.

## Estado (resumo)

| Função | Estado |
|---|---|
| Início, biblioteca, favoritos, perfil, configurações | Pronto (dados salvos no aparelho) |
| Player que gira (retrato/paisagem), controle virtual, vibração | Pronto |
| Layouts PlayStation, Xbox, Nintendo, PSP e genérico | Pronto |
| Controle Bluetooth (botões e direcional) | Pronto; analógicos físicos pendentes |
| Abrir jogos Android e emuladores instalados | Pronto (pacotes ainda não testados em aparelho) |
| Conexão segura (wss://), latência medida, reconexão | Pronto, testado só em código; falta servidor real |
| Mecanismo de execução, Central de Jogos (importar arquivos), Plataformas (abrir app/site oficial) | Pronto; sem login de conta |
| Vídeo por streaming (WebRTC) | **Pendente** |
| Login e catálogo na nuvem (Supabase) | **Pendente** (esquema em `database/`) |
| Painel administrativo | **Pendente** |

Detalhes e limites reais: [`docs/STATUS.md`](docs/STATUS.md).

## Baixar o APK

Aba **Releases** → `latest` → `NexusCloud.apk` (não precisa de login). O APK é assinado com a chave de debug
do GitHub, que muda a cada build: para atualizar, desinstale a versão anterior antes.

## Custo

R$ 0. O app roda sem servidor: jogos web dentro do app, jogos Android e emuladores instalados. Provedores de
nuvem são de terceiros e alguns são pagos (marcado em cada card). Nada é cobrado pelo NEXUS.

## Compilar

O GitHub Actions compila sozinho a cada alteração em `app/` (aba **Actions** → artefatos
`nexus-cloud-debug-apk` e `nexus-cloud-release-apk`). O release usa a chave de debug
(assinatura própria ainda pendente).

Localmente (precisa de Flutter e Android SDK):

```bash
cd app
flutter create --platforms=android --project-name nexus_cloud --org com.nexuscloud .
python3 ../scripts/patch_android.py android/app/src/main/AndroidManifest.xml
flutter pub get
flutter run
```

## Estrutura

- `app/` app Flutter (`lib/player` tem o jogo, os controles e a sessão)
- `streaming/` protocolo do servidor de streaming
- `emulators/` como o app usa emuladores
- `database/` esquema SQL (Supabase)
- `docs/` status e arquitetura
- `scripts/` ajuste do manifesto Android no build
- `.github/workflows/` compilação do APK

O NEXUS não inclui jogos comerciais, BIOS nem ROMs.
