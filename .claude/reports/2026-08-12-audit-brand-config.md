# Audit: brand-config/* and multi-brand/* doc pages vs. substrate source

Date: 2026-08-12
Docs repo: `/Users/dimitriotero/Documents/GITHUB/substrate-docs`
Code repo: `/Users/dimitriotero/Documents/GITHUB/substrate`

## Headline

All eight pages describe a **config system that does not exist in the codebase**. The
docs document a JSON config format (`substrate.config.json` + `substrate.workspace.json`)
with kebab-case scalar fields (`space-unit`, `type-size-unit`, `scale-ratio`,
`motion-unit`, `density`, `cvd`, `font`, `modes`, `contrast-targets`) and a `color:` map
of semantic roles.

The actual system is **YAML** (`config.global.yaml` / `config.yaml`) under
`src/brands/<family>/[<sub-brand>/]`, with a nested section-based schema
(`intents`, `elevation`, `typography`, `shape`, `motion`, `space`, `flexibility`,
`presets`, `gradients`, `ramps`, `materials`, `system`).

This is not field drift. It is a different format, a different file layout, a different
inheritance mechanism, a different CLI, and a different generated-token vocabulary. Not one
example config in these eight pages would load, and not one generated token name in these
pages exists in `generated/`.

Verdict summary:

| Page | Verdict |
|---|---|
| brand-config/overview.mdx | INACCURATE (near-total) |
| brand-config/color.mdx | INACCURATE (near-total) |
| brand-config/typography.mdx | INACCURATE (near-total) |
| brand-config/motion.mdx | INACCURATE (near-total) |
| brand-config/spacing-density.mdx | INACCURATE (near-total) |
| multi-brand/overview.mdx | INACCURATE (near-total) |
| multi-brand/inheritance.mdx | INACCURATE (near-total; one claim is actively inverted) |
| multi-brand/adding-a-brand.mdx | INACCURATE (near-total) |

---

## Ground truth: the real brand config schema

Authoritative TypeScript interface: `src/kernel/system/types.ts:146-240` (`BrandConfig`).
Authoritative loader: `src/kernel/system/brand-loader.ts`.
Authoritative cascade contract: `src/kernel/system/cascade.md` + `src/kernel/system/cascade.ts`.

```ts
// src/kernel/system/types.ts:146
export interface BrandConfig {
  name: string;
  slug: string;                       // directory name → [data-brand="slug"]
  intents: {                          // REQUIRED: brand + neutral
    brand: BrandIntent;
    neutral: BrandIntent;
    [name: string]: BrandIntent;
  };
  ramps?: Record<string, RampConfig>;
  color?: ColorConfig;                // ramp orchestration ONLY — not hue/chroma
  elevation: { stepLight; stepDark; sunkenStep };
  typography: { headingFamily; bodyFamily; monoFamily?; baseFontSize; scaleRatio; fluid?; density? };
  shape: { radiusBase };
  motion: { durationBase; easing };
  space: { unit };
  flexibility: { scheme; contrast; density; typeScale; motion; effects? };
  gradients?: Record<string, GradientConfig>;
  effects?: { blurUnit };
  materials?: Record<string, MaterialConfig>;
  system?: Record<string, unknown>;
  presets?: { mode?; density?; contrast? };
}
```

YAML is authored kebab-case and normalized to camelCase at load
(`cascade.md` §1: `heading-family` → `headingFamily`). Named-resource maps
(`intents`, `materials`, `gradients`, `ramps`, `rampOutputs`) preserve their child key
spellings exactly one level deep.

Real example — `src/brands/stripe/config.global.yaml`:

```yaml
intents:
  brand:   { hue: 277, chroma: 0.268 }
  neutral: { hue: 251, chroma: 0.012 }
  danger:  { hue: 11,  chroma: 0.228 }
  ...
elevation: { step-light: 0.015, step-dark: 0.04, sunken-step: 0.02 }
typography:
  heading-family: "'Sohne', 'Inter', system-ui, sans-serif"
  body-family: "'Sohne', 'Inter', system-ui, sans-serif"
  base-font-size: 1        # rem, NOT "16px"
  scale-ratio: 1.25
  fluid: { rate: 0.5 }
  density: { font-size-k: 0, font-weight-k: 0 }
shape:  { radius-base: 6 }
motion: { duration-base: 200, easing: "cubic-bezier(0.25, 0.1, 0.25, 1)" }
space:  { unit: 4 }        # bare number, NOT "4px"
flexibility: { scheme: true, contrast: {...}, density: {...}, type-scale: {...}, motion: {...} }
presets: { mode: {...}, density: {...}, contrast: {...} }
```

### Files that do not exist

`find . -name "substrate.config.*" -o -name "substrate.workspace.*"` returns **nothing**
outside `node_modules`. Neither file exists anywhere in the repo.

---

## Per-page findings

### 1. brand-config/overview.mdx — INACCURATE

| Claim (line) | Verdict | Evidence |
|---|---|---|
| Config file is `substrate.config.json`, "JSON (or YAML)" (L7, L11) | **INACCURATE** | Loader reads only `config.yaml` / `config.global.yaml` via `yaml.load` — `brand-loader.ts:135-137,152`. No JSON path exists. |
| "Place this file at the root of your project or brand directory… picked up automatically" (L7) | **INACCURATE** | Discovery is `loadAllBrandsWithPaths(brandsDir)` scanning `src/brands/*/`; there is no root-level or cwd-based pickup — `brand-loader.ts:124-160`. |
| Top-level field `brand` (string slug) (L15, L41) | **INACCURATE** | No `brand` field. `BrandConfig` has `name` and `slug`; `slug` is *derived from the directory name*, not authored — `brand-loader.ts:154` (`brand.slug = entry.name`), `types.ts:148`. |
| Top-level `color: { primary: {hue,chroma}, neutral: {...} }` (L16-19) | **INACCURATE** | Colors live under `intents:`, not `color:`. A `color?` key exists but is `ColorConfig` = ramp orchestration (`ramps`, `rampOutputs`) — `types.ts:117-120,164`. Role is `brand`, not `primary`. |
| `"space-unit": "4px"` (L20, L49) | **INACCURATE** | Real: `space: { unit: 4 }` — a bare number in px, nested. `types.ts:204-206`; every brand config e.g. `stripe/config.global.yaml`. |
| `"type-size-unit": "16px"` (L21, L53) | **INACCURATE** | Real: `typography.base-font-size: 1` — a **rem** number, not a px string. `types.ts:178` (`baseFontSize: number; // rem`). |
| `"scale-ratio": 1.25` top-level (L22) | **PARTIALLY ACCURATE / MISPLACED** | Value/type right, location wrong: it is `typography.scale-ratio` — `types.ts:179`. |
| `"motion-unit": "100ms"` (L23, L61) | **INACCURATE** | Real: `motion: { duration-base: 200, easing: "..." }` — number of ms, nested, and `easing` (undocumented) is required. `types.ts:198-201`. |
| `"density": "default"` as a top-level enum (L24, L65) | **INACCURATE** | Density is not a top-level scalar. It appears as (a) `presets.density.<level>.density-factor` and (b) the runtime `densityFactor` slider (0.8→1.3) — `types.ts:235-239,261-264`; `preferences.ts:14`. |
| `"cvd": ["deuteranopia","protanopia"]` build-time validation array (L25, L69) | **INACCURATE** | No `cvd` key in `BrandConfig`; `grep cvd src/brands/` returns nothing. CVD is a **runtime user preference**: `CvdType = 'none'\|'protan'\|'deutan'\|'tritan'\|'achromat'` with a severity — `preferences.ts:4-9`. Doc's spellings (`deuteranopia`/`protanopia`/`tritanopia`) are not the enum values. It does not "fail the build". |
| `"font": { sans, mono }` → `--font-sans` / `--font-mono` (L26-29, L73) | **INACCURATE** | Real: `typography.heading-family` / `body-family` / optional `mono-family` — `types.ts:175-177`. No `font` block; `--font-sans` / `--font-mono` do not exist in `generated/`. |
| `"modes": ["light","dark"]`, output as `[data-theme]` (L30, L77) | **INACCURATE** | No `modes` array. Modes come from `presets.mode` (light/dark/dimmed/high-contrast/dark-high-contrast). Selectors are `[data-brand]` / `[data-mode~="…"]`, never `[data-theme]` — `types.ts:148`, `generated/global/css/modes.gen.css`. |
| `"contrast-targets": { "body-text": 75, "ui-components": 60 }` (L31-34, L81) | **INACCURATE / UNVERIFIABLE** | No such key in `BrandConfig`. Contrast is `flexibility.contrast {min,max}` plus `contrast-factor` in presets, plus fixed per-channel Lc targets in the kernel (`--intent-fg-l` at Lc 75, `--intent-border-l` at Lc 50 — `src/kernel/system/config.ts:42-43`). |
| "Only `brand` and `color` are required" (L88) | **INACCURATE** | Neither key exists. Required at load: `intents.brand` and `intents.neutral` — `brand-loader.ts:85` (`REQUIRED_INTENTS = ['brand','neutral']`), enforced by `validateBrandIntentTracks` throwing `TrackError('missing-required-intent')` (`brand-loader.ts:95-107`). `BrandConfig` additionally types `elevation`, `typography`, `shape`, `motion`, `space`, `flexibility` as non-optional. |
| Minimal-config example (L90-98) and the defaults list (L100) | **INACCURATE** | Would not load: no `intents`, wrong keys throughout. The claimed defaults (`space-unit: 4px`, etc.) are not defaults of any real field. |

**Would the example configs validate? No.** Both the "complete example" (L13-35) and the
"minimal" example (L90-98) fail immediately — no `intents` map, so
`validateBrandIntentTracks` throws `missing-required-intent` for `brand`.

### 2. brand-config/color.mdx — INACCURATE

| Claim (line) | Verdict | Evidence |
|---|---|---|
| Two params per role: `hue` (0-360), `chroma` (0-~0.4) (L11-14) | **ACCURATE** | `HueChroma` — `types.ts:14-17` (`hue: number; // 0-360`, `chroma: number; // 0-0.4`). |
| Lightness is never authored; solver derives it (L7, L16) | **ACCURATE (for intents)** | `types.ts:22-23` "Lightness never appears here — it stays solver-owned". Note: `gradients[].stops[].lightness` **is** author-controlled (`types.ts:440`), an unstated exception. |
| Colors live under a `color:` key (L20-31) | **INACCURATE** | They live under `intents:`. `color?` is ramp orchestration — `types.ts:117-120`. |
| Role name `primary` (L22, L52) | **INACCURATE** | The required brand role is `brand`, not `primary`. `types.ts:155`; `SYSTEM_INTENTS` in `src/kernel/system/config.ts:20-28` = `brand, neutral, danger, warning, success, info, beta`. |
| Role name `error` (L27, L54) | **INACCURATE** | Real name is `danger`. Same evidence. |
| Reserved-roles table lists `primary`/`error` and omits `beta` (L52-57) | **INACCURATE** | Correct baseline set is `brand, neutral, danger, warning, success, info, beta`. |
| "reserved role names unlock additional generated token variants and built-in component bindings" (L60) | **INACCURATE / MISLEADING** | `config.ts:13-18` explicitly states the opposite: `SYSTEM_INTENTS` "is NOT the source of truth… the pipeline reads the brand's declared intents, never this list." There is "no built-in-vs-custom split" (`types.ts:150-153`). Custom intents get identical treatment. |
| Multi-stop light/dark via `{ light: {...}, dark: {...} }` (L24-26, L33-42) | **INACCURATE** | That grammar does not exist. The real scheme-varying grammar is `scheme-end` (tier 1) or `scheme-track: [{at, hue, chroma}]` / `{at, from-intent}` (tier 2), plus `blend: 'oklch'\|'oklab'` — `types.ts:26-61`. Positions are `at: 0` (light) → `at: 1` (dark). These key spellings are never normalized (`cascade.md` §1). |
| "Substrate interpolates between them" (L35) | **PARTIALLY ACCURATE (right idea, wrong syntax)** | Interpolation over a scheme axis is real (`kernel/color/track.ts`), but keyed on `scheme-track`/`scheme-end`, not `light`/`dark`. |
| Generated CSS `--color-primary`, `--color-primary-subtle`, `--color-on-primary` (L67-79) | **INACCURATE** | None of these exist. `grep -r "color-primary" generated/` → no matches. Real intent primitives are `--intent-hue`, `--intent-chroma`, `--intent-fg-l`, `--intent-border-l`, `--intent-surface-l`, `--intent-pattern` (`config.ts:39-45`; `generated/global/css/modes.gen.css`), plus solved `--solved-{bg,fg,bdr}-{l,c}`. |
| `[data-theme="dark"]` selector (L75) | **INACCURATE** | Real selectors are `[data-brand="slug"]` and `[data-mode~="…"]`. `grep "data-theme" generated/` → no matches. |
| "APCA contrast values appear as comments in every generated CSS file" (L65, L82) | **INACCURATE** | No `/* APCA Lc … */` comments in `generated/`. Contrast is emitted as numeric lightness custom properties resolved at runtime, not as audit comments. |

### 3. brand-config/typography.mdx — INACCURATE

| Claim (line) | Verdict | Evidence |
|---|---|---|
| `"type-size-unit": "16px"` (L12, L20) | **INACCURATE** | Real: `typography.base-font-size: 1` (rem) — `types.ts:178`. |
| `scale-ratio` at 1.25 = Major Third (L13, L21) | **ACCURATE in value, MISPLACED in location** | `typography.scale-ratio` — `types.ts:179`. Stripe/magic-patterns both use 1.25; Delta uses 1.2. |
| `font: { sans, mono }` (L14-17, L22) | **INACCURATE** | Real: `heading-family`, `body-family`, optional `mono-family` — `types.ts:175-177`. |
| "Substrate produces seven named steps" `--type-size-xs … 3xl` (L26-36) | **INACCURATE** | No such tokens. `grep "type-size" generated/` → no matches. The real model is **continuous**: `round(nearest, calc(var(--font-size-base) * pow(var(--effective-ratio), var(--_font-scale))), var(--font-size-quantum, 0.25rem))` — `src/platforms/web/css/transformer.ts:456`. |
| Named steps are `xs/sm/md/lg/xl/2xl/3xl` (L28-36) | **INACCURATE** | Real vocabulary is **semantic text roles** with fractional `fontScale` exponents: `heading: 3`, `body: 0`, `caption: -0.75`, `label: -0.5`, `code: -0.25`, `kbd: -0.5` — `generated/global/typescript/text-roles.gen.ts:18-26`. Fractional steps are impossible in the doc's integer-power table. |
| Generated CSS block with fixed px values (L40-52) | **INACCURATE** | Fabricated. Sizes are computed in-CSS via `pow()` against `--effective-ratio` = `calc(1 + (var(--scale-ratio) - 1) * var(--type-scale-factor))` — `generated/global/css/tokens.gen.css:6`. |
| `--font-sans` / `--font-mono` emitted (L49-50) | **INACCURATE** | Do not exist in `generated/`. Font family reaches CSS via `--surface-font-family`. |
| Fluid clamp "requires a `viewport` config block" (L62) | **INACCURATE** | No `viewport` block exists in `BrandConfig` or any brand YAML. Fluid config is `typography.fluid { rate, floor?, ceiling?, quantum? }` — `types.ts:180-185` — and per-role envelopes in `text-roles.gen.ts`. `reference: 'viewport' \| 'container'` is a per-role `FluidEnvelope` field (`types.ts:128`), not a top-level block. |
| "See the responsive configuration guide" (L62) | **UNVERIFIABLE** | No such page/anchor given; no matching config concept in source. |

### 4. brand-config/motion.mdx — INACCURATE

| Claim (line) | Verdict | Evidence |
|---|---|---|
| `"motion-unit": "100ms"`, default `"100ms"` (L12, L15) | **INACCURATE** | Real: `motion.duration-base` as a bare ms number — `types.ts:199`. Actual brand values: Stripe 200, magic-patterns 200, Delta 75. There is no `100ms` default. |
| `easing` is not mentioned as configurable | **OMISSION (INACCURATE by omission)** | `motion.easing` is a required sibling field — `types.ts:200`. Delta sets `"linear"`; Stripe `"cubic-bezier(0.25, 0.1, 0.25, 1)"`. |
| Duration ladder `--motion-instant/fast/normal/slow/slower` at 0/1×/2×/3×/5× (L21-25, L45-51) | **INACCURATE** | No such tokens. `grep "motion-fast" generated/` → no matches. The real emission is a **single continuous** token: `--duration: calc(var(--duration-base) * var(--motion-factor))` — `generated/global/css/tokens.gen.css:9`. There is no discrete ladder and no multiplier set. |
| Easing tokens `--ease-standard/enter/exit/spring` (L27-30, L55-60) | **INACCURATE** | None exist. `grep "ease-standard" generated/` → no matches. Easing is one brand-authored string (`motion.easing`). |
| `@media (prefers-reduced-motion: reduce)` block zeroing duration tokens is always emitted (L33-40, L62) | **INACCURATE** | Not emitted in `generated/`. Reduced motion is handled by the **JS runtime** setting `motionFactor` to 0 via `matchMedia('(prefers-reduced-motion: reduce)')` — `src/platforms/web/runtime/a11y.ts:9,17`. (`src/platforms/web/styles/reference.css:430` has a hand-authored block, not generated brand output.) |
| "this is not optional or configurable" (L63) | **INACCURATE** | `motionFactor` is an explicitly user-adjustable slider (0→1), and `flexibility.motion {min,max}` lets a brand bound it — `preferences.ts:17`, `types.ts:214`. |
| Default `motionFactor` | **CONTEXT** | Defaults to `0.75`, not 1 — `preferences.ts:29`. Docs never mention this. |

### 5. brand-config/spacing-density.mdx — INACCURATE

| Claim (line) | Verdict | Evidence |
|---|---|---|
| `"space-unit": "4px"` (L12, L16) | **INACCURATE** | Real: `space: { unit: 4 }` — nested, bare number — `types.ts:204-206`. (All six shipped brands use `unit: 4`, so the *value* is right.) |
| `"density": "default"` as a top-level string enum (L13, L17) | **INACCURATE** | Not a top-level field. See overview row. |
| Density options are exactly `compact` / `default` / `comfortable` (L21-25) | **OUTDATED-MISLEADING** | These are *conventional preset names*, not an enum. `presets.density` is an open `Record<string, DensityPresetLevel>` — `types.ts:237`. `src/brands/magic-patterns/config.yaml` defines `discovery` / `default` / `workspace` instead, proving the set is brand-defined. |
| Generated tokens `--space-1 … --space-16` (L31-41) | **INACCURATE** | Do not exist. `grep -rE "\-\-[a-z0-9-]*space[a-z0-9-]*" generated/global/css/ generated/styles/` yields only `--space-unit` and `--surface-white-space`. There is no numbered spacing ladder. |
| "Token names reflect the multiplier… `--space-4` always means 4 units" (L44) | **INACCURATE** | Predicated on tokens that do not exist. Spacing is applied through surface properties (`--surface-gap-x/y`, `--surface-margin-*`) scaled by `--density`. |
| "Density multiplies the effective space-unit at build time" (L46-48) | **INACCURATE / INVERTED** | Density is a **runtime continuous** multiplier, not build-time: `densityFactor: number; // 0.8 → 1.3` — `preferences.ts:14`; `--radius: calc(var(--radius-base) * var(--density))` — `tokens.gen.css:8`. No rebuild is needed to change density. |
| Step 2: "Execute `substrate build`" (L54-56) | **INACCURATE** | No such command. See CLI section below. |
| "Substrate's built-in component recipes — buttons, inputs, cards…" (L63) | **PARTIALLY ACCURATE** | Components do exist (`src/components/`) and density does affect sizing, but via the runtime `--density` variable, not a density-triggered rebuild. |

### 6. multi-brand/overview.mdx — INACCURATE

| Claim (line) | Verdict | Evidence |
|---|---|---|
| Shared engine; brands differ only in intents + dimensional units (L11) | **ACCURATE in spirit** | Consistent with the single-kernel + per-brand-config architecture. |
| "What changes between brands is limited to their color intents and dimensional units" (L11) | **OUTDATED-MISLEADING** | Understates it: brands also own `elevation`, `shape.radius-base`, `motion.easing`, `flexibility` policy, `presets` (including which density/mode levels exist), `gradients`, `ramps`, `materials`, and `system` overrides — `types.ts:146-240`. |
| Layout `brands/<name>/substrate.config.json` (L17-27) | **INACCURATE** | Real: `src/brands/<family>/config.global.yaml` plus `src/brands/<family>/<sub>/config.yaml`; or flat `src/brands/<name>/config.yaml` — `brand-loader.ts:4-6,124-160`. Verified on disk for delta, google, descript, draftkings, stripe (families) and magic-patterns (flat). |
| `substrate.workspace.json` registers brands and sets output (L26, L29-38) | **INACCURATE** | File does not exist anywhere in the repo. Brand discovery is **filesystem convention** — `readdirSync(brandsDir)` — with no registry file: `brand-loader.ts:128-160`. |
| `substrate build --all` (L44-46) | **INACCURATE** | No `build` command and no `--all` flag on the CLI. Real pipeline: `npm run generate` → `scripts/generate.ts` (`package.json`), with `--family <ramps\|tokens\|descriptors\|doc-views>` and `--target <css\|dtcg\|swift\|compose\|react-native>` flags. |
| `substrate build --brand acme` (L50-52) | **INACCURATE** | No `--brand` flag. `packages/cli/bin/substrate-init.js:38-44` usage lists only: `init`, `add`, `upgrade`, `adopt`, `setup`, `artifact`. |
| Output is "CSS, Swift, Kotlin, and JSON" (L54) | **PARTIALLY ACCURATE / INCOMPLETE** | Real per-brand output dirs: `compose`, `css`, `docs`, `dtcg`, `json`, `react-native`, `swift`, `xcassets` — `generated/brands/delta/booking/`. Kotlin is under `compose`; DTCG, React Native, xcassets, and docs are undocumented. |

### 7. multi-brand/inheritance.mdx — INACCURATE (contains an actively inverted claim)

| Claim (line) | Verdict | Evidence |
|---|---|---|
| Two-level cascade (L11-16) | **ACCURATE in shape, wrong in layers** | There *is* a two-level cascade, but it is **family `config.global.yaml` → sub-brand `config.yaml`** (`brand-loader.ts:138-150`, `resolveBrandConfigCascade`), not "workspace defaults → brand". |
| `defaults` block in `substrate.workspace.json` (L13, L20-34) | **INACCURATE** | Neither the file nor a `defaults` block exists. The shared layer is the family's `config.global.yaml`. |
| Workspace-level `space-unit` / `scale-ratio` / `motion-unit` / `density` / `cvd` (L36-40) | **INACCURATE** | None of these field names exist; `cvd` is not a config field at all (`preferences.ts:4`). |
| Brand override example (L46-55) | **INACCURATE** | Would not load — wrong filename, wrong format, no `intents`. |
| Effective-value table (L63-68) | **INACCURATE** | Every field named in it is fictional. |
| **"Any field set in a brand config fully overrides the workspace default… There is no merging of sub-fields… If a brand sets `color.primary`, it must supply the complete intent object including both `hue` and `chroma`. Partial objects are not merged."** (L72-74) | **INACCURATE — DIRECTLY INVERTED** | The cascade is an explicit **recursive deep merge**. `cascade.md` §2: "object, and base value is also an object → **Deep-merged** recursively." Proof in shipped config: `src/brands/delta/skymiles/config.yaml:20-22` sets only `intents.brand.chroma: 0.220` and inherits `hue: 15` from `src/brands/delta/config.global.yaml:21-23`. Under the documented rule that config would be invalid; in reality it is the canonical authoring pattern (`brand-doc.schema.json` describes brand configs as "deltas-only"). This is the single most damaging error in the set — following it produces needless duplication and defeats the inheritance model. |
| Null-delete semantics | **OMISSION** | Undocumented and important: `null` in an override **deletes** the key; it is the only delete signal. Arrays replace wholesale, never concatenate — `cascade.md` §2. |
| Sub-brand slug derivation | **OMISSION** | Merged brand slug is `{parent}-{sub}` (e.g. `delta-skymiles`) — `brand-loader.ts:148`. |
| Tip: "set your most conservative values at the workspace level" (L76-78) | **UNVERIFIABLE / INAPPLICABLE** | Advice about a mechanism that does not exist. |

### 8. multi-brand/adding-a-brand.mdx — INACCURATE

| Claim (line) | Verdict | Evidence |
|---|---|---|
| Step 1: `mkdir -p substrate/brands/nova` (L14-16) | **PARTIALLY ACCURATE** | Directory-per-brand is right; the real path is `src/brands/nova`. |
| Step 2: create `substrate/brands/nova/substrate.config.json` with the shown JSON (L20-38) | **INACCURATE** | Wrong filename, wrong format, wrong schema. Real: `src/brands/nova/config.yaml` with `name`, `intents` (incl. required `brand` + `neutral`), `elevation`, `typography`, `shape`, `motion`, `space`, `flexibility`, `presets`. |
| The example config would validate | **NO** | Fails on three counts: (a) not YAML/not the expected filename so it is never discovered; (b) no `intents` map → `TrackError('missing-required-intent')` for `brand` (`brand-loader.ts:95-107`); (c) `color.primary`/`color.error`/`color.success` are not intents, and `color.neutral` uses the nonexistent `light`/`dark` split. |
| `brand` field "namespaces output files and token prefixes" (L42) | **INACCURATE** | Slug comes from the directory name, assigned by the loader — `brand-loader.ts:154`. |
| `color.neutral` light/dark split (L44) | **INACCURATE** | Grammar does not exist; see color.mdx findings. |
| `space-unit` / `type-size-unit` / `scale-ratio` descriptions (L46-48) | **INACCURATE** | Wrong names, wrong nesting, wrong units (`"4px"`→`4`; `"15px"`→ rem number). |
| Step 3: register in `substrate.workspace.json` (L51-59) | **INACCURATE** | No registration step exists — discovery is by directory scan. This step is entirely spurious. |
| Step 4: `substrate build --brand nova` (L62-67) | **INACCURATE** | No such command/flag. Real: `npm run generate`. |
| Step 5 output layout `dist/tokens/nova/{nova.css,nova.swift,nova.kt,nova.json}` (L70-82) | **INACCURATE** | Real: `generated/brands/<family>/<sub>/{css,swift,compose,dtcg,json,react-native,xcassets,docs}/` with files like `brand.gen.kt`, `index.gen.kt`, `system.light.gen.kt`. Nothing lands in `dist/tokens/`, and no file is named `<brand>.css`. |
| "Each brand automatically gets all five display modes — light, dark, dimmed, high-contrast, and high-contrast-dark… without any extra configuration" (L88) | **INACCURATE (the "without configuration" half)** | The five names match what shipped brands define, but they are **authored per brand** in `presets.mode` (e.g. `stripe/config.global.yaml`), not automatic. `presets.mode` is an open `Record<string, ModePresetLevel>` — `types.ts:236`. A brand that omits it does not get them. Generated Compose output confirms exactly the authored set: `system.{light,dark,highContrast,darkHighContrast}.gen.kt`. |
| Tip: workspace defaults (L91-93) | **INACCURATE** | Points at the nonexistent workspace mechanism; also repeats the inverted no-merge premise. |

---

## Cross-cutting corrections

**File format and location.** `src/brands/<family>/config.global.yaml` (shared base) +
`src/brands/<family>/<sub>/config.yaml` (deltas), or flat `src/brands/<name>/config.yaml`.
YAML only. Keys kebab-case, normalized to camelCase at load.

**Inheritance.** Recursive deep merge with `null`-delete. Partial sub-objects merge (the
docs claim the exact opposite). Merged slug = `{parent}-{sub}`. Arrays replace wholesale.
Contract: `src/kernel/system/cascade.md`.

**Required fields.** `intents.brand` and `intents.neutral` are hard-required and throw at
load if missing. `elevation`, `typography`, `shape`, `motion`, `space`, `flexibility` are
non-optional in the type.

**Pipeline.** `npm run generate` (→ `scripts/generate.ts`), with `--family` / `--target` /
`--check`. The `substrate` binary (`@unknown-creatives/substrate`) is a consumer-side
onboarding tool: `init`, `add`, `upgrade`, `adopt`, `setup`, `artifact`. There is no
`substrate build`, no `--brand`, no `--all`.

**Token vocabulary.** Nothing in these docs matches. Real: `--intent-{hue,chroma,fg-l,
border-l,surface-l,pattern}`, `--solved-{bg,fg,bdr}-{l,c}`, `--surface-*`, `--duration`,
`--radius`, `--scale`, `--effective-ratio`, `--weight-bump`, `--space-unit`. Selectors are
`[data-brand="slug"]` and `[data-mode~="intent"]` — never `[data-theme]`.

**The continuous-vs-discrete framing.** The deepest conceptual error across typography,
motion, and spacing: the docs present **discrete token ladders** (seven type steps, five
duration steps, eight spacing steps). Substrate is a **continuous** system — a base value
times a runtime factor, with `pow()` for type. That is the product's headline
differentiator ("continuous density/scale"), and these pages describe the conventional
system it was built to replace.

**Undocumented but significant.** `elevation`, `shape.radius-base`, `flexibility` policy,
`presets` (mode/density/contrast with property deltas), `gradients`, `ramps` + `rampOutputs`,
`materials`, `system` overrides, scheme-track intents (`scheme-end` / `scheme-track` /
`from-intent` / `blend`), and the `warmth` runtime preference.

---

## Key source references

- `src/kernel/system/types.ts:146-240` — `BrandConfig` (authoritative schema)
- `src/kernel/system/types.ts:14-61` — `HueChroma`, `IntentColor`, scheme-track grammar
- `src/kernel/system/brand-loader.ts:85,95-107,124-160` — discovery, required intents, cascade
- `src/kernel/system/cascade.md` §1-2 — normalization + deep-merge/null-delete contract
- `src/kernel/system/config.ts:13-28,39-45` — `SYSTEM_INTENTS`, intent primitive suffixes
- `src/kernel/system/preferences.ts:4-32` — runtime sliders incl. `CvdType`, `densityFactor`, `motionFactor`
- `src/platforms/web/css/transformer.ts:456` — continuous type-size `pow()` formula
- `src/platforms/web/runtime/a11y.ts:9,17` — reduced-motion via runtime `motionFactor`
- `generated/global/css/tokens.gen.css:5-10` — real emitted root tokens
- `generated/global/typescript/text-roles.gen.ts:18-26` — semantic text roles + fractional scales
- `src/brands/stripe/config.global.yaml`, `src/brands/delta/config.global.yaml`,
  `src/brands/delta/skymiles/config.yaml`, `src/brands/magic-patterns/config.yaml` — real configs
- `packages/cli/bin/substrate-init.js:38-44` — real CLI surface
