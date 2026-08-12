# Project Memory

Shared knowledge base for all agents working on substrate-docs.
The repository is the system of record — if it's not here, it doesn't exist for agents.

**One-liner:** Mintlify docs site for the Substrate engine (a runtime APCA
color/token solver at ../substrate). Docs accuracy is CI-gated against a
committed ground-truth manifest extracted from the engine.

## Critical facts

- Engine repo: `/Users/dimitriotero/Documents/GITHUB/substrate`. **origin/main
  is the source of truth** — always `git fetch` first; the local checkout is
  advanced by other agents. Generate the manifest from a detached worktree at
  origin/main.
- Never use `npx substrate` (installs an unrelated third-party package). The
  real CLI: `node <checkout>/packages/cli/bin/substrate-init.js`.
- Accuracy gate: `npm run check:docs` (all MDX vs ground-truth/manifest.json);
  `npm test` (checker + generator tests); `npm run check:partials`.
  Regenerate manifest: run `scripts/generate-manifest.ts` under the engine's
  own tsx **with cwd inside the engine checkout**.

## Topics

- [substrate-engine.md](substrate-engine.md) — the engine's real domain model:
  intents, preference vector, presets, APCA policy, token namespaces, CLI,
  config schema, native artifacts.
- [gotchas.md](gotchas.md) — fabrications that must never reappear, sandbox
  and tooling traps, allowlist policy.
- [decisions.md](decisions.md) — UCS-1129 decisions: gate architecture,
  examples policy, rewrite-vs-repair split, human-review checklist.
