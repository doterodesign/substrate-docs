# Bloom agent — research findings

**Engine ground truth:** `/tmp/claude-501/substrate-om` @ `0f32f6a6391ec238c4ef078d297cbc7608b6f2ae` ("chore: remove release bump file"), detached worktree pinned to origin/main.
**Date:** 2026-08-12
**Purpose:** Establish what "Bloom" actually is at origin/main so the docs site can add a Bloom section without fabricating capability.

---

## 1. What Bloom is (docs-reader paragraph)

Bloom is **a persona/prompt bundle for AI coding assistants, not a runtime API and not a CLI command.** It is a set of Markdown files under `agents/bloom/` that instruct a coding agent (Claude Code, Cursor, Codex CLI, etc.) to act as a Substrate design-system specialist. Consumers get it by running `substrate init`, which **symlinks** `agents/bloom/` into their project at `agents/bloom` and symlinks the 12 skills in `skills/*` into the tool-specific skills directory (`.claude/skills/`, `.cursor/skills/`, …). The user then invokes Bloom conversationally — by saying "Bloom", "Hey Bloom", "@Bloom" — and the agent loads the persona files and routes the request to one of the `skills/substrate-*/SKILL.md` procedures. There is exactly **one** piece of executable Bloom-named code in the engine: `npm run bloom:self-check`, an internal repo-drift guard runner that is *not* shipped to consumers.

The important distinction for docs: **"Bloom" names two different things**, and conflating them is the main fabrication risk.

| | Bloom the agent persona | `bloom:self-check` |
|---|---|---|
| What | Markdown persona + skill routing | Node script, npm run target |
| Where | `agents/bloom/*.md`, `skills/*/SKILL.md` | `scripts/bloom-self-check.ts`, `src/docs-health/bloom-self-check.ts` |
| Audience | Consumers (via `substrate init`) + contributors | Engine contributors only |
| Shipped to consumers | Yes (symlinked by `init`) | **No** |

---

## 2. The shipped surface

### 2.1 Persona files (`agents/bloom/`) — the consumer-facing artifact

| File | Lines | Role |
|---|---|---|
| `agents/bloom/bloom.md` | 74 | Entry point. YAML frontmatter (`name: bloom`, `model: inherit`, `color: green`) + identity loader + triggering guidance |
| `agents/bloom/soul.md` | 58 | WHO — identity, philosophy, "measure of success" |
| `agents/bloom/personality.md` | 50 | HOW — communication style, orchestrator behavior |
| `agents/bloom/abilities.md` | 248 | WHAT — skill catalog, workflows, routing logic, memory, SSOT contract |

`bloom.md:40` documents **dual-mode operation**: the same file is (1) the system prompt when Bloom is dispatched as a team agent by another agent via SendMessage, and (2) the loader the `bloom` skill invokes for direct user interaction.

Sibling judge agents also exist at repo root: `agents/evaluator.md`, `agents/skeptic.md`, `agents/tiebreaker.md` (referenced from `personality.md:20-23`).

### 2.2 Activation skill (`bloom` SKILL.md) — engine-repo only, see §4 caveat

Two byte-near-identical copies, both 16 lines, tracked in git:
- `.claude/skills/bloom/SKILL.md`
- `.agents/skills/bloom/SKILL.md`

They differ on **one line only** (line 6): the dismissal phrase is `"be Claude again"` vs `"be Codex again"`.

Frontmatter description (verbatim, useful for a docs accuracy checker):
> `Substrate design system specialist. Use when the user says "Bloom", "talk to Bloom", "Hey Bloom", "@Bloom", asks to create a component config, review Substrate docs, audit the system, or does any work involving Substrate's adaptive color system, APCA contrast, theming, tokens, or platform transforms.`

Activation protocol (`<agent-activation CRITICAL="TRUE">`): load `agents/bloom/bloom.md` → read fully → load `agents/bloom/soul.md` → greet briefly, no menu → follow the execution protocol. Persona persists until explicitly dismissed ("dismiss Bloom", "thanks Bloom", "exit Bloom").

### 2.3 `npm run bloom:self-check` — internal contributor command

**CLI driver:** `scripts/bloom-self-check.ts` (117 lines).
**Pure core:** `src/docs-health/bloom-self-check.ts` (238 lines), re-exported by `src/docs-health/index.ts:1`.

Exported symbols from `src/docs-health/bloom-self-check.ts`:

| Symbol | Kind | Signature / value |
|---|---|---|
| `SelfCheckGuard` | interface | `{ id, label, script, severity: 'error'\|'warning', optional?: boolean }` |
| `SELF_CHECK_GUARDS` | const | `SelfCheckGuard[]` — 7 guards, in run order (`bloom-self-check.ts:50-94`) |
| `GuardRunOutcome` | interface | `{ declared, status?, output?, runnerError? }` |
| `guardCheckFromOutcome` | function | `(guard, outcome) => DocsHealthCheck` — pure, no fs/process |
| `failureFinding` | function | `(guard, outcome) => DocsHealthFinding` |
| `unrunnableBlockingFinding` | function | `(guard, reason) => DocsHealthSetupErrorFinding` |
| `skipFinding` | function | `(guard, reason) => DocsHealthSetupErrorFinding` |
| `tail` | function | `(text, max = 20) => string` |

The 7 guards (`bloom-self-check.ts:50-94`), exact `id` / `script` / `severity`:

| id | npm script | severity | notes |
|---|---|---|---|
| `validate-ontology` | `validate:ontology` | error | blocking |
| `validate-ontology-values` | `validate:ontology:values` | error | `optional: true` — graceful skip while undeclared |
| `validate-docs` | `validate:docs` | error | blocking |
| `validate-docs-paths-strict` | `validate:docs:paths:strict` | error | blocking |
| `validate-brand-doc` | `validate:brand-doc` | warning | advisory |
| `audit-ontology` | `audit:ontology` | warning | advisory |
| `docs-health` | `docs:health` | warning | advisory |

**Exit-code contract (UCS-821, `scripts/bloom-self-check.ts:20-26`):** non-zero **only** on blocking (error-severity) guards — either failing *or never having run* (missing from `package.json` / failed to spawn). A blocking guard's absence is itself a blocking defect. Advisory guards never affect exit code. The `optional` guard is the single exception (advisory skip while its script is undeclared).

**I/O:** reads `package.json` `scripts` (presence probe, `scripts/bloom-self-check.ts:47-53`); spawns `npm run --silent <script>` per guard via `spawnSync` at `engineRoot` from `resolveRoots()`; **writes no files** — stdout only. Output format: a banner, then `formatDocsHealthRun(run)`, then `bloom:self-check PASSED — no blocking guard failed (N advisory finding(s)).` or `bloom:self-check FAILED — N blocking guard failure(s); resolve them above.`

Findings carry `source: 'bloom:self-check:<script>'` and `adapter: 'bloom:self-check'`.

**Tests pass:** `npx vitest run src/docs-health/__tests__/bloom-self-check.test.ts src/skill-registry` → **23/23 passed** (13 + 10). *(Requires `dangerouslyDisableSandbox` — the sandbox blocks `node_modules/.vite-temp` writes.)*

### 2.4 CLI touchpoints (`@unknown-creatives/substrate`)

- `packages/cli/bin/lib/link.js:63-96` — `linkAgents(projectRoot, substratePath)`. Symlinks `<substrate>/agents/bloom` → `<project>/agents/bloom`. Returns `{ skipped, reason?: 'source-missing'|'real-directory'|'already-linked' }`. Never overwrites a real directory.
- `packages/cli/bin/lib/link.js:28-60` — `linkSkills(...)` symlinks every `skills/<name>/SKILL.md` directory; `getSkillNames` (`link.js:14-20`) is the roster source.
- `packages/cli/bin/main.js:333-344` — user-visible `init` output lines: `OK Linked agents to agents/bloom/`, `OK agents/bloom/ already linked`, `-- agents/bloom/ not found in Substrate source (skipped)`, `-- agents/bloom/ exists as a directory (not a symlink), skipping`.
- `packages/cli/bin/main.js:308` — dry-run line: `  - Link agents to agents/bloom/`.
- `packages/cli/bin/lib/template.js:5-49` — `INSTRUCTION_TEMPLATE` / `renderInstruction(substratePath)`. Contains a `### Agent: Bloom` section written into `CLAUDE.md` / `AGENTS.md` / etc.: *"Bloom is Substrate's design system specialist. Activate by mentioning 'Bloom' or asking about design system architecture, component configs, theming, tokens, APCA contrast, or CVD compensation."*
- `packages/cli/bin/lib/adopt.js:160-210` — four `manualReason` strings routing un-automatable cases to "manual/Bloom reconciliation": directory path collisions, semantic duplicate overlays, shadow overlays, modified delivered files.
- `packages/cli/bin/lib/upgrade.js:715,721` — advisory overlay text naming Bloom as the reviewer/remover.
- `packages/cli/bin/lib/scaffold.js:114` — scaffolds `memory/MEMORY.md` with *"Client-owned learnings captured by Bloom hooks live here."*

**Note — `agents/bloom` is NOT linked in `clone-root` model.** `main.js:331` guards `linkAgents` behind `substrateInfo.model !== 'clone-root'` (the engine repo itself already has it).

### 2.5 Scaffolded hooks (real, `scaffold.js:266-312`)

`init` writes these into the consumer's `.claude/settings.json`:

| Event | Matcher | Action |
|---|---|---|
| `PreToolUse` | `Write(<content>/components/*/config.yaml)` | `scripts/validate-config-write.sh`, 10s |
| `PreToolUse` | `Write(<content>/components/*/config.doc.yaml)` | `scripts/validate-doc-write.sh`, 10s |
| `PostToolUse` | `Write(<content>/brands/*/config.yaml)` | `type: 'prompt'` — informational brand-impact note, non-blocking |
| `Stop` | (none) | `scripts/store-learnings.sh`, 15s, `SUBSTRATE_MEMORY_DIR` env |

All four scripts exist: `scripts/validate-config-write.sh`, `scripts/validate-doc-write.sh`, `scripts/store-learnings.sh`, `scripts/validate-skill-write.sh`.

---

## 3. Relationship to skill registry and docs-health

### 3.1 Skill registry (`src/skill-registry/skill-registry.ts`, 178 lines)

Purpose per its docstring (`skill-registry.ts:6-9`): *"Bloom reads the flat `{ name, description, tags, path }` list from `generated/skills/REGISTRY.gen.yaml` to answer 'do I have a skill for X?' without opening and parsing every markdown file."*

Exports: `SKILL_REGISTRY_RELATIVE_PATH` (`'generated/skills/REGISTRY.gen.yaml'`), `SKILL_REGISTRY_GENERATOR` (`'substrate-skill-registry'`), `SKILL_REGISTRY_SCHEMA_VERSION` (`'1.0.0'`), `SkillRegistryEntry`, `SkillRegistry`, `parseFrontmatter`, `deriveTags`, `findSkillFiles`, `buildSkillEntry`, `buildSkillRegistry`, `serializeSkillRegistry`.

Generated by `npm run generate:skill-registry` (`scripts/generate-skill-registry.ts`); `--check` variant (`generate:skill-registry:check`) detects drift. Each `SKILL.md` is SSOT; the registry is a derived projection, never hand-edited. `deriveTags` is deterministic: `substrate-<domain>` name suffix + every `--flag` in the description + bare `<verb> to <infinitive>` matches, minus a `VERB_STOPWORDS` denylist, lowercased/deduped/sorted.

The registry is Bloom's **routing fallback**. `abilities.md:150-178` defines the capability-gap protocol: search `REGISTRY.gen.yaml` → surface a plausible near-match → name the gap and offer the skill-creation pipeline → log to `memory/capability-gaps.md`. Critically (`abilities.md:160-161`): *"the registry routes, the skill file governs"* — always load the matched `SKILL.md` before executing.

**On-disk registry: `skillCount: 12`**, matching `ls skills/` exactly.

### 3.2 docs-health

`src/docs-health/index.ts` (4 lines) re-exports `./bloom-self-check.js`, `./findings.js`, `./validate-doc-paths.js`, `./validate-docs.js`.

Bloom self-check **deliberately does not reinvent** the finding model — it reuses the shared docs-health primitives: `runDocsHealth` / `formatDocsHealthRun` from `src/docs-health/run-docs-health.js` for aggregation, exit-code derivation, and rendering; `DocsHealthFinding` / `DocsHealthSetupErrorFinding` from `./findings.js`; `isBlockingDocsHealthFinding` for the blocking/advisory split. Note `docs:health` is *itself* one of the 7 guards (advisory) — self-check is the strict superset umbrella.

### 3.3 Barrel boundary

`grep` for `docs-health|skill-registry` in `src/index.ts` and `src/node.ts` → **no matches**. Neither module is exported from any public barrel. `skill-registry.ts:14` states explicitly: *"Node-only; never import from browser code or the `src/index.ts` barrel."* `src/node.ts:8` mentions Bloom only in a comment about in-repo consumers.

**Consequence for docs: there is no importable Bloom/docs-health public API.** Do not document `import { ... } from '@substrate/engine'` for any of these symbols.

---

## 4. Implemented vs. design-doc-only — the accuracy gate

### Verified implemented ✅

- `agents/bloom/{bloom,soul,personality,abilities}.md` — all 4 exist.
- `agents/{evaluator,skeptic,tiebreaker}.md` — all exist.
- `bloom` SKILL.md at `.claude/skills/bloom/` and `.agents/skills/bloom/`.
- 12 skills on disk = 12 registry entries: `figma-to-code`, `skill-creator`, `substrate-audit`, `substrate-brand`, `substrate-config`, `substrate-docs`, `substrate-knowledge`, `substrate-migrate`, `substrate-ontology`, `substrate-reflect`, `substrate-self-check`, `substrate-user-config`.
- 6 workflows: `build-component.md`, `evolve.md`, `guided-migration-pipeline.md`, `personalization-pipeline.md`, `skill-creation-pipeline.md`, `system-health.md`.
- `npm run bloom:self-check` + `generate:skill-registry` + `generate:skill-registry:check` + `docs:health` — all declared in `package.json`.
- `memory/` with 18 files incl. `MEMORY.md`, `capability-gaps.md`.
- `references/`: `architecture.md`, `component-model.md`, `platform-contracts.md`, `token-system.md`, `ontology/`, `_manifest.yaml`.
- All 4 hook shell scripts.
- Tests: 23/23 pass.

### Design-doc-only / superseded ❌ — do NOT document

- **`bloom/` plugin wrapper with `.claude-plugin/plugin.json`** — described in `docs/superpowers/plans/2026-04-05-bloom-agent-phase1-4.md` ("Claude Code plugin", `bloom/.claude-plugin/plugin.json`). **Explicitly dissolved** by `docs/superpowers/specs/2026-05-14-bloom-flatten-design.md` ("Dissolve the `bloom/` plugin wrapper"). No `plugin.json` and no `hooks.json` exist anywhere in the repo (`find` confirms). The single agent entry point is `agents/bloom/bloom.md`, not the spec's `agents/bloom.md`.
- **"Proactive awareness" / "daily reflect cycle"** — `docs/superpowers/specs/2026-04-05-substrate-agent-design.md` §1 vision language ("notices inconsistencies, flags regressions… without being asked", "Daily reflect cycle"). No scheduler exists. `substrate-reflect` is a manually invoked skill.
- **"14 skills"** — a count from `docs/superpowers/specs/2026-05-14-bloom-dedup-design.md` motivation section. Actual: **12**.
- **`design-philosophy.md` / `engineering-philosophy.md` under `bloom/`** — the phase plan's file map. Actual location is repo root: `DESIGN-PHILOSOPHY.md`, `ENGINEERING-PHILOSOPHY.md`.

### ⚠️ Live drift inside `abilities.md` — do not copy its skill list verbatim

`agents/bloom/abilities.md:13-118` ("Available Skills") is **stale relative to the shipped skills**:

1. **`substrate-migrate` flags are wrong.** `abilities.md:97-113` documents `--analyze` / `--migrate` / `--verify`. The shipped `SKILL.md` frontmatter (and registry) uses **flagless subcommands `analyze` / `plan` / `apply` / `verify`** — a permission-first flow with a decision manifest. `bloom.md:72` compounds this: *"Migration questions → … note that a dedicated migrate skill is planned for future phases"* — but `skills/substrate-migrate/` **exists and ships**.
2. **Three shipped skills are missing from `abilities.md`:** `substrate-ontology`, `substrate-self-check`, `figma-to-code`.
3. **`substrate-audit --current-state` is undocumented** in `abilities.md` (which lists only `--system`, `--artifact`, `--knowledge`, `--evals`). The shipped frontmatter leads with `--current-state`.

**Docs guidance:** treat `generated/skills/REGISTRY.gen.yaml` (or the `SKILL.md` frontmatter) as SSOT for the skill roster and flags — never `abilities.md` prose. This mirrors the engine's own SSOT contract (`abilities.md:227-248`): *"You reference system facts; you never carry copies of them… A number, name, or list quoted in prose is a convenience that drifts."*

### ⚠️ Test-fixture artifact — a genuine trap

`packages/cli/tests/integration.test.ts:41` and `tests/e2e-onboarding.test.ts:46` create a fake `skills/bloom/SKILL.md` fixture and then assert `.claude/skills/bloom` is a symlink (`integration.test.ts:118-120,142,158-161,171-174`). **In the real repo `skills/bloom/` does not exist** (`git ls-files | grep skills/bloom` returns only the two `.claude`/`.agents` paths). Because `linkSkills` enumerates `skills/*` only, **a real consumer does not receive the `bloom` activation SKILL.md — only `agents/bloom/` plus the 12 substrate skills.**

Do **not** write "`substrate init` installs the Bloom skill into `.claude/skills/bloom/`" — that is true of the test fixture, not of the shipped engine. The accurate statement is: *`init` symlinks `agents/bloom/` and the 12 `skills/substrate-*` skills; the persona is activated by mentioning Bloom, as described in the `CLAUDE.md` block `init` writes.*

---

## 5. Consumer-facing or internal? → **Both, split by surface**

| Surface | Audience | Nav placement |
|---|---|---|
| Bloom persona (`agents/bloom/`), linked by `substrate init`, activated by saying "Bloom" | **Consumer-facing** | Main nav — belongs near Getting Started / CLI, since `init` output and the scaffolded `CLAUDE.md` both mention it by name. A user who runs `init` sees `OK Linked agents to agents/bloom/` and gets a `### Agent: Bloom` section in their `CLAUDE.md`; with no docs they have no idea what to do with it. |
| The 12 `skills/substrate-*` | **Consumer-facing** | Same section — these are the actual verbs (`substrate-brand --register`, `substrate-migrate analyze`, …) |
| `npm run bloom:self-check`, `generate:skill-registry`, `src/docs-health/*`, `src/skill-registry/*` | **Contributor/internal only** | Contributing/internal section, or omit. Not in the published package; no public export; `scripts/` is a repo path, not a consumer path. |
| `manual/Bloom reconciliation` in `adopt`/`upgrade` | Consumer-visible **string**, engagement-context concept | Mention only within the adopt/upgrade docs, as "requires manual reconciliation (Bloom or a human)" |

Supporting evidence for consumer-facing status: `README.md:41` (*"`init` finds Substrate, links skills + the Bloom agent"*), `docs/getting-started.md:51` (`substrate/engine/agents/` vendored *"the Bloom agent `init` symlinks"*) and `:160-161`, and `docs/delivery-runbook.md:97` (clients receive *"Bloom prompts/workflows for the engagement"*).

**Distribution caveat worth a docs note:** `docs/delivery-runbook.md:416-418` — the CLI package `@unknown-creatives/substrate` is **not yet published to npm**; a bare `npx substrate` fetches an unrelated third-party package. Run the bin from a checkout that has had `npm ci`.

---

## 6. Verifiable identifiers for a docs accuracy checker

**Commands**
- `npm run bloom:self-check` (internal)
- `npm run generate:skill-registry`, `npm run generate:skill-registry:check`, `npm run docs:health` (internal)
- `substrate init`, `substrate init --refresh`, `substrate init --dry-run` (consumer)

**Exported symbols** — `src/docs-health/bloom-self-check.ts`: `SELF_CHECK_GUARDS`, `SelfCheckGuard`, `GuardRunOutcome`, `guardCheckFromOutcome`, `failureFinding`, `unrunnableBlockingFinding`, `skipFinding`, `tail`.
`src/skill-registry/skill-registry.ts`: `SKILL_REGISTRY_RELATIVE_PATH`, `SKILL_REGISTRY_GENERATOR`, `SKILL_REGISTRY_SCHEMA_VERSION`, `SkillRegistryEntry`, `SkillRegistry`, `parseFrontmatter`, `deriveTags`, `findSkillFiles`, `buildSkillEntry`, `buildSkillRegistry`, `serializeSkillRegistry`.
`packages/cli/bin/lib/link.js`: `linkAgents`, `linkSkills`, `getSkillNames`, `unlinkSkills`. `packages/cli/bin/lib/template.js`: `INSTRUCTION_TEMPLATE`, `renderInstruction`.

**Guard ids** — `validate-ontology`, `validate-ontology-values`, `validate-docs`, `validate-docs-paths-strict`, `validate-brand-doc`, `audit-ontology`, `docs-health`.

**Files** — `agents/bloom/{bloom,soul,personality,abilities}.md`; `agents/{evaluator,skeptic,tiebreaker}.md`; `.claude/skills/bloom/SKILL.md`; `.agents/skills/bloom/SKILL.md`; `generated/skills/REGISTRY.gen.yaml`; `scripts/bloom-self-check.ts`; `src/docs-health/{index,bloom-self-check,findings,run-docs-health}.ts`; `src/skill-registry/skill-registry.ts`; `memory/MEMORY.md`; `memory/capability-gaps.md`; `skills/substrate-self-check/SKILL.md`.

**Skill names (12, exact)** — `figma-to-code`, `skill-creator`, `substrate-audit`, `substrate-brand`, `substrate-config`, `substrate-docs`, `substrate-knowledge`, `substrate-migrate`, `substrate-ontology`, `substrate-reflect`, `substrate-self-check`, `substrate-user-config`.

**Workflow names (6, exact)** — `build-component`, `evolve`, `guided-migration-pipeline`, `personalization-pipeline`, `skill-creation-pipeline`, `system-health`.
*(Caveat: `abilities.md:124-128` lists a `personalization-pipeline` and others but omits `guided-migration-pipeline`; use the `workflows/` directory listing as SSOT.)*

**Trigger phrases (from bloom SKILL.md frontmatter)** — "Bloom", "talk to Bloom", "Hey Bloom", "@Bloom". **Dismissal** — "dismiss Bloom", "thanks Bloom", "exit Bloom", "be Claude again" (`.claude` variant) / "be Codex again" (`.agents` variant).

**Init output strings** — `OK Linked agents to agents/bloom/`, `OK agents/bloom/ already linked`, `-- agents/bloom/ not found in Substrate source (skipped)`, `-- agents/bloom/ exists as a directory (not a symlink), skipping`.

---

## 7. Recommended doc claims (safe to write)

1. Bloom is the Substrate design-system agent persona — Markdown identity + skill routing for AI coding assistants; not a runtime library and not a CLI subcommand.
2. `substrate init` symlinks `agents/bloom/` into the project and the 12 `skills/substrate-*` into each selected tool's skills directory, and appends a `### Agent: Bloom` block to `CLAUDE.md`/`AGENTS.md`/equivalent.
3. Activate by mentioning Bloom in conversation; it stays in persona until explicitly dismissed.
4. Bloom routes requests to skills; on no match it consults `generated/skills/REGISTRY.gen.yaml`, surfaces a near-match, names the capability gap, and can create a new skill through a human-gated pipeline.
5. Bloom reads/writes `memory/` and reads `references/` + `knowledge/`; hooks scaffolded by `init` validate config writes and store learnings on session stop.
6. Contributors additionally have `npm run bloom:self-check` — a 7-guard drift/health umbrella that exits non-zero only on blocking guard failures (or blocking guards that never ran).

**Do not write:** that Bloom is a Claude Code *plugin*; that it has a `plugin.json`; that it runs on a schedule or acts proactively without being asked; that there are 14 skills; that `substrate-migrate` uses `--analyze/--migrate/--verify`; that a dedicated migrate skill is "planned"; that `init` installs a `bloom` skill into `.claude/skills/`; or that any Bloom/docs-health symbol is importable from a public barrel.
