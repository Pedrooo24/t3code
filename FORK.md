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
- Build: `bun run build` (Turborepo, 6 tasks, ~20s cold / 1.7s warm).
- Dev: `bun run dev` (Electron + Vite).

Baseline fechada: **2026-04-19**.
