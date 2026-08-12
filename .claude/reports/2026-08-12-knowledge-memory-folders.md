# Substrate `knowledge/` and `memory/` — research report

**Scope:** the engine's top-level `knowledge/` and `memory/` folders — structure, formats, consumers, authoring rules, lifecycle.
**Source checkout:** `/tmp/claude-501/substrate-om` (detached worktree at `origin/main`, commit `c9535187`, "chore: remove release bump file"). Read-only; nothing modified.
**Method:** every claim below is anchored to a file path, with line numbers for load-bearing claims. Where the repo does not state a purpose, this report says "not documented in-repo" rather than inferring one.

---

## Part 1 — `knowledge/`

### 1.1 What it is, in the repo's own words

`knowledge/_catalog.yaml:2-13` defines it:

> heading: "Substrate Knowledge Base"
> description: System-agnostic knowledge about human perception, accessibility, culture, and language as they relate to interface adaptation. **This knowledge base never references specific system elements (properties, components, modes, config keys).**
> notes: scope — "World knowledge for personalization. The bridge between knowledge and system behavior lives in skill reasoning, not in these files."

That scope note is the folder's defining constraint and the cleanest one-sentence definition available in-repo: `knowledge/` is **world knowledge** (facts about humans), deliberately decoupled from **system knowledge** (facts about Substrate). The system-knowledge counterpart is `references/` and `references/ontology/`; the boundary is restated in `references/ontology/classes/900-maintenance.yaml:21` ("The ontology is system knowledge; `knowledge/` remains world knowledge") and `references/ontology/_rules.yaml:26`.

The organizing scheme is an explicit **Dewey Decimal Classification analogue** — the skill that manages it is described as managing "the DDC-organized knowledge base" (`skills/substrate-knowledge/SKILL.md:4`), leaves carry Dewey-style `notation` values (`1.1.3`, `2.1.2`, …), and the qualifier tables are annotated "Analogous to DDC Table 2 / Table 5 / Table 6" (`knowledge/_tables/geographic.yaml:5`, `groups.yaml:5`, `languages.yaml:5`).

### 1.2 Full directory tree

Four levels: **catalog → domain → division → leaf**. 6 domains, 20 divisions, 54 leaf `.md` files, 27 `_index.yaml` files, 3 tables, plus `_catalog.yaml`, `_rules.yaml`, `AGENTS.md`.

```
knowledge/
├── _catalog.yaml                  # root: 6 domains (59 lines)
├── _rules.yaml                    # 5 ambiguity-resolution rules (33 lines)
├── AGENTS.md                      # the read/traversal protocol for agents (58 lines)
├── _tables/                       # cross-domain qualifiers (DDC-style tables)
│   ├── geographic.yaml            # 10 regions (48 lines)
│   ├── groups.yaml                # 5 demographic groups (27 lines)
│   └── languages.yaml             # script systems + direction (40 lines)
│
├── accessibility/                 # domain 1 — persistent traits
│   ├── _index.yaml
│   ├── vision/          _index.yaml + color-perception, contrast-needs, low-vision
│   ├── motor/           _index.yaml + ataxia-and-cerebellar-disorders, parkinsons-tremor,
│   │                    repetitive-strain-injury, single-hand-operation,
│   │                    switch-and-alternative-input
│   ├── cognitive/       _index.yaml + adhd, autism-sensory, dementia-and-cognitive-decline,
│   │                    dyslexia, photosensitivity, traumatic-brain-injury
│   ├── auditory/        _index.yaml + auditory-processing-disorder,
│   │                    deafness-and-hard-of-hearing, hyperacusis-and-misophonia, tinnitus
│   └── mental-health/   _index.yaml + anxiety-disorders, bipolar-disorder,
│                        major-depressive-disorder, obsessive-compulsive-disorder,
│                        post-traumatic-stress-disorder, schizophrenia-spectrum
│
├── culture/                       # domain 2
│   ├── _index.yaml
│   ├── color-meaning/            east-asian-, mena-, western-color-associations
│   ├── reading-direction/        right-to-left-scripts
│   ├── symbolism/                _index.yaml only — NO leaves
│   └── typography-conventions/   cjk-typography
│
├── perception/                    # domain 3
│   ├── _index.yaml
│   ├── color-theory/             color-temperature-and-warmth,
│   │                             simultaneous-contrast-and-color-context
│   ├── density-comfort/          cognitive-load-and-density, information-density-preference,
│   │                             minimalism-and-maximalism-aesthetics
│   └── motion-sensitivity/       functional-vs-decorative-motion,
│                                 motion-sickness-and-cybersickness,
│                                 oculomotor-and-binocular-vision,
│                                 prefers-reduced-motion-spectrum, vestibular-disorders
│
├── language/                      # domain 4
│   ├── _index.yaml
│   ├── script-systems/           arabic-script, cjk-ideographs
│   ├── numeral-systems/          cjk-and-indic-numerals, eastern-arabic-numerals
│   └── text-expansion/           text-expansion-and-contraction
│
├── context/                       # domain 5 — external situation, minutes-to-hours
│   ├── _index.yaml
│   ├── ambient/                  bright-sunlight-and-outdoor-glare,
│   │                             dim-and-dark-adapted-environments,
│   │                             mixed-and-fluctuating-lighting
│   ├── device/                   mobile-handheld, vehicle-display
│   └── activity/                 _index.yaml only — NO leaves (explicitly deferred)
│
└── state/                         # domain 6 — transient internal, hours-to-months
    ├── _index.yaml
    ├── psychological/            acute-fatigue-and-burnout, acute-grief-and-bereavement
    ├── physiological/            medication-induced-visual-effects,
    │                             pregnancy-induced-visual-changes
    └── chronobiological/         jet-lag-and-sleep-deprivation
```

**Two empty divisions are deliberate, not broken.** `knowledge/context/activity/_index.yaml:22` has `sections: []` with a revision note at lines 20-21: *"Leaves pending future batch — no activity leaves authored in 2026-05-20 batch."* `knowledge/culture/symbolism/` likewise has an index and no leaves. These are useful for docs as an illustration of how the tree carries honest coverage gaps.

### 1.3 The six domains and their axis of separation

`knowledge/_catalog.yaml:25-58` lists them. The distinguishing axis is explicitly **time-scale**, which is the most quotable design idea in the folder:

| Domain | Time-scale (as stated) | Catalog lines |
|---|---|---|
| `accessibility` | "persistent traits" | 26-31 |
| `culture` | (none stated) | 32-36 |
| `perception` | (none stated) | 37-41 |
| `language` | (none stated) | 42-46 |
| `context` | "minutes to hours" | 47-52 |
| `state` | "hours to months" | 53-58 |

`state` is defined as "Distinct from accessibility because these conditions **resolve**" (`_catalog.yaml:57-58`). The domain-level `_index.yaml` files reinforce the split with explicit `class-elsewhere` routing — e.g. `knowledge/accessibility/_index.yaml:10-13`: "Cultural accessibility (reading direction, symbolism) is classed in culture/. Transient conditions (pregnancy, post-surgery, jet lag) are classed in state/."

### 1.4 File formats — three shapes

**(a) `_catalog.yaml` (root, one file).** YAML wrapped in `---` fences. Keys: `heading`, `description`, `notes[]` (typed: `scope`, `revision` with `date`+`text`), `domains[]` (each `id`/`heading`/`description`). Note the `revision` notes at lines 14-24 double as an in-file changelog — the 2026-05-19 entry records adding `context`, `state`, and the `mental-health` division.

**(b) `_index.yaml` (one per domain and per division, 27 total).** Domain-level indexes carry `domain`, `heading`, `description`, `notes[]`, and `divisions[]`. Division-level indexes carry `domain`, `division`, `heading`, `description`, `notes[]`, and `sections[]` where each section is `{id, heading, file}` — the `file` field is the hard link to the leaf (`knowledge/accessibility/vision/_index.yaml:13-22`).

**(c) Leaf `.md`.** YAML frontmatter + Markdown body. Canonical example `knowledge/accessibility/vision/low-vision.md`:

- `notation: "1.1.3"` (line 2) — Dewey-style domain.division.section
- `domain`, `division`, `heading`, `description` (lines 3-9)
- `notes[]` (lines 10-29) — typed governance notes, see 1.5
- `terms[]` (lines 30-41) — search/matching vocabulary ("low vision", "magnification", "macular degeneration", …)
- `edition: 2` (line 42) — bumped on expansion
- `contributors[]` (lines 43-45) — `bloom`, `dimitri`
- `sources[]` (lines 46-105) — structured citations: `id`, `title`, `authors[]`, `publisher`, `year`, `doi`/`isbn`/`url`, and `type` (observed values: `peer-reviewed`, `agency`, `monograph`)
- Body (lines 108-145) — prose with **inline bracket citations keyed to source ids**, e.g. `[who-vision-fs, who-vision-2019]` at line 110, `[bailey-lovie-1976, legge-2007]` at line 123.

The body convention is worth documenting: sections like `## Adaptation Principles` and `## Interaction Effects`, where "Interaction Effects" enumerates how this condition compounds with others and cross-links by path (`low-vision.md:142-145` links to `accessibility/vision/color-perception/`, `perception/motion-sensitivity/`, `accessibility/cognitive/photosensitivity/`).

Across all 54 leaves: `edition: 1` on 51, `edition: 2` on 3. Contributors are `dimitri` (54) and `bloom` (54) — i.e. every leaf lists both.

### 1.5 The typed `notes` vocabulary (DDC-derived, and the most distinctive convention)

Note types observed across catalog, indexes, and leaves, with meaning as defined in `knowledge/AGENTS.md:26-32`:

| `type` | Meaning | Agent behavior (AGENTS.md) |
|---|---|---|
| `scope` | What this entry covers / excludes | boundary statement |
| `class-here` | What kind of material belongs at this node | authoring guidance |
| `class-elsewhere` | **Redirect** — content lives elsewhere | "Follow the pointer and read from there instead" (line 30) |
| `see-also` | Related knowledge | "Read these when the current task touches multiple aspects of a single user need" (line 31) |
| `including` | **"Standing room"** — topics that might belong here but were never promoted to their own leaf | "Do not over-index on these — they are placeholders, not authoritative content" (line 32) |
| `revision` | Dated change log entry (`date` + `text`) | provenance |

"Standing room" is genuine DDC vocabulary and is the term the repo uses; `skills/substrate-knowledge/SKILL.md:135-136` makes it actionable — the audit flags standing-room items referenced in 3+ entries as promotion candidates for their own leaf.

### 1.6 `_rules.yaml` — ambiguity resolution, in priority order

`knowledge/_rules.yaml:6-32`, five rules applied in order when a fact could be classified in more than one place:

1. **`rule-of-application`** (priority 1) — "Classify where the knowledge is **applied**. Impact of culture on accessibility belongs in accessibility, not culture."
2. **`fuller-treatment`** (2) — prefer the entry with deeper coverage.
3. **`first-of-two`** (3) — equally applicable → prefer the earlier one in the hierarchy; *exception:* if both are the two major subdivisions of a parent, use the parent.
4. **`rule-of-three`** (4) — three or more applicable entries sharing a parent → use the parent.
5. **`table-of-last-resort`** (5) — fall back in this order: kinds of needs → parts of experience → properties of interface → processes affecting user → operations user performs.

⚠️ **Documentation accuracy caveat.** `knowledge/AGENTS.md:46` describes the rules file as enumerating "which dimension takes precedence when adaptations conflict (**accessibility over preference, stated need over inferred context**, etc.)". Those two example rules **do not exist in `_rules.yaml`** — the actual five rules are about *where to file* knowledge, not which adaptation wins at runtime. This is a real prose/SSOT drift in the engine. Do not repeat the AGENTS.md phrasing in public docs; describe `_rules.yaml` from the file itself.

### 1.7 `_tables/` — cross-domain qualifiers

Three files, described as "dimensions that qualify knowledge entries", each explicitly analogized to a DDC table.

- `geographic.yaml` (48 lines, "Analogous to DDC Table 2") — 10 regions keyed `east-asia`, `south-asia`, `southeast-asia`, `middle-east`, `europe-west`, `europe-east`, `africa-sub-saharan`, `americas-latin`, `americas-north`, … each with `heading`, `description` (country list), and `terms[]`.
- `groups.yaml` (27 lines, "Analogous to DDC Table 5") — 5 demographic groups: `children`, `elderly`, `low-literacy`, `motor-impaired`, `cognitive-load`.
- `languages.yaml` (40 lines, "Analogous to DDC Table 6") — script systems keyed `latin`, `arabic`, `hebrew`, `cjk`, `devanagari`, `cyrillic`, … each with `heading`, `direction` (`ltr`/`rtl`), and `terms[]`.

Usage rule (`knowledge/AGENTS.md:42`): "Consult tables when a leaf's adaptation strategies depend on user-specific qualifiers that the leaf itself does not enumerate." `geographic.yaml:5-7` adds that "The skill combines base knowledge with regional qualifications during reasoning" — i.e. combination happens in the model's reasoning, not by any file-level join.

### 1.8 Who consumes `knowledge/`

Four distinct consumers, in decreasing directness:

**(a) The Bloom agent — prose navigation (primary).**
`agents/bloom/abilities.md:8` lists Bloom's knowledge sources as "`references/*.md` files … **plus the `knowledge/` base (system-agnostic world knowledge for personalization). Loaded selectively.**" Line 182 delegates the how: "Knowledge navigation is governed by `knowledge/AGENTS.md`. Read that file when you need to traverse the knowledge base." Line 184 adds that "The same navigation pattern applies to `evals/` — the eval tree mirrors the knowledge tree."

**(b) `knowledge/AGENTS.md` — the traversal protocol itself.** Frontmatter `name: knowledge-base-navigation`, `audience: agents` (lines 2-8). It is addressed to any agent regardless of invoking skill (line 13). Its core mandate, **progressive disclosure**, is stated as a hard rule at line 17: *"Never read by hardcoded path. Always start from the catalog and descend."* Then the four steps (lines 19-22): `_catalog.yaml` → domain `_index.yaml` → division `_index.yaml` → leaf `.md`. The stated rationale (line 24) is that the protocol "prevents you from over-reading (loading content you don't need) and from **under-reading (missing the classification context that gives a leaf its meaning)**."

The file also scopes itself explicitly (lines 52-57): it covers *reading and traversal only*; writing, auditing, and explaining are the substrate-knowledge skill's operations.

**(c) `skills/substrate-knowledge/SKILL.md` — the five operations.** 147 lines, frontmatter `name: substrate-knowledge`. Operations:

| Flag | Purpose | Lines | Writes `knowledge/`? |
|---|---|---|---|
| `--classify` | Propose where new knowledge belongs (traverse, apply `_rules.yaml`, propose notation/domain/division/heading/description) | 21-29 | no |
| `--build` | Create or expand entries | 31-53 | **yes — the only path that does** |
| `--resolve` | Navigate from natural language via progressive disclosure; returns consulted entries + paths | 111-116 | no |
| `--audit` | Walk the *entire* tree for structural integrity | 118-137 | no |
| `--explain` | Explain a classification decision root-to-leaf, naming which ambiguity rule decided it | 139-147 | no |

`--audit` is the concrete definition of "structurally valid" and is worth documenting verbatim (lines 122-137): every `_index.yaml` division id has a matching subdirectory and every listed section file exists; every leaf has valid frontmatter with all required fields, ≥1 governance note (`scope` or `class-here`) and ≥1 `revision` note; every `class-elsewhere` and `see-also` path resolves; orphan files not listed in any `_index.yaml` are reported; `including` items appearing in 3+ entries are flagged as promotion candidates.

The skill also draws the knowledge/ontology line up front (lines 13-19): Substrate-specific *terminology* goes through `skills/substrate-ontology`; the DDC tree is for "broader world knowledge."

**(d) The MCP server — the one real code consumer.** `packages/mcp/src/compile.ts:17-69` (`compileKnowledge`) walks `knowledge/`: loads `_catalog.yaml` (stripping the `---` fences, line 22), loads `_rules.yaml` if present (26-28), then for each catalog domain reads its `_index.yaml` and every division subdirectory, splitting each leaf `.md` into `{content, frontmatter}` via the regex at line 54. Output shape `CompiledKnowledge = {catalog, domains, rules}` (`packages/mcp/src/compiled-types.ts:36-40`). It is emitted as `knowledge.ts` (`compile.ts:174`) into `packages/mcp/src/compiled/`, which is **gitignored** (`.gitignore`, "packages/mcp/src/compiled/") — a build artifact.

Scale note worth quoting: `compiled-types.ts:5-8` explains the compiled modules use explicit type annotations rather than `as const` because "**the knowledge module alone is >1MB**, and an as-const literal of that size exceeds the compiler's type-serialization limit under declaration emit (TS7056)."

Downstream of the compile step: `packages/mcp/src/resources/knowledge.ts` exposes MCP resources at URIs `substrate://knowledge`, `substrate://knowledge/{domain}`, and (per the plan doc `docs/superpowers/plans/2026-05-14-mcp-plan-3-resources-prompts.md:176`) `substrate://knowledge/{domain}/{division}/{leaf}`. `packages/mcp/src/pipeline/orchestrator.ts` imports the compiled knowledge (line 5), instructs the model to "NAVIGATE: For each dimension, find relevant knowledge leaves" (line 46), and returns a trace containing `knowledgePaths` (lines 51, 131).

**Important nuance for docs:** despite the MCP compiler, there is **no knowledge resolver** — navigation is prose-driven. `docs/archive/genesis/kit/engine-contract.md:46` states it plainly: *"Today the DDC `knowledge/` tree is **prose-navigated** (`knowledge/AGENTS.md`); there is no code resolver."* The ontology has a code resolver; knowledge does not. (That file is an archived design doc for a *different, unshipped* product — the "Genesis Kit" — so cite it only for this factual observation about Substrate, never as Substrate's roadmap.)

**(e) The eval tree mirrors it.** `evals/_catalog.yaml:5-6` — "Eval tree mirrors the knowledge tree — coverage gaps are structurally visible" — with four categories that each "Fire when [domain] knowledge paths are consulted. Mirrors knowledge/[domain]/" (`evals/_catalog.yaml:22-41`, plus `evals/*/_index.yaml:6`). The firing mechanism is `domain_selection: "knowledge-path-prefix"` (`workflows/personalization-pipeline.md:62`), implemented at `packages/mcp/src/pipeline/judge-dispatch.ts:180-181`. This closes the loop on `knowledge/AGENTS.md:48-50`: "If you are running a personalization pipeline, record which leaf entries you consulted. This list feeds the eval pipeline's firing rules — **evals only fire for domains the agent actually used.**" Note that the eval mirror covers only 4 of the 6 domains — `context` and `state` have no eval category.

**(f) The ontology points at it.** `references/ontology/classes/700-human-context.yaml` names knowledge indexes as `source-of-truth` for human-context concepts: line 14 (`knowledge/accessibility/_index.yaml` alongside `src/kernel/accessibility/contract.yaml`), line 42 (`culture`), line 56 (`perception`), line 70 (`language`) — with line 21 noting "Detailed world knowledge stays under `knowledge/`."

### 1.9 How a user adds or composes a knowledge entry

The authoring path is `--build`, and it is **the only writer**. `skills/substrate-knowledge/SKILL.md:35-40`:

> `--build` is the **only** path that writes to `knowledge/`. It is a human-gated step: the reflect/evolve self-learning loop never writes `knowledge/` directly (it writes `memory/` and `references/` only). Every `knowledge/` change flows through a reviewer running `--build` against vetted findings. **Do not run `--build` from an unattended cron or an autonomous reflection phase; it requires a human in the loop.**

Procedure (lines 42-53):

*New leaf:* run `--classify` first (or accept a pre-classified location) → generate frontmatter including `notation, domain, division, heading, description, notes (scope + class-elsewhere + see-also + revision), terms, edition, contributors` → write actionable content in the body → **update the parent division `_index.yaml` `sections` list**.

*Expanding a leaf:* read the existing entry → add content sections → add a `revision` note with today's date → **increment `edition`** → add contributor.

**The findings → knowledge promotion path** (lines 55-109) is the five-step lifecycle for how a learning becomes world knowledge:

1. **Accumulate** — learnings land in `memory/` during work and daily reflection. A candidate is tagged by adding `Promote-to: knowledge/` to its `Applied to:` line (lines 66-75).
2. **Queue** — reflection surfaces candidates but does not act; never applied during an autonomous or cron phase (77-80).
3. **Review gate** — a human checks four things (82-92): it is **world knowledge** (not a Substrate-internal fact → `references/`; not shared terminology → ontology); it is **durable and sourced** ("`knowledge/` leaves carry citations; an unsourced claim is not promotable"); it does not **duplicate or contradict** an existing leaf (if it refines one, expand that leaf rather than create a competitor); the proposed **classification** is correct.
4. **Promote** — the reviewer runs `--build`; "This is the only step that mutates `knowledge/`" (94-97).
5. **Prune** — the `memory/` entry becomes prunable on the next reflection cycle (99-101).

Rationale, quotable (lines 105-109): *"Bloom self-learns, but the SSOT world-knowledge base must not drift on autonomous writes. … An unattended reflection can propose; only a human, through `--build`, promotes."*

### 1.10 How `knowledge/` affects engine and agent behavior

- **It never touches generated CSS or tokens.** No script in `scripts/` references `knowledge` (verified: `grep -rln knowledge scripts/` returns nothing). There is no build step, validator, or npm script for `knowledge/` in `package.json`.
- **It shapes agent reasoning during personalization.** The bridge is explicitly reasoning, not code (`_catalog.yaml:11-13`: "The bridge between knowledge and system behavior lives in skill reasoning, not in these files").
- **It gates which evals fire** (§1.8e).
- **It is served to MCP clients** as resources and injected into the personalization orchestrator prompt (§1.8d).

### 1.11 Client overlay and distribution

`knowledge/` is **vendored to client projects and overlayable**:

- `docs/getting-started.md:54` — `references/` and `knowledge/` are copied to `substrate/engine/references/` + `.../knowledge/` because they are "reference and knowledge content the skills read at runtime."
- `packages/cli/bin/lib/scaffold.js:14` — `const CLIENT_DIRS = ['components', 'brands', 'knowledge', 'references'];` — `substrate init` scaffolds a **client-side `knowledge/`** directory for project-specific overlays.
- `packages/cli/bin/lib/upgrade.js:572-574` — `isKnowledgeOverlayPath()` returns true for `knowledge/` and `references/` prefixes, feeding `findSemanticOverlayDuplications()` (line 576) so `substrate upgrade` reports when a client's overlay entry semantically duplicates a refreshed engine entry, for later `substrate adopt` reconciliation.
- `packages/cli/bin/lib/template.js:26` lists `substrate-knowledge: Knowledge base access` in the scaffolded agent instructions.

There is **no write-guard hook on `knowledge/`**. Component configs and doc configs get `PreToolUse` validation hooks (`scaffold.js:268-289`, `renderClaudeHookSettings`), and `skills/*/SKILL.md` gets `scripts/validate-skill-write.sh` — but no equivalent for `knowledge/`. `docs/archive/genesis/kit/engine-contract.md:82` names this as a known gap ("config/doc are guarded today via `.claude/settings.json`; `knowledge/` is NOT — close that gap"). The human gate is procedural (the skill's own text), not enforced.

`substrate init` symlinks `agents/bloom` (`packages/cli/bin/lib/link.js:63-95`) and each `skills/*/SKILL.md` directory (lines 23-55) into the client project — that is how `substrate-knowledge` and Bloom reach a client, and transitively how the vendored `knowledge/` gets read.

---

## Part 2 — `memory/`

### 2.1 What it is

`memory/MEMORY.md:1-5`:

> # Bloom Memory
> Persistent learnings from working on the Substrate design system. Entries are tagged with who provided feedback. **Knowledge promoted to reference files is pruned. This is a working set, not an archive.**

So: **agent memory for Bloom**, structured exactly as the task brief guessed — a `MEMORY.md` index plus topic files. It is *not* project documentation and *not* an append-only archive; it is a deliberately pruned working set.

### 2.2 Full tree — 19 files, three distinct kinds

```
memory/
├── MEMORY.md                        # 32-line index — the entry point
│
│   ── (a) THE FOUR CANONICAL TOPIC FILES (stubs in this checkout) ──
├── decisions.md                     # 2 lines: "# Decisions / Design decisions with reasoning. Tagged with who decided."
├── feedback.md                      # 2 lines: "# Feedback / Team corrections and confirmations. Tagged with who provided."
├── patterns.md                      # 2 lines: "# Patterns / Cross-component patterns discovered through work."
├── gotchas.md                       # 64 lines — the only populated one
│
│   ── (b) STRUCTURED QUEUES / LOGS (formal entry formats + lifecycles) ──
├── maintenance-findings.md          # 41 lines — self-audit queue
├── capability-gaps.md               # 83 lines — unroutable-request log
├── skill-regressions.md             # 57 lines — skill failure log
│
│   ── (c) PER-TOPIC DEEP-DIVE FILES (linked from MEMORY.md) ──
├── scheme-track-intents.md
├── container-surface-model.md
├── data_mode_singleton.md
├── mode_cascade_layering.md
├── border-channel-requirement.md
├── missing-intent-failure-mode.md
├── bloom-hardening-roadmap.md
├── mode_value_resolution.md
├── slot_identity_convention.md
├── outreach_voice_learnings.md
└── capability-gaps.md, skill-regressions.md (above)
```

Note the inconsistent naming — some files use kebab-case (`border-channel-requirement.md`), others snake_case (`data_mode_singleton.md`, `mode_value_resolution.md`, `slot_identity_convention.md`, `outreach_voice_learnings.md`). No convention is documented in-repo.

### 2.3 `MEMORY.md` — the index

32 lines. Six `##` sections — **Patterns, Gotchas, Decisions, Feedback, Team** (with `Decisions` and `Feedback` and `Team` carrying HTML-comment descriptions of what belongs there, e.g. line 20: `<!-- Design decisions with reasoning. Tagged with who decided. -->`). Each entry is a one-line link plus a compressed summary:

```markdown
- [Container vs Filled Surface Model](container-surface-model.md) — cards use alpha: 0
  + contrast: 1.0, not alpha: 1.0 + contrast: auto
```

Two sections (`Feedback`, and the `Decisions` header comment) are empty in this checkout. The `Team` section holds exactly one entry: outreach voice learnings.

The index-plus-files split is stated at `agents/bloom/abilities.md:198`: *"Your memory lives at `memory/MEMORY.md`. It is an index of persistent learnings stored as individual markdown files in the `memory/` directory."*

### 2.4 The canonical memory entry format

`skills/substrate-reflect/SKILL.md:419-427` defines it for **any** skill writing memory, not just reflection:

```
## [Topic] — [YYYY-MM-DD]
**From:** [Person name/role]
**Context:** [What was being worked on]
**Learning:** [The actual insight]
**Applied to:** [What reference/skill this affects, if any]
```

Line 429 explains why the two metadata fields exist: *"The `From` field matters — it tracks **who on the team holds which knowledge and preferences**. The `Applied to` field enables pruning: once a learning has been written into a reference file or skill, the memory entry can be pruned in the next reflection cycle."*

`agents/bloom/abilities.md:203-207` states the same four required elements from the agent side (what was learned, who taught it, when, why it matters) and adds the write threshold at line 209: *"Do not write memory for routine interactions. Only store learnings that will change how you operate."*

⚠️ **Format drift, worth flagging.** The actual files do not consistently use that format. Observed variants: `**Tagged:** @dimitri, 2026-04-12` (`memory/data_mode_singleton.md:3`, `mode_cascade_layering.md:3`, `slot_identity_convention.md:3`, `mode_value_resolution.md:3`) and `**Learned from:** Dimitri Otero — channel-card border debugging (2026-05-20)` (`border-channel-requirement.md:3`, `container-surface-model.md:3`, `bloom-hardening-roadmap.md:3`) and `**Learned from:** UCS-1103 release failure (2026-08-09, PR #458)` (`gotchas.md:6` — attribution to a ticket rather than a person). Public docs should present the SKILL.md format as the specified one and not claim uniformity.

### 2.5 The three structured logs — each with its own entry format and lifecycle

These are the most rigorously specified files in `memory/`, and each documents its own contract at the top of the file.

**(a) `memory/maintenance-findings.md` (41 lines).** Header (lines 1-9): non-blocking findings from `npm run bloom:self-check`, Step 0 of `workflows/evolve.md`. Blocking findings never land here — those are surfaced immediately. Entry format (lines 13-23) requires `Finding`, `Source guard`, `First seen`, `Last seen`, `Status`, optional `Verified`, optional `Notes`.

Lifecycle (lines 25-38): `open` → `proposed` → `resolved` | `rejected`. Three rules matter:
- **Closed-loop verification:** an entry becomes `resolved` only when the **specific guard named in `Source guard`** re-runs clean — "approval alone never resolves an entry." (Also at `workflows/evolve.md:130`, which stresses re-running the specific guard "not the whole `bloom:self-check` umbrella.")
- **Dedupe on (source guard, finding):** while `open`/`proposed`, update `Last seen` rather than adding a duplicate.
- **Recurrence re-opens:** a `resolved` finding that recurs re-opens *the same entry* — status back to `open`, `Last seen` updated, note in `Notes`, **prior `Verified` date kept as history** — never duplicated.

Queue is currently empty: `<!-- No open findings. Step 0 of workflows/evolve.md appends entries here. -->` (line 41).

**(b) `memory/capability-gaps.md` (83 lines).** Header (lines 1-13): requests Bloom could not route to any skill. Written by the routing fallback in `agents/bloom/abilities.md` when no route matches and no near-match survives in `generated/skills/REGISTRY.gen.yaml`. Consumed by the reflect cycle, which clusters recurring gaps into skill proposals for `workflows/skill-creation-pipeline.md`. Explicitly *"an append-only log, not curated memory — entries are added at the end (newest last) and pruned only when a skill covers the gap or the gap is explicitly rejected during reflection"* (lines 11-13). Entry format (lines 17-30): `### YYYY-MM-DD — <short gap title>` with `Request` (near-verbatim), `Near-misses considered` (registry entries evaluated *and why each was rejected*, or `none`), `Outcome`.

Contains one real worked example (lines 34-49) — the Figma-import gap that became `skills/figma-to-code/`. That entry is an excellent docs illustration of the whole loop: gap logged → clustered → skill created through the pipeline → gap entry annotated "Covered by `skills/figma-to-code/SKILL.md`."

**(c) `memory/skill-regressions.md` (57 lines).** Header (lines 1-13): failures observed while executing a skill — wrong output, missed validation, bad routing. Written by *any* session where a skill execution fails, most often during Stage 6 first-use monitoring of the skill-creation pipeline. Consumed by reflect, which turns 2+ instances of the same failure into a Phase-3 proposal. Entry format (lines 17-29) mirrors maintenance-findings and adds `Skill`, `Invocation`, `Failure`, `Root-cause hypothesis`.

Its lifecycle (lines 31-51) has one distinctive twist: most skill failures have **no machine check**, so an entry stays `proposed` until the skill's **next successful use** confirms the fix, stamping `Verified` with that date. A single instance stays logged as a data point rather than becoming a proposal.

The header of each of the three also carries an explicit authority disclaimer — e.g. skill-regressions.md:11-13: *"Fixes are proposal-first and human-gated — `skills/*/SKILL.md` is Proposed-tier, so nothing in this file authorizes an autonomous skill edit."*

### 2.6 Who reads and writes `memory/`

**Readers:**
- **Bloom, at session start.** `agents/bloom/abilities.md:200`: "Check `memory/MEMORY.md` at the start of interactions where context from past conversations would be valuable. The index tells you what files exist and what they contain."
- **`substrate-reflect` Phase 1**, which reads the full set. `skills/substrate-reflect/SKILL.md:29-36` enumerates all eight: `MEMORY.md`, `decisions.md`, `feedback.md`, `patterns.md`, `gotchas.md`, `maintenance-findings.md`, `capability-gaps.md`, `skill-regressions.md`.
- **`workflows/evolve.md:59`** — the daily cycle reads "`memory/MEMORY.md` and all topic files."

**Writers — four paths:**

1. **Bloom, during work.** `agents/bloom/abilities.md:203`: after meaningful interactions, "create or update a memory file and update the index."
2. **The `Stop` hook — the only automated writer.** `scripts/store-learnings.sh` (61 lines) is a Claude Code Stop hook. It reads hook JSON from stdin, takes `transcript_path` (line 21), bails if `.bloom-disabled` exists (lines 15-17) or the memory dir is absent (29-31), then greps human turns for correction patterns via `jq` — the regex at line 46 is `no[,.]|wrong|don.t do|should be|actually|instead` — takes up to 5 matches, and **appends a `## Session Learnings — DATE` block to `$MEMORY_DIR/feedback.md`** (lines 49-60). Memory dir is `${SUBSTRATE_MEMORY_DIR:-memory}` (line 9). This is the concrete mechanism behind "Bloom learns from corrections," and it is worth documenting accurately: it is a regex heuristic over the transcript, not model-driven extraction.
3. **Workflows.** `workflows/system-health.md:122` writes a health-check summary to `memory/MEMORY.md`; `workflows/build-component.md:143-148` writes a pattern entry to `memory/patterns.md` and updates the `MEMORY.md` index; `workflows/evolve.md:141` and `skills/substrate-reflect/SKILL.md:387` write a dated cycle/reflection record to `memory/MEMORY.md` (template at reflect lines 389-415: Consolidated / Pruned / References updated / Proposed / Approved / Deferred / Maintenance findings / Skill regressions).
4. **The routing fallback**, appending to `capability-gaps.md` (`agents/bloom/abilities.md:174-178`).

### 2.7 The trust boundary — the single most important fact about both folders

`memory/` is the **only** directory (with `references/`) that Bloom may write autonomously. Stated in three places, consistently:

- `skills/substrate-reflect/SKILL.md:46` — Phase 2 autonomous actions "affect only working memory and reference files — never identity or capability definitions."
- `skills/substrate-reflect/SKILL.md:57-63` — "Promotion during reflection targets `references/*.md` only. Reflection **never writes `knowledge/`**… tag its memory entry with `Promote-to: knowledge/` and surface it as a promotion candidate in Phase 3 for human review."
- `skills/substrate-reflect/SKILL.md:83-86` — "The `knowledge/` DDC tree — the SSOT world-knowledge base — is out of scope for reflection entirely."
- `workflows/evolve.md:68-70` — "Autonomous writes stay in `memory/` and `references/`. Evolve **never writes `knowledge/`**."
- `workflows/evolve.md:175` (cron scope) — "Both write only `memory/` and `references/` and never `knowledge/` … **`knowledge/` is only ever mutated by a human running `substrate-knowledge --build`, never by the cron.**"
- `skills/substrate-reflect/SKILL.md:224-225` — "`knowledge/` remains off-limits."

The one autonomous write *inside* the queues is status bookkeeping: `maintenance-findings.md:37-38` — "Status bookkeeping is autonomous (this is a memory file); the fixes themselves are always human-gated"; mirrored at reflect lines 375-377.

**The clean formulation for docs:** memory is where the agent may write freely; references are where verified system facts get promoted autonomously; knowledge is world knowledge that only a human can write, through one gated skill operation. Three tiers, one direction of flow, one human gate.

### 2.8 Lifecycle — committed, and pruned

**Committed, not generated.** All 19 files are git-tracked (`git ls-files memory` lists them); `.gitignore` does not mention `memory/`. Recent commits touch it directly with a `chore(memory):` prefix — `31b6bfaf` "chore(memory): deploy keys do not survive repo transfers…", `bc09d29c`, `c1c8aad6` — several with `[skip ci]`.

**Actively pruned.** `skills/substrate-reflect/SKILL.md:431-439` gives four pruning criteria: (1) **Promoted** — the learning now lives in a `references/*.md` or a skill procedure ("the memory entry was the vehicle, not the destination"); (2) **Stale reference** — it describes a file/field/pattern that no longer exists; (3) **Embedded correction** — a one-time correction since internalized into philosophy or skill procedures; (4) superseded (referenced at `workflows/evolve.md:65`). Reflection triggers: daily cron, or "more than 8-10 new entries across all topic files" (reflect lines 17-19), or open maintenance findings, or 2+ recurring skill regressions (lines 20-21).

**Client projects get their own, seeded by the CLI.** `packages/cli/bin/lib/scaffold.js:106-126` (`writeClientMemorySeed`) creates `<contentRoot>/memory/` and writes `MEMORY.md` with the header "# Substrate Client Memory / Client-owned learnings captured by Bloom hooks live here." plus four stubs — `feedback.md`, `decisions.md`, `patterns.md`, `gotchas.md` (line 123). All via `writeIfMissing`, so re-running `init` never clobbers client memory. The scaffolded `.claude/settings.json` wires the Stop hook with `SUBSTRATE_MEMORY_DIR` pointed at that client path (`scaffold.js:264`, `301-311`, timeout 15000ms).

Note the asymmetry for docs: the **client** seed has only the four canonical topic files. The three structured queues (`maintenance-findings`, `capability-gaps`, `skill-regressions`) are engine-repo constructs and are **not** scaffolded into clients.

### 2.9 What is *not* documented in-repo

- **`README.md` mentions neither folder** (grep for `knowledge|memory` returns nothing). Same for `DESIGN-PHILOSOPHY.md`, `ENGINEERING-PHILOSOPHY.md`, `PRODUCT.md`, `CONTEXT.md`, `CLAUDE.md`, and `AGENTS.md` (root). There is no top-level narrative introduction to either folder anywhere in the repo — the docs site would be the first place it exists.
- **No naming convention** is documented for memory topic files (hence the kebab/snake mix).
- **No stated rule** for when a learning becomes its own topic file versus an entry inside `patterns.md`/`gotchas.md`. The tree shows both patterns in use; the rule is not written down.
- **No cap or retention window** on memory size beyond the qualitative pruning criteria.
- **`knowledge/` has no automated validator** wired into `package.json` — `--audit` is a skill operation an agent performs, not an npm script. (`bloom:self-check` → `scripts/bloom-self-check.ts` contains no `knowledge` or `memory` references.)

---

## Part 3 — Real names and content requiring rename or omission

Public docs use a fictional cast (`acme`, `aurora`). The following appear in these folders and must be renamed or omitted.

### 3.1 `memory/` — substantial exposure. Treat this folder as unsafe to quote verbatim.

| Location | Content | Recommendation |
|---|---|---|
| `memory/missing-intent-failure-mode.md:8-9,17-18` | **Delta Air Lines** brand modeling — "verified against the **delta** family (`medallion-gold` exists only in **skymiles**)", `data-brand="delta-corporate"`, `[data-mode~="medallion-gold"]` | Rename to the fictional cast (e.g. `aurora` family, `aurora/loyalty` vs `aurora/corporate`, intent `tier-gold`). Do not ship `delta`/`skymiles`/`medallion-gold`. |
| `memory/mode_cascade_layering.md:15` | Brand selector examples list `brand-d`, `brand-a`, **`stripe`**, **`delta`** | Rename. `stripe` and `delta` are both real companies. |
| `memory/gotchas.md:28-33` | Repo ownership history: transferred from **`doterodesign/substrate`** to **`unknown-creatives-studio/uc-substrate`**; names three docs still holding the old owner | Omit entirely. Internal repo-migration history, no docs value. |
| `memory/gotchas.md:60` | **`doterodesign/substrate-docs`**, local clone path `~/Documents/GITHUB/substrate-docs` | Omit — names a private path and account. |
| `memory/gotchas.md` (deploy-key section, ~34-64) | GitHub Actions secret names `RELEASE_DEPLOY_KEY`, `SUBSTRATE_RELEASE_SIGNING_PRIVATE_KEY`, org policy `deploy_keys_enabled_for_repositories`, ed25519 key rotation narrative | Omit. Operational security detail; no public value. |
| `memory/outreach_voice_learnings.md` (whole file) | **Dimitri**'s personal sales/outreach voice, the "**Design Token Architecture Compass**" **Notion** lead magnet, a 6-dimension self-assessment, studio positioning, "Dimitri wants me to become the studio's core agent" (line 38) | **Omit entirely.** Confidential commercial material, unrelated to the engine. Do not reference this file by name in public docs. |
| `memory/MEMORY.md:9,32` | "release bump awaiting **Dimitri**"; "**Dimitri's** peer-to-peer studio outreach voice" | If MEMORY.md is shown as a format example, rewrite entries with fictional names. |
| `memory/container-surface-model.md:3`, `border-channel-requirement.md:3`, `bloom-hardening-roadmap.md:3` | `**Learned from:** Dimitri Otero — …`; bloom-hardening also credits **Codex** | Replace the person with a fictional name in any quoted example. |
| `memory/data_mode_singleton.md:3`, `mode_cascade_layering.md:3`, `slot_identity_convention.md:3`, `mode_value_resolution.md:3` | `**Tagged:** @dimitri` | Same. |
| `memory/scheme-track-intents.md:44,57` | "who: **Dimitri's** CVD bug"; "Open thread for **Dimitri**" | Same. |
| `memory/capability-gaps.md:34-49` | The Figma-import gap entry — **Figma** is named throughout | **Probably keep.** Figma here is a third-party tool the engine integrates with (there is a shipped `skills/figma-to-code/`), not a customer or a stand-in brand. This entry is the best available worked example of the capability-gap loop. Judgment call for the docs owner. |
| `memory/gotchas.md` (several), various | UCS ticket IDs (`UCS-1103`, `UCS-1113`), PR numbers (`#458`, `#459`, `#460`), `memory/scheme-track-intents.md:9` "PRs #392–#399" | Strip. Internal tracker references mean nothing publicly. |

### 3.2 `knowledge/` — low exposure, one systematic item

- **`contributors: [bloom, dimitri]`** appears in **all 54 leaves** (e.g. `knowledge/accessibility/vision/low-vision.md:43-45`). `dimitri` is a real person. If any leaf frontmatter is shown as a format example, substitute a fictional contributor. The `contributors` *field* should absolutely be documented; the value should not be `dimitri`.
- No company or customer brand names appear anywhere in `knowledge/` — verified by grep for `acme|aurora|delta|skymiles|unknown creatives|doterodesign`; only the `dimitri` contributor lines matched.
- **Real-world proper nouns that are fine and should be kept:** the citation apparatus (WHO, CDC, RNIB, ICD-11, DSM-5-TR, Unicode, W3C/WCAG/APCA, IES, NHTSA, ASHA, ACOG, AASM) and academic authors (Bailey & Lovie, Legge, Rubin, Berlin & Kay, Sweller, Hick, Albers, Maeda). These are scholarly sources, not brands, and they are the point of the sourcing standard. `knowledge/_tables/geographic.yaml` also names countries — also fine.
- **Sensitive-topic note (not a rename issue, but a review flag):** `knowledge/accessibility/mental-health/` covers PTSD, schizophrenia spectrum, bipolar disorder, and major depression, and `knowledge/state/psychological/acute-grief-and-bereavement.md` covers bereavement. These are sourced to ICD-11/DSM-5-TR and written as interface-adaptation guidance, but a public docs page that lists them as example content should frame them carefully.

---

## Part 4 — Loose ends and discrepancies found

Worth surfacing to whoever writes the public pages, since docs should not propagate them:

1. **`knowledge/AGENTS.md:46` misdescribes `_rules.yaml`.** It cites "accessibility over preference, stated need over inferred context" as example rules; neither exists in the file (§1.6). Document `_rules.yaml` from `_rules.yaml`.
2. **Two empty divisions** (`culture/symbolism/`, `context/activity/`) — intentional, with an explicit deferral note in the latter. Docs should either mention them as honest coverage gaps or avoid implying full coverage.
3. **The eval mirror is incomplete** — `evals/` mirrors 4 domains (accessibility, perception, language, culture); `context` and `state` were added later (`_catalog.yaml:14-24`, revision 2026-05-19) and have no eval category.
4. **No write-guard on `knowledge/`** — the human gate is procedural prose in the skill, not an enforced `PreToolUse` hook, unlike config/doc/skill writes (§1.11). Do not describe it as technically enforced.
5. **Memory entry format drift** — the specified format (`From/Context/Learning/Applied to`) is not what most files actually use (§2.4).
6. **`docs/archive/genesis/`** describes a separate, unshipped "Genesis Kit" product with its own `kb/` + `_memory/` vocabulary. It is a useful source for the observation that knowledge is prose-navigated, but it is **not Substrate's architecture or roadmap** — do not draw docs content from it.
7. **`memory/patterns.md`, `decisions.md`, `feedback.md` are 2-line stubs** in this checkout, despite `MEMORY.md` listing populated Patterns and Decisions sections — because those entries live in their own topic files and the index links to them. If docs show `patterns.md` as an example, note it is a stub here.
