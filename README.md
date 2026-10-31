# MasterX

Launcher de **Minecraft Bedrock para Android** que roda o jogo dentro do próprio app: instâncias, mods nativos (`.so`),
mundos, packs, skins, servidores, contas Microsoft/Xbox, CurseForge, controles Pojav e editor de mundo.

Baseado no [LeviLauncher](https://github.com/LiteLDev/LeviLaunchroid) 1.6.0 (© LeviMC, Apache-2.0), com nova marca, ícone e canal de atualizações próprio.
Veja `masterx-android/NOTICE-MasterX.md` para o aviso de modificação.

## Baixar
Aba **Releases** deste repositório → arquivo `MasterX.apk`.

## Requisitos
Android 9+ (ARM64), Minecraft Bedrock oficial instalado da Google Play. O MasterX **não inclui o Minecraft** e não é afiliado à Mojang ou à Microsoft.

## Compilar
O GitHub Actions compila sozinho a cada alteração em `masterx-android/` (workflow `MasterX Android`).
Para ativar o CurseForge, crie o segredo `CURSEFORGE_API_KEY` em Settings → Secrets and variables → Actions.

## Estrutura
- `masterx-android/` — projeto Android (app, módulo `minecraft`, `pojav_controls`, recursos)
- `.github/workflows/masterx-android.yml` — build e publicação do APK
