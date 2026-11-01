# Protocolo do servidor de streaming (v1, rascunho)

Transporte: WebSocket seguro (`wss://`). O app recusa `ws://`.
Mensagens de texto em JSON. O vídeo/áudio (WebRTC) ainda **não** faz parte desta versão.

## App → servidor
```json
{"t":"hello","v":1,"game":"xonotic","w":1280,"h":720,"fps":60,"kbps":6000}
{"t":"ping","ts":1730000000000}
{"t":"in","b":["south","l1"],"ls":[0.5,-0.25],"rs":[0,0]}
```
- `b`: botões pressionados, por posição física: `south east west north l1 r1 l2 r2 l3 r3
  select start home up down left right`.
- `ls`/`rs`: analógicos de -1 a 1 (y positivo = para baixo).
- `in` só é enviado quando algo muda (no máximo ~60 por segundo).

## Servidor → app
```json
{"t":"pong","ts":1730000000000}
{"t":"stats","kbps":5800}
```
- `pong` deve devolver o `ts` recebido; o app calcula a latência.
- `stats` é opcional e alimenta o indicador de bitrate.

## Pendente
Autenticação (token), negociação WebRTC (`offer`/`answer`/`ice`), ajuste adaptativo de bitrate,
encerramento explícito de sessão.
