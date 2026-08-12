# Substrate engine — real domain model (verified at origin/main 9a76ab8, 2026-08-12)

## Architecture
- Runtime solver, NOT a build-time token baker, NOT a component library.
  Pipeline emits solver inputs + component style descriptors + baked per-mode
  snapshots; kernels (web JS, `packages/kernel-swift`, `packages/kernel-kotlin`)
  solve APCA lightness at runtime against the actual surface.
- Preference vector (`UserPreferences`, 7 axes, all continuous): scheme (0→1),
  contrastFactor (0.75→1.5), densityFactor (0.8→1.3), typeScaleFactor
  (0.9→1.4), motionFactor (0→1, DEFAULT 0.75), warmth (0→1),
  cvd {type: none|protan|deutan|tritan|achromat, severity 0→1}.
- Engine presets (`SCHEME_PRESETS`, camelCase keys): light 0/1.0, dark 1/1.0,
  dimmed 0.65/0.95 (mid-track, LIGHTER than dark, no baked native artifact),
  highContrast 0/1.3, darkHighContrast 1/1.3.
- APCA policy (`COLOR_SOLVER_APCA_POLICY`): fg Lc 75, border Lc 50, focus
  ring Lc 60, max 106 — scaled by contrastFactor. Transform order:
  warmth → cvd → apca. Shortfalls surface as `unmetLc`; a build-failing
  accessibility gate sweeps the brand corpus.

## Config
- YAML only: `src/brands/<family>/config.global.yaml` + `<sub>/config.yaml`
  (deltas), or flat `<name>/config.yaml`. Kebab-case authored → camelCase
  normalized. Slug derived from directory (`{parent}-{sub}`).
- `intents` is an OPEN map; only brand + neutral required; conventional names
  brand/neutral/danger/warning/success/info/beta. hue + chroma only —
  lightness solver-owned. Scheme tracks (`scheme-end`/`scheme-track`/
  `from-intent`/`blend`) are schema-valid but unexercised by shipped brands.
- Required sections: elevation, typography (base-font-size in REM,
  scale-ratio), shape.radius-base, motion (duration-base + easing), space.unit,
  flexibility (per-axis min/max bounds). presets.mode/density/contrast are
  open maps of brand-named levels.
- Inheritance: recursive deep merge, null deletes, arrays replace, deltas-only
  enforced by validator. The engine bundles six demo brand families named
  after real companies (see engine `src/brands/`) — they are fictional
  demonstrations, NOT clients. LEGAL POLICY: never name them in this repo
  (published pages, memory, reports, manifest — anywhere). Docs use the
  fictional cast `acme` (standalone) and `aurora`/`aurora-rewards` (family);
  pages referencing the bundled catalog say "demo brand families" and import
  `snippets/demo-brands-note.mdx`.

## Web output
- Namespaces: `--ucs-{intent}-{hue,chroma,fg-l,border-l,surface-l,pattern}`,
  per-role `--ucs-{intent}-fg-l-{heading,label,caption,code,kbd}`, baked
  triptych `--ucs-{intent}-{surface,text,border}` (hex), `--surface-*`,
  `--ctx-surface-l`, `--ucs-focus-ring`, scalars (--density, --scale,
  --space-unit, --effective-ratio, --duration, --motion-factor, …).
- NO ladders: spacing = density×scale×space-unit×n; type =
  pow(--effective-ratio, role fontScale) quantized; motion =
  duration-base×motion-factor.
- Attributes: `data-ucs` (cascade opt-in), `data-mode` (~= role selector,
  NOT a theme), `data-brand` (runtime-set slug), `data-cvd-achromat`,
  `data-cvd-sim`. No-JS SSR floor = 2×2 matrix on [data-brand]; JS primary.
- Runtime sequence: import `@substrate/generated/global/css/index.gen.css`;
  syncBrandToCssVars → syncPrefsToCssVars → updateAllVars (from
  `@substrate/engine`). Aliases: @substrate/engine, @substrate/components/*,
  @substrate/generated/* (engine-swap guarantee).

## Native output
- Swift/Kotlin per-mode files `system.{light,dark,highContrast,darkHighContrast}.gen.*`
  each declaring `SubstrateSystemTokens` / `SubstrateSystemTokenSet`
  (surface/text/border, Display P3). Kotlin files are package-less — one per
  build variant or declarations collide. `material-scheme.gen.kt` = Compose
  integration point. Descriptors import SubstrateKernel / substrate.kernel.
- CLI verbs: init, add, upgrade, adopt, setup, artifact. `--platform` selects
  an AI tool, not a build target. Generation: `npm run generate` in checkout.
