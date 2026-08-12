# Substrate consumer CLI — survey for end-user documentation

Date: 2026-08-12
Ground truth: `/tmp/claude-501/substrate-om` @ `0f32f6a6391ec238c4ef078d297cbc7608b6f2ae`
("chore: remove release bump file"), detached worktree pinned to origin/main.

All file paths below are relative to that engine checkout root unless marked otherwise.
Behavioral claims marked **[verified]** were produced by executing the bin against a
fresh scratch directory on Node 24; everything else is read from source.

---

## 1. Where the CLI lives and how consumers invoke it

### Package

| Fact | Value | Source |
|---|---|---|
| npm package name | `@unknown-creatives/substrate` | `packages/cli/package.json:2` |
| Version | `0.59.0` | `packages/cli/package.json:3` |
| Bin name → target | `substrate` → `./bin/substrate-init.js` | `packages/cli/package.json:15-17` |
| Node requirement | `>=22` | `packages/cli/package.json:7` |
| Runtime deps | `esbuild ^0.27.7`, `js-yaml ^4.1.1` | `packages/cli/package.json:38-41` |
| Published files | `bin`, `assets`, `README.md`, `LICENSE` | `packages/cli/package.json:9-14` |
| Public subpath export | `./engine-artifact` → `./bin/lib/engine-artifact.js` | `packages/cli/package.json:18-20` |

`substrate --version` prints `0.59.0` **[verified]**.

### Entry point and dispatch

- **`packages/cli/bin/substrate-init.js`** (23 lines) is the bin. It is deliberately
  import-free: it installs `process.on('uncaughtException')` and
  `process.on('unhandledRejection')` handlers *first*, then dynamically
  `import('./main.js')`. Every failure prints `substrate: <message>` and exits 1 with
  no stack trace. `SUBSTRATE_DEBUG=1` is the documented escape hatch that re-enables
  the stack trace (`substrate-init.js:15-17`).
- **`packages/cli/bin/main.js`** (462 lines) holds the real dispatch. It is a flat
  sequence of `if (command === '<verb>')` blocks against `process.argv.slice(2)[0]`,
  each ending in `process.exit()`. `projectRoot` is always `process.cwd()`
  (`main.js:32-34`).
- 37 modules under `packages/cli/bin/lib/`.

### Verb list — verified from source, not assumed

The six known verbs are correct and complete. Dispatch order in `main.js`:

| Verb | main.js lines | Implementation |
|---|---|---|
| `--version` / `-v` | 106-115 | inline; reads `../package.json` |
| `add` | 117-126 | `bin/lib/add.js` |
| `upgrade` | 128-137 | `bin/lib/upgrade.js` |
| `adopt` | 139-148 | `bin/lib/adopt.js` |
| `setup` | 150-173 | `bin/lib/setup-plan.js` + `bin/lib/setup-transaction.js` |
| `artifact` | 175-187 | `bin/lib/engine-artifact.js` |
| `init` | 189-462 | inline in `main.js` (fallthrough — no explicit `if`) |

Anything that is not one of those falls to `main.js:189-192`: `printUsage()` on
**stdout**, exit `0` for `--help`/`-h`, exit `1` otherwise. An unknown verb writes
**nothing to stderr** **[verified]** — the usage text goes to stdout even on failure.

### The real invocation path (NOT `npx substrate`)

The package is **not published to npm**. A bare `npx substrate` fetches an unrelated
third-party package of the same name. Both consumer docs say so explicitly:

- `docs/getting-started.md:22-27`:
  > Substrate is not yet on npm: the CLI package (`@unknown-creatives/substrate`) is
  > not yet published — the registry holds only a reserved placeholder — so
  > **`npx substrate init` does not work today**. Worse, a bare `npx substrate`
  > fetches an unrelated third-party package of the same name.

- `docs/delivery-runbook.md:407-428`, "## 6. Running the CLI during an engagement",
  gives the canonical shell-function spelling:

  ```bash
  substrate() { node <substrate-checkout>/packages/cli/bin/substrate-init.js "$@"; }
  ```

  > Every bare `substrate <cmd>` in this document means that invocation.

**Critical constraint for docs:** the CLI must run from a Substrate checkout that has
had `npm ci`. Its `js-yaml` dependency resolves from the checkout root; copying `bin/`
out standalone fails with `ERR_MODULE_NOT_FOUND` (`docs/delivery-runbook.md:414-417`,
echoed at `docs/getting-started.md:141-143`).

Two documented spellings a docs page can safely use:

```bash
# One-off, no shell function:
node "$SUBSTRATE_REPO/packages/cli/bin/substrate-init.js" init --dry-run --platform claude-code

# Session alias (runbook §6):
substrate() { node <substrate-checkout>/packages/cli/bin/substrate-init.js "$@"; }
```

There is also a packed-tarball path used only by the CI gate
(`scripts/verify-onboarding-p0.mjs` does `npm pack packages/cli` then installs it and
runs `node_modules/.bin/substrate`). That is a vendor-side verification path, not a
consumer instruction.

### Global usage block (exact text, `main.js:36-51`) **[verified]**

```
Usage: substrate init [--refresh] [--platform <name>] [--all] [--dry-run] [--report-aliases]
       substrate add <entry-id|name> --generate-command <cmd> [--catalog <dir>]
       substrate add --list [--catalog <dir>]
       substrate upgrade --engine-artifact <bundle> \
         --signing-public-key <pem|file|env:NAME> \
         --engine-version <semver> \
         --regenerate-command <cmd> --verify-command <cmd> [--report-id <id>] \
         [--modified-engine <refuse|discard|freeze|engage-uc>]
       substrate adopt --report <json> [--finding <id>] [--apply]
       substrate adopt --rollback <id>
       substrate setup (--plan | --dry-run) --engine-artifact <path> \
       [--brand <id>]... [--component <id>]... \
       [--target <css|swift|compose>]...
       substrate setup --apply <plan.json> --signing-public-key <pem|file|env:NAME>
       substrate artifact assemble --source-root <dir> --output-directory <dir> \
         --version <semver> --signing-private-key <pem|file|env:NAME>
       substrate --version
```

Note `substrate init --help` is **not** handled — `--help` after `init` is just an
unrecognized flag and init proceeds to engine detection. Every *other* verb handles
`--help`/`-h` inside its own parser and exits 0.

---

## 2. Engine detection (shared by init; the layout vocabulary docs must use)

`detectSubstrate(projectRoot, envPath)` — `bin/lib/detect.js:56-116`. Wrapped by
`detectEngine(projectRoot)` (`:39-41`, applies `$SUBSTRATE_PATH`) and
`engineDetected(projectRoot)` (`:51-54`, boolean).

`$SUBSTRATE_PATH` is checked first. It must resolve **inside** the project root or
detection returns `{ rejected }`; it is *not* verified to actually contain an engine.

Probe order (first `fs.existsSync` hit wins):

| Marker directory probed | `model` | returned `path` |
|---|---|---|
| `substrate/engine/skills/substrate-config` | `client` | `substrate/engine` |
| `engine/skills/substrate-config` | `client` | `engine` |
| `node_modules/@unknown-ui/substrate/skills/substrate-config` | `install` | `node_modules/@unknown-ui/substrate` |
| `substrate/skills/substrate-config` | `clone-subdir` | `substrate` |
| `skills/substrate-config` | `clone-root` | `.` |

`$SUBSTRATE_PATH` yields `model: 'manual'`. The returned `path` is always the directory
containing `skills/` — for the v2 client layout that is the **engine** root, not the
substrate root.

`clone-root` is the Substrate repo itself and is special-cased throughout `init`: it
skips agent linking, client-layout scaffolding, bootstrap, aliases, and the catalog
index.

On success init prints `Found Substrate (client): substrate/engine` (model in parens).

---

## 3. Per-verb reference

### 3.1 `substrate init`

Purpose: wire an existing project (with an engine already vendored) to AI coding tools
and scaffold the client-owned layout. Init **does not obtain the engine** — it requires
one already present.

**Flags** (`main.js:194-208`), all boolean except `--platform`:

| Flag | Default | Meaning |
|---|---|---|
| `--refresh` | off | Re-run using platforms recorded in `.substrate/state.yaml`; skips AI-wiring scaffold (`scaffoldAiWiring: !isRefresh`, `main.js:393`) |
| `--platform <name>` | — | Configure exactly one platform, non-interactive. Missing value → `Error: --platform requires a value`, exit 1 |
| `--all` | off | Select every tier-1 and tier-2 platform, non-interactive |
| `--dry-run` | off | Print planned actions and exit 0; writes nothing |
| `--report-aliases` | off | Print alias blocks instead of writing them; also suppresses `.substrate/aliases.js` and `.substrate/catalog.json` emission |

With none of `--refresh`/`--platform`/`--all`, init opens an **interactive checkbox**
(`main.js:284-287`, `bin/lib/ui.js`) pre-checking detected tools. With stdin closed it
selects nothing and exits **0** with `No platforms selected. Nothing to do.` — so
scripted/CI usage must always pass `--platform` or `--all`.

**Platform catalog** — `bin/lib/platforms.js:4-120`, 14 entries. Only tier ≤ 2 are
offered (`main.js:274,277`). Tier 1 gets skills symlinks + instruction file; tier 2 is
labeled `(instructions only)` in the picker.

| id | label | tier | skillsDir | instructionFile | mode |
|---|---|---|---|---|---|
| `claude-code` | Claude Code (CLI + VS Code + JetBrains) | 1 | `.claude/skills` | `CLAUDE.md` | append |
| `cursor` | Cursor | 1 | `.cursor/skills` | `.cursor/rules/substrate.md` | create |
| `windsurf` | Windsurf | 1 | `.windsurf/skills` | `.windsurfrules` | append |
| `github-copilot` | GitHub Copilot | 1 | `.github/skills` | `.github/copilot-instructions.md` | append |
| `gemini-cli` | Gemini CLI | 1 | `.gemini/skills` | `GEMINI.md` | append |
| `codex-cli` | OpenAI Codex CLI | 1 | `.agents/skills` | `AGENTS.md` | append |
| `kiro` | Kiro (AWS) | 1 | `.kiro/agents` | `.kiro/steering/substrate.md` | create |
| `cline` | Cline | 2 | — | `.clinerules/substrate.md` | create |
| `continue-dev` | Continue.dev | 2 | — | `.continue/rules/substrate.md` | create |
| `junie` | JetBrains Junie | 2 | — | `.junie/guidelines/substrate.md` | create |
| `tabnine` | Tabnine | 2 | — | `.tabnine/guidelines/substrate.md` | create |
| `augment` | Augment Code | 2 | — | `.augment/rules/substrate.md` | create |
| `zed` | Zed | 3 | — | — | — |
| `sourcegraph-cody` | Sourcegraph Cody | 3 | — | — | — |

Detection markers per platform are the `detect:` arrays in the same file (e.g.
`claude-code` → `.claude/`, `codex-cli` → `AGENTS.md` or `.agents/`).

Instruction writing (`bin/lib/instruct.js:14-53`): `append` mode replaces content
between `<!-- substrate:start -->` and `<!-- substrate:end -->` (appending the block if
absent, preserving the rest of the file); `create` mode **overwrites** the whole file
with unwrapped content.

**What init writes on disk** (non-`clone-root` models):

1. `agents/bloom/` symlink → engine's `agents/bloom` (`bin/lib/link.js`)
2. Per selected platform: skill symlinks into `skillsDir/`, and the instruction file
3. `.substrate/state.yaml` — merged over the existing document so a hand-edited
   `roots:` block survives (`main.js:377-388`)
4. Client layout scaffold (`bin/lib/scaffold.js:361-384`):
   - `substrate/`, `substrate/engine/`, `substrate/generated/` directories
   - `substrate/{components,brands,knowledge,references}/` each with `.gitkeep`
   - `.gitkeep` in the generated root
   - a `src` symlink beside the generated root pointing at `{engineRoot}/src`
   - **`substrate/properties.yaml`** — client property overlay, seeded with `{}`
   - **`substrate/substrate.config.yaml`** — organization config, generated from the
     engine's `src/kernel/system/system.config.yaml` with every value commented out
     and a literal `{}` document body
   - `substrate/memory/MEMORY.md` + `feedback.md`, `decisions.md`, `patterns.md`,
     `gotchas.md`
   - `.claude/settings.json` hooks (only when `.claude/` exists and `claude-code` is
     among the selected platforms and not `--refresh`)
5. Bootstrap (`bin/lib/bootstrap.js:218-224`):
   - seeds `.substrate/manifest.yaml` if absent (never overwrites; `wx` flag)
   - creates `substrate/{kernel,platforms,types}` symlinks into `{engineRoot}/src/*`,
     falling back to a recursive copy when symlinks are unavailable
   - checks that `tsx`, `js-yaml`, `yaml`, `semver` resolve from the project or engine
     root (warning only, never a blocker)
6. Toolchain aliases + `.substrate/aliases.js` (write mode only)
7. `.substrate/catalog.json` (write mode only, silently skipped if no catalog reachable)

**Exit contract.** Bootstrap blockers are content roots with status `missing-source` or
`copy-failed` (`bootstrap.js:240-244`). When any exist, init prints
`Init completed with N blocker(s) — see the !! lines above.` to stderr and **exits 1**.
Otherwise it prints `Done! Substrate is ready in this project.` and exits 0. Missing
runtime dependencies are deliberately *not* blockers.

The blocker gate only binds when the detected engine equals the bootstrapped engine root
(`main.js:418-421`) — in the legacy `install`/`clone-subdir` models those lines stay
warnings.

**Quotable output lines** (`OK`/`--`/`!!` prefixes, two-space indent):

```
Found Substrate (client): substrate/engine
  OK Linked agents to agents/bloom/
  OK Linked 3 skills to .claude/skills/
  OK Created CLAUDE.md            (or "Updated" in append mode)
Wrote .substrate/state.yaml (remembers your selections for --refresh)
Scaffolded substrate client root overlays
  OK Seeded delivery manifest at .substrate/manifest.yaml
  OK Linked content root substrate/kernel/ -> ../substrate/engine/src/kernel
  OK Engine runtime dependencies resolve (tsx, js-yaml, yaml, semver)
  OK Wrote importable bundler-alias manifest to .substrate/aliases.js
     Bundler configs can spread it: import { substrateAliases } from './.substrate/aliases.js'
  OK Wrote catalog discovery index to .substrate/catalog.json
     Browse entries with: substrate add --list
Done! Substrate is ready in this project.
```

Blocker lines:

```
  !! Content root substrate/kernel/ could not be created: no engine source at substrate/engine/src/kernel.
     Generation will fail reading substrate/kernel/. Re-vendor the engine's src/kernel/ (getting-started §0).
  !! Engine runtime dependencies not resolvable here: tsx, semver.
     Generation run from this repo will fail with ERR_MODULE_NOT_FOUND. Install them with:
       npm install --save-dev tsx semver
     (Not needed if you run generation from the Substrate checkout — getting-started §0.)
```

**No-engine failure (exit 1)** — `main.js:211-223` **[verified]**:

```
Could not find Substrate in this project.
Expected one of:
  - substrate/engine/ (vendored client layout)
  - engine/ at project root (vendored client layout, remapped root)
  - node_modules/@unknown-ui/substrate/ (npm install, legacy)
  - substrate/ subdirectory (clone, legacy)
  - skills/substrate-config/ at project root (clone at root)
  - $SUBSTRATE_PATH environment variable

Substrate's engine is delivered separately from this CLI. Two ways to obtain it:
  1. Supervised engagement: you receive a signed engine bundle and onboard with
     `substrate setup` — contact Unknown Creatives (docs/delivery-runbook.md §1.1).
  2. Vendored checkout: copy the engine from a Substrate source checkout
     (docs/getting-started.md §0, "Obtain Substrate").
```

`--dry-run` does **not** bypass detection — detection at `:210` precedes the dry-run
branch at `:296`, so a bare repo fails identically.

Out-of-root `$SUBSTRATE_PATH` (`main.js:225-229`):

```
$SUBSTRATE_PATH (/tmp) resolves outside the project root.
The path must be within the project directory.
```

`--refresh` without state: `No .substrate/state.yaml found. Run \`substrate init\` first.`

### 3.2 `substrate add`

Purpose: copy a catalog entry into the client content root, record provenance in the
delivery manifest, then run the consumer's generate command.

**Flags** (`bin/lib/add.js:58-82`):

| Flag / arg | Required | Default | Meaning |
|---|---|---|---|
| `<entry-id\|name>` positional | yes (unless `--list`) | — | `components/button` or bare `button` |
| `--generate-command <cmd>` | yes | — | Shell command run as step 5/5 |
| `--catalog <dir>` | no | fallback chain | Catalog root |
| `--list` | no | off | Read-only discovery; refuses an entry id |
| `--help` / `-h` | no | — | Prints usage, exit 0 |

Catalog root fallback when `--catalog` is omitted (`add.js:196-209`):
`{projectRoot}/catalog-staging` → `{engineRoot}/catalog-staging` →
`{CLI_REPO_ROOT}/catalog-staging`. Not found → `Catalog root not found`.

Bare `name` (no slash) is resolved by scanning for entries whose last path segment
matches; zero matches → `Catalog entry not found: <request>`, multiple →
`Catalog entry "<request>" is ambiguous: <ids>`.

**Progress output** — exactly five numbered steps, then a terminal line:

```
1/5 resolve entry
2/5 validate entry
3/5 scaffold
4/5 record manifest
5/5 generate
Added catalog/components/button@0.1.0
```

The `origin` string format is `catalog/<entry-id>@<version>`.

**`--list` output shape** (`add.js:277-303`), entries grouped by top-level directory:

```
Catalog entries in /path/to/catalog-staging:

brands/
  delta  0.1.0  Brand config for delta.

Add an entry with: substrate add <entry-id|name> --generate-command <cmd> [--catalog <dir>]
```

`--list` tolerates a missing `.substrate/state.yaml` (read-only discovery), but refuses
outright when there is no state, no `--catalog`, no detectable engine, and no local
`catalog-staging/` **[verified, exit 1]**:

```
Error during add: No Substrate engine was detected in this project — there is no catalog to list.
Substrate's engine is delivered separately from this CLI. Two ways to obtain it:
  ...
```

**Catalog entry schema** — `entry.yaml` in the entry directory (`add.js:352-381`):

| Field | Type | Rule |
|---|---|---|
| `kind` | string | one of `component`, `brand`, `doc` |
| `version` | string | strict semver |
| `requires` | string[] | each must resolve to a `config.yaml` under the engine kernel or content root |
| `summary` | string | non-empty |
| `changelog` | array | any array |

Forbidden keys (`add.js:27-36`) — presence is an error, "derive it outside author YAML":
`id`, `tier`, `engine`, `platforms`, `permission`, `permissions`, `customer`, `customers`.

Per-kind file requirements (`add.js:383-402`):
- `component` → must contain `config.yaml`
- `brand` → must contain `config.yaml` or `config.global.yaml`
- `doc` → must contain at least one `.yaml` or `.md` file

**Disk effects.** Files are copied to `{contentRoot}/{entry-id}/...`. Every text file
gets a provenance header comment (`add.js:489-505`), commented per extension:
`// Substrate catalog provenance: <origin>` for JS/TS, `/* … */` for CSS,
`<!-- … -->` for HTML/SVG, `# …` otherwise, and **no header for `.json`**. Binary
extensions (`.png`, `.woff2`, …) are copied verbatim.

Add **never overwrites**: `Refusing to overwrite existing client-owned file: <path>`.
Component entries skip `brands/<family>/…` overrides for brands the client hasn't
materialized (`add.js:448-460`).

If the generate command fails, add rolls back — it deletes the scaffolded files, prunes
empty directories, and restores the previous manifest text (`add.js:184-190`).

Missing-state errors **[verified]**:
```
Error during add: No .substrate/state.yaml found. Run `substrate init` first.
No Substrate engine was detected in this project.
<acquisition guidance>
```
Missing manifest (`add.js:156-159`):
```
No .substrate/manifest.yaml found. Re-run `substrate init` in this project to seed it (init seeds the delivery manifest; older clients only got one from `substrate upgrade`).
```

### 3.3 `substrate setup`

Two mutually exclusive modes. This is the **supervised-engagement onboarding** verb —
the one that consumes a signed engine bundle. Unlike `init`, it does obtain the engine.

**Usage (`setup-plan.js:20-27`)**:
```
Usage: substrate setup (--plan | --dry-run) --engine-artifact <path> \
       [--brand <id>]... [--component <id>]... \
       [--target <css|swift|compose>]...
       substrate setup --apply <plan.json> --signing-public-key <pem|file|env:NAME>
```

**Flags** (`setup-plan.js:29-78`):

| Flag | Mode | Repeatable | Meaning |
|---|---|---|---|
| `--plan` / `--dry-run` | plan | — | Aliases for the same mode |
| `--engine-artifact <path>` | plan | no | The signed `.bundle` |
| `--brand <id>` | plan | yes | Brand selection |
| `--component <id>` | plan | yes | Component selection |
| `--target <css\|swift\|compose>` | plan | yes | Output target |
| `--apply <plan.json>` | apply | no | The saved plan |
| `--signing-public-key <pem\|file\|env:NAME>` | apply | no | Trusted release key |

Parser-level rejections:
- `--plan` + `--apply` → `Choose either --plan/--dry-run or --apply, not both.`
- `--apply` with any selection flag or `--engine-artifact` →
  `--apply accepts only a setup plan and --signing-public-key; selections come from the plan.`
- `--signing-public-key` without `--apply` → `--signing-public-key is valid only with --apply.`
- Neither mode → `Choose --plan/--dry-run to inspect setup or --apply to commit an approved plan.`

**Target vocabulary** — `bin/lib/setup-target-policy.js:6-14`, frozen:
`css` (label "CSS"), `swift` ("Swift"), `compose` ("Jetpack Compose").

**Plan mode** writes nothing and prints a canonical JSON plan to **stdout**
(`setup-plan.js:125`). Top-level plan keys: `schemaVersion` (`"1.0.0"`), `command`
(`"setup"`), `mode` (`"plan"`), `planId`, `preconditions`, `roots`, `host`,
`engineAcquisition`, `targetPolicy`, `projectDeclaration`, `aiHosts`, `phases`.

The six phase ids, in order (`setup-plan.js:162-169`): `engine-acquisition`,
`ownership-records`, `project-projection`, `host-integration`, `generation`,
`verification`.

Docs guidance from `docs/delivery-runbook.md:189-199`: keep the plan **outside** the
client repo (it binds the repo's real path and file snapshot), and redirect stderr
separately (`2> plan.err`) rather than `2>&1`, which would corrupt the plan file.

Engine-artifact inspection now runs **before** declaration inference
(`setup-plan.js:96-103` carries the comment explaining why), so a missing bundle in a
bare repo reports the bundle, not the brand **[verified]**:

```
Error during setup: Engine artifact not found: missing.bundle. Provide the .bundle file emitted by substrate artifact assemble. The signed engine bundle and its three sidecars arrive together in the engagement handoff set (docs/delivery-runbook.md §1.1).
```

Declaration errors (`bin/lib/project-declaration.js`):
- `Select at least one --brand for the inferred project declaration.`
- `Select at least one --component for the inferred project declaration.`
- `Select at least one --target (css, swift, compose).`
- `Unsupported setup target(s): <ids>. Choose from: css, swift, compose.`
- `Invalid <brand|component> selection "<v>". Use lowercase letters, digits, hyphens, and at most one slash.`
- When `substrate/project.yaml` exists *and* selection flags are passed:
  `Ambiguous project intent: substrate/project.yaml already exists, so setup selection flags cannot also define the declaration. Edit the declaration or remove the selection flags.`

**Apply mode** (`bin/lib/setup-transaction.js:35-135`) re-derives the plan from the
current repo and refuses if anything drifted:
`Setup plan no longer matches the current consumer repository. Run substrate setup --plan again.`
Other guards: `Unsupported setup plan contract.`,
`Setup plan identity does not match its contents.`, and for a missing plan file
(`setup-transaction.js:138-142`):
```
Setup plan not found: <path>. Run `substrate setup --plan` first and save its output; --apply consumes the saved plan.
```

Apply takes a lock (`setup-apply.lock`), stages everything, verifies the bundle against
attestation + checksum + signature + public key, runs native verification for
`swift`/`compose` targets and the consumer build, then commits. It prints a JSON result
with `status` (`"committed"` or `"retained"`), `planId`, `engine.version`,
`engine.sha256`, `changes`, `artifacts`, `verification`. Failure rolls back; if rollback
is incomplete, `main.js:160-167` adds:
`Setup rollback was incomplete. Recovery data was preserved at <path>.`

**What a committed apply produces** (`docs/delivery-runbook.md:219-227`):
```
substrate/engine/            the sealed engine (compiler.mjs, runtime.mjs, …)
substrate/generated/         generated output + manifest.gen.json
substrate/project.yaml       the declaration
src/substrate.setup.ts       the one setup-owned integration module
.substrate/manifest.yaml     delivery provenance
.substrate/state.yaml        AI-host/operational state
```

### 3.4 `substrate upgrade`

Purpose: swap in a newer signed engine bundle transactionally, run codemods, regenerate,
verify, and write an upgrade report.

**Flags** (`bin/lib/upgrade.js:28-52`), first five required:

| Flag | Required | Meaning |
|---|---|---|
| `--engine-artifact <bundle>` | yes | The signed `.bundle` |
| `--signing-public-key <pem\|file\|env:NAME>` | yes | Trusted release key |
| `--engine-version <semver>` | yes | Must match the version the bundle declares |
| `--regenerate-command <cmd>` | yes | Step 4/6 |
| `--verify-command <cmd>` | yes | Step 5/6, run in an isolated verification workspace |
| `--report-id <id>` | no | Names the report file |
| `--modified-engine <refuse\|discard\|freeze\|engage-uc>` | no, default `refuse` | Policy when the installed engine has local edits |

Retired flags `--artifact-sha256` and `--artifact-signature` now fail loudly
(`upgrade.js:41-43`, message at `:272-279`).

**Progress output** — six numbered steps:
```
1/6 verify artifact
2/6 swap engine
3/6 codemods
4/6 regenerate
5/6 verify
6/6 report
Upgrade complete: engine 0.58.0 -> 0.59.0
```
Plus `Codemods applied: <ids>` when any ran.

**`--modified-engine` semantics** (`upgrade.js:308-331`):
- `refuse` (default) — throws before the swap; nothing changes
- `discard` — discards local engine edits and proceeds
- `freeze` — stops, stays on the current engine, returns status `frozen`
- `engage-uc` — stops, returns status `engage-uc`

Refusal text (`upgrade.js:342-351`):
```
Engine has local modifications; deterministic upgrade stopped before swap.
Choose one explicit door before continuing:
--modified-engine discard: discard edits and take the new engine artifact.
--modified-engine freeze: stay frozen on engine <version>.
--modified-engine engage-uc: engage Unknown Creatives to upstream or scope the engine change.
Modified paths: ...
Unmanifested paths: ...
```

Other notable errors:
- `--engine-version must be semver`
- `Engine artifact version mismatch: --engine-version is X, the signed bundle declares Y`
- `No .substrate/state.yaml found. Run \`substrate init\` first.`
- `No .substrate/manifest.yaml found. Cannot run a manifest-driven upgrade. Re-run \`substrate init\` in this project to seed it.`
- Unpacked directory passed → the five-line refusal at `upgrade.js:259-270` ending
  `To produce one from a source checkout, run \`substrate artifact assemble\`.`

**Sidecar resolution** (`upgrade.js:226-232`) — derived from the bundle path, must sit
beside it: `<name>.attestation.json` (replacing the `.bundle` suffix),
`<name>.bundle.sha256`, `<name>.bundle.sig`.

**Protected resources** never clobbered by the swap (`upgrade.js:368-399`):
`.substrate/`, `substrate/project.yaml`, `substrate/substrate.config.yaml`,
`substrate/properties.yaml`, the generated root, every catalog-delivered file recorded
as a `fetch`, and any setup-owned host-integration files listed in state.

**Report** — written to `.substrate/reports/upgrade-<id>.json`. Fields:
`generatedAt`, `engine.previousVersion`, `engine.nextVersion`, `pristineRefreshed`,
`modifiedDeliveredFiles`, `pathCollisions`, `overlayDuplications`, `roots`. This file is
exactly what `substrate adopt --report` consumes.

### 3.5 `substrate adopt`

Purpose: triage and optionally apply the findings in an upgrade report, with rollback.

**Flags** (`bin/lib/adopt.js:6-27`):

| Flag | Meaning |
|---|---|
| `--report <json>` | Path to the upgrade report (project-relative only) |
| `--finding <id>` | Select one finding |
| `--apply` | Consent to mutate; requires exactly one `--finding` |
| `--rollback <id>` | Undo a previous apply; cannot combine with the above |

Guards: `--apply requires one --finding`;
`--rollback cannot be combined with --report, --finding, or --apply`;
missing report → the instructive message at `adopt.js:50-53`:
```
Missing --report: adopt reads the upgrade report JSON that `substrate upgrade` writes to .substrate/reports/upgrade-<id>.json.
```

**Finding sources** — three report arrays (`adopt.js:97-115`): `pathCollisions`,
`overlayDuplications`, `modifiedDeliveredFiles`. Finding types are
`path-collision`, `overlay-duplication`, `modified-delivered`. A non-array value gives
`Report field <key> must be an array`.

**Listing output** (no `--finding`):
```
Findings from <report>:
- <id> <summary>
Add --apply with one --finding id to mutate files.
```
or `- None` when empty.

**Planning output** (with `--finding`, no `--apply`), plan summary plus:
```
No files changed. Re-run with --apply to consent.
```

**Automatable vs manual** (`adopt.js:156-213`). Only two operations are automated:
- `path-collision` on a **file** → `copy-file` (engine file into the client path);
  summary `Plan: adopt engine file into client path`
- `overlay-duplication` with `relation: 'duplicates'` → `remove-file`;
  summary `Plan: remove duplicate overlay now covered by the engine`

Everything else refuses with a `manualReason` — directory path collisions,
`semantic-duplicate` overlays, `shadows` overlays, and all modified delivered files all
"require manual/Bloom reconciliation".

**Apply output**:
```
Applied <finding-id>
Rollback id: adopt-2026-08-12t...-<pid>-<finding-id>
```
Rollback records are written to `.substrate/adopt/<rollbackId>.json` **before** any
mutation, storing base64 snapshots of prior contents. `--rollback <id>` replays them in
reverse and prints `Rollback complete: <id>`.

Path safety: every path must be project-relative and stay inside the project root
(`adopt.js:328-337`).

### 3.6 `substrate artifact assemble`

**Vendor-side command.** It runs from a Substrate *source checkout*, not a client
project — the CLI says so explicitly. Document it as the release-engineering step that
produces what `setup` and `upgrade` consume.

`assemble` is the only action; anything else →
`Artifact command requires the \`assemble\` action`.

**Flags** (`bin/lib/engine-artifact.js:15-44`), all four required:
`--source-root <dir>`, `--output-directory <dir>`, `--version <semver>`,
`--signing-private-key <pem|file|env:NAME>`.

The signing-key parser has a special case allowing a raw PEM value that begins with
`-----BEGIN ` even though it looks like a flag (`engine-artifact.js:30-31`).

**Source-root validation runs before key material is read and before esbuild**
(`engine-artifact.js:75`, `engine-artifact-assembly.js:51-62`) **[verified]**:
```
Error during artifact assembly: --source-root is not a Substrate source checkout: <abs path> (missing or not a file: scripts/engine-compiler.ts). `substrate artifact assemble` is a vendor-side command: it runs from a Substrate source checkout, not from a client project.
```

**Success output** (`engine-artifact.js:87-90`):
```
Assembled engine artifact <version>
Artifact: <artifactPath>
Attestation: <attestationPath>
SHA-256: <sha256>
```

---

## 4. Config files the CLI creates or consumes

### `.substrate/state.yaml` — operational state (`bin/lib/state.js`)

Written by `init` and `setup --apply`; read by `add`, `upgrade`, `setup`.
One YAML document shared with the engine's `resolveRoots()`.

CLI-owned keys: `version` (1), `substratePath`, `model`, `platforms` (array of platform
ids), `scope` (`'project'`). Client-owned optional key: `roots:` with `engine`,
`content`, `generated` — a layout remap the CLI must preserve across rewrites.

Defaults when `roots:` is absent (`bin/lib/scaffold.js:8-12`):
`engine: substrate/engine`, `content: substrate`, `generated: substrate/generated`.

Legacy migration: a pre-unification `.substrate.json` is still read when the YAML file
is absent, and deleted after the first successful write, printing
`Migrated .substrate.json -> .substrate/state.yaml (legacy state file removed)`.

Root topology is validated by `resolveSetupRoots` (`bin/lib/setup-roots.js`), which
rejects roots outside the repo (including through symlinks), a content root that
contains the project root, an engine root containing the content root, and engine/
generated or engine/`.substrate` overlap. Each error is prefixed
`Invalid .substrate/state.yaml: ...`.

### `.substrate/manifest.yaml` — delivery manifest (`bin/lib/delivery-manifest.js`)

Constant `DELIVERY_MANIFEST_RELATIVE_PATH = '.substrate/manifest.yaml'`, version `1`.
Seeded by `init`, extended by `add` (fetch records), rewritten by `upgrade` (engine
hash set). Only four top-level keys are allowed — unknown keys are rejected:

```yaml
version: 1
engine:
  version: <semver>       # 0.0.0 in an init-seeded manifest
  files: {}               # relative path -> sha256, filled by upgrade
fetches:
  - id: components/button
    version: 0.1.0
    origin: catalog/components/button@0.1.0
    fetchedAt: <ISO 8601>
    files:
      - path: substrate/components/button/config.yaml
        hash: <sha256>
        origin: catalog/components/button@0.1.0
roots:
  engine: substrate/engine
  content: substrate
  generated: substrate/generated
```

### `substrate/project.yaml` — client project declaration (`bin/lib/project-declaration.js`)

Created by `setup` when inferred from selection flags; thereafter the single authority.
Exactly four allowed keys; unknown keys are rejected by name.

```yaml
version: 1
brands: [magic-patterns]
components: [button, surface]
targets: [css]
```

Rules: `version` must be `1`; `brands`/`components`/`targets` must each be a non-empty
array of unique strings; targets must be a subset of `css`/`swift`/`compose` and are
normalized into policy order; brand and component ids must match
`^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)?$`.

### `substrate/substrate.config.yaml` — organization config

Scaffolded by `init` (`scaffold.js:235-241`) from the engine's
`src/kernel/system/system.config.yaml`, and listed as a `setup` plan change
(`setup-plan.js:232-234`, "Create the client-owned system configuration overlay").
Every default is emitted **commented out** with its value, so engine tuning keeps
flowing underneath, and the live document body is a literal `{}`.

Header text (`scaffold.js:205-219`):
```
# Substrate organization config.
# Generated from the current engine documented defaults declarations.
# All values are commented so future engine tuning keeps flowing underneath.
# Uncomment a key to take ownership of that value in this client repo.
#
# <path> - default: <value>
#   <key>: <value>
...
# Every value above is commented, so the document below is an empty mapping.
# Keep the {} until you uncomment your first key, then remove it.
{}
```
Missing engine source → `Could not find engine system.config.yaml for substrate.config.yaml scaffold`.

### `substrate/properties.yaml` — client property overlay

Scaffolded by `init` (`scaffold.js:91-104`), also a `setup` plan change. Contents:
```
# Substrate client property overlay.
# Add project-specific property definitions here; engine defaults still apply underneath.
# The explicit {} keeps this file a valid (empty) YAML mapping until you add keys;
# replace it with your first top-level key.
{}
```
The literal `{}` matters: an all-comment YAML file loads as `null`, which the declared
graph rejects with "expected a YAML mapping".

### `.substrate/aliases.js` — bundler alias manifest

`ALIAS_MANIFEST_PATH = '.substrate/aliases.js'` (`bin/lib/aliases.js:127`). Written by
`init` in write mode and by `setup` (`host-alias-manifest`). An importable ES module
exporting `substrateAliases`, consumed as
`import { substrateAliases } from './.substrate/aliases.js'` →
`resolve: { alias: substrateAliases }`. Targets are rebased to absolute paths at load
time against the module's own location.

Alias policy SSOT is the engine's `src/aliases.ts`, loaded at runtime — `init` never
hardcodes a second list. Public patterns: `@substrate/engine`, `@substrate/components/*`,
`@substrate/generated/*`. `@substrate/engine/*` is `internal`; bare `@substrate/*` is
`unsupported`. Toolchains: `tsconfig`, `vite`, `vitest`, `webpack`, `next`.

When the policy cannot be loaded, init degrades rather than lying:
```
Could not load the alias policy to configure aliases automatically.
Reason: <cause>
Detected toolchains: <list>.
See docs/alias-contract.md for the supported @substrate/* aliases to add by hand.
```

### `.substrate/catalog.json` — catalog discovery index

`CATALOG_INDEX_PATH = '.substrate/catalog.json'` (`add.js:305`). Emitted by `init` in
write mode only; silently skipped when no catalog is reachable or `.substrate/` is
unwritable — never fails init. Shape:
```json
{ "version": 1, "catalog": "catalog-staging", "entries": [ { "id": "...", "kind": "...", "version": "...", "summary": "..." } ] }
```
`rootIsAbsolute: true` is added when the catalog resolves outside the project tree.

### `.claude/settings.json` — hooks (only when `.claude/` already exists)

Merged, never replaced (`scaffold.js:338-359`). Adds `PreToolUse` matchers for
component `config.yaml` and `config.doc.yaml` writes (running the engine's
`scripts/validate-config-write.sh` / `validate-doc-write.sh` with a 10s timeout), a
`PostToolUse` prompt hook on brand config writes, and a `Stop` hook running
`scripts/store-learnings.sh` with a 15s timeout. Env vars passed:
`SUBSTRATE_CONTENT_DIR`, `SUBSTRATE_MEMORY_DIR`.

### Other generated paths

- `.substrate/reports/upgrade-<id>.json` — upgrade reports
- `.substrate/adopt/<rollbackId>.json` — adopt rollback records
- `.substrate/setup-apply.lock` — setup apply lock
- `substrate/memory/{MEMORY,feedback,decisions,patterns,gotchas}.md` — Bloom memory seed

---

## 5. Cross-check of the existing survey (`docs/agents/2026-08-12-ucs-1124-cli-survey.md`)

That document is a **UCS-1124 pre-implementation snapshot**. Its own header says
findings may have been addressed by later commits. At `0f32f6a6`, most of its
recommendations have shipped. Do **not** use it as a source for docs.

### Stale / wrong at 0f32f6a6

| Survey claim | Status at 0f32f6a6 | Evidence |
|---|---|---|
| "`--version` prints `0.1.0` today (`packages/cli/package.json:3`)" (§3, §6 step 4) | **Wrong.** Version is `0.59.0` | `packages/cli/package.json:3`; `substrate --version` → `0.59.0` **[verified]** |
| "there is **no top-level `process.on('uncaughtException')`** and no top-level try/catch" (§1) | **Wrong.** Both handlers exist and are the whole point of the bin now | `bin/substrate-init.js:11-23` |
| Line-number table for dispatch cites `substrate-init.js:33-35`, `:107-116`, `:118-127`, … (§1) | **Wrong file.** Dispatch moved out of `substrate-init.js` into `bin/main.js`. `substrate-init.js` is now 23 lines | `bin/substrate-init.js`, `bin/main.js` |
| "`setup --plan` … tells the user to pick a brand rather than that their bundle is missing" (§2) | **Fixed.** Artifact inspection now precedes declaration inference | `setup-plan.js:96-103`; **[verified]** output names the bundle |
| "`add --list` … exits **0** and prints the catalog of the Substrate development checkout" (§2) | **Fixed.** Refuses with exit 1 when no state, no `--catalog`, no engine, no local `catalog-staging/` | `add.js:108-119`; **[verified]** exit 1 |
| "`artifact assemble` … **raw esbuild error escapes**" / "no `--source-root` validation at all" (§2) | **Fixed.** `assertEngineSourceCheckout` runs before key reading and esbuild | `engine-artifact.js:75`, `engine-artifact-assembly.js:51-62`; **[verified]** clean message |
| "`init` message … never names **the fix**" (§2) | **Fixed.** Acquisition guidance block now appended | `main.js:221`, `bin/lib/acquisition.js`; **[verified]** |
| "`add.js:113`", "`add.js:129-132`", "`adopt.js:79`", "`upgrade.js:88`", "`detect.js:33-93`" etc. | **All line numbers shifted.** e.g. the add state error is now `add.js:134-139`; detect is `detect.js:56-116` | current sources |
| "`resolveCatalogRoot` (`add.js:169-181`)", "`CLI_REPO_ROOT` … (`add.js:21`)" | Numbers stale; logic still present at `add.js:196-209` and `add.js:23` | `add.js` |
| §5: "**Only `substrate-init.js:211` calls `detectSubstrate`. No other command does.**" | **Wrong now.** `add` calls `engineDetected()` twice | `add.js:112`, `add.js:133` |
| §5 detect table "`detect.js:44-84`" and "`:24-27`" | Line numbers stale; the five-row probe table itself is still accurate | `detect.js:67-107` |
| §6: "`ONBOARDING_P0_CONTRACT` (`:17-31`) lists 13 blocking contracts. **None of them is `init`**" | Not re-verified in this survey; treat as unconfirmed | — |
| §2 summary table rows for `setup --plan`, `add --list`, `artifact assemble` | All three rows now wrong per the fixes above | — |

### Still accurate

- `adopt --report <empty {}>` in a repo with no engine **exits 0** and prints
  `- None` **[verified]**. `runAdopt` still never reads state or touches the engine.
- Per-subcommand `--help` returns `{ help: true }` and exits 0; `substrate init --help`
  is still unhandled.
- Unknown command prints usage to **stdout** and exits 1 **[verified]**, with nothing
  on stderr — the asymmetry the survey flagged persists.
- `--version` exits **0 even on its failure path** (`main.js:111-114` then `:114`).
- The engine-detection probe list and the hardcoded expected-layout literal in the bin
  are still two separate lists that can drift (`main.js:214-219` vs `detect.js:67-107`).
- The `.bundle`/sidecar messages in `setup-engine-artifact.js` are contract-quality.
- Docs anchors: getting-started §0 at `docs/getting-started.md:20`; delivery-runbook
  handoff set §1.1 — both still present and quoted above.

---

## 6. Identifiers a docs accuracy checker can verify

**Command names** (exact `argv[0]` matches): `init`, `add`, `upgrade`, `adopt`,
`setup`, `artifact`, `--version`, `-v`, `--help`, `-h`.
Sub-action: `assemble` (only valid action for `artifact`).

**Flags by verb**

- init: `--refresh`, `--platform`, `--all`, `--dry-run`, `--report-aliases`
- add: `--list`, `--catalog`, `--generate-command`, `--help`, `-h`
- upgrade: `--engine-artifact`, `--signing-public-key`, `--engine-version`,
  `--regenerate-command`, `--verify-command`, `--report-id`, `--modified-engine`
  (retired, now error: `--artifact-sha256`, `--artifact-signature`)
- adopt: `--report`, `--finding`, `--apply`, `--rollback`
- setup: `--plan`, `--dry-run`, `--engine-artifact`, `--apply`, `--signing-public-key`,
  `--brand`, `--component`, `--target`
- artifact: `--source-root`, `--output-directory`, `--version`, `--signing-private-key`

**Enumerated flag values**
- `--modified-engine`: `refuse` (default), `discard`, `freeze`, `engage-uc`
- `--target` / project `targets`: `css`, `swift`, `compose`
- key inputs accept `<pem|file|env:NAME>`

**Scaffolded / consumed file names**
`.substrate/state.yaml`, `.substrate/manifest.yaml`, `.substrate/aliases.js`,
`.substrate/catalog.json`, `.substrate/reports/upgrade-<id>.json`,
`.substrate/adopt/<id>.json`, `.substrate/setup-apply.lock`, `.substrate.json` (legacy),
`substrate/project.yaml`, `substrate/substrate.config.yaml`, `substrate/properties.yaml`,
`substrate/memory/MEMORY.md` (+ `feedback.md`, `decisions.md`, `patterns.md`,
`gotchas.md`), `substrate/{components,brands,knowledge,references}/.gitkeep`,
`src/substrate.setup.ts`, `entry.yaml`, `config.yaml`, `config.global.yaml`,
`config.doc.yaml`, `manifest.gen.json`, `.claude/settings.json`.

**Exported symbols** (stable enough to cite)
- `bin/lib/platforms.js`: `PLATFORMS`, `getPlatform`
- `bin/lib/detect.js`: `detectSubstrate`, `detectEngine`, `engineDetected`, `detectPlatforms`
- `bin/lib/state.js`: `readState`, `writeState`
- `bin/lib/scaffold.js`: `scaffoldClientLayout`, `resolveClientLayoutRoots`,
  `createSystemDocumentedDefaults`, `renderClaudeHookSettings`
- `bin/lib/bootstrap.js`: `CONTENT_ROOT_LINKS` (`['kernel','platforms','types']`),
  `ENGINE_RUNTIME_DEPENDENCIES` (`['tsx','js-yaml','yaml','semver']`),
  `ensureDeliveryManifest`, `ensureContentRootLinks`, `checkEngineRuntimeDependencies`,
  `bootstrapClient`, `collectBootstrapBlockers`, `renderBootstrapSummary`
- `bin/lib/add.js`: `parseAddFlags`, `runAdd`, `addUsage`, `emitCatalogIndex`,
  `CATALOG_INDEX_PATH`
- `bin/lib/adopt.js`: `parseAdoptFlags`, `runAdopt`, `adoptUsage`
- `bin/lib/upgrade.js`: `parseUpgradeFlags`, `runUpgrade`, `upgradeUsage`
- `bin/lib/setup-plan.js`: `parseSetupFlags`, `runSetupPlan`, `setupUsage`
- `bin/lib/setup-transaction.js`: `runSetupApply`
- `bin/lib/setup-target-policy.js`: `SETUP_TARGET_POLICY`, `SETUP_PROJECT_TARGETS`
- `bin/lib/engine-artifact.js`: `parseEngineArtifactFlags`, `runEngineArtifactCommand`,
  `engineArtifactUsage`, `assembleEngineArtifact`, `createLocalEngineArtifactProvider`,
  `inspectEngineArtifact`
- `bin/lib/aliases.js`: `ALIAS_MANIFEST_PATH`, `loadAliasPolicy`, `detectToolchains`,
  `setupAliases`, `renderAliasSummary`, `emitAliasManifest`
- `bin/lib/delivery-manifest.js`: `DELIVERY_MANIFEST_RELATIVE_PATH`, `MANIFEST_PATH`,
  `DELIVERY_MANIFEST_VERSION`, `validateDeliveryManifest`, `readDeliveryManifest`,
  `writeDeliveryManifest`, `buildDeliveryHashSet`, `hashFile`, `hashBytes`
- `bin/lib/acquisition.js`: `HANDOFF_SET_SENTENCE`, `acquisitionGuidance`,
  `acquisitionGuidanceLines`
- `bin/lib/project-declaration.js`: `resolveProjectDeclaration`,
  `parseProjectDeclaration`, `renderProjectDeclaration`
- `bin/lib/setup-roots.js`: `resolveSetupRoots`, `joinPlanPath`, `toPlanPath`

**Stable message fragments worth pinning in a docs checker**
- `Could not find Substrate in this project.`
- `Substrate's engine is delivered separately from this CLI. Two ways to obtain it:`
- `Done! Substrate is ready in this project.`
- `Init completed with N blocker(s) — see the !! lines above.` (N is a number)
- `No .substrate/state.yaml found. Run \`substrate init\` first.`
- `Error during add: ` / `Error during upgrade: ` / `Error during adopt: ` /
  `Error during setup: ` / `Error during artifact assembly: ` / `Error during setup: `
  (init's own catch also uses `Error during setup: `)
- `substrate: ` (top-level guard prefix)
- `No files changed. Re-run with --apply to consent.`
- `Add --apply with one --finding id to mutate files.`
- `Upgrade complete: engine <old> -> <new>`
- `Assembled engine artifact <version>`
- `Setup plan no longer matches the current consumer repository. Run substrate setup --plan again.`

**Environment variables**: `SUBSTRATE_PATH`, `SUBSTRATE_DEBUG`,
`SUBSTRATE_CONTENT_DIR`, `SUBSTRATE_MEMORY_DIR`. Test-only hooks (do not document):
`SUBSTRATE_SETUP_FAIL_BEFORE_COMMIT`, `SUBSTRATE_SETUP_FAIL_AFTER_REPLACE`.

---

## 7. Documentation cautions

1. **Never write `npx substrate`.** It resolves to an unrelated third-party package.
   Use the runbook §6 shell-function form or the direct
   `node <checkout>/packages/cli/bin/substrate-init.js` invocation.
2. **The CLI needs its checkout's `node_modules`.** Copying `bin/` out standalone fails
   with `ERR_MODULE_NOT_FOUND` on `js-yaml`.
3. **`init` and `setup` are different onboarding doors.** `init` requires an engine to
   already be vendored and wires AI tooling; `setup` consumes a signed bundle and is
   the supervised-engagement path. Do not present them as alternatives to each other
   without that distinction.
4. **`artifact assemble` is vendor-side.** The CLI refuses to run it from a client
   project. Keep it out of consumer quickstarts.
5. **Interactive `init` needs a TTY.** Without `--platform` or `--all`, a non-interactive
   run selects nothing and exits 0 with `No platforms selected. Nothing to do.` — a
   false pass in CI.
6. **Version strings drift.** The CLI version is `0.59.0` at this commit; prefer
   `substrate --version` over a hardcoded number in docs.
7. Scaffolded YAML overlays intentionally contain a literal `{}` — do not describe them
   as "empty files" or advise deleting the braces before adding a first key.
