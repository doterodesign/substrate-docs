# Audit: substrate-docs top-level pages vs. substrate source

**Date:** 2026-08-12
**Auditor:** documentation accuracy sub-agent
**Docs repo:** `/Users/dimitriotero/Documents/GITHUB/substrate-docs`
**Ground truth:** `/Users/dimitriotero/Documents/GITHUB/substrate` (`src/`, `generated/`, `packages/cli/`, corroborated by `docs/`)

Pages audited:

- `/Users/dimitriotero/Documents/GITHUB/substrate-docs/index.mdx`
- `/Users/dimitriotero/Documents/GITHUB/substrate-docs/introduction.mdx`
- `/Users/dimitriotero/Documents/GITHUB/substrate-docs/quickstart.mdx`
- `/Users/dimitriotero/Documents/GITHUB/substrate-docs/core-concepts.mdx`

---

## Headline verdict

**These four pages do not describe the Substrate in this repository.** They describe a plausible but fictional static token-compiler product: a JSON config file that does not exist, a CLI command that does not exist, an output directory that does not exist, and a CSS variable namespace that does not exist. Every concrete, checkable identifier in the Quickstart — config filename, config field names, CLI command, CLI flags, output paths, CSS custom property names, the runtime data attribute — has **zero occurrences** in the substrate repo.

The conceptual framing (OKLCH, APCA, CVD, multi-brand, computed-not-static) is broadly right and is the one genuinely load-bearing thing these pages get correct. But it is attached to an architecture that is wrong in a specific and consequential way: **Substrate is a runtime solver, not a build-time token baker.** The docs describe values being computed at build time and frozen into per-mode files. In reality the pipeline emits *solver inputs and style descriptors*, and a JS/Swift/Kotlin kernel solves APCA lightness at runtime against the actual surface. That single architectural inversion is what makes most of the specifics wrong rather than merely imprecise.

| Page | Verdict | Notes |
|---|---|---|
| `index.mdx` | **Mostly inaccurate** | Conceptual pitch survives; the three-step "How It Works" pipeline and the `substrate.config` reference are wrong. |
| `introduction.mdx` | **Mixed — the least wrong page** | Problem framing and benefits are defensible. Config field list is fabricated; "five complete token sets" misrepresents a continuous model. |
| `quickstart.mdx` | **Entirely non-functional** | Every command, path, filename, field, and variable is fabricated. A reader following it cannot succeed at any step. Highest-priority rewrite. |
| `core-concepts.mdx` | **Right ideas, wrong specifics** | Best conceptual page (OKLCH/APCA/CVD/multi-brand rationale is sound). All JSON, CSS, Swift, and Kotlin examples are fabricated. |

---

## What Substrate actually is

From `/Users/dimitriotero/Documents/GITHUB/substrate/README.md:3-9` and `docs/getting-started.md:14-19`:

> An adaptive color and design-token system — APCA contrast solving, CVD compensation, multi-brand theming, and continuous density/scale — delivered as a generative config engine, not a component library. You write config; Substrate compiles the CSS cascade and computes **runtime** lightness values.

Integration is via `substrate init` (vendoring the engine into a client repo), three import aliases (`@substrate/engine`, `@substrate/components/*`, `@substrate/generated/*`), and a runtime call sequence: `syncBrandToCssVars` → `syncPrefsToCssVars` → `updateAllVars` (`README.md:65-73`; exports confirmed at `src/index.ts:37`).

---

## INACCURATE findings

Ordered by severity. Every "zero occurrences" claim below was verified by repo-wide grep excluding `node_modules`/`.git`.

### 1. `substrate build` does not exist (quickstart.mdx:53-88; core-concepts.mdx:123)

The Quickstart's central instruction is to run `substrate build`. There is no such command.

The CLI (`packages/cli/bin/substrate-init.js`) dispatches exactly six commands: `init` (:38), `add` (:118), `upgrade` (:129), `adopt` (:140), `setup` (:151), `artifact` (:176). Generation in this repo is done through npm scripts wrapping `scripts/generate.ts` (`package.json:9-40`, e.g. `npm run generate`, `generate:tokens:swift`).

The only two occurrences of the string `substrate build` in the entire repo are in a design document that explicitly names it as a **rejected** alternative: `docs/superpowers/specs/2026-08-12-cli-npm-publishing-design.md:334` describes "interface (`substrate.config.json`, `substrate build`) that diverges from…" and `:453` marks it "invocation language only". The docs appear to have adopted the interface that spec rejected.

Compounding this: the CLI is unpublished, and the README warns explicitly that `npx substrate` fetches an **unrelated third-party package** (`README.md:30-33`, `docs/getting-started.md:21-25`). The real invocation is `node <substrate-checkout>/packages/cli/bin/substrate-init.js init`.

### 2. `--platform web|ios|android` means something entirely different (quickstart.mdx:75-81)

The docs present `substrate build --platform web|ios|android` as selecting an output platform. `--platform` is a real flag on `substrate init`, but its accepted values are **AI coding tools**: `claude-code`, `cursor`, `windsurf`, `github-copilot`, `gemini-cli`, `codex-cli`, `kiro`, `cline`, `continue-dev`, `junie`, `tabnine`, `zed`, `sourcegraph-cody`, `augment` (`packages/cli/bin/lib/platforms.js:6-113`). It selects which AI tool's skills/instructions get wired up, not a build target.

This is worse than a missing flag — a reader could plausibly run `--platform web` and get "Unknown platform: web" (`substrate-init.js:255-257`) with no hint why.

Actual output-target selection is `--target` on the generate script: `css`, `dtcg`, `swift`, `compose`, `react-native` (`package.json:14-40`; canonical registry at `src/generated-artifacts/registry.ts:26-80`, which lists ten targets including `xcassets`, `typescript`, `docs`, `json`).

### 3. `substrate.config` / `substrate.config.json` is not the brand config (index.mdx:18,31; introduction.mdx:22; quickstart.mdx:15; core-concepts.mdx:15,25,227)

Referenced on all four pages as the file you author. `substrate.config.json` has zero occurrences as a real artifact — it appears only in the same rejected-design spec cited above.

Real brand configs are **YAML** (`src/kernel/system/brand-loader.ts:126-162`):

| Layout | Files |
|---|---|
| Flat brand | `src/brands/{name}/config.yaml` |
| Brand family | `src/brands/{parent}/config.global.yaml` + `src/brands/{parent}/{sub}/config.yaml` |

There *is* a `substrate.config.yaml`, but it is a different thing: the client's org-wide **system config overlay** scaffolded by `substrate init` (`packages/cli/bin/lib/scaffold.js:236`), sourced from `src/kernel/system/system.config.yaml` (`scaffold.js:145`). Conflating it with the brand config would send a reader editing the wrong file.

### 4. Every config field in the Quickstart example is fabricated (quickstart.mdx:17-50; introduction.mdx:24-28; index.mdx:31)

The example config is JSON with `brand`, `color.primary/neutral/accent`, `space-unit`, `type-size-unit`, `scale-ratio`, `motion-unit`. Against `src/kernel/system/types.ts:146-246`:

| Doc field | Status | Real equivalent |
|---|---|---|
| `"brand": "my-brand"` (top-level string) | **Does not exist** | `name: string` (`types.ts:147`); `slug` is loader-derived (`brand-loader.ts:154`). `brand` exists only as an *intent key*. |
| `color.primary` | **Does not exist** | No `primary` intent anywhere. `color:` is `ColorConfig = {ramps?, rampOutputs?}` (`types.ts:117-120`) — ramp output config only. |
| `color.neutral` | **Wrong location** | `intents.neutral` (`types.ts:158`) — required. |
| `color.accent` | **Does not exist** | Not a system intent; brands invent their own named intents. |
| `space-unit` (top level) | **Does not exist** | `space: { unit: <px> }` (`types.ts:203-205`); e.g. `src/brands/delta/config.global.yaml:69-70` → `unit: 4`. |
| `type-size-unit` | **Does not exist** (zero hits) | `typography.base-font-size` in rem (`types.ts:178`). |
| `scale-ratio` (top level) | **Correct name, wrong nesting** | `typography.scale-ratio` (`types.ts:179`; `delta/config.global.yaml:61`). The one field the docs get partly right. |
| `motion-unit` | **Does not exist** (zero hits) | `motion: { duration-base, easing }` (`types.ts:198-201`). |

Also unmentioned but **required** by `BrandConfig`: `elevation` (`types.ts:169-173`), `shape.radius-base` (`:194-196`), `flexibility` (`:208-215`) — the last being the block that defines the continuous scheme/contrast/density/type-scale/motion ranges that make Substrate what it is. The doc's config would fail validation for missing required fields, not merely produce different output.

Real intent names (`src/kernel/system/config.ts:20-28`): `brand`, `neutral`, `danger`, `warning`, `success`, `info`, `beta` — and `config.ts:13-18` is emphatic that even this list is *not* the source of truth; the brand's own `intents:` map is. Only `brand` and `neutral` are required (`brand-loader.ts:99`).

### 5. The `./substrate-tokens/` output tree does not exist (quickstart.mdx:60-73, 94, 131-134; core-concepts.mdx:140, 161, 190)

Repo-wide grep for `substrate-tokens` and `SubstrateTokens`: **zero matches**.

Real output root is `generated/`, organized `generated/<scope>/<target>/`:

- `generated/global/css/{tokens,modes,modes.system,properties,index,chart}.gen.css`
- `generated/global/swift/components/<component>/style.gen.swift`
- `generated/global/compose/components/<component>/style.gen.kt`
- `generated/brands/<brand>/<sub-brand>/{css,swift,compose,dtcg,react-native,xcassets,json}/…`

Every artifact carries a `.gen.` marker, enforced per-target at `src/generated-artifacts/registry.ts:26-80`.

Per-mode brand CSS files *do* exist, which makes the doc's fiction especially near-miss: `generated/brands/<brand>/css/tokens.{light,dark,highContrast,darkHighContrast}.gen.css` — four variants, not the doc's three, and not named `substrate-tokens.*`.

The import line in quickstart.mdx:94 (`@import '../substrate-tokens/web/substrate-tokens.css'`) would fail. Real form, per `README.md:66`:

```ts
import '@substrate/generated/global/css/index.gen.css';
```

### 6. Every CSS custom property named in the docs has zero occurrences (quickstart.mdx:99-112, 136-163; core-concepts.mdx:139-157)

Grepped individually across all of `generated/`:

| Doc variable | Hits |
|---|---|
| `--color-primary-surface` | 0 |
| `--color-primary-on-surface` | 0 |
| `--color-primary-surface-hover` | 0 |
| `--color-neutral-on-surface-muted` | 0 |
| `--space-1` … `--space-5` | 0 |
| `--type-size-0` … `--type-size-5` | 0 |
| `--motion-duration-fast` | 0 |
| `--motion-easing-standard` | 0 |

There is **no `--color-*` namespace at all**. Real prefixes: `--ucs-*` (public intent primitives), `--surface-*` (per-surface computed), `--intent-*` / `--solved-*` (internal solver channels).

Per-intent primitives are `--ucs-{intent}-{hue,chroma,fg-l,border-l,surface-l,pattern}` (`src/kernel/system/config.ts:39-46`; visible throughout `generated/global/css/modes.gen.css`).

**There is no numbered spacing ladder.** Spacing is computed from one `--space-unit` scaled by `--density` and `--scale` (`generated/global/css/components/badge/badge.gen.css:9-13`):

```css
--surface-padding-x: calc(var(--density) * var(--scale) * var(--space-unit) * 2);
```

**There is no named type-size ramp.** Sizes are exponents of a computed ratio (`generated/global/css/tokens.gen.css:6`):

```css
--effective-ratio: calc(1 + (var(--scale-ratio) - 1) * var(--type-scale-factor));
```

**Motion:** `--duration: calc(var(--duration-base) * var(--motion-factor))` (`tokens.gen.css:9`). The `.button-primary` example at quickstart.mdx:100-112 references six variables, none of which exist.

### 7. `data-substrate-mode` does not exist, and `data-mode` means something else (quickstart.mdx:114-125; core-concepts.mdx:105, 142, 150)

Repo-wide grep for `data-substrate-mode`: **zero matches**.

The real `data-mode` attribute does not carry light/dark — it carries **intent and state**, matched with `~=` (space-separated tokens), e.g. `[data-mode~="brand"]`, `[data-mode~="danger"]`, `[data-mode~="hover"]`, `[data-mode~="primary"]` (`generated/global/css/modes.system.gen.css:440-524`). A reader setting `data-substrate-mode="dark"` gets nothing; a reader setting `data-mode="dark"` also gets nothing, because dark is not a `data-mode` value.

Scheme is a **continuous numeric variable** written by the runtime (`src/platforms/web/runtime/css-bridge.ts:143`):

```ts
vars['--scheme'] = String(prefs.scheme);
```

Other real attributes: `[data-ucs]` — the opt-in marker that makes an element participate in the cascade (`src/platforms/web/css/transformer.ts:113,123`), and `[data-brand="<slug>"]`, set at runtime (`css-bridge.ts:130`).

### 8. `prefers-color-scheme` is not emitted the way described (quickstart.mdx:127; core-concepts.mdx:105)

Both pages claim Substrate emits `@media (prefers-color-scheme: dark)` blocks alongside mode layers, and that omitting the attribute yields automatic system-preference behavior.

`prefers-color-scheme` has **zero occurrences in `generated/`**. Two real mechanisms:

1. **Runtime (primary):** OS preference is detected in JS and mapped to a preset name — `'darkHighContrast' | 'dark' | 'highContrast' | 'light'` (`src/platforms/web/runtime/preferences.ts:2-9`).
2. **No-JS SSR fallback (opt-in):** a 2×2 matrix pre-baked onto `[data-brand="<slug>"]` (`src/platforms/web/css/nojs-snapshot.ts:33-38`), covering `light`, `dark` + `(prefers-color-scheme: dark)`, `highContrast` + `(prefers-contrast: more)`, and both.

That file's own header (`nojs-snapshot.ts:1-16`) states the static snapshot is "the accessible floor" and that continuous scheme positions (dimmed at 0.65), CVD, warmth, and density remain JS-only. So the docs' claim that mode-switching "requires no JavaScript beyond toggling a single attribute" (quickstart.mdx:91) inverts the actual design: **JS is the primary path**, and the CSS-only fallback is a deliberately reduced subset.

### 9. Per-token APCA Lc comments in generated CSS do not exist (quickstart.mdx:130-144)

Step 4 tells the reader to open the generated CSS and read per-token APCA metadata comments like `APCA Lc: 87.4 against --color-primary-surface`.

`APCA` appears **twice** in all of `generated/`: once as prose in `generated/skills/REGISTRY.gen.yaml:32`, once as a section comment in `generated/global/css/components/text/text.gen.css:107`. `Lc` as a standalone token: **zero matches**.

This is architecturally impossible rather than merely absent: contrast is solved at runtime against the actual surface (`contrast: .auto` in the descriptors), so a baked per-token Lc would be meaningless. The verification workflow the docs propose cannot exist in this design.

### 10. The "APCA contrast warning" build output is fabricated (quickstart.mdx:166-173)

No string `APCA contrast warning` or `contrast warning` exists in `src/` or `scripts/`.

There *is* a real and arguably better mechanism: a **build-failing accessibility gate** (`src/kernel/color/brand-corpus-accessibility.ts:519-541`), whose real output shape is:

```
Accessibility gate: FAIL (N failures: 3 apca, 1 cvd)
[apca] atlas/dark — warning foreground Lc 68.7 is below 70.3
```

(pinned by `src/kernel/color/__tests__/brand-corpus-accessibility.test.ts:62,68`; passes as `Accessibility gate: PASS (0 failures)`). Note the word "warning" in that sample line is the **intent name**, not a severity. It is wired into `generate:check` — a hard gate, not an advisory warning.

### 11. Swift and Kotlin output shapes are fabricated (core-concepts.mdx:159-218)

Neither `public enum SubstrateTokens { public enum Color { … } }` nor `object SubstrateTokens { object ColorLight { … } }` exists.

Two real shapes:

**(a) Component style descriptors** — `generated/global/swift/components/badge/style.gen.swift:1-22`:

```swift
import SubstrateKernel

public enum BadgeComponent {
    public static let style = ComponentStyleDescriptor(
        component: "badge",
        nodes: [
            StyleNode(scope: .component, properties: [
                StyleProperty(name: "padding-x", value: .spatial(2)),
                StyleProperty(name: "shape", value: .radiusCapsule),
            ]),
            StyleNode(scope: .role("primary"),
                foreground: ChannelParameters(chroma: .multiplier(0), contrast: .auto))
```

Kotlin mirrors this (`generated/global/compose/components/badge/style.gen.kt`, importing `substrate.kernel.*`). These are descriptors **interpreted by a runtime kernel** (`packages/kernel-swift`, `packages/kernel-kotlin`), not flat constants.

**(b) Per-mode resolved token sets** — `generated/brands/magic-patterns/swift/system.light.gen.swift:1-22`:

```swift
public struct SubstrateSystemTokenSet { public let surface: Color; public let text: Color; public let border: Color }
public enum SubstrateSystemTokens {
    public static let surface = SubstrateSystemTokenSet(
        surface: Color(.displayP3, red: 0.9588, green: 0.9594, blue: 0.9728, opacity: 1.0000), …)
```

Differences from the docs that matter: real names are `SubstrateSystemTokens` / `SubstrateSystemTokenSet`; the unit is a surface/text/border **triple per intent**, not `Color.Primary.surface`; modes are **separate files** (`system.{light,dark,highContrast,darkHighContrast}.gen.*`) rather than nested `ColorLight`/`ColorDark` objects or a `UIColor { traits in … }` dynamic provider; and colors are **Display-P3**, not sRGB hex or 0–1 sRGB components.

The doc's Kotlin also invents `object Space { val S3 = 6.25.dp }` and `object TypeSize { val Size2 = 16.sp }` — no numbered spacing or type ladder exists on any platform (see finding 6).

### 12. `"extends": "substrate/base"` is not real (core-concepts.mdx:113-123)

`substrate/base` has **zero occurrences** across `src`, `docs`, and `packages`. No brand config in `src/brands/` contains an `extends:` key.

`extends:` is real but is a **component-config** feature, a path to a type: `src/components/button/config.yaml:3` → `extends: types/action` (resolved at `src/kernel/system/resolver.ts:604-620`).

Brand inheritance is **directory-structural and implicit** (`brand-loader.ts:126-162` → `cascade.ts:306-331`): a `config.global.yaml` in a family directory is the parent; each sub-directory's `config.yaml` is a child layer merged over it, child wins. Merge is deep with **null-delete** semantics — a `null` in the overlay removes the parent key (`brand-loader.ts:57-59`, `cascade.ts:194`).

Convention is **deltas-only**, and this is *enforced*: `findRedundantSubBrandLeaves` (`src/kernel/system/brand-cascade-validator.ts:29-84`) flags any sub-brand leaf whose value equals the parent's.

Worth noting: the *substance* of core-concepts.mdx:125-129 — base changes propagate, new roles are inherited, a new brand needs few lines — is **accurate**. `src/brands/delta/booking/config.yaml` declares five keys and inherits the rest. Only the syntax is invented.

### 13. Per-intent `light:` / `dark:` hue/chroma syntax is wrong (core-concepts.mdx:33-45)

The doc shows:

```json
{ "color.neutral": { "intent": "neutral", "light": {...}, "dark": {...} } }
```

The *capability* is real, but the grammar is not (`src/kernel/system/types.ts:47-60`; desugaring at `src/kernel/color/track.ts:118-160`). Three tiers:

- constant: `{hue, chroma}`
- sugar: base `{hue, chroma}` + `scheme-end: {hue, chroma}` (`types.ts:57`)
- full: `scheme-track: [{at, hue, chroma} | {at, from-intent}]` (`types.ts:58`)

The axis is a continuous `at ∈ [0,1]` (0 = light → 1 = dark), not two named buckets. There are no `light:` / `dark:` keys under an intent.

Two further caveats: **no shipped brand currently uses this** (`grep "scheme-end\|scheme-track" src/brands/` → zero), so it is an available-but-unexercised capability. And `light:` / `dark:` keys *do* appear in brand YAML — under `presets.mode:` (`src/brands/delta/config.global.yaml:96-101`), carrying `scheme` and `contrast-factor`, not hue/chroma. A reader could easily copy the doc's shape into the wrong block.

---

## OUTDATED / MISLEADING findings

### A. "Five complete token sets" misrepresents a continuous model (introduction.mdx:39; quickstart.mdx:10; core-concepts.mdx:85)

The five names are real, but they are **runtime preference presets on continuous axes**, not five statically emitted token sets (`src/kernel/system/preferences.ts:43-49`):

```ts
light:            { scheme: 0,    contrastFactor: 1.0 },
dark:             { scheme: 1,    contrastFactor: 1.0 },
dimmed:           { scheme: 0.65, contrastFactor: 0.95 },
highContrast:     { scheme: 0,    contrastFactor: 1.3 },
darkHighContrast: { scheme: 1,    contrastFactor: 1.3 },
```

The file's own comment (`:34-35`) says: "These are convenience shortcuts — the underlying model stays continuous." Key names are camelCase `highContrast`/`darkHighContrast`, not the docs' kebab-case `high-contrast`/`high-contrast-dark`.

The docs also omit that `UserPreferences` (`preferences.ts:11-19`) carries **seven** continuous axes — `scheme`, `contrastFactor`, `densityFactor`, `typeScaleFactor`, `motionFactor`, `warmth`, `cvd` — so density, type scale, motion, and warmth are all user-adjustable at runtime. Presenting five discrete modes as the model understates the product's actual differentiator.

The core-concepts Modes tab descriptions are otherwise directionally reasonable, though "high-contrast … pushed toward maximum contrast" overstates a 1.3× Lc multiplier.

### B. "Computed at build time" is the central architectural inversion (index.mdx:6,34; introduction.mdx:30; core-concepts.mdx:15-21,65)

All four pages assert that Substrate computes final token values at build time. The APCA solve happens at **runtime** — that is the design's whole point.

`src/kernel/color/solver.ts:11-27` documents the contract: inputs are `brand` + `prefs` + `surface`; transform order is warmth → CVD → APCA; the fixed policy is `fg Lc 75, border Lc 50, focus ring Lc 60`, scaled by `prefs.contrastFactor`; output is `--ucs-{intent}-*` primitives. `README.md:71-72` shows the call: `updateAllVars(brand, prefs); // runs the APCA solver, writes --ucs-* to :root`.

The build step emits **solver inputs and descriptors**; the kernel resolves against the actual surface. This is also why per-token Lc comments (finding 9) and a discrete mode attribute (finding 7) are absent *by design*. Core-concepts is the right place to fix this, since its "Computed vs. Static Tokens" section is otherwise well-argued and is where a reader forms their mental model.

Note also the docs' APCA target values conflict with the code: quickstart.mdx:144 says "Target: Lc 75 (body text)" — which matches `solver.ts:22` — but quickstart.mdx:171 says "Target: Lc 45 (non-text UI)" where the real border target is **Lc 50**.

### C. Understated / omitted capabilities

- **CVD compensation** is named in introduction.mdx:16 as a problem but never presented as a feature with a config surface, despite being a headline capability in `README.md:3` with a full implementation (`src/kernel/color/cvd.ts`) and runtime preference (`preferences.ts:18`: `cvd: {type, severity}` across `protan`/`deutan`/`tritan`/`achromat`). It also runs *before* the APCA solve (`solver.ts:16-19`), which is a genuinely notable design decision.
- **Warmth / Night Shift** (`preferences.ts:17`, `src/kernel/color/warmth.ts`) is entirely absent from these pages.
- **Output targets** are presented as three (Web/iOS/Android). Real registry has ten (`src/generated-artifacts/registry.ts:26-80`); the token-family set is `css, dtcg, swift, compose, react-native` (`src/platforms/tokens/__tests__/emission-parity.test.ts:26`). **DTCG** and **React Native** are shipping and unmentioned.
- **`Surface` component and the `data-ucs` cascade.** `README.md:8-9` calls `Surface` the only React Substrate ships (scoped APCA re-solving needs JS). The docs never mention it, nor `data-ucs` — so a reader has no idea how an element opts into the cascade.
- **Positioning.** `README.md:3-9` and `docs/getting-started.md:14` both go out of their way to say "not a component library." The docs pages never make this boundary explicit, and `src/components/` contains ~60 component directories that could easily be mistaken for a shipped library.

### D. Onboarding path is absent

The real integration story — vendor the engine, run `substrate init`, wire three aliases (`@substrate/engine`, `@substrate/components/*`, `@substrate/generated/*`), import the CSS barrel, call the runtime — is documented in `README.md:11-85` and `docs/getting-started.md`. None of it appears in quickstart.mdx. The alias contract in particular (`docs/alias-contract.md`) is described in the README as "the entire client import contract" and the guarantee that survives engine swaps; a quickstart that omits it leaves the reader with no working import path.

---

## ACCURATE findings

Genuinely correct, verified:

- **OKLCH as the internal color space**, and the rationale for perceptual uniformity over HSL (core-concepts.mdx:47-55). Confirmed throughout `src/kernel/color/oklch.ts`. Axis descriptions L 0–1, C 0–~0.4, H 0–360 match `oklch.ts:6` and the chroma clamp at `track.ts:127-131`.
- **APCA over WCAG 2.x**, including the signed Lc model and polarity/spatial-frequency sensitivity (core-concepts.mdx:59-73). Matches `src/kernel/color/apca.ts` and the solver contract.
- **Foregrounds are derived, never hand-picked** (core-concepts.mdx:73, introduction.mdx:30) — exactly right per `solver.ts:22-24`.
- **Lc 75 for body text** (quickstart.mdx:144) matches `COLOR_SOLVER_APCA_POLICY` (`solver.ts:22`).
- **Generated files are build artifacts you must not edit** (core-concepts.mdx:23-25). Every generated file carries `DO NOT EDIT` (e.g. `generated/global/css/tokens.gen.css:1`).
- **Multi-brand via shared model with per-brand deltas** (introduction.mdx:42, core-concepts.mdx:111,125-129) — accurate in substance; only the `extends` syntax is invented. Six brand families ship: `delta`, `descript`, `draftkings`, `google`, `magic-patterns`, `stripe`.
- **Chroma shifts between light and dark to preserve perceptual character** (core-concepts.mdx:33-45) — the capability is real via `scheme-track`/`scheme-end`; only the syntax and the Helmholtz–Kohlrausch attribution are unverified.
- **iOS = Swift, Android = Kotlin/Compose** (all pages) — correct, though incomplete.
- **Hue 0–360 and chroma 0–0.4 input ranges** (quickstart.mdx:41-46) — match `track.ts:127-131`.
- **`scale-ratio` as the field name** (quickstart.mdx:49) — correct name, wrong nesting level.

---

## UNVERIFIABLE

- The Helmholtz–Kohlrausch attribution (core-concepts.mdx:45). The effect is real, but no source comment ties it to Substrate's scheme-track design.
- Specific hex/OKLCH values in examples (`#edf8f3`, `oklch(96% 0.018 160)`, `Lc 87.4`). Not reproducible since the config that would produce them cannot be loaded, and there is no `--color-primary-surface` to compare against.
- Nav links `/brand-config/overview` and `/modes/overview` (index.mdx:17,20; introduction.mdx:55; core-concepts.mdx:226,229). Not audited — outside this task's four pages.
- Claims about *why* teams maintain parallel token sets (introduction.mdx:9-18). Reasonable market framing, not a code claim.

---

## Recommendation

`quickstart.mdx` should be treated as a from-scratch rewrite against `README.md:11-85` and `docs/getting-started.md`, not as a page to correct — there is no salvageable line of code in it. `core-concepts.mdx` is worth *repairing* rather than replacing: its conceptual sections are the strongest writing in the set, and it mainly needs (a) the build-time → runtime correction in "Computed vs. Static Tokens", and (b) all four code examples replaced with real excerpts from `generated/`. `introduction.mdx` needs its config field list and the "five token sets" framing fixed. `index.mdx` needs its three-step pipeline replaced with the real vendor/init/import/verify flow.

The single most valuable correction across all four pages is the runtime-solver framing: it is what makes continuous density, CVD compensation, warmth, and scoped `Surface` re-solving legible as one coherent design rather than a list of features.
