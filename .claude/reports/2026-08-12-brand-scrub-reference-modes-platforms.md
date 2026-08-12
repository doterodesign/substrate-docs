# Brand scrub — reference/, modes/, platforms/

Date: 2026-08-12
Scope: `modes/*.mdx` (4 files), `platforms/*.mdx` (3 files), `reference/*.mdx` (7 files)
Branch: `main`, working tree only (no commits, no git operations performed).

## Result

- Brand grep after scrub: **0 matches** across all 14 assigned files (excluding the agreed
  false positives `deltas` / `deltas-only` / `description` / `descriptor`).
- `npm run check:docs`: **accuracy gate: PASS (33 pages, engine 9a76ab8)**.
- MDX validity: JSX open/close tag parity and code-fence parity verified programmatically on
  all 14 files; all pass. Only file touched with a new import is `reference/config-schema.mdx`,
  where the import sits with the two existing imports directly after the frontmatter.

## Per-file mention counts (before → after)

| File | Before | After | Notes |
|---|---|---|---|
| `modes/overview.mdx` | 4 | 0 | `data-brand="magic-patterns"` ×4 → `"acme"` |
| `modes/light-dark.mdx` | 1 | 0 | generated path → `generated/brands/acme/...` |
| `modes/high-contrast.mdx` | 2 | 0 | `data-brand="magic-patterns"` ×2 → `"acme"` |
| `modes/color-vision.mdx` | 0 | 0 | untouched |
| `platforms/web.mdx` | 0 | 0 | untouched |
| `platforms/ios-swift.mdx` | 1 | 0 | path + honesty reframe |
| `platforms/android-kotlin.mdx` | 2 | 0 | path, symbol rename, honesty reframe |
| `reference/apca-solver.mdx` | 0 | 0 | untouched |
| `reference/color-tokens.mdx` | 2 | 0 | `stripe-cyan` → `acme-cyan`; `delta/booking` → `aurora/booking` |
| `reference/config-schema.mdx` | 8 | 0 | full rewrite of example + disclaimer snippet added |
| `reference/faq.mdx` | 0 | 0 | untouched |
| `reference/motion-tokens.mdx` | 2 | 0 | brand-attributed values genericized |
| `reference/spacing-tokens.mdx` | 2 | 0 | brand-attributed presets genericized |
| `reference/type-tokens.mdx` | 1 | 0 | brand-attributed ratios genericized |

Totals: 25 mentions before → 0 after. 10 files modified, 4 assigned files needed no change.

## Change log by file

### `modes/overview.mdx`
Four `[data-brand="magic-patterns"]` selectors in the no-JS fallback CSS example → `[data-brand="acme"]`.
Comments, scheme values, and contrastFactor numbers untouched.

### `modes/light-dark.mdx`
`generated/brands/magic-patterns/css/tokens.light.gen.css` → `generated/brands/acme/css/tokens.light.gen.css`.
Surrounding prose ("the pipeline bakes static per-mode files…") kept — it describes engine
behavior, not a specific brand, so no honesty reframe was needed.

### `modes/high-contrast.mdx`
Two `[data-brand="magic-patterns"]` selectors → `[data-brand="acme"]`.

### `platforms/ios-swift.mdx`
"This is real output from `generated/brands/magic-patterns/swift/system.light.gen.swift`:" →
"This is example output for a fictional `acme` brand — `generated/brands/acme/swift/system.light.gen.swift`:".
Honesty rule applied: the "real output" claim would have been false once the brand became
fictional. All Swift code, Display P3 channel values, and type names left byte-identical.

### `platforms/android-kotlin.mdx`
1. "Real output from `generated/brands/magic-patterns/compose/system.light.gen.kt`:" →
   "Example output for a fictional `acme` brand — `generated/brands/acme/compose/system.light.gen.kt`:"
   (same honesty reframe as iOS).
2. `object MagicPatternsMaterialScheme {` → `object AcmeMaterialScheme {`.
3. Prose "so the Magic Patterns brand produces `MagicPatternsMaterialScheme`" →
   "so an `acme` brand produces `AcmeMaterialScheme`".
4. Two usage sites in the `AppTheme` composable: `MagicPatternsMaterialScheme.dark/.light` →
   `AcmeMaterialScheme.dark/.light`.
   All Kotlin color channel values unchanged.

### `reference/color-tokens.mdx`
1. Custom-intent example list: `` `stripe-cyan` `` → `` `acme-cyan` ``. (`medallion-gold`
   left alone — not a company name.)
2. "From `generated/brands/delta/booking/css/tokens.light.gen.css`:" →
   "For example, `generated/brands/aurora/booking/css/tokens.light.gen.css`:".
   Sub-brand dir `booking` retained per the rules; the "From <path>" phrasing was softened to
   "For example" so it no longer asserts the hexes were copied from a real shipped file.

### `reference/config-schema.mdx` (largest change)
1. Frontmatter `description`: "with every example copied from a shipped brand" →
   "illustrated with an example brand config". The old wording was an explicit
   provenance claim that is false for a fictional brand.
2. Added `import DemoBrandsNote from '/snippets/demo-brands-note.mdx';` as the third import,
   matching the existing `/snippets/generated/...` import style.
3. Placed `<DemoBrandsNote />` after the intro block (after the directory-convention table and
   the `substrate.config.yaml`/kebab-case paragraph, immediately before `## Complete example`).
   **Judgment call:** the brief said "right after the intro paragraph". The literal intro
   paragraph is the one-line sentence that introduces the file-convention table, so putting the
   Note there would have split a sentence from the table it introduces. I placed it at the end
   of the intro block instead — still above the fold, still before any example, and it reads as
   a preamble to the example config it is warning about.
4. Table rows: `e.g. magic-patterns` → `e.g. acme`; `e.g. delta, stripe` → `e.g. aurora`
   (collapsed to one example since both originals mapped to different fictional names and one
   suffices for "a brand family").
5. Example config header: "Trimmed from the shipped `src/brands/stripe/config.global.yaml` —
   every key and value below is real:" → "An example brand config (fictional brand), trimmed —
   `src/brands/acme/config.global.yaml`:". Dropped the "every key and value below is real"
   claim entirely (honesty rule).
6. Inside the YAML: `stripe-cyan:` → `acme-cyan:` (brand-derived custom intent, the one
   permitted key rename). Comment alignment adjusted to keep the `# custom intents are
   first-class` comment in column. All hue/chroma/elevation/typography/shape/motion/space/
   flexibility/presets keys and numeric values unchanged.
7. `name` section: "`name: Delta Air Lines - SkyMiles`" → "`name: Aurora Airways - Rewards`";
   slug derivation "`delta/skymiles` → `delta-skymiles`" → "`aurora/rewards` → `aurora-rewards`".
8. Typography section: "there is no engine default; Stripe 1.25, Delta 1.2" → "there is no
   engine default; the demo brands range from 1.2 to 1.25".
9. Presets section: "note shipped brands choose positions, not endpoints (Delta's light is
   `scheme: 0.02`; Stripe's dark is `0.74`…)" → "note brands choose positions, not endpoints
   (a light level may sit at `scheme: 0.02`; a dark level at `0.74`…)". Numbers preserved.
10. Optional sections: "e.g. DraftKings' static ramp files" → "a brand that opts in gets static
    ramp files" (generic rephrase per the no-substitution rule for DraftKings).

### `reference/motion-tokens.mdx`
1. `--duration-base` row: "Shipped values differ widely: Stripe 200, Delta 75." → "Authored
   values differ widely across the bundled demo brands — from 75 to 200."
2. `--easing` row: "Stripe ships `cubic-bezier(0.25, 0.1, 0.25, 1)`, Delta ships `linear`" →
   "one brand may ship `cubic-bezier(0.25, 0.1, 0.25, 1)` where another ships `linear`".
   Both numeric/string values preserved verbatim; only the attribution changed.

### `reference/spacing-tokens.mdx`
1. "The names are brand-chosen (an open map). Delta ships:" → "…One brand might ship:".
2. "Magic Patterns instead names its levels `discovery` / `default` / `workspace`" → "Another
   names its levels…". The rhetorical point (two different brands prove the set is convention,
   not enum) survives without either name.

### `reference/type-tokens.mdx`
"`typography.scale-ratio`; Stripe ships 1.25, Delta 1.2" → "`typography.scale-ratio`; the demo
brands ship values from 1.2 to 1.25".

## Judgment calls

1. **Disclaimer snippet placement in config-schema** — see item 3 above. Placed at the end of
   the intro block rather than mid-intro, to avoid separating a sentence from its table.
2. **Snippet not added to any other page.** Per the brief, the Note goes only on pages that
   explicitly discuss the bundled demo catalog, not pages that merely use `acme`/`aurora` in
   examples. I checked every assigned file for catalog discussion. The remaining aggregate
   references — "every shipped brand uses 4" (`spacing-tokens.mdx:9`), "every shipped brand
   uses `1`" (`type-tokens.mdx:27`), "the demo brands range from 1.2 to 1.25"
   (`config-schema.mdx:111`, `type-tokens.mdx:17`), "the bundled demo brands — from 75 to 200"
   (`motion-tokens.mdx:17`), "no shipped brand currently exercises it"
   (`config-schema.mdx:103`) — are statistics over the catalog that name no company, so they
   are in-bounds and did not warrant the Note.
3. **Collapsed two brand names into one where redundant.** In the config-schema file-convention
   table the original cited two family examples (`delta`, `stripe`); since both map into the
   same fictional cast and the row only needs one illustration, it now reads `e.g. aurora`.
4. **`medallion-gold` left as-is** in `reference/color-tokens.mdx`. It is an airline-flavored
   custom-intent name but not a company name, and it is not in the grep pattern. Flagging it
   here since "Medallion" is a real Delta loyalty tier name — if the legal review wants maximum
   distance from the Delta family, this is the one remaining allusion in my files and it could
   become e.g. `aurora-gold`. I did not change it because it falls outside my instructions.
5. **Honesty reframes beyond bare renaming.** Three places asserted provenance ("Real output
   from", "This is real output from", "every key and value below is real", plus the frontmatter
   "copied from a shipped brand"). Renaming alone would have left the docs asserting that a
   nonexistent brand's files are real engine output. All four were reframed as illustrative.
   No numeric values, CSS variables, YAML keys, or code structure were altered anywhere.

## Mentions that could not be removed

None. All 25 mentions in the assigned files were removed.

## Files deliberately not touched

`ground-truth/manifest.json`, `ground-truth/allowlist.json`, `lib/`, `scripts/`,
`snippets/generated/` — per instructions. Note for the team lead: `ground-truth/manifest.json`
still contains real brand names in its `nativeSymbols` list (e.g. `DeltaSkymilesMaterialScheme`,
`GoogleWorkspaceMaterialScheme`, `StripeCheckoutMaterialScheme`, `MagicPatternsMaterialScheme`,
`Descript*`, `Draftkings*` — ~20+ symbols around lines 1352-1520). That file is committed to the
repo and therefore public on GitHub even though Mintlify does not render it as a page. It is
outside my assigned scope, but it is the same legal exposure, and I understand a separate
workstream is filtering brand symbols from the manifest. The accuracy gate passes either way:
the native-symbol check only fires on identifiers matching `\bSubstrate[A-Z]...`, so
`AcmeMaterialScheme` is never checked against the manifest.
