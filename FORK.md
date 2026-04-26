# Fork — Pedrooo24/t3code

Fork pessoal do [pingdotgg/t3code](https://github.com/pingdotgg/t3code) do Pedro.
Upstream declarou publicamente não estar a aceitar contribuições → divergência livre, rebase oportunístico.

- Local: `C:\PROJETOS\T3`
- Origin: `Pedrooo24/t3code`
- Upstream: `pingdotgg/t3code`
- Branch de trabalho: `pedro/dev`
- Plano mestre: `C:\Users\pedro\.claude\plans\bem-eu-quero-fazer-shimmering-prism.md`

## Baseline (tag `baseline-v0`)

Cherry-picks aplicados em `pedro/dev` por ordem de risco crescente, cada um com `bun run build` verde entre passos:

| PR | Autor | Resumo | Commits |
|---|---|---|---|
| [#2192](https://github.com/pingdotgg/t3code/pull/2192) | reasv | Prevent probeClaudeCapabilities from leaking API requests | 3 |
| [#2124](https://github.com/pingdotgg/t3code/pull/2124) | mvanhorn | Thread cwd through Claude capability probe (skills de projecto) | 2 |
| [#2132](https://github.com/pingdotgg/t3code/pull/2132) | gmackie | Back off failed git status refreshes | 5 |
| [#2178](https://github.com/pingdotgg/t3code/pull/2178) | maddada | Kill managed probe opencode processes (mem leak) | 2 |
| [#2116](https://github.com/pingdotgg/t3code/pull/2116) | TheKingYouNeed | Reconcile stale approval state after responses (Windows) | 1 |

Total: **13 commits** de cherry-pick preservando autoria (`-x`).

## Roadmap pós-baseline

1. **Feature 0** — MCPs por projecto ([#277](https://github.com/pingdotgg/t3code/issues/277))
2. **Feature 1** — Legibilidade de agentes (modelo, tokens, custo, contexto, subagentes, nav keyboard-first)
3. **Feature 2** — Renderer limpo (skills/MCPs/thinking/tool calls como primeira classe)
4. **Feature 3** — Customização total (temas CSS variables, densidade, font-size, title bar)
5. **Polish** — Spotlight mode ([#525](https://github.com/pingdotgg/t3code/issues/525)), smoke test paralelismo

## Workflow

- `main` tracks `origin/main` (fork), recebe rebase de `upstream/main`. Nunca se trabalha aqui.
- `pedro/dev` — branch de trabalho, todas as features.
- Build web + server: `bun run build` (Turborepo, 6 tasks, ~25s cold).
- Build desktop (Electron): `bun run build:desktop`.
- Dev web (browser, só para debug rápido): `bun run dev`.
- **Dev desktop (alvo primário — Electron + web + server em paralelo): `bun run dev:desktop`**.
- Start desktop empacotado: `bun run start:desktop`.

Baseline fechada: **2026-04-19**.

## Palette policy

Status indicators sao codigo visual de estado - uniformizar tudo a teal dilui a semantica de cada cor.

- **teal** - primary/active/inProgress (substituiu blue em toda a UI)
- **violet** - estados terminais de plano (Plan Ready, PR merged)
- **emerald** - Completed/success
- **amber** - pending/warning
- **red** - error/destructive

Racional: cada cor tem semantica propria. Misturar blue e teal para "coisas activas" cria ambiguidade desnecessaria - teal e o primary deste fork, blue nao existe.

## Feature 1+2 — Observabilidade de agentes (em curso)

Branch: `feat/agent-observability`. Plano: `effervescent-dancing-kettle.md`.

- **Bug server corrigido:** `item.started` no `ProviderRuntimeIngestion.ts` agora propaga `data` (nome real, modelo, prompt do subagente) tal como `item.completed` ja fazia. Eliminado o "Agent" generio nos cards.
- **Utilitarios client:** `classifyToolCall`, `subagentDescriptor`, `groupActivitiesBySubagent`, `extractFinalAgentResponse` adicionados a `session-logic.ts`. `deriveWorkLogEntries` aceita filtros opcionais.
- **SubagentPanel enriquecido:** modelo e effort reais por agente (com badge "herdado da thread" quando herda), pills MCPs/Skills/tools contados por parentToolUseId, botao de drawer por card.
- **AgentInspectorDrawer novo:** Sheet lateral com tabs Conversa/Resumo. Conversa mostra prompt inicial, timeline de actividades e resposta final ao orquestrador. Resumo agrupa MCPs por servidor, skills, ficheiros tocados e comandos bash.
- **MessagesTimeline melhorado:** `classifyToolCall` aplica-se a cada tool call - MCP com ícone Plug teal, Skill com ícone Puzzle violet, Agent com ícone Bot emerald, Edit amber. Labels `MCP[server]/tool`, `Skill(name)`, `Agent(type)`.

## Feature 0 — MCPs por projecto (Claude)

Isolamento de servidores MCP por projecto: threads paralelos em projectos diferentes carregam conjuntos distintos de MCPs.

### Como funciona

O Claude Agent SDK é chamado com `settingSources: ["user", "project", "local"]` e recebe o `cwd` do workspace do projecto, pelo que lê automaticamente `<workspaceRoot>/.claude/settings.local.json` em cada thread. O motor já existia desde o baseline; esta feature acrescenta apenas o painel de controlo no UI.

### Criar override via UI

1. Settings → secção "Claude MCPs (por projecto)".
2. O painel mostra o path completo e o estado (exists / missing) para o projecto activo.
3. Se não existir, "Criar a partir de template" gera `.claude/settings.local.json` com `mcpServers: {}` e um comentário explicativo.
4. "Abrir no editor" abre o ficheiro no editor preferido (mesmo mecanismo das keybindings).

### Editar manualmente

Qualquer editor. Schema: `mcpServers: Record<string, { type: "stdio" | "sse" | "http", ... }>`. Alterações só entram em vigor em **nova thread** — não há hot-reload nesta iteração.

### Aviso gitignore

O ficheiro é `.claude/settings.local.json`, gitignored por convenção Claude. **Não** usar `.claude/settings.json` versionado para tokens ou credenciais.

### Limitações actuais

- Sem hot-reload: reiniciar thread após editar.
- Apenas por projecto — sem MCPs por thread.
- Sem editor visual de servidores MCP (apenas descoberta, criação e abertura).

