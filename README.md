# ⛏️ CraftForge

**Criador de addons, mods, mobs, blocos, itens e mundos para Minecraft Bedrock — direto no navegador, sem escrever uma linha de código.**

O CraftForge é uma alternativa web ao Addons Maker: você monta o conteúdo por formulário, vê o JSON gerado em tempo real, valida antes de exportar e baixa um `.mcaddon` que abre direto no Minecraft.

> Ferramenta independente de fãs. **Não é afiliada à Mojang ou Microsoft.** Minecraft é marca registrada da Mojang AB.

---

## Versões do Minecraft (atualizado em 17/10/2026)

| Edição | Versão | Lançamento | Observação |
| --- | --- | --- | --- |
| **Bedrock (estável)** | **1.26.52** (26.52) | 25/09/2026 | Hotfix do Wilderness Bound — alvo padrão de todo projeto novo |
| Java (estável) | 26.3 | 15/09/2026 | Mesma linha de atualização |
| Bedrock Preview | 1.26.60.28 | 22/09/2026 | Instável — não use em addons publicados |

Formatos usados dentro dos arquivos gerados:

- itens e blocos → `format_version` **1.26.50**
- entidades → `format_version` **1.26.40**
- manifest → `format_version` **2**, `min_engine_version` **[1, 26, 52]**

> Regra importante respeitada pelo gerador: a partir de `1.26.30`, todo item precisa de **ao menos um componente** em `minecraft:item.components`, senão o registro falha com content error. O CraftForge garante isso sempre.

### Atualizar as versões sem fazer deploy

As versões não estão travadas no código: existe um **painel de administração** em `/admin` que grava os valores no datastore e passa a valer imediatamente para a home, o header, a API e todos os projetos novos.

- Defina `CRAFTFORGE_ADMIN_EMAIL` antes de criar a conta (ou no login — a promoção acontece automaticamente).
- Acesse `/admin`, edite e salve. Para voltar ao padrão do build, use **Restaurar padrão**.

---

## Começando

```bash
npm install
cp .env.example .env.local   # opcional
npm run dev                  # http://localhost:3000
```

Para produção:

```bash
npm run build
npm start
```

Outros comandos:

```bash
npm run typecheck   # tsc --noEmit
npm test            # testes do gerador de packs (node:test + tsx)
npm run db:reset    # apaga o banco local (data/craftforge.db)
```

---

## O que dá para criar

| Editor | Gera |
| --- | --- |
| **Itens** | ícone, empilhamento, comida (nutrição/saciedade), ferramenta/arma (dano, durabilidade, encantamento, velocidade de quebra por tag), armadura (slot e proteção), combustível, compostagem, arremessável e recarga |
| **Blocos** | geometria (cubo cheio/laje/camada), dureza, resistência a explosão, fricção, emissão e bloqueio de luz, inflamabilidade, som, cor no mapa e tabela de drops |
| **Mobs** | comportamento pacífico/hostil, domável, aquático, imune a fogo, montável, vida, dano, velocidade, alcance, resistência a repulsão, ovo de spawn e drops |
| **Receitas** | molde 3×3, sem molde e fornalha, com estações (bancada, alto-forno, defumador, fogueira, cortador) e suporte a tags |
| **Mundos** | semente, modo de jogo, dificuldade, PvP, trapaças, estruturas, distância de simulação e manter inventário |

Cada mob ganha automaticamente **modelo, textura, animações de caminhada/idle, controlador de animação e ovo de spawn**. Se você não enviar uma imagem, o CraftForge desenha a textura proceduralmente (PNG) para o pack abrir completo.

---

## Diferenciais em relação ao Addons Maker

| | Addons Maker | CraftForge |
| --- | --- | --- |
| Plataforma | app Android/iOS | **site** — funciona em qualquer navegador, sem instalar nada |
| Conta e sync | app | **e-mail + senha**, projetos salvos no datastore |
| Visualizar o JSON gerado | não | **sim**, aba “Arquivos” mostra todos os arquivos do pack |
| Validação antes de exportar | limitada | **validador com erros e avisos**, erros bloqueiam o export |
| Histórico de versões | não | **sim**, snapshot a cada 5 saves + restauração |
| Trabalho em equipe / multitarefa | não | **detecção de conflito** entre abas e **tempo real** via SSE |
| Versões do Minecraft | fixas no app | **atualizáveis pelo painel admin, sem deploy** |
| Código | fechado | **este repositório** |

---

## Tempo real

Tudo ligado por **Server-Sent Events** (`/api/stream`):

- autosave do editor avisa outras abas do mesmo projeto;
- publicações, curtidas e cadastros aparecem no feed do painel;
- heartbeat a cada 15 s mantém a conexão viva atrás de proxy.

O salvamento usa **concorrência otimista**: se outra aba salvou depois da sua, o servidor devolve `409` com os dados atuais em vez de sobrescrever silenciosamente.

---

## Segurança

| Camada | Implementação |
| --- | --- |
| Senhas | **scrypt** (N=16384, salt de 16 bytes por conta). Nada de MD5/SHA1. |
| Enumeração de contas | login sempre executa a verificação (mesmo quando o e-mail não existe) e “esqueci a senha” sempre responde 200 |
| Sessões | token opaco de 32 bytes; só o **SHA-256** vai para o banco; cookie `HttpOnly` + `SameSite=Lax` + `Secure` em produção; revogáveis |
| Troca de senha | derruba **todas** as sessões da conta |
| CSRF | middleware checa o header `Origin` em todo método que altera estado |
| Rate limit | login (8/min), cadastro (5/10 min), reset (5/15 min), escrita (120/min), export (30/min) |
| SQL | **100% parametrizado** (sql.js com bind `?`) — nenhuma query concatenada |
| Entrada | validação com **zod** em toda rota, com limites de tamanho e tipo |
| Upload | só `image/png` em data URL, máximo 1 MB |
| Headers | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` |
| Auditoria | tabela `audit_log` registra login, falha de login, cadastro, troca de senha e ações sensíveis |

---

## Arquitetura

```
src/
├─ app/
│  ├─ page.tsx                 landing
│  ├─ entrar · criar-conta · esqueci-senha · redefinir · verificar
│  ├─ painel/                  dashboard (projetos + feed ao vivo)
│  ├─ editor/[id]/             editor principal
│  ├─ biblioteca/              comunidade (busca, categorias, paginação)
│  ├─ biblioteca/[slug]/       detalhe, download, curtida, comentários
│  ├─ perfil/                  conta, senha, sessões ativas
│  ├─ admin/                   versões do Minecraft em runtime
│  ├─ caixa-de-entrada/        e-mails (verificação e reset)
│  └─ api/                     auth · projects · library · profile · stream · health
├─ components/                 UI (header, dashboard, editor, biblioteca, admin)
├─ lib/
│  ├─ db.ts                    datastore SQLite (sql.js) + migrações
│  ├─ auth.ts                  scrypt, sessões, tokens
│  ├─ session.ts               cookie e helpers de sessão
│  ├─ store.ts                 repositório de projetos/likes/comentários
│  ├─ versions.ts              versões do Minecraft com override em runtime
│  ├─ mailer.ts                transporte de e-mail (outbox por padrão)
│  ├─ events.ts                barramento SSE
│  ├─ rate-limit.ts            sliding window
│  ├─ validation.ts            esquemas zod
│  ├─ png.ts · texture.ts      codificador PNG e texturas procedurais
│  └─ generator/               pack.ts · geometry.ts · validate.ts · zip.ts
└─ middleware.ts               CSRF + guarda de rotas autenticadas
```

### Datastore

O banco é **SQLite real** via `sql.js` (SQLite compilado em WebAssembly), não `better-sqlite3`:

- zero módulo nativo → funciona em qualquer ambiente, incluindo preview e Vercel;
- mesma SQL, índices, `FOREIGN KEYS` e transações;
- a instância vive em `globalThis` (o webpack gera um bundle por rota; sem isso cada rota teria seu próprio banco em memória);
- persistência em arquivo com **escrita atômica** (tmp + rename) e flush com debounce de 250 ms.

Arquivo: `data/craftforge.db` (configurável por `CRAFTFORGE_DB`, e `data/` está no `.gitignore`).

> **Deploy em serverless (Vercel):** o sistema de arquivos é efêmero. Para produção com múltiplas instâncias, troque `src/lib/db.ts` por Postgres/Supabase (a interface `get/all/run/exec` já está isolada) e `src/lib/events.ts` por um barramento compartilhado (Redis/Upstash).

### E-mail

No preview não há SMTP liberado, então o transporte padrão grava as mensagens numa **caixa de saída interna** em `/caixa-de-entrada` — o fluxo de verificação e de reset funciona de ponta a ponta e dá para testar. Para enviar de verdade, implemente `deliver()` em `src/lib/mailer.ts` com Resend/SES/Postmark/SMTP.

---

## Export

| Formato | Conteúdo |
| --- | --- |
| `.mcaddon` | behavior pack + resource pack — abre direto no Minecraft Bedrock |
| `.zip` | mesma árvore, para descompactar e editar |
| só BP | apenas o behavior pack (lógica) |
| só RP | apenas o resource pack (texturas, modelos, animações) |

Estrutura gerada:

```
meu_addon_BP/
├─ manifest.json              format_version 2 · min_engine_version [1,26,52]
├─ pack_icon.png
├─ items/ blocks/ entities/ recipes/
└─ loot_tables/blocks|entities/
meu_addon_RP/
├─ manifest.json
├─ pack_icon.png
├─ blocks.json
├─ entity/          client entity (textura, geometria, animações, ovo)
├─ models/entity/   geometria gerada
├─ animations/ animation_controllers/
└─ textures/items|blocks|entity + item_texture.json + terrain_texture.json
```

Os UUIDs dos manifests são **determinísticos**: reexportar o mesmo projeto mantém os mesmos IDs, então o Minecraft atualiza o pack em vez de duplicar.

---

## Testes

```bash
npm test
```

Cobre: geração do pack inicial, validade de todo JSON gerado, `min_engine_version` e UUIDs estáveis, regra de componentes ≥ 1.26.30, validador (duplicatas e namespace reservado), codificador PNG e geração do ZIP.

---

## Variáveis de ambiente

Veja `.env.example`. As principais:

| Variável | Padrão | Para que serve |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | links de e-mail e metadata |
| `CRAFTFORGE_DB` | `./data/craftforge.db` | caminho do banco |
| `CRAFTFORGE_ADMIN_EMAIL` | — | e-mail que vira administrador |
| `ALLOWED_ORIGINS` | — | hosts extras liberados no CSRF |
| `CRAFTFORGE_FLUSH_MS` | `250` | intervalo de flush do banco |

---

## Limites do plano gratuito

- 50 projetos por conta (`FREE_PROJECT_LIMIT` em `src/lib/session.ts`)
- 120 itens, 120 blocos, 60 mobs e 120 receitas por projeto (limites de validação)

## Licença

MIT — veja [LICENSE](./LICENSE).
