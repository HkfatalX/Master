# Emuladores

O NEXUS **não embute** emuladores. Ele abre o app do emulador se estiver instalado
(`app/lib/data/catalog.dart`, lista `kEmulators`). Você instala o emulador e importa seus
próprios jogos/BIOS nele.

| Emulador | Sistema | Pacote usado | Verificado |
|---|---|---|---|
| PPSSPP | PSP | `org.ppsspp.ppsspp` | Não |
| DuckStation | PS1 | `com.github.stenzek.duckstation` | Não |
| Dolphin | GameCube / Wii | `org.dolphinemu.dolphinemu` | Não |
| RetroArch | vários | `com.retroarch` | Não |

Antes de integrar mais a fundo (abrir um jogo específico), conferir licença, versão para Android e
como o emulador recebe arquivos. PS3, PS4 e Xbox ficam para streaming remoto; não há emulação
local viável nesses casos.
