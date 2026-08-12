# Audit: modes/* and platforms/* doc pages vs. substrate source

Date: 2026-08-12
Docs repo: `/Users/dimitriotero/Documents/GITHUB/substrate-docs`
Code repo: `/Users/dimitriotero/Documents/GITHUB/substrate`

Pages audited:
- `modes/overview.mdx`
- `modes/light-dark.mdx`
- `modes/high-contrast.mdx`
- `modes/color-vision.mdx`
- `platforms/web.mdx`
- `platforms/ios-swift.mdx`
- `platforms/android-kotlin.mdx`

---

## Executive summary

All seven pages are **substantially inaccurate**. They describe a conventional
static-token design system: a build step that emits per-brand token files, five
discrete named "display modes" selected via a `data-theme` HTML attribute, and
platform outputs that are flat constant files. The actual Substrate is a
different architecture: a **continuous preference-vector engine** whose modes are
points on continuous sliders (`scheme`, `contrastFactor`, `warmth`, `cvd`, ...),
whose CSS is driven by `data-brand` + `data-mode` (a *role* selector, not a theme
selector), and whose Swift/Kotlin packages are **computation kernel ports**
(APCA/OKLCH/CVD math) rather than generated constants.

The single most consequential error, repeated on six of the seven pages, is the
`data-theme` attribute. **The string `data-theme` does not appear anywhere in the
substrate codebase** — not in `src/`, not in `generated/`, not in
`packages/`. Every code example that sets `data-theme` is non-functional.

Verdicts:

| Page | Verdict |
| --- | --- |
| `modes/overview.mdx` | INACCURATE — core mechanism (`data-theme`) fabricated; mode model misrepresented |
| `modes/light-dark.mdx` | INACCURATE — config schema, CSS output, CLI, and Lc defaults all wrong |
| `modes/high-contrast.mdx` | INACCURATE — `chromaLift` config key and `substrate audit` command do not exist |
| `modes/color-vision.mdx` | INACCURATE — CVD type names wrong, config shape wrong, scope of transform wrong, `achromat` omitted |
| `platforms/web.mdx` | INACCURATE — output paths, CLI command, and entire token namespace table fabricated |
| `platforms/ios-swift.mdx` | INACCURATE — `SubstrateTokens` namespace, `.uiColor`, `.resolving(in:)` do not exist |
| `platforms/android-kotlin.mdx` | INACCURATE — `SubstrateTokens.Light/.Dark/.HighContrast`, `.toColorScheme()` do not exist |

---

## Cross-cutting findings

### CC-1. `data-theme` does not exist — INACCURATE (critical)

Documented on `modes/overview.mdx:37-55,62-72`, `modes/light-dark.mdx:43,58,67,70`,
`modes/high-contrast.mdx:30,35,52,58,69,74,77,82`, `modes/color-vision.mdx:21,50,56,71,74-75,101-107`,
`platforms/web.mdx:19,57-71,76-77`, `platforms/ios-swift.mdx:77`.

Evidence: a repo-wide search for `data-theme` across `generated/` and
`src/platforms/` returns zero matches. The attributes the engine actually writes
are in `src/platforms/web/runtime/css-bridge.ts`:

- `css-bridge.ts:130` — `root.setAttribute('data-brand', brand.slug)`
- `css-bridge.ts:165` — `root.toggleAttribute('data-cvd-achromat', isAchromat)`
- `css-bridge.ts:373` — `root.setAttribute('data-cvd-sim', cvd.type)`

`data-mode` exists but means something entirely different from a theme: it selects
a **semantic/brand color role**, not a display mode. From
`generated/global/css/modes.system.gen.css` the selectors are
`[data-mode~="brand"]`, `[data-mode~="danger"]`, `[data-mode~="success"]`,
`[data-mode~="warning"]`, `[data-mode~="info"]`, `[data-mode~="neutral"]`,
`[data-mode~="beta"]`. In `generated/global/css/modes.gen.css` the same attribute
carries brand-specific roles (`[data-mode~="delta-navy"]`, `[data-mode~="cloud-blue"]`,
`[data-mode~="ai-glow"]`, ...). It is a `~=` space-separated token list, i.e.
multiple roles can be applied at once — nothing like a single-value theme switch.

Consequence: every theme-switcher snippet in the docs is non-functional. In
particular `platforms/web.mdx:76-84` (`setTheme()` writing `data-theme` +
`localStorage`) and `modes/color-vision.mdx:104-108` would silently do nothing.

### CC-2. Modes are continuous preferences, not five discrete themes — OUTDATED-MISLEADING

`modes/overview.mdx:7,9-33` frames Substrate as generating "five display modes",
each "a complete, self-contained token set".

The real model is a preference vector. `src/kernel/system/preferences.ts:1-19`:

```ts
// ─── User Preferences ───────────────────────────────────────────────────────
// Five continuous sliders that scale the entire token system.
export interface UserPreferences {
  scheme: number;          // 0 (light) → 1 (dark), continuous
  contrastFactor: number;  // 0.75 → 1.5 — scales all Lc targets
  densityFactor: number;   // 0.8 → 1.3 — scales spacing, sizing, border-radius
  typeScaleFactor: number; // 0.9 → 1.4 — scales the type scale ratio
  motionFactor: number;    // 0 (instant/reduced) → 1 (full brand duration)
  warmth: number;          // 0 (neutral) → 1 (full amber shift) — Night Shift
  cvd: CvdConfig;
}
```

The five named modes are *convenience presets over that continuum*, explicitly
labelled as such at `preferences.ts:33-49`:

```ts
// Named presets mapping to continuous scheme + contrastFactor values.
// These are convenience shortcuts — the underlying model stays continuous.
export const SCHEME_PRESETS: Record<string, SchemePreset> = {
  light:            { name: 'Light',              scheme: 0,    contrastFactor: 1.0 },
  dark:             { name: 'Dark',               scheme: 1,    contrastFactor: 1.0 },
  dimmed:           { name: 'Dimmed',             scheme: 0.65, contrastFactor: 0.95 },
  highContrast:     { name: 'High Contrast',      scheme: 0,    contrastFactor: 1.3 },
  darkHighContrast: { name: 'Dark High Contrast', scheme: 1,    contrastFactor: 1.3 },
};
```

Two naming errors follow. The preset **keys are camelCase** — `highContrast` and
`darkHighContrast` — not the kebab-case `high-contrast` / `high-contrast-dark`
the docs use throughout. And the docs' claim that each mode is a self-contained
baked token set is wrong for `dimmed`: it sits mid-track at `scheme: 0.65` and is
sampled continuously. `src/platforms/tokens/__tests__/static.test.ts:158-181`
asserts exactly this ("a mid-scheme (dimmed) preset samples the track
continuously — no endpoint switching"; the dimmed bake matches *neither* endpoint
recolor).

Also note the docs' derivation story is inverted for `dimmed`. `modes/overview.mdx:23`
says dimmed has luminance "reduced further than standard dark" and suits OLED
"where true black saves battery". In the code dimmed is *lighter* than dark
(`scheme: 0.65` vs dark's `1`) and carries a slightly *lower* contrast factor
(0.95) — the opposite of the doc's description.

### CC-3. `substrate build` and `substrate audit` do not exist — INACCURATE

Cited at `modes/light-dark.mdx:82`, `modes/high-contrast.mdx:94,97`,
`platforms/web.mdx:11`, `platforms/ios-swift.mdx:12`, `platforms/android-kotlin.mdx:12`.

The published CLI is `@unknown-creatives/substrate` (`packages/cli/package.json:2`)
with a single binary `substrate` → `./bin/substrate-init.js` (`package.json:15-17`).
Its usage banner (`packages/cli/bin/substrate-init.js:37-48`) lists only:

```
Usage: substrate init [--refresh] [--platform <name>] [--all] [--dry-run] [--report-aliases]
       substrate add <entry-id|name> --generate-command <cmd> [--catalog <dir>]
       substrate add --list [--catalog <dir>]
```

plus `upgrade`, `adopt`, `setup`, and an engine-artifact subcommand (imports at
`substrate-init.js:20-27`). There is no `build` and no `audit` verb.

Generation in the monorepo is done through npm scripts, not the CLI —
`package.json:10-44` defines `generate`, `generate:tokens`,
`generate:tokens:swift`, `generate:tokens:compose`, `generate:ramps:*`,
`generate:descriptors`, each shelling into `scripts/generate.ts`. Note `npm run
build` (`package.json:46`) is `generate:check && tsc && demo:corpus && build -w
@substrate/demo` — a repo build, not a token emit.

### CC-4. Default APCA target is Lc 75, not Lc 70/60 — INACCURATE

`modes/light-dark.mdx:99` claims "Substrate defaults to Lc 70 for body text and
Lc 60 for large text and UI components". `modes/overview.mdx:15` and
`modes/high-contrast.mdx:24,31` repeat Lc 70 as the body-text default.

`src/kernel/system/config.ts:42-43` documents the actual channel targets:

```ts
'fg-l',      // foreground lightness (APCA Lc 75 against context surface)
'border-l',  // border lightness (APCA Lc 50 against context surface)
```

So foreground is Lc 75 and borders Lc 50. There is no Lc 60 "large text / UI
component" tier in the kernel. Separately, the docs' "Lc 90+" high-contrast
target is not a fixed target at all — high contrast is `contrastFactor: 1.3`
(`preferences.ts:47`), a *multiplier* applied to the Lc targets, which against
the real Lc 75 base yields ~Lc 97.5 rather than a hard 90 floor.

---

## Per-page findings

### `modes/overview.mdx` — INACCURATE

| Claim | Location | Verdict | Evidence |
| --- | --- | --- | --- |
| Five modes: light, dark, dimmed, high-contrast, high-contrast-dark | `:4,9-33` | PARTLY ACCURATE | Five presets exist (`preferences.ts:43-49`) but keys are `highContrast`/`darkHighContrast`, and they are preset points on a continuum, not baked self-contained sets. See CC-2. |
| Modes applied via `data-theme` on `<html>` or any container | `:37-55` | INACCURATE | See CC-1. `data-theme` is absent from the codebase. |
| `dimmed` = reduced luminance below dark, for OLED true-black | `:22-24` | INACCURATE | `dimmed` is `scheme: 0.65`, between light (0) and dark (1) — lighter than dark, not darker (`preferences.ts:46`). |
| High contrast pushes pairs to "APCA Lc 90+" | `:27,31` | INACCURATE | It is a `contrastFactor` multiplier of 1.3, not a fixed Lc 90 target. See CC-4. |
| Accent placed to clear "APCA Lc 70" | `:15` | INACCURATE | Foreground target is Lc 75 (`config.ts:42`). |
| CSS ships `prefers-color-scheme: dark` and `prefers-contrast: more` blocks; no JS needed | `:59` | PARTLY ACCURATE | The media queries do exist, but the selector and scope are wrong — see next row. |
| Media-query blocks use `:root:not([data-theme])` | `:61-73` | INACCURATE | The real no-JS snapshot emits `[data-brand="<slug>"]` inside the media block. `src/platforms/web/css/nojs-snapshot.ts:53` — `const selector = \`[data-brand="${brand.slug}"]\``; media conditions at `:34-39`. |
| No JS needed for OS preference following | `:57-59` | OUTDATED-MISLEADING | The static snapshot is only a 2×2 light/dark × normal/more matrix for the **page/root surface**, explicitly described as "the accessible floor; JS refines it once available" (`nojs-snapshot.ts:6-16`). Continuous scheme positions (dimmed), CVD, warmth, density and *nested/scoped surfaces* all still require JS (`nojs-snapshot.ts:12-15`). |
| CVD presets named protanopia/deuteranopia/tritanopia | `:89` | INACCURATE | Kernel names are `protan`/`deutan`/`tritan` (+`achromat`). See color-vision section. |

### `modes/light-dark.mdx` — INACCURATE

| Claim | Location | Verdict | Evidence |
| --- | --- | --- | --- |
| Light/dark derived from one intent, APCA solved per mode | `:7-13` | ACCURATE (in substance) | The continuous `scheme` axis plus APCA solving does exactly this (`preferences.ts:12`, `src/kernel/color/apca.ts:178-191` `solveLightness` binary search). |
| Multi-stop intent config shape `"neutral": { "light": {...}, "dark": {...} }` | `:19-24` | INACCURATE | Not the real schema. The kernel's mechanism is a **track** (`src/kernel/color/track.ts`, `evalTrack(stops, blend, scheme)`), evaluated at the continuous scheme position — see usage in `src/platforms/tokens/__tests__/static.test.ts:172`. Brand configs are YAML (`src/brands/*/config.global.yaml`), not the JSON shown. |
| Interpolation across modes for hue/chroma | `:17,26` | ACCURATE (mechanism), INACCURATE (interface) | Track stops interpolate continuously, but not via a `light`/`dark` key pair. |
| Generated CSS emits `--color-surface`, `--color-surface-secondary`, `--color-on-surface` | `:36-48` | INACCURATE | Zero occurrences of `--color-surface` or `--color-primary` in `generated/`. Real custom properties are `--ucs-*` (11,273 occurrences), e.g. `--ucs-brand-fg-l`, `--ucs-brand-surface-l`, `--ucs-brand-hue`, `--ucs-brand-chroma`, `--ctx-surface-l` (`generated/global/css/modes.system.gen.css`). |
| CSS emits literal `oklch(92% 0.01 220)` values per mode | `:36-48,59-61` | INACCURATE | The engine emits **lightness/hue/chroma primitives composed via calc()**, not finished colors. `src/kernel/system/config.ts:37` — "CSS composes full oklch() colors from these primitives using calc()/clamp()". Registered `@property --ucs-*-l` / `--ucs-*-hue` / `--ucs-*-chroma` entries confirm this. |
| `[data-theme="dark"]` block | `:43` | INACCURATE | See CC-1. |
| `:root:not([data-theme])` media selector | `:58` | INACCURATE | Real selector is `[data-brand="<slug>"]` (`nojs-snapshot.ts:53`). |
| `substrate build` produces manifest alongside CSS | `:78-84` | INACCURATE | See CC-3. |
| Token manifest entries with `"contrast": { "apca": 91.4 }` | `:88-96` | UNVERIFIABLE / likely fabricated | `generated/manifest.gen.json` exists but no per-token `contrast.apca` schema of this shape was found. The kernel does track shortfall as `unmetLc` on `LightnessSolution` (`apca.ts:149-157`), a different concept. |
| Defaults Lc 70 body / Lc 60 large | `:99` | INACCURATE | Lc 75 fg / Lc 50 border (`config.ts:42-43`). See CC-4. |

### `modes/high-contrast.mdx` — INACCURATE

| Claim | Location | Verdict | Evidence |
| --- | --- | --- | --- |
| Two high-contrast variants (light base + dark base) | `:9-20` | ACCURATE (in substance) | `highContrast` (scheme 0, cf 1.3) and `darkHighContrast` (scheme 1, cf 1.3) — `preferences.ts:47-48`. Names in docs are kebab-case; real keys are camelCase. |
| Re-solve with target raised from Lc 70 to "Lc 90+" | `:24,31,36` | INACCURATE | Mechanism is a `contrastFactor` multiplier (1.3), not a substituted absolute target; base is Lc 75 not 70. `preferences.ts:13,47`; `config.ts:42`. |
| Hue and chroma held constant, only lightness changes | `:24` | ACCURATE (for contrast axis) | Matches the channel model — `contrastFactor` "scales all Lc targets" (`preferences.ts:13`); hue/chroma are separate channels (`config.ts:40-43`). Contradicted by the page's own next Note (see below). |
| `"highContrast.chromaLift": false` config option | `:43` | INACCURATE (fabricated) | `chromaLift` returns **zero matches** across `src/`, `packages/`, and `generated/`. The whole Note also self-contradicts `:24` ("hue and chroma are held constant"). |
| `@media (prefers-contrast: more)` in CSS output | `:48,51` | ACCURATE (condition), INACCURATE (selector) | Condition matches `nojs-snapshot.ts:37`. Selector is `[data-brand=...]`, not `:root:not([data-theme])`. |
| Combined `(prefers-contrast: more) and (prefers-color-scheme: dark)` | `:58` | ACCURATE (condition), order differs | `nojs-snapshot.ts:38` — `'(prefers-color-scheme: dark) and (prefers-contrast: more)'`. Equivalent semantics. |
| Runtime also responds to `prefers-contrast: less` | (not documented) | OMISSION | `src/platforms/web/runtime/a11y.ts:41-42` handles both `more` and `less`; docs mention only `more`. |
| Scoped `data-theme="high-contrast"` on a container / nested mixing | `:69,74-86` | INACCURATE | See CC-1. Contrast is a root-level preference scalar, not a per-subtree attribute. |
| `substrate audit --mode high-contrast` | `:94-98` | INACCURATE | No `audit` command. See CC-3. `src/audit/` exists as internal tooling, but is not this CLI surface. |

### `modes/color-vision.mdx` — INACCURATE

| Claim | Location | Verdict | Evidence |
| --- | --- | --- | --- |
| Three presets: `protanopia`, `deuteranopia`, `tritanopia` | `:11-17` | INACCURATE | Kernel identifiers are `protan`, `deutan`, `tritan` — plus a fourth, `achromat`. `src/kernel/system/preferences.ts:4` — `export type CvdType = 'none' \| 'protan' \| 'deutan' \| 'tritan' \| 'achromat';`. Same five values in Swift (`packages/kernel-swift/Sources/SubstrateKernel/Preferences.swift:6-12`) and Kotlin (`packages/kernel-kotlin/.../Preferences.kt:8`). Also `src/platforms/tokens/vectors.ts:49`. |
| Achromatopsia / monochromacy unsupported (implied by "three presets") | `:9-17` | OMISSION (significant) | `achromat` is fully supported: chroma reduction proportional to severity (`src/kernel/color/cvd.ts:145-149`), a `data-cvd-achromat` root attribute (`css-bridge.ts:149-150,164-165`), and dedicated pattern overlays (`src/platforms/web/styles/cvd-patterns.css:2,11-12`) so non-color cues carry meaning. |
| CVD is a boolean-ish preset list | `:21-37` | INACCURATE | CVD is `{ type, severity }` where severity is continuous 0.0→1.0 (`preferences.ts:6-9`). Severity is a first-class dimension the docs never mention. |
| Config shape: `{"brand": "acme", "cvd": ["protanopia", ...]}` | `:23-37` | INACCURATE (fabricated) | No `cvd:` key exists in any brand config (`src/brands/*/config.global.yaml`, `src/brands/*/*/config.yaml` — zero matches). CVD is a **runtime user preference**, not a build-time brand config array. |
| Each preset produces an independent `data-theme` block | `:21,50,56-64` | INACCURATE | See CC-1. CVD is applied by runtime hue transform (`cvdTransformAllIntents`, `cvd.ts:137-141`), plus `data-cvd-achromat` / `data-cvd-sim` attributes. |
| Only semantic roles (error/warning/success/info) are shifted; brand primary/secondary/neutral untouched | `:45,67` | INACCURATE | The function is literally `cvdTransformAllIntents(intents, cvd, gamut)` and iterates **every** intent in the map (`cvd.ts:137-153`). Compensation is a global hue redistribution onto a CVD-safe arc — `CVD_SAFE_ARCS` protan/deutan `{start: 70, end: 290}`, tritan `{start: 310, end: 130}` (`src/kernel/system/config.ts:73-77`), with `CVD_MIN_HUE_SEPARATION = 15` degrees enforced between adjacent intents (`config.ts:82`). Brand colors are *not* exempt. |
| Specific shifts: error red 0 → amber 40; success green 145 → cyan 200 | `:53,56-64` | INACCURATE | Not how it works. Hues are redistributed across the safe arc subject to minimum separation, not mapped to hard-coded target hues. Protan/deutan safe arc starts at 70°, so an "amber 40" output is outside the arc. |
| "no CSS media query equivalent for CVD" | `:87` | ACCURATE | No CVD media query exists in CSS; matches the runtime-preference design. |
| CVD × mode composition via nested `data-theme`; compound values "on the roadmap" | `:71-83` | INACCURATE | Composition is already native — `cvd` and `scheme` are independent axes of one preference vector (`preferences.ts:11-19`), so dark + protan is simply `{scheme: 1, cvd: {type: 'protan', severity: 1}}`. The nesting workaround and the roadmap framing are both wrong. |
| Docs present CVD compensation as a robust solve | throughout | OUTDATED-MISLEADING | The kernel carries prominent caveats the docs omit entirely (`cvd.ts:5-20`): hue redistribution helps **dichromats** most and is "weak for ANOMALOUS TRICHROMATS (the majority of CVD)"; "Treat it as an aid, not a guarantee"; it is "NEVER a substitute for non-color cues" (WCAG 2.2 §1.4.1); `CVD_MIN_HUE_SEPARATION` is "an engineering HEURISTIC, not a canonical/standardized threshold"; palettes should be validated empirically via Machado simulation + ΔE. Omitting these overstates the guarantee. |
| Machado 2009 simulation basis | (not documented) | OMISSION | `cvd.ts:2,30-33` — Machado, Oliveira, Fernandes (2009) IEEE TVCG 15(6), pre-computed 3×3 matrices at 11 severity steps. A notable, citable strength the docs skip. |

### `platforms/web.mdx` — INACCURATE

| Claim | Location | Verdict | Evidence |
| --- | --- | --- | --- |
| `substrate build` emits `dist/tokens/acme/acme.css` + `acme.json` | `:11-19` | INACCURATE | No `build` command (CC-3). Real layout is `generated/global/css/*.gen.css` (`tokens.gen.css`, `modes.gen.css`, `modes.system.gen.css`, `properties.gen.css`, `chart.gen.css`, `index.gen.css`) and per-brand `generated/brands/<brand>/<product>/`. No `<brand>.css` / `<brand>.json` pair. |
| Import via `@import './dist/tokens/acme/acme.css'` | `:26-34` | INACCURATE | Path does not exist. |
| "no build plugins, no JavaScript runtime, no dependencies" | `:7` | INACCURATE (critical) | The opposite of the architecture. There is a required web runtime — `src/platforms/web/runtime/css-bridge.ts` sets `data-brand`, computes scoped intent vars, and re-solves APCA per surface. The static CSS is only an SSR "accessible floor"; continuous scheme, CVD, warmth, density and **nested/scoped surfaces** need JS (`src/platforms/web/css/nojs-snapshot.ts:11-16`). |
| Mode switching via `data-theme` on `<html>` + `setTheme()` localStorage snippet | `:57-84` | INACCURATE | See CC-1. This code has no effect. |
| `--color-*` namespace (surface, on-surface, primary, error) | `:92` | INACCURATE | Zero `--color-primary` / `--color-surface` occurrences in `generated/`. Real namespace is `--ucs-*` (e.g. `--ucs-brand-fg-l`, `--ucs-danger-surface-l`) plus `--ctx-*`. |
| `--space-*` scale values `1,2,3,4,6,8,12,16` | `:93` | INACCURATE | `--space-*` exists (438 occurrences) but the generated name is `--space-unit` — a single unit scaled by `densityFactor`, not a discrete enumerated ramp. |
| `--type-size-*` with `xs…3xl` | `:94` | INACCURATE | Zero occurrences of `--type-size-`. Real: `--font-size-base`, `--font-size-quantum`, `--font-size-rate`, and `--effective-ratio: calc(1 + (var(--scale-ratio) - 1) * var(--type-scale-factor))` (`generated/global/css/tokens.gen.css`) — a computed modular scale, not a fixed t-shirt ramp. |
| `--font-*` = `sans`, `mono` | `:95` | PARTLY INACCURATE | `--font-*` exists but the values are `--font-body`, `--font-heading`, `--font-mono`. There is no `--font-sans`. |
| `--motion-*` = instant/fast/normal/slow/slower | `:96` | INACCURATE | Only one `--motion-` occurrence in `generated/`; real model is `--duration: calc(var(--duration-base) * var(--motion-factor))` (`tokens.gen.css`) — continuous, driven by `motionFactor`. |
| `--ease-*` = standard/enter/exit/spring | `:97` | INACCURATE | Zero occurrences of `--ease-` in `generated/`. Descriptors reference easing as `.easing("brand")`. |
| `acme.json` is W3C DTCG format for Tokens Studio / Style Dictionary | `:100` | PARTLY VERIFIABLE | DTCG support does exist (`src/kernel/color/dtcg.ts`, `npm run generate:tokens:DTCG`), but not at the documented path or filename. |

### `platforms/ios-swift.mdx` — INACCURATE

| Claim | Location | Verdict | Evidence |
| --- | --- | --- | --- |
| Output is a single `dist/tokens/acme/acme.swift` | `:11-16` | INACCURATE | Real output is a directory of per-brand files: `generated/brands/<brand>/swift/` containing `index.gen.swift`, `brand.gen.swift`, `system.light.gen.swift`, `system.dark.gen.swift`, `system.highContrast.gen.swift`, `system.darkHighContrast.gen.swift`, plus component descriptors under `generated/global/swift/components/`. |
| "requires no third-party dependencies" | `:7,28` | INACCURATE | Component descriptor files begin `import SubstrateKernel` (e.g. `generated/global/swift/components/badge...swift:2`), i.e. they depend on the `packages/kernel-swift` SwiftPM package (`packages/kernel-swift/Package.swift`). Token-value files import `SwiftUI`. |
| `SubstrateTokens` enum namespace | `:7,28,34,42-48,57-59,68,71` | INACCURATE (fabricated) | The real symbols are `SubstrateSystemTokens` (an `enum`) and `SubstrateSystemTokenSet` (a `struct`) — `generated/brands/magic-patterns/swift/system.light.gen.swift:4-16`. `SubstrateTokens` does not exist. |
| Nested enums `Color`, `Space`, `TypeSize`, `Font`, `Motion` | `:34` | INACCURATE | No such nesting. `SubstrateSystemTokens` exposes flat role members — `surface`, `surfaceElevated`, `brand`, `neutral`, `danger`, `warning` (`system.light.gen.swift:17-45`) — each a `SubstrateSystemTokenSet` with exactly three fields: `surface`, `text`, `border` (`:5-7`). |
| `SubstrateTokens.Space.space4`, `.TypeSize.md` | `:42-46,59` | INACCURATE | No spacing or type-size constants in the Swift token output at all. Spacing appears in *descriptors* as `.spatial(2)` style properties, resolved by the kernel. |
| `SubstrateTokens.Color.primary` / `.onPrimary` | `:44-45,57-58` | INACCURATE | No `primary`/`onPrimary` roles. Nearest is `SubstrateSystemTokens.brand`, and the foreground member is `.text` not `onPrimary`. |
| `.uiColor` helper converting Color → UIColor | `:53,57-58` | INACCURATE (fabricated) | No `uiColor` member exists. Values are `SwiftUI.Color(.displayP3, red:green:blue:opacity:)` (`system.light.gen.swift:18-20`). |
| `.resolving(in: .darkMode)` | `:71` | INACCURATE (fabricated) | No such API. Light/dark are **separate generated files** (`system.light.gen.swift` vs `system.dark.gen.swift`), each with statically baked values. |
| Uses `UITraitCollection` under the hood for automatic light/dark | `:64` | INACCURATE | Generated files contain plain static values; nothing consults `UITraitCollection`. Note `src/kernel/color/apple.ts:6` does map appearances to Xcode asset-catalog `luminosity`/`contrast` for a *different* output target, but that is not the Swift constants path described here. |
| Values are sRGB-ish / unspecified color space | implicit | OMISSION | Output is **Display P3** (`Color(.displayP3, ...)`), a material detail for correctness that the page never states. |
| High-contrast/CVD need `accessibilityContrast` trait override | `:76-78` | INACCURATE | Conflates the web `data-theme` fiction with UIKit traits. Real high-contrast Swift output is a separate pre-generated file, `system.highContrast.gen.swift` / `system.darkHighContrast.gen.swift`; CVD is handled by the kernel's `Cvd.swift`, not by a trait collection. |
| Kernel package contents | (not documented) | OMISSION | `packages/kernel-swift/Sources/SubstrateKernel/` is a full math port: `Apca.swift`, `Oklch.swift`, `Cvd.swift`, `Pipeline.swift`, `Preferences.swift`, `Surface.swift`, `Track.swift`, `Warmth.swift`, `ColorResolve.swift`, `Materials.swift`, `StyleDescriptor.swift`, `BrandData.swift`, with conformance tests against shared fixtures (`Tests/SubstrateKernelTests/Fixtures/reference-fixtures.json`). The page documents none of the actual runtime API. |

### `platforms/android-kotlin.mdx` — INACCURATE

| Claim | Location | Verdict | Evidence |
| --- | --- | --- | --- |
| Output is a single `dist/tokens/acme/acme.kt` | `:11-16` | INACCURATE | Real output is `generated/brands/<brand>/compose/` with `index.gen.kt`, `brand.gen.kt`, `system.light.gen.kt`, `system.dark.gen.kt`, `system.highContrast.gen.kt`, `system.darkHighContrast.gen.kt`, `material-scheme.gen.kt`. |
| Copy into `app/src/main/java/com/acme/design/SubstrateTokens.kt`, edit `package` line | `:21-28` | INACCURATE | Generated Compose files declare **no package** at all (`system.light.gen.kt:1-3` goes straight from the generated-header comment to imports). There is no package line to edit. (The kernel port does declare `package substrate.kernel` — `packages/kernel-kotlin/src/main/kotlin/substrate/kernel/Preferences.kt:6`.) |
| "No additional Gradle dependencies required"; uses only `androidx.compose.ui.graphics.Color` and `androidx.compose.ui.unit.*` | `:30-32` | PARTLY INACCURATE | Token files import `androidx.compose.ui.graphics.Color` **and `androidx.compose.ui.graphics.colorspace.ColorSpaces`** (`system.light.gen.kt:2-3`); no `androidx.compose.ui.unit.*` import appears. Descriptor/kernel usage additionally requires the `substrate.kernel` port. |
| `import com.acme.design.SubstrateTokens` | `:45` | INACCURATE | Object is `SubstrateSystemTokens` and is package-less. |
| Nested objects `Color`, `Space`, `TypeSize` | `:37` | INACCURATE | Real shape is `object SubstrateSystemTokens` with flat role vals, each a `data class SubstrateSystemTokenSet(surface, text, border)` (`system.light.gen.kt:5-9,11`). |
| `SubstrateTokens.Color.primary` / `.onPrimary` | `:52-53` | INACCURATE | Roles are `surface`, `surfaceElevated`, `brand`, `neutral`, `danger`, `warning` (`system.light.gen.kt:12-40`). No `primary`/`onPrimary`. |
| `SubstrateTokens.Space.space4`, `TypeSize.md` | `:56-63` | INACCURATE (fabricated) | No spacing or type-size constants in Compose token output. Also a type error as written: Compose `fontSize` needs a `TextUnit`/`.sp`, and `Modifier.padding` needs `Dp` — the snippet would not compile even if the symbols existed. |
| Separate `SubstrateTokens.Light` / `SubstrateTokens.Dark` objects | `:70,75-77` | INACCURATE | Light and dark are separate **files**, each declaring the *same* top-level `SubstrateSystemTokens` name — they are alternative artifacts, not sibling members. As written the snippet cannot compile; worse, naively adding both files to one source set collides on the duplicate `SubstrateSystemTokens` / `SubstrateSystemTokenSet` declarations. |
| `tokens.toColorScheme()` | `:82` | INACCURATE (fabricated) | No such extension. There *is* a `material-scheme.gen.kt` per brand that emits a Material `ColorScheme` — that is the real integration point, and the page never mentions it. |
| `SubstrateTokens.HighContrast` object | `:92-99` | INACCURATE | Real artifacts are `system.highContrast.gen.kt` and `system.darkHighContrast.gen.kt` (separate files, same object name). |
| "maps to Android's forced-contrast night mode" | `:92` | INACCURATE / conflated | Night mode is a light/dark concept, unrelated to contrast. Substrate does have forced-colors handling (`src/kernel/color/forced-colors.ts`) but that is the CSS `forced-colors` / Windows high-contrast path (`src/platforms/web/runtime/a11y.ts:99`), not Android night mode. |
| `isHighTextContrastEnabled` covers Substrate's high-contrast mode | `:96-99` | OUTDATED-MISLEADING | `isHighTextContrastEnabled` is a text-specific Android flag; Substrate's `contrastFactor` scales all Lc targets including borders (`preferences.ts:13`, `config.ts:42-43`). Also `getSystemService(ACCESSIBILITY_SERVICE)` as written is not valid outside a `Context` receiver. |
| "cover all five Substrate display modes within a single theme composable" | `:102` | INACCURATE | Only four static Compose artifacts exist (light, dark, highContrast, darkHighContrast). `dimmed` (`scheme: 0.65`) has no baked file — it requires continuous track sampling through the kernel (`static.test.ts:158-181`). |
| Kernel package contents | (not documented) | OMISSION | `packages/kernel-kotlin/src/main/kotlin/substrate/kernel/` mirrors the Swift port: `Apca.kt`, `Oklch.kt`, `Cvd.kt`, `Pipeline.kt`, `Preferences.kt`, `Surface.kt`, `Track.kt`, `Warmth.kt`, `ColorResolve.kt`, `StyleDescriptor.kt`, `BrandData.kt`, with a conformance harness (`run-conformance.sh`, `src/conformance/kotlin/substrate/kernel/VectorConformance.kt`). Unmentioned. |

---

## Would the code examples compile / work?

| Example | Result |
| --- | --- |
| `modes/*` + `platforms/web.mdx` HTML `data-theme` snippets | Parse as valid HTML, but have **no effect** — no CSS matches `data-theme`. |
| `platforms/web.mdx:76-84` `setTheme()` | Runs without error; produces no visual change. |
| `platforms/web.mdx:41-52` `var(--color-primary)` etc. | Resolve to nothing (invalid/initial) — those custom properties are never defined. |
| `platforms/ios-swift.mdx:36-48` SwiftUI | **Does not compile.** `SubstrateTokens`, `.Space.space4`, `.Color.primary`, `.TypeSize.md` are all undefined. |
| `platforms/ios-swift.mdx:55-59` UIKit | **Does not compile.** Adds undefined `.uiColor`. |
| `platforms/ios-swift.mdx:71` `.resolving(in: .darkMode)` | **Does not compile.** No such method or `.darkMode` member. |
| `platforms/android-kotlin.mdx:39-65` Compose | **Does not compile.** Undefined `SubstrateTokens`, wrong import, plus `Dp`/`TextUnit` type errors. |
| `platforms/android-kotlin.mdx:72-86` theme wrapper | **Does not compile.** `SubstrateTokens.Dark/.Light` and `.toColorScheme()` undefined. |
| `platforms/android-kotlin.mdx:94-100` accessibility check | **Does not compile** as written (no `Context` receiver); also semantically wrong for Substrate's contrast model. |
| `modes/light-dark.mdx:19-24` JSON multi-stop config | Not a valid Substrate config — brand configs are YAML and use track stops. |
| `modes/color-vision.mdx:23-37` JSON `cvd` array | Not a valid Substrate config — no `cvd` key in brand config; CVD is a runtime preference with `{type, severity}`. |
| `modes/high-contrast.mdx:43` `"highContrast.chromaLift": false` | Key does not exist. |
| `substrate build` / `substrate audit ...` | Commands do not exist; CLI would print usage and fail. |

---

## Highest-priority corrections

1. **Remove every `data-theme` reference** across all six pages and replace with
   the real model: `data-brand` (set by the runtime) + preference vector, with
   `data-mode` documented correctly as a *semantic role* selector.
2. **Reframe modes as a continuous preference vector** with named presets
   (`light`, `dark`, `dimmed`, `highContrast`, `darkHighContrast` — camelCase),
   noting `dimmed` is mid-track at 0.65 and lighter than dark.
3. **Rewrite both platform pages from scratch.** The documented Swift/Kotlin APIs
   are fabricated; the real surface is `SubstrateSystemTokens` /
   `SubstrateSystemTokenSet` (three fields: surface/text/border, Display P3) plus
   the `SubstrateKernel` / `substrate.kernel` computation packages.
4. **Correct the CVD page**: identifiers `protan`/`deutan`/`tritan`/`achromat`,
   continuous `severity`, runtime preference (not brand-config array), global
   intent hue redistribution over `CVD_SAFE_ARCS` (not four semantic roles), and
   surface the kernel's own caveats about anomalous trichromats and non-color cues.
5. **Fix the CLI**: replace `substrate build` / `substrate audit` with the real
   `substrate init|add|upgrade|adopt|setup` surface and the `npm run generate:*`
   pipeline.
6. **Correct contrast defaults** to Lc 75 (foreground) / Lc 50 (border), and
   describe high contrast as `contrastFactor: 1.3` multiplier rather than a fixed
   Lc 90 target.
7. **Replace the token namespace table** in `platforms/web.mdx` with the real
   `--ucs-*` / `--ctx-*` primitives and the calc()-composed model, and state
   plainly that a JS runtime is required beyond the SSR accessible floor.
