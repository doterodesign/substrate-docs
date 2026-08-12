# Gotchas

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
