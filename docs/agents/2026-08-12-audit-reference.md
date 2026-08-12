# Reference Section Accuracy Audit — 2026-08-12

Docs repo: `/Users/dimitriotero/Documents/GITHUB/substrate-docs`
Code under test: `/Users/dimitriotero/Documents/GITHUB/substrate`

Scope: the seven `reference/*.mdx` pages. No doc pages were modified.

---

## Executive summary

The reference section documents a **different product than the one in the repository**. This is not a case of drift on a handful of fields — the token namespace, the config file format, the config field names, the mode-switching mechanism, and the contrast-target model are all fabricated or wrong.

Highest-severity findings:

1. **The entire `--color-*` token namespace does not exist.** Real tokens are `--ucs-{intent}-{surface,text,border}` and `--surface-*`. Not one of the ~28 color tokens documented on `color-tokens.mdx` appears in generated output.
2. **`substrate.config.json` does not exist.** Config is YAML (`config.yaml` / `config.global.yaml` per brand; `substrate.config.yaml` for client overrides). Nearly every documented field name is wrong.
3. **`data-theme` does not exist.** Modes/intents are scoped via `data-mode` (and `data-brand`).
4. **`--type-size-*`, `--space-N`, `--motion-fast|normal|slow|slower`, `--ease-*` — none exist.** Type/spacing/motion pages document ladders the engine does not emit.
5. **`contrast-targets` does not exist anywhere in the codebase.** The real APCA policy is a fixed named policy (fg Lc 75 / border Lc 50 / focus ring Lc 60) scaled by a continuous `contrastFactor`.
6. **The "APCA Lc comment in generated CSS" claim is false** — zero occurrences of `APCA` in any generated CSS.

Per-page verdicts:

| Page | Verdict |
|---|---|
| `color-tokens.mdx` | INACCURATE (near-total) |
| `type-tokens.mdx` | INACCURATE (near-total) |
| `spacing-tokens.mdx` | INACCURATE (near-total) |
| `motion-tokens.mdx` | INACCURATE (near-total) |
| `config-schema.mdx` | INACCURATE (near-total) |
| `apca-solver.mdx` | MIXED — conceptual framing ACCURATE, all specifics INACCURATE |
| `faq.mdx` | MIXED — philosophy ACCURATE, most mechanics INACCURATE |

---

## Ground truth: what the system actually emits and consumes

Established before per-page findings, since most findings reference it.

### Real CSS variable namespaces

From `generated/global/css/*.css` and `generated/brands/*/*/css/*.css` (180 unique names in global alone):

- `--ucs-{intent}-hue`, `-chroma`, `-fg-l`, `-surface-l`, `-border-l`, `-pattern`
- `--ucs-{intent}-fg-l-{heading,label,caption,code,kbd}` (per text role)
- `--ucs-{intent}-{surface,text,border}` (resolved hex, in per-mode token files)
- `--ucs-focus-ring`, `--ctx-surface-l`
- `--surface-*` (~70 layout/typography/appearance properties: `--surface-background`, `--surface-foreground`, `--surface-border-color`, `--surface-padding-x`, `--surface-font-size`, …)
- `--solved-{fg,bg,bdr}-{l,c}`
- Scalars: `--density`, `--scale`, `--contrast-factor`, `--motion-factor`, `--type-scale-factor`, `--duration`, `--duration-base`, `--radius`, `--radius-base`, `--space-unit`, `--scale-ratio`, `--effective-ratio`, `--font-size-base`, `--font-size-quantum`, `--font-size-rate`, `--weight-bump`
- Fonts: `--font-heading`, `--font-body`, `--font-mono`
- `--chart-*` families

Example of real emitted tokens, `generated/brands/delta/booking/css/tokens.light.gen.css:6-12`:

```css
:root {
  --ucs-surface-surface: #eff7f9;
  --ucs-surface-text: #080c0d;
  --ucs-surface-border: #6d7374;
  --ucs-surface-elevated-surface: #f6fdff;
  --ucs-brand-surface: #bf0039;
  --ucs-brand-text: #c7003f;
  --ucs-brand-border: #ff5674;
```

### Real config shape

`src/kernel/system/types.ts:146-240` — `interface BrandConfig`:

```
name, slug, intents{brand, neutral, [name]}, ramps?, color?,
elevation{stepLight, stepDark, sunkenStep},
typography{headingFamily, bodyFamily, monoFamily?, baseFontSize, scaleRatio, fluid?, density?},
shape{radiusBase}, motion{durationBase, easing}, space{unit},
flexibility{scheme, contrast, density, typeScale, motion, effects?},
gradients?, effects?, materials?, system?, presets?
```

Authored as YAML — see `src/brands/delta/config.global.yaml`, `src/brands/delta/booking/config.yaml`.

### Real mode set

`generated/brands/*/*/css/tokens.*.gen.css` yields exactly: `light`, `dark`, `highContrast`, `darkHighContrast`.
`src/kernel/system/preferences.ts:43-49` `SCHEME_PRESETS` adds `dimmed` as a preset (scheme 0.65, contrastFactor 0.95) but it is not a separately generated token file in current output.

### Real APCA policy

`src/kernel/color/solver.ts:61-66`:

```ts
export const COLOR_SOLVER_APCA_POLICY = {
  foregroundLc: 75,
  borderLc: 50,
  focusRingLc: 60,
  maxLc: 106,
} as const satisfies ColorSolverApcaPolicy;
```

Scaled by `prefs.contrastFactor` (`src/kernel/system/preferences.ts:13`, range 0.75→1.5).

---

## Page 1: `reference/color-tokens.mdx` — INACCURATE

Verdict: near-total fabrication. Every token name in all five tables is wrong.

### F1.1 — INACCURATE (CRITICAL): no `--color-*` token namespace exists

The page documents ~28 tokens across Surface / On-Surface / Primary / Semantic / Border tables. Grep across all of `generated/`: the only `--color-*` hits are 12 numeric ramp steps in **one** brand (`generated/brands/draftkings/*/css/ramps.web.static.gen.css`: `--color-brand-25`, `-50`, `-100` … `-1000`) — an opt-in named ramp recipe (`BrandConfig.ramps`, `src/kernel/system/types.ts:161`), not the semantic system.

Specifically nonexistent: `--color-surface`, `--color-surface-secondary`, `--color-surface-tertiary`, `--color-surface-inverse`, `--color-on-surface`, `--color-on-surface-subtle`, `--color-on-surface-disabled`, `--color-on-surface-inverse`, `--color-primary`, `--color-primary-subtle`, `--color-on-primary`, `--color-primary-hover`, `--color-primary-active`, `--color-error`, `--color-on-error`, `--color-error-subtle`, `--color-warning`, `--color-on-warning`, `--color-warning-subtle`, `--color-success`, `--color-on-success`, `--color-success-subtle`, `--color-info`, `--color-on-info`, `--color-info-subtle`, `--color-border`, `--color-border-strong`, `--color-border-focus`.

Real equivalents: `--ucs-surface-surface`, `--ucs-surface-text`, `--ucs-surface-border`, `--ucs-surface-elevated-*`, `--ucs-brand-*`, `--ucs-danger-*`, `--ucs-warning-*`, `--ucs-success-*`, `--ucs-info-*`, `--ucs-focus-ring`.

### F1.2 — INACCURATE: `error` is named `danger`

Config and output use `danger`, not `error`. `src/brands/delta/config.global.yaml:27` (`danger:`); emitted as `--ucs-danger-surface|text|border`. The doc's whole "Semantic Tokens" table keys off `error`.

### F1.3 — INACCURATE: the "triptych" is surface/text/border, not signal/on-color/subtle

Doc (line 45) claims each semantic color yields "the signal color itself, its on-color, and a subtle background tint". Real triptych is `-surface` / `-text` / `-border` (see `tokens.light.gen.css`). No `-subtle` token exists anywhere in generated output.

### F1.4 — INACCURATE (CRITICAL): `data-theme` does not exist; modes use `data-mode`

Doc line 73: "Each mode is scoped to a `data-theme` attribute". Zero `data-theme` occurrences in `src/` or `packages/`. Actual selectors are `[data-mode~="brand"]`, `[data-mode~="danger"]`, `[data-mode~="delta-navy"]`, etc. (`generated/global/css/modes.gen.css`). Note `data-mode` scopes **intents**, not light/dark — a further conceptual mismatch. Brands scope via `[data-brand="slug"]` (`src/kernel/system/types.ts:148`).

### F1.5 — INACCURATE: mode list wrong

Doc line 73 lists `light`, `dark`, `dimmed`, `high-contrast`, `high-contrast-dark`. Generated files are `light`, `dark`, `highContrast`, `darkHighContrast` (camelCase, and no `dimmed` file). `dimmed` exists only as a `SCHEME_PRESETS` entry (`preferences.ts:46`).

### F1.6 — INACCURATE: CVD is not a set of generated `data-theme` presets

Doc line 73: "any CVD presets you enable (`protanopia`, `deuteranopia`, `tritanopia`)". CVD is a **runtime user preference** — `CvdConfig { type, severity }` with `type: 'none' | 'protan' | 'deutan' | 'tritan' | 'achromat'` (`src/kernel/system/preferences.ts:4-9`), severity continuous 0→1. Names are `protan`/`deutan`/`tritan`, not the `-opia` forms, and `achromat` is undocumented.

### F1.7 — PARTIALLY ACCURATE: build-time APCA solving

"Every foreground token is APCA-solved against its intended surface at build time" is directionally right (`src/kernel/color/apca.ts:180-250`), but the system is also a runtime CSS-variable engine (`src/platforms/web/runtime/css-bridge.ts`), so "at build time" understates it.

### F1.8 — ACCURATE: Swift/Kotlin parity

"equivalent Swift constants and Kotlin values are generated using the same naming convention" — confirmed: `generated/brands/delta/booking/swift/`, `.../compose/` exist with parallel structure.

---

## Page 2: `reference/type-tokens.mdx` — INACCURATE

### F2.1 — INACCURATE (CRITICAL): `--type-size-*` tokens do not exist

Zero occurrences of `--type-size-` in `generated/`. The seven documented tokens (`--type-size-xs` … `--type-size-3xl`) are fabricated.

Real emission: `--font-size-base` (rem, from `typography.baseFontSize`), `--scale-ratio`, `--effective-ratio`, `--type-scale-factor`, `--font-size-quantum`, `--font-size-rate`, and per-surface `--surface-font-size`. `src/platforms/web/runtime/css-bridge.ts:93-94`:

```ts
vars['--font-size-base'] = `${brand.typography.baseFontSize}rem`;
vars['--scale-ratio'] = String(brand.typography.scaleRatio);
```

The scale is a **continuous** computed function (with a user-adjustable `typeScaleFactor`, range 0.9–1.4 per `preferences.ts:15`), not a discrete t-shirt ladder.

### F2.2 — INACCURATE: config field names

Doc says the scale derives from `type-size-unit` and `scale-ratio`. `type-size-unit` has **zero** occurrences in `src/` or `packages/`. Real: `typography.baseFontSize` (in **rem**, default 1 — not px) and `typography.scaleRatio` (`src/kernel/system/types.ts:178-179`).

### F2.3 — INACCURATE: "16px base" default

`baseFontSize: 1` is rem, and every shipped brand uses `base-font-size: 1` (`src/brands/delta/config.global.yaml:52`). The doc's "16px base" is an unstated rem→px assumption presented as the config value.

### F2.4 — INACCURATE: default ratio is not 1.25

Doc asserts default 1.25 (Major Third). Delta ships `scale-ratio: 1.2` (`src/brands/delta/config.global.yaml:53`). No engine-level 1.25 default was found; ratio is per-brand and required.

### F2.5 — INACCURATE: font token names

Doc lists `--font-sans` and `--font-mono` and claims Substrate manages "two stacks". Real tokens are **three**: `--font-heading`, `--font-body`, `--font-mono` (`generated/brands/delta/booking/css/brand.gen.css`), from `typography.headingFamily` / `bodyFamily` / `monoFamily?` (`types.ts:175-177`). `--font-sans` does not exist.

### F2.6 — INACCURATE: `font` config object does not exist

Doc line 25: "supplying a `font` object in your brand config". Zero `font:` key occurrences. Real key is `typography:`.

### F2.7 — INACCURATE: `--line-height-*` and `--letter-spacing-*` do not exist

Zero occurrences of either prefix in `generated/`. All documented values (1.2/1.5/1.75; -0.02em/0/0.05em/0.1em) are unverifiable fabrications. Real per-surface properties: `--surface-line-height`, `--surface-letter-spacing`.

### F2.8 — OUTDATED-MISLEADING: "line height tokens are fixed values, not computed"

Contradicts the engine's density model, which carries `typography.density.fontSizeK` / `fontWeightK` coefficients (`types.ts:186-189`) — typography responds to density.

---

## Page 3: `reference/spacing-tokens.mdx` — INACCURATE

### F3.1 — INACCURATE (CRITICAL): `--space-N` scale does not exist

Zero occurrences of `--space-0`, `--space-1`, … `--space-24` in `generated/`. The only `--space-*` token is `--space-unit` (`src/platforms/web/runtime/css-bridge.ts:101`):

```ts
vars['--space-unit'] = `${brand.space.unit}px`;
```

Spacing is applied as a **`calc()` continuum**, not a token ladder. `src/platforms/web/css/transformer.ts:184`:

```ts
value: `calc(var(--density) * var(--scale) * var(--space-unit) * ${value})`,
```

So a component authoring `padding-inline: 4` resolves through `--surface-padding-x`, not a `--space-4` token. Confirmed in `src/platforms/web/styles/reference.css:417-418`.

### F3.2 — INACCURATE: `space-unit` is not the config key

Doc treats `space-unit` as a top-level config field with a `"4px"` **string** value. Real: `space.unit`, a **number** in px (`types.ts:204-206`; `src/brands/delta/config.global.yaml` → `space:\n  unit: 4`).

### F3.3 — INACCURATE (CRITICAL): density multipliers are wrong

Doc table: compact 0.75× / default 1× / comfortable 1.25×. Actual, consistent across **all five** shipped brands (delta, draftkings, descript, google, stripe `config.global.yaml`):

```yaml
density:
  compact:      { density-factor: 0.85 }
  default:      { density-factor: 1.0 }
  comfortable:  { density-factor: 1.15 }
```

The worked example on line 40 (`4 × (4px × 0.75) = 12px`) is therefore wrong; at real compact it would be 13.6px.

### F3.4 — INACCURATE: density is continuous, not three levels

Doc: "The three levels give you a single-lever control". Real `densityFactor` is a continuous preference (`preferences.ts:14`, range 0.8→1.3), with compact/default/comfortable as **presets** on that continuum, and per-brand `flexibility.density {min, max}` bounding it (`types.ts:212`).

### F3.5 — UNVERIFIABLE / fabricated rationale: "steps 5, 7, 9, 11, 13–15 intentionally omitted"

Presupposes a discrete scale that doesn't exist (F3.1). No supporting code or design doc found.

### F3.6 — INACCURATE: density multiplies `space-unit` "before all other calculations"

Real order composes three independent scalars at use site: `--density * --scale * --space-unit` (`transformer.ts:184`). `--density` never mutates `--space-unit`.

---

## Page 4: `reference/motion-tokens.mdx` — INACCURATE

### F4.1 — INACCURATE (CRITICAL): named duration tokens do not exist

Zero occurrences of `--motion-instant`, `--motion-fast`, `--motion-normal`, `--motion-slow`, `--motion-slower`. The only `--motion-*` token is `--motion-factor`. Real motion vars: `--duration-base`, `--duration`, `--motion-factor`, `--surface-transition-duration`, `--surface-transition-delay`, `--surface-transition-timing`.

Real model (`src/kernel/motion/motion.ts:11-17`):

```ts
export function resolveDuration(
  baseDuration: number, motionFactor: number, multiplier: number = 1
): number {
  return Math.round(baseDuration * motionFactor * multiplier);
}
```

A continuous `motionFactor` (0→1, default **0.75** per `preferences.ts:27`) times the brand's `durationBase`, times a per-component multiplier — not five named steps.

### F4.2 — INACCURATE: `motion-unit` config field does not exist

Zero occurrences. Real: `motion.durationBase` (number, ms) and `motion.easing` (string) — `types.ts:198-201`. Delta ships `duration-base: 75`, `easing: "linear"` (`src/brands/delta/config.global.yaml:60-62`), so the doc's "100ms unit" example column matches no shipped brand.

### F4.3 — INACCURATE (CRITICAL): `--ease-*` tokens do not exist

Zero occurrences of `--ease-standard`, `--ease-enter`, `--ease-exit`, `--ease-spring`. Real: a single `--easing` var per brand from `motion.easing`. All four documented cubic-bezier curves are fabricated, as is the asymmetric enter/exit rationale (line 28). Delta's actual easing is `linear`.

### F4.4 — INACCURATE: the CSS usage example cannot work

Lines 34-44 use `var(--motion-fast)`, `var(--ease-standard)`, `var(--motion-normal)`, `var(--ease-enter)` — none of which resolve. The example would silently produce invalid transitions.

### F4.5 — PARTIALLY ACCURATE: reduced-motion behavior

Doc line 47: "all duration tokens except `--motion-instant` resolve to `0ms`". Mechanism is real but described wrongly — `prefers-reduced-motion: reduce` sets `motionFactor` to 0 (`src/platforms/web/runtime/a11y.ts:9,17`), which zeroes `resolveDuration` output. There is no `--motion-instant` to exempt. Verdict on the *effect*: ACCURATE. On the *mechanism and token names*: INACCURATE.

---

## Page 5: `reference/config-schema.mdx` — INACCURATE

Verdict: the most damaging page. It is a field-by-field reference for a config file that does not exist in this format.

### F5.1 — INACCURATE (CRITICAL): the file is YAML, not `substrate.config.json`

Doc line 7: "`substrate.config.json` at the root of your project — is the single input to Substrate". Zero occurrences of `substrate.config.json`. Reality:

- Per-brand: `src/brands/<brand>/config.global.yaml` + `src/brands/<brand>/<subbrand>/config.yaml`
- Client override: `substrate.config.yaml` (`src/generated-artifacts/project-graph.ts:224` — `readContent('substrate.config.yaml', 'client-override')`)
- Component-level: `config.yaml` per component
- Client property overrides: `properties.yaml` (`src/kernel/system/schema.ts:456-463`)

It is also not a "single input" — it is a layered cascade (global → platform → client; `schema.ts:399-408`), plus brand global → sub-brand inheritance.

### F5.2 — INACCURATE: `brand` field

Doc: `brand`, string, required, "prefix in output filenames". Real: **two** fields — `name` (display string, e.g. `"Delta Air Lines - Booking"`) and `slug` (directory name, used in `[data-brand="slug"]` selectors) — `types.ts:147-148`.

### F5.3 — INACCURATE (CRITICAL): `color` field is `intents`

Doc: `color`, object, required, keyed by `primary`/`neutral`/`error`/`warning`/`success`/`info`. Real: `intents`, with **only `brand` and `neutral` required** and every other intent the brand's free choice (`types.ts:154-158`):

```ts
intents: {
  brand: BrandIntent;
  neutral: BrandIntent;
  [name: string]: BrandIntent;
};
```

The comment above it is explicit: *"There is no built-in-vs-custom split: a brand declares ALL of its intents in this single map."* So `primary` → `brand`, `error` → `danger`, and the doc's closed enumeration of six roles misrepresents an open map. Real brands declare arbitrary intents (`delta-navy`, `booking-cta`, `medallion-gold`, `gemini-blue`, …).

### F5.4 — INACCURATE: `space-unit`

See F3.2. Doc: top-level `space-unit`, string `"4px"`, default `"4px"`. Real: `space.unit`, number, required, no engine default.

### F5.5 — INACCURATE: `type-size-unit`

Zero occurrences. Real: `typography.baseFontSize`, number in **rem** (not a px string), default not `"16px"`.

### F5.6 — INACCURATE: `scale-ratio`

Not top-level; it is `typography.scaleRatio` (`types.ts:179`). The documented default 1.25 is unsupported — Delta uses 1.2. The named-ratio list (1.2 Minor Third / 1.25 Major Third / 1.333 / 1.5) is editorial, not schema. (Aside: 1.2 is a Minor Third and 1.25 a Major Third — the labels are conventionally right, but they encode no engine behavior.)

### F5.7 — INACCURATE: `motion-unit`

Zero occurrences. Real: `motion.durationBase` (number ms) + `motion.easing` (string). Doc omits `easing` entirely.

### F5.8 — INACCURATE: `density`

Doc: top-level string enum `"compact"|"default"|"comfortable"`, default `"default"`. Real: density is (a) a runtime continuous `densityFactor`, (b) bounded by `flexibility.density {min, max}` (`types.ts:212`), and (c) declared as named preset **levels** under `presets.density` with `density-factor` values (`types.ts:235-239`, `ModePresetLevel`/`DensityPresetLevel`). There is no top-level `density` string field.

### F5.9 — INACCURATE: `modes`

Doc: top-level array of `"light"|"dark"|"dimmed"|"high-contrast"|"high-contrast-dark"`, "when omitted, all modes are generated". Real: `presets.mode`, a **map** of named levels each carrying `scheme` (0→1 continuous) and `contrastFactor` (`types.ts:256-259`). From `src/brands/delta/config.global.yaml:99-113`:

```yaml
presets:
  mode:
    light:              { scheme: 0.02, contrast-factor: 1.0 }
    dark:               { scheme: 0.95, contrast-factor: 1.0 }
    dimmed:             { scheme: 0.62, contrast-factor: 0.95 }
    high-contrast:      { scheme: 0.01, contrast-factor: 1.3 }
    dark-high-contrast: { scheme: 0.97, contrast-factor: 1.3 }
```

Note these are *positions on a continuum* (0.02, not 0), which the doc's discrete-list model cannot express.

### F5.10 — INACCURATE (CRITICAL): `cvd` config array does not exist

Doc: top-level `cvd` array of `"protanopia"|"deuteranopia"|"tritanopia"`, each generating "an additional `data-theme` token set". Real: CVD is a runtime `UserPreferences.cvd: CvdConfig` — `{ type: 'none'|'protan'|'deutan'|'tritan'|'achromat', severity: number }` (`preferences.ts:4-9`). Nothing is pre-generated per CVD profile. Engine-side constants are `CVD_SAFE_ARCS` and `CVD_MIN_HUE_SEPARATION` (`src/kernel/system/config.ts:73-82`).

### F5.11 — INACCURATE (CRITICAL): `contrast-targets` does not exist

Zero occurrences of `contrast-targets` or `contrastTargets` in `src/` or `packages/`. The documented override mechanism — including the `body-text` / `muted-text` role keys and the JSON examples on lines 86-92 and 190-193 — is entirely fabricated. Real contrast control is the continuous `contrastFactor` scaling a fixed policy (`solver.ts:61-66`), bounded per brand by `flexibility.contrast {min, max}` (Delta: 0.75–1.5).

### F5.12 — INACCURATE: `font` object

Zero occurrences of a `font:` config key. Real: `typography` with `headingFamily`/`bodyFamily`/`monoFamily`. The doc's `{"sans", "mono"}` key set is wrong (F2.5/F2.6).

### F5.13 — INACCURATE: "Color Intent Object" multi-stop shape

Doc (lines 126-162) documents `light`/`dark` sub-objects for per-mode hue/chroma override. No such shape in `BrandIntent`. Per-mode variation is handled by the scheme track system (`src/kernel/color/track.ts`, `intentTrackEvaluators`, referenced `solver.ts:37`) evaluated at continuous `prefs.scheme`, not by static light/dark literals. The claim that `light` covers `light`+`high-contrast` and `dark` covers `dark`+`dimmed`+`high-contrast-dark` is likewise unsupported.

### F5.14 — PARTIALLY ACCURATE: `hue` / `chroma`

The two leaf fields are real (`BrandIntent`, confirmed in every `config.yaml` and in `generated/.../swift/brand.gen.swift` as `IntentColorSpec(hue:chroma:)`), and both are required. Stated ranges (hue 0–360, chroma 0–0.4) are plausible and consistent with shipped values (0.008–0.216) but no explicit validation clamp was located — treat the exact bounds as UNVERIFIABLE.

### F5.15 — Undocumented required/major fields

The page omits, among others: `slug`, `elevation` (required), `flexibility` (required), `shape.radiusBase` (required), `presets`, `gradients`, `materials`, `effects`, `ramps`, `color` (the real `ColorConfig`), `system`, `typography.fluid`, `typography.density`. A reader following this page could not produce a loadable config.

---

## Page 6: `reference/apca-solver.mdx` — MIXED

The only page whose conceptual core survives. All numbers and mechanisms below the concept layer are wrong.

### F6.1 — ACCURATE: APCA is used, and the solve is a binary search on OKLCH L

`src/kernel/color/apca.ts:180-250`, `_solveLightnessCore`: "Binary search: 30 iterations gives precision to ~1e-9", searching `l` in [0,1] at fixed hue/chroma. Matches the doc's framing (line 15) and the FAQ's binary-search claim.

### F6.2 — ACCURATE: Lc sign convention

Doc line 19: positive Lc = dark-on-light, negative = light-on-dark, normalized to absolute values for targets. Confirmed `apca.ts:70-73` (docblock) and `apca.ts:85-95`; the solver compares `Math.abs(lc)` against a positive `targetLc` (`apca.ts:230`, param doc "always positive, e.g. 75").

### F6.3 — ACCURATE: attribution and rationale

"Developed by Andrew Somers", modelling polarity/spatial-frequency/non-linear response — consistent with `apca.ts:1-11` header citing SAPC-APCA and the W3C Silver task force.

### F6.4 — INACCURATE (CRITICAL): the default-targets table is fabricated

Doc lines 34-40 assert per-token Lc defaults: `--color-on-surface` 70, `--color-on-surface-subtle` 45, `--color-on-primary` 75, `--color-on-error` 75, high-contrast 90.

Real policy (`solver.ts:61-66`) is role-shaped, not token-shaped: **foreground Lc 75, border Lc 50, focus ring Lc 60, max Lc 106**. Every number in the doc table except the coincidental 75 is wrong, and the tokens it keys on don't exist (F1.1). High-contrast is not an Lc-90 override — it is `contrastFactor: 1.3` multiplying the policy (`preferences.ts:47-48`), i.e. fg 75 × 1.3 = 97.5, not 90.

Substrate additionally has a size/weight-aware Lc floor table (`src/kernel/color/apca-bronze.ts`, `lookupBronzeLc`, wired at `solver.ts:38`) that the doc never mentions — and whose header explicitly warns it is *"Substrate's OWN construction, NOT an official APCA artifact"*.

### F6.5 — INACCURATE (CRITICAL): high-contrast does not "override all targets to Lc 90"

Doc lines 40, 82. Contradicted by F6.4 — high contrast is a multiplicative factor on a continuum, and it is user-adjustable within `flexibility.contrast` (0.75–1.5), not a fixed floor. The doc's "regardless of your `contrast-targets` config" also references a nonexistent field (F5.11).

### F6.6 — INACCURATE (CRITICAL): the `contrast-targets` override mechanism is fabricated

Lines 44-58, including the JSON example, the `body-text`/`muted-text` keys, and the claim "You cannot set any target below Lc 30 — Substrate enforces this floor". No such field, keys, or floor exist. The real guardrails are per-brand `flexibility.contrast {min, max}` and the solver's `SOLVE_TOL`/`unmetLc` shortfall reporting (`apca.ts:47`, `apca.ts:157-172`).

### F6.7 — INACCURATE (CRITICAL): generated CSS contains no APCA Lc comments

Doc lines 60-78 claim "Every foreground token in the generated CSS includes its solved Lc score as an inline comment" and shows an example. Grep for `APCA` across all generated CSS for `delta/booking`: **0 matches in every file**. The example block is doubly wrong — it uses `--color-*` names (F1.1), `data-theme` selectors (F1.4), and `oklch()` values, whereas real per-mode token files emit **hex** (69 hex matches, 0 `oklch(` matches in `tokens.light.gen.css`).

### F6.8 — UNVERIFIABLE: the Lc-use-case table (lines 21-28)

Lc 15/30/45/60/75/90 with those use-case labels reflects general APCA guidance but does not correspond to any table in `src/kernel`. The parenthetical "Substrate defaults to Lc 70" is INACCURATE (real: 75). The real size/weight table (`apca-bronze.ts:26-42`) has a different structure entirely.

### F6.9 — ACCURATE-BUT-DATED: WCAG 3.0 note

Line 85's characterization of APCA as the candidate contrast method for the in-development WCAG 3.0 is broadly fair. The confident "when WCAG 3.0 becomes the standard, your tokens will already meet it" overstates — the codebase itself is markedly more cautious (`apca-bronze.ts:5-10`: "Do not read them as an official conformance table — validate against the live APCA tooling before claiming Bronze conformance").

### F6.10 — Undocumented solver behavior worth noting

The doc presents solving as always succeeding. Real solver returns `LightnessSolution { l, unmetLc, clamped }` and explicitly surfaces shortfalls rather than silently passing (`apca.ts:137-162`, UCS-568). A reference page that never mentions `unmetLc` misses the system's most important honesty guarantee.

---

## Page 7: `reference/faq.mdx` — MIXED

### F7.1 — ACCURATE: positioning vs. Style Dictionary / Tokens Studio

"Stores intent and computes values" is a fair description of the intent→solve pipeline (`solver.ts:10-27`).

### F7.2 — MOSTLY ACCURATE with one wrong detail: "no hand-authored token values"

Correct in spirit. But "The one exception is `font`" is wrong twice: the key is `typography` (F2.6), and it is not the only literal — `motion.easing` (a raw CSS easing string, e.g. `"linear"`), `shape.radiusBase`, `space.unit`, and `elevation.*` steps are all authored literals.

### F7.3 — PARTIALLY INACCURATE: coexisting with an existing design system

The interop claim is plausible, but the collision-safety argument rests on `data-theme` scoping and `--color-*`/`--space-*` namespacing — both wrong (F1.4, F1.1, F3.1). The real namespaces (`--ucs-*`, `--surface-*`, `data-mode`, `data-brand`) are arguably *safer*, so the conclusion holds by accident while the reasoning is false.

### F7.4 — INACCURATE (CRITICAL): the Figma answer is fabricated

Claims Substrate "generates a `brand.json` raw token file alongside its CSS output" and instructs committing it. `find generated -name "brand.json"` → **no results**. Real machine-readable outputs are DTCG: `generated/brands/delta/booking/dtcg/tokens.{light,dark,highContrast,darkHighContrast}.gen.dtcg.json`, plus `json/conformance-vectors.gen.json`. DTCG is in fact the *better* Figma path, so the advice points at a nonexistent file while a real one exists.

### F7.5 — INACCURATE: `substrate build` command

Used in three answers (lines 38, 59, and implied line 22). The CLI binary is `substrate` → `./bin/substrate-init.js` (`packages/cli/package.json:6-8`); no `build` subcommand was found. Generation runs through scripts such as `scripts/generate-tokens.ts` (named in every generated file header). Treat `substrate build` as UNVERIFIABLE at best, more likely wrong.

### F7.6 — INACCURATE: the CVD answer

Same defects as F5.10 — no `cvd` config array, wrong profile names (`protanopia` vs real `protan`), no pre-generated per-profile `data-theme` sets, `achromat` omitted. The claim that "CVD token sets are generated on top of whatever `modes` you enable" describes a build-time cross-product that does not exist; CVD is applied at runtime in the transform chain (`COLOR_SOLVER_TRANSFORM_ORDER = ['warmth', 'cvd', 'apca']`, `solver.ts:50`).

Also worth flagging: the codebase carries strong caveats the FAQ omits — hue redistribution "helps DICHROMATS most; it is weak for ANOMALOUS TRICHROMATS (the majority of CVD)" and "is NEVER a substitute for non-color cues" (`cvd.ts:6-14`). The FAQ's unqualified "remain distinguishable" is a meaningful accessibility overclaim.

### F7.7 — MOSTLY ACCURATE: changing primary hue

Recomputation-from-intent is real. Two errors: the field is `intents.brand.hue`, not a `primary` hue (F5.3), and `substrate build` is wrong (F7.5).

### F7.8 — PARTIALLY INACCURATE: per-component density

The conclusion (no per-component density field) is right, but the suggested workaround — "applying a CSS rule that overrides `--space-unit` on that element" — misidentifies the lever. The composition is `calc(var(--density) * var(--scale) * var(--space-unit) * n)` (`transformer.ts:184`), so the correct scoped override is `--density`, which is exactly what the engine varies. `--space-unit` is the brand constant.

### F7.9 — INACCURATE: disabling modes

Same as F5.9 — no top-level `modes` array; modes are `presets.mode` levels on a continuum. The claim that omitting a mode yields "no `data-theme` selectors, no Swift/Kotlin constants, no output files" compounds the `data-theme` error (F1.4).

### F7.10 — ACCURATE: iOS/Android output

"Three output formats in parallel: CSS, Swift, Kotlin" — confirmed (`generated/brands/delta/booking/{css,swift,compose}/`), and the outputs genuinely derive from the same brand data (`swift/brand.gen.swift` carries the same intents/elevation/typography/motion/space values as the YAML). Understated: real output also includes `react-native`, `dtcg`, `xcassets`, `json`, `docs`.

The naming example is wrong: doc predicts `AcmeTokens.colorPrimary`. Real Swift namespace is derived from brand+subbrand — `public enum DeltaBookingBrand` with `BrandData(...)` — not a `<Brand>Tokens.colorPrimary` constant.

### F7.11 — ACCURATE: OKLCH internals

The strongest answer on the page. All-OKLCH math (`src/kernel/color/oklch.ts`), perceptual uniformity enabling binary search on L without hue/chroma drift (`apca.ts:230-247` searches `l` at fixed `c`/`h`) — correct and well-stated.

One caveat: "The generated CSS uses `oklch()` function syntax" is only partly true. Component CSS uses `oklch()`, but per-mode token files emit **hex** (`tokens.light.gen.css`: 69 hex, 0 `oklch(`).

---

## Cross-cutting recommendations

1. **Do not patch these pages incrementally.** `color-tokens`, `type-tokens`, `spacing-tokens`, `motion-tokens`, and `config-schema` need rewriting from generated output, not correcting. There is no salvageable token list on any of them.
2. **Generate the token reference tables from `generated/`.** A doc test asserting every documented CSS variable appears in generated output would have caught all of F1.1/F2.1/F3.1/F4.1 mechanically. The substrate repo already has precedent for this (`src/__tests__/doc-config-coherence.test.ts`, `src/ontology/__tests__/generated-output-contract.test.ts`).
3. **Reconcile the discrete-vs-continuous model.** The docs describe a conventional discrete-token design system; Substrate is a continuous generative engine (`scheme`, `contrastFactor`, `densityFactor`, `typeScaleFactor`, `motionFactor`, `warmth`, CVD `severity` are all continuous with preset positions). This is the product's central differentiator and the reference section actively obscures it.
4. **Carry the codebase's own caveats into the docs.** The CVD limitations (`cvd.ts:5-19`) and the Bronze-table provenance warning (`apca-bronze.ts:4-10`) are accessibility-relevant and currently contradicted by confident doc claims.
5. **Document `unmetLc`.** The solver's explicit shortfall reporting is a genuine strength that no reference page mentions.
