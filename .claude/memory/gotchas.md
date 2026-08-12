# Gotchas

## Publishing surface (legal)
- Mintlify serves EVERY .md/.mdx in the repo as a hidden page, even when it
  is not in docs.json nav (verified: unlinked files return 200 by URL).
  Never put internal reports/notes in served paths. Dot-directories are NOT
  served (verified 404) → internal reports go in `.claude/reports/`, which
  overrides the global docs/agents/ convention for this repo.
- No real company brand names in served pages, the manifest, or memory
  (user directive, 2026-08-12): the engine's bundled demo brands are named
  after real companies but are NOT clients. See substrate-engine.md "LEGAL
  POLICY" and decisions.md for the fictional cast and disclaimer snippet.
  Exception: historical audit reports under .claude/reports/ retain engine
  file-path citations (unserved). Git HISTORY still contains the old
  brand-named pages — full erasure needs a history rewrite or a private
  repo; surfaced to the user 2026-08-12.

## Fabrications that must never reappear (audit 2026-08-12; CI gate enforces)
- `substrate.config.json`, `substrate build`, `substrate audit`, `data-theme`,
  `--color-*` semantic namespace, `--space-1..16`, `--type-size-*`,
  `--motion-fast/slow`, `--ease-*`, `--font-sans`, `SubstrateTokens`,
  protanopia/deuteranopia/tritanopia spellings, kebab-case preset keys
  (high-contrast-dark), `contrast-targets`, `cvd:`/`modes:` brand-config
  fields, `extends: substrate/base`, per-token APCA Lc CSS comments.
- Origin of the fiction: a REJECTED design spec in the engine repo
  (docs/superpowers/specs/2026-08-12-cli-npm-publishing-design.md).

## Tooling traps
- NEVER append `|| echo …` to a multi-step `&&` verification chain: || binds
  the WHOLE chain (equal precedence, left-assoc), so the echo masks any
  intermediate failure and the chain exits 0. Bit us 2026-08-12: a "no brand
  vars anywhere" line printed from the || branch after npm test had run the
  ENGINE's suite (cd-into-worktree cwd gotcha, again). Verify in separate
  commands from the docs repo cwd.
- The committed manifest carried --ucs-{brandSlug}-* variable families for
  the real-company demo brands (generated-css glob) until 2026-08-12 — the
  legal brand-name directive covers the manifest too. The generator now
  filters them (slugs from src/brands dirs incl. sub-brands; intent-family
  patterns keep the checker complete) and a test enforces it.
- The generator extracts component/type config keys (base
  src/components/*/config.yaml + src/types/*/config.yaml + properties.yaml;
  brand override dirs excluded) and skill flags (skills/*/SKILL.md) — docs
  quoting shipped component configs or naming skill operations (--build)
  pass the gate without allowlist entries.
- Engine CLI entry: packages/cli/bin/substrate-init.js is a 23-line
  crash-guard shim since UCS-1124; dispatch + usage live in bin/main.js,
  setup usage in bin/lib/setup-plan.js. The manifest generator extracts CLI
  verbs/flags from those three files — NOT lib/*.js wholesale (scaffold /
  template modules embed `--` strings that are not flags).
- tsx CLI needs an IPC unix socket → blocked by the Bash sandbox; run
  manifest generation with sandbox disabled.
- tsx must run with cwd inside the engine checkout (tsconfig alias
  resolution for the @substrate/generated import in the engine barrel).
- `node --test test/` fails (path parsed as module); use bare `node --test`.
- The engine checkout HEAD moves during sessions (other agents). Pin to a
  detached worktree at origin/main (symlink node_modules into it).
- Compound shell commands that `cd` into the engine then run `npm test` run
  the ENGINE's suite — always run docs npm scripts from the docs repo cwd.

## Allowlist policy
- ground-truth/allowlist.json entries need a reason; used ONLY for
  "named-to-deny" mentions of fabricated identifiers. Real-but-unextracted
  symbols get extraction added to the generator instead (precedent:
  SubstrateSurface web component scan). It is a flat JSON array — MERGE,
  never overwrite (a sub-agent once clobbered it).

## Corrected claims (feedback 2026-08-12 — do not reintroduce)
- data-mode is NOT just an intent-role selector. It is the composable
  per-element mode list (kernel/system/mode-resolver.ts): intent roles,
  component roles (card/panel/inset), component states and modes, brand
  preset LEVEL names (discrete match beats slider interpolation), materials,
  and the fluid gate. The resolver excludes scheme/contrastFactor from token
  effects, so preset tokens apply property deltas only — the axes stay
  preference-owned (that half of the old warning was right). Root cause of
  the error: the audit only surveyed generated color CSS, never the mode
  resolver.
- danger/error: SYSTEM_INTENTS (kernel/system/config.ts) is explicitly a
  "convention baseline", NOT a contract — only brand/neutral are required.
  Never write that the destructive intent "is danger, not error"; a brand
  may use any name. Root cause: over-correction from the fabrication-era
  --color-error cleanup.
- initializeSubstrate() (platforms/web/runtime/initialize.ts, exported from
  the barrel) wraps the whole three-call startup; `substrate setup --apply`
  GENERATES src/substrate.setup.ts (css import + initializeSubstrate()) and
  wires the app entry. Don't present runtime wiring as purely manual. The
  baked no-JS floor follows OS prefers-color-scheme/contrast with zero JS;
  the apply* helpers are only for keeping the LIVE vector on OS signals.
- Writing "data-theme" literally anywhere (even to deny it) trips the gate;
  say "theme attribute".

## APCA legal (UCS-530, 2026-08-12)
- reference/apca-solver.mdx#about-apca carries APCA's required verbatim
  prohibited-uses disclaimer — never paraphrase, reflow, or delete it; other
  pages cross-reference the anchor instead of duplicating it.
- The Myndex commercial-license conversation is in flight: never claim APCA
  license status, permission, endorsement, or conformance certification
  (no "licensed"/"certified"/"conformant"/Bronze/Silver claims). The Lc
  size/weight floor table is Substrate's own construction, not an official
  APCA artifact.
- APCA = "Accessible Perceptual Contrast Algorithm" — the docs previously
  said "Advanced"; don't reintroduce it.
