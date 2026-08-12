# Substrate — Component Configs & Type Configs

Research report for documentation authoring.

- **Checkout researched:** `/tmp/claude-501/substrate-om` (detached worktree, `origin/main`, commit `c9535187`)
- **Mode:** read-only; nothing in the worktree was modified
- **Date:** 2026-08-12

All paths below are relative to the engine repo root unless stated otherwise. Every claim is
cited to a file (and line numbers for load-bearing claims). Where something could not be
verified, it is called out explicitly in the **Open questions / unverified** section rather
than guessed at.

---

## 1. Where configs live

Two config families sit side by side under `src/`:

| Family | Location | Purpose |
| --- | --- | --- |
| Component config | `src/components/{component}/config.yaml` | Per-component style, roles, states, modes, parts |
| Type config ("types config") | `src/types/{type}/config.yaml` | Shared archetypes components inherit via `extends:` |

There are 5 type configs and ~71 component directories.

```
src/types/
├── action/config.yaml      (1284 bytes)
├── chart/config.yaml       (1801 bytes)  + config.doc.yaml, index.ts, types.ts
├── feedback/config.yaml    (1645 bytes)
├── input/config.yaml       (1143 bytes)
└── text/config.yaml        (1778 bytes)
```

A component directory looks like this (`src/components/badge/`):

```
src/components/badge/
├── config.yaml            ← the engine config (styling; drives generation)
├── config.doc.yaml        ← the documentation config (prose; drives docs)
├── brands/                ← per-brand overrides
│   ├── magic-patterns/config.yaml
│   └── draftkings/{corporate,pick6,casino,sportsbook}/config.yaml
└── web/
    ├── badge.tsx          ← React implementation
    └── config.doc.yaml    ← platform-specific doc config
```

**The two `config.*.yaml` files are different layers and must not be conflated.**
`CONTEXT.md:5-22` is explicit about this:

> **Doc config**
> : A hand-authored YAML file describing an artifact for both human readers and
> downstream generators. Validated against a JSON Schema by `validate:docs`.
> Never machine-generated. Distinct from a **doc view**.
>
> **Doc view**
> : A generated, per-brand projection of a doc config (`config.doc.gen.yaml`),
> emitted by resolving a brand's intents against the doc config's. Derived, never
> edited.

`config.yaml` is the styling/engine config that this report is mostly about; `config.doc.yaml`
is prose metadata (description, anatomy, accessibility, guidelines, sources). A third,
generated artifact `config.doc.gen.yaml` is the per-brand doc view — derived, never edited.

There is also a `catalog-staging/components/` tree with the same `entry.yaml` /
`config.yaml` / `config.doc.yaml` shape. It appears to be a staging area for components not
yet promoted into `src/components/`; several staged components (`toast`, `toggle`,
`datepicker`) have only `entry.yaml` + `config.doc.yaml` and no `config.yaml`.

### File format

**YAML, always.** No TS-authored configs. `scripts/generate-css.ts:445` loads
`types/text/config.yaml` and parses it with `yaml.load(...)`. Component configs are
discovered by directory scan filtered on the presence of `config.yaml`
(`scripts/generate-doc-views.ts:117`).

---

## 2. The `types config` concept

"Types config" is a first-class, named concept in the engine's own ontology. The canonical
definition is `references/ontology/classes/300-type-config.yaml`, class `S-300`,
concept `S-310` (lines 7-21):

```yaml
concepts:
  - id: S-310
    term: Type Config
    class: 300-type-config
    summary: Shared archetype config inherited by components.
    definition: Root-level YAML config under src/types that defines reusable role, state, mode, and semantic-map patterns.
    aliases: [archetype config, types config]
    source-of-truth: [src/types/action/config.yaml, src/types/input/config.yaml, src/types/text/config.yaml, src/types/feedback/config.yaml, src/types/chart/config.yaml]
    owned-by: type config
    used-by: [component extends, config resolver, migration classification]
    confusable-with: [S-410, S-210]
    migration-use: Classify component concepts by the closest reusable archetype before inventing new component behavior.
    status: active
    last-verified: "2026-05-21"
    notes: [Types are portable source, not platform adapters.]
```

The same file enumerates the five archetypes as separate concepts, each with its own ID and
guidance on when to reach for it:

| ID | Term | Archetype | Definition (verbatim from the ontology) | Used by |
| --- | --- | --- | --- | --- |
| S-330 | Action Type | `types/action` | "Type config with primary, secondary, and auxiliary emphasis roles plus action interaction states." | button, button-link, tab, migrated actions |
| S-340 | Input Type | `types/input` | "Type config for components that accept user input and expose value/change/validation bindings." | input, checkbox, field controls |
| S-350 | Text Type | `types/text` | "Type config defining text roles such as heading, body, caption, label, code, and kbd." | SubstrateText, component parts, migration rewrites |
| S-360 | Feedback Type | `types/feedback` | "Type config with feedback-oriented roles and state treatments for components such as alerts and cards." | alert, card, feedback components |
| S-370 | Chart Type | `types/chart` | "Type config for data visualization style semantics that should remain separate from chart geometry." | chart integrations, migration escape hatches |

Two further ontology concepts matter for authoring:

- **S-320 Type Role** — "Named role in a type config that components inherit and may
  override." Note attached: *"Documentation variant roles are not always type roles."*
- **S-380 Semantic Map** — "Config map that resolves named values such as thin, medium, or
  heavy into numeric values." It carries a machine-checkable enumeration
  (`300-type-config.yaml:120-124`):

```yaml
    enumerates:
      - kind: yaml-map-keys
        source: src/types/action/config.yaml
        path: semantic-map.border
        values: [thin, medium, heavy]
```

---

## 3. Vocabulary — role vs mode vs state vs part vs slot

`CONTEXT.md` is the engine's glossary and defines these precisely. Quoting the Component
layer section verbatim (`CONTEXT.md:57-85`):

> **Part**
> : A structural node a component (or composition) owns outright. Parts form a
> tree via `parent`. Not a component reference.
>
> **Slot**
> : A content-projection point — a place where a consumer supplies content the
> artifact does not own.
>
> **Role**
> : A variant declared in a component's `config.yaml` `roles:` map. Roles carry
> their own states. A doc may document fewer roles than the config declares, but
> never one the config does not. Roles are usage-frequency tiers (primary,
> secondary, auxiliary), not visual-emphasis tiers.
>
> **Intent**
> : A named color semantic (brand, neutral, danger, warning, success, info, plus
> any a brand adds). The authoritative set for a brand lives in that brand's
> `config.yaml`.
>
> **Mode**
> : A combinatorial, open-ended `data-mode` string. Modes combine; properties do
> not.
>
> **State**
> : An interaction state defined inside a role, overriding properties directly.

Two points worth surfacing in public docs because they are counter-intuitive:

1. **Roles are usage-frequency tiers, not visual-emphasis tiers.** `primary` /
   `secondary` / `auxiliary` describe how often the variant is reached for, not how loud
   it looks. This is stated flatly in `CONTEXT.md:70-72`.
2. **Modes combine; properties do not.** `data-mode` is a space-separated token list
   (`data-mode~=` selectors throughout), so several modes can be active at once.

---

## 4. Component config schema

### 4.1 Top-level keys

Reconstructed from the structural-key allowlist in `src/kernel/system/config-validator.ts:21-36`
and from real configs. The validator's `STRUCTURAL_KEYS` set is the authoritative list of
"this is config structure, not a style property":

```js
const STRUCTURAL_KEYS = new Set([
  'class', 'uses', 'scale', 'component', 'extends', 'layer', 'roles', 'states',
  'parts', 'semantic-map', 'type', 'font-family', 'font-size', 'meta', 'defaults',
  'style', 'modes', 'breakpoints', 'platforms', 'slots', 'contract', 'bind',
  'props', 'visible', 'visible-from', 'override', 'ref', 'children', 'role',
  'intent', 'element',
  // Legacy paint tokens consumed directly by resolvePaintTokens (transformer.ts)
  'bg-opacity', 'fg-mode', 'fg-contrast', 'fg-chroma', 'border-presence',
  'border-weight', 'chroma',
  // Fluid typography block consumed by resolveTextScaleRule (transformer.ts)
  'fluid',
  // Unconsumed-`uses:` marker written by resolvePartUses (resolver.ts) —
  // findUnresolvedPartUses owns its diagnostic, so the generic unknown-property
  // check must not double-report it.
  'unresolvedUses',
]);
```

The keys an author actually writes:

| Key | Meaning |
| --- | --- |
| `component:` | The component's name. Required — the resolver throws if `config.yaml` is absent. |
| `class:` | CSS class emitted (e.g. `sub-button`). Optional; derived when omitted. |
| `extends:` | Type archetype to inherit, e.g. `types/action`. Optional. |
| `layer:` | CSS cascade layer. Defaults to `ucs.component-specific` (`transformer.ts:1453`). |
| `style:` | Root style bag. **Channel blocks are illegal here** (see §4.4). |
| `roles:` | Role map; each role may carry `states:` and `parts:`. |
| `modes:` | Mode map — combinatorial `data-mode` tokens. |
| `parts:` | Structural nodes the component owns. |
| `slots:` | Content-projection points. |
| `breakpoints:` | Per-breakpoint style bags. |
| `platforms:` | Platform-specific overrides. |
| `contract:` | Behavioral bindings (e.g. `on-click`, `disabled`). |
| `semantic-map:` | Named→numeric lookup (e.g. border `thin`/`medium`/`heavy`). |
| `meta:` | Metadata; carries `intents:` capability restriction. |

### 4.2 Real component config #1 — `src/components/badge/config.yaml` (verbatim, 46 lines)

```yaml
component: badge
extends: types/action

style:
  display: inline-flex
  align-items: center
  gap-column: 1.5
  padding-x: 2
  padding-y: 0.5
  font-scale: -1
  font-weight: 600
  shape: full
  white-space: nowrap
  vertical-align: middle
  pointer-events: none
  transition-duration: none
  transition-easing: default

roles:
  primary:
    background:
      alpha: 1.0
    foreground:
      contrast: auto
      chroma: 0
    states: null
  secondary:
    background:
      alpha: 0
    foreground:
      contrast: 1.0
      chroma: 1.0
    border-width: 1
    border-style: solid
    border:
      contrast: 1.0
      chroma: 0.8
    states: null
  auxiliary:
    background:
      alpha: 0
    foreground:
      contrast: 1.0
      chroma: 1.0
    states: null
```

Note `states: null` on every role. `null` is the **delete** signal in the cascade — badge
inherits `types/action` (which defines hover/pressed states) and then deletes them, because a
badge is non-interactive. This is documented in `src/kernel/system/cascade.md:92`:
*"`null` is the **only** delete signal. There is no separate 'unset' or 'remove' keyword; a
child config removes an inherited value by setting it to `null`."*

### 4.3 Real component config #2 — `src/components/button/config.yaml` (verbatim, 98 lines)

```yaml
component: button
class: sub-button
extends: types/action
layer: ucs.component-specific

style:
  display: inline-flex
  align-items: center
  justify-content: center
  gap-column: 2
  padding-x: 4
  padding-y: 2
  border-radius: 1
  font-scale: 0
  font-weight: 600
  cursor: pointer
  user-select: none
  appearance: none
  white-space: nowrap
  vertical-align: middle
  transition-duration: normal
  transition-easing: default

roles:
  primary:
    background:
      alpha: 1.0
    foreground:
      contrast: auto
      chroma: 0
    states:
      hover:
        background:
          lightness: "+0.05"
      pressed:
        background:
          lightness: "-0.03"
      disabled:
        opacity: 0.5
        cursor: not-allowed
        pointer-events: none
      focus:
        outline-width: 2px
        outline-offset: 2px
  secondary:
    background:
      alpha: 0.2
    foreground:
      contrast: 1.0
      chroma: 1.0
    border-width: 1
    border-style: solid
    border:
      contrast: 1.0
      chroma: 0.8
    states:
      hover:
        background:
          lightness: "+0.04"
      pressed:
        background:
          lightness: "-0.02"
      disabled:
        opacity: 0.5
        cursor: not-allowed
        pointer-events: none
      focus:
        outline-width: 2px
        outline-offset: 2px
  auxiliary:
    background:
      alpha: 0
    foreground:
      contrast: 1.0
      chroma: 1.0
    states:
      hover:
        background:
          lightness: "+0.03"
      pressed:
        background:
          lightness: "-0.02"
      disabled:
        opacity: 0.5
        cursor: not-allowed
        pointer-events: none
      focus:
        outline-width: 2px
        outline-offset: 2px

modes:
  selected: null

contract:
  bindings:
    - on-click
    - disabled
```

Relative lightness deltas are authored as **quoted strings** — `"+0.05"`, `"-0.03"` — so YAML
does not coerce them to plain numbers and the sign is preserved as a delta rather than an
absolute value.

### 4.4 Channel blocks

`background`, `foreground`, and `border` are *channels*, not ordinary properties
(`config-validator.ts:38`). A channel value may be a block with these keys, mirroring
`ChannelBlock` in `types.ts` (`config-validator.ts:200-202`):

```js
const CHANNEL_BLOCK_KEYS = new Set([
  'lightness', 'chroma', 'contrast', 'alpha', 'tint', 'gradient', 'filter', 'noise',
]);
```

**Position matters, and getting it wrong is a hard error.** Channel blocks are illegal in a
root `style:` bag or a `breakpoints:` bag; they are legal inside a role, part, or mode bag.
`config-validator.ts:214-223`:

```js
  if (isPlainObject(value)) {
    if (position === 'root') {
      diagnostics.push({
        path,
        message:
          `Channel block for "${channel}" is not valid in a root style or breakpoint bag — ` +
          'the emitter treats it as a scalar and corrupts output. Move the block into a role, part, or mode bag.',
      });
      return;
    }
```

Scalar channel values are also constrained (`config-validator.ts:244-264`):

- `border:` scalar must be `none`, `thin`, `medium`, `heavy`, or a pixel number.
- `background:` scalar must be `solid`, `none`, or `tint(<0-1>)`.
- `foreground:` scalar must be `auto` or a contrast number.

`foreground: { contrast: auto }` means auto-contrast (black on light, white on dark) — see
the generated output in §7.

### 4.5 Spatial values

Spacing properties (`padding-x`, `padding-y`, `gap-column`, `margin-*`) are typed `spacing`
in `src/kernel/system/properties.yaml:33-40` and are authored as **unitless multipliers**, not
pixels. `padding-x: 2` on badge becomes:

```css
/* 8px at default density=1, scale=1, space-unit=4 */
--surface-padding-x: calc(var(--density) * var(--scale) * var(--space-unit) * 2);
```

So the authored number multiplies a chain of `--density × --scale × --space-unit`. The
generator emits the resolved-at-defaults pixel value as a comment, which is a nice detail for
docs: authors write ratios, the engine emits responsive `calc()`.

`font-scale` is a **scale-step exponent**, not a size. It is typed `number`, default `0`
(`properties.yaml:140-143`), and carries an unusual note (`properties.yaml:137-139`):

```yaml
typography:
  # font-scale declares no emission by design — named engine behavior
  # (quantized-pow formula + density coupling) until the formula pattern
  # earns its way in (P5·g).
  font-scale:
    type: number
    default: 0
    category: typography
```

The emitted formula (from `generated/global/css/components/badge/badge.gen.css`):

```css
--_computed: round(nearest, calc(var(--font-size-base) * pow(var(--effective-ratio), var(--_font-scale))), var(--font-size-quantum, 0.25rem));
--surface-font-size: var(--_computed);
--_font-scale: calc(-1 + var(--density-fs-k, 0) * var(--density, 1));
```

`font-size = base × ratio^font-scale`, rounded to a quantum, with a density coupling term
added to the exponent. The TS mirror of the same math is `src/kernel/color/solver.ts:246`.

### 4.6 `shape: full` and border-radius

Badge authors `shape: full`; the generator emits `--surface-border-radius: 9999px`. Button
instead authors `border-radius: 1` (a scale multiplier). Both spellings exist in real configs.

### 4.7 Parts

`src/components/card/config.yaml:76-99` shows the parts pattern:

```yaml
parts:
  header:
    style:
      display: flex
      align-items: start
      gap-column: 2
      padding-y: 0
  media:
    style:
      display: block
      flex: none
  body:
    style:
      flex: 1
      line-height: 1.5
  footer:
    style:
      display: flex
      align-items: center
      gap-column: 2
      padding-y: 0
  action:
    style:
      flex: none
```

### 4.8 `uses:` — parts inheriting a type role

A part may pull its tokens from a type-config role via `uses:`. The mechanism is documented
in `src/kernel/system/resolver.ts:207-208` and `238-242`:

> A `uses` value like "types/text" with a part named "heading" means:
> load types/text config, find roles.heading, and merge those tokens as the base.

```js
    // uses format: "types/text" — we need to find the role matching the part name
    //   uses: types/text  (with part named "heading") -> load types/text, get roles.heading
    //   uses: types/text  (with part named "body") -> load types/text, get roles.body
    //   uses: types/text  (with part named "emphasized-body") -> load types/text, get roles.body (fallback)
```

Matching is by **part name**, with a **suffix fallback**: a part named `emphasized-body`
matches role `body`. An unmatched `uses:` is a hard error, not a silent no-op (§8).

---

## 5. Type config schema and the five archetypes

### 5.1 Type-config top-level keys

| Key | Meaning |
| --- | --- |
| `type:` | Archetype name (`action`, `text`, …). |
| `effect:` | Effect channel — `backdrop-filter` for all but `text`, which uses `filter`. |
| `meta.intents:` | Consumable-intent capability restriction. |
| `roles:` | Roles components inherit. |
| `modes:` | Modes components inherit. |
| `semantic-map:` | Named→numeric lookups. |

Every one of the five type configs carries this identical comment above `meta:` — worth
quoting in docs because it states a system-wide invariant:

```yaml
# Consumable-intent capability — intents are universal; this is the only
# restriction surface. 'all' = every intent the brand defines (UCS-572).
meta:
  intents: all
```

### 5.2 `src/types/action/config.yaml` (verbatim, 74 lines)

```yaml
type: action
effect: backdrop-filter

# Consumable-intent capability — intents are universal; this is the only
# restriction surface. 'all' = every intent the brand defines (UCS-572).
meta:
  intents: all

roles:
  primary:
    background:
      alpha: 1.0
    foreground:
      contrast: auto
      chroma: 0
    states:
      hover:
        background:
          lightness: "+0.05"
      pressed:
        background:
          lightness: "-0.03"
  secondary:
    background:
      alpha: 0.2
    foreground:
      contrast: 1.0
      chroma: 1.0
    border-width: 1
    border-style: solid
    border:
      contrast: 1.0
      chroma: 0.8
    states:
      hover:
        background:
          tint: 0.08
      pressed:
        background:
          tint: 0.12
  auxiliary:
    background:
      alpha: 0
    foreground:
      contrast: 1.0
      chroma: 1.0
    states:
      hover:
        background:
          tint: 0.08
      pressed:
        background:
          tint: 0.12

modes:
  selected:
    foreground:
      contrast: 1.0
      chroma: 1.0
    background:
      alpha: 0.12
    states:
      hover:
        background:
          alpha: 0.18
      pressed:
        background:
          alpha: 0.22

semantic-map:
  border:
    thin: 1
    medium: 1.5
    heavy: 2
```

### 5.3 `src/types/text/config.yaml` (verbatim, 87 lines) — the typography role system

This is the file that defines `heading`, `body`, `caption`, `label`, `code`, `kbd`.

```yaml
type: text
effect: filter

# Consumable-intent capability — intents are universal; this is the only
# restriction surface. 'all' = every intent the brand defines (UCS-572).
meta:
  intents: all

roles:
  heading:
    font-family: var(--font-heading)
    font-scale: 3
    font-weight: 700
    line-height: 1.2
    letter-spacing: -0.01em
    text-transform: none
    fluid:
      floor: 0.7
      ceiling: 1.3
      min: 1.125
      max: 4
      reference: container
  body:
    font-family: var(--font-body)
    font-scale: 0
    font-weight: 400
    line-height: 1.5
    letter-spacing: 0
    text-transform: none
    fluid:
      floor: 0.85
      ceiling: 1.1
      min: 0.875
      max: 1.5
      reference: container
  caption:
    font-family: var(--font-body)
    font-scale: -0.75
    font-weight: 400
    line-height: 1.4
    letter-spacing: 0.01em
    text-transform: none
    fluid:
      floor: 0.92
      ceiling: 1.05
      min: 0.6875
      max: 1
      reference: container
  label:
    font-family: var(--font-body)
    font-scale: -0.5
    font-weight: 600
    line-height: 1
    letter-spacing: 0.04em
    text-transform: uppercase
    fluid:
      floor: 0.9
      ceiling: 1.08
      min: 0.6875
      max: 1
      reference: container
  code:
    font-family: var(--font-mono)
    font-scale: -0.25
    font-weight: 400
    line-height: 1.45
    letter-spacing: 0
    text-transform: none
    fluid:
      floor: 0.95
      ceiling: 1.05
      min: 0.75
      max: 1.25
      reference: container
  kbd:
    font-family: var(--font-mono)
    font-scale: -0.5
    font-weight: 600
    line-height: 1
    letter-spacing: 0
    text-transform: none
    fluid:
      floor: 0.95
      ceiling: 1.05
      min: 0.6875
      max: 1
      reference: container
```

Each role carries a `fluid:` envelope (`floor`, `ceiling`, `min`, `max`, `reference`). `fluid`
is in the structural-key allowlist and is consumed by `resolveTextScaleRule` in
`transformer.ts` (`config-validator.ts:29-30`). When present, the transformer emits a second
rule gated by `[data-mode~="fluid"]` (`src/platforms/web/css/transformer.ts:1135`, `1168`) —
so fluid typography is opt-in per element via a mode token.

### 5.4 `src/types/input/config.yaml` (verbatim, 64 lines)

```yaml
type: input
effect: backdrop-filter

# Consumable-intent capability — intents are universal; this is the only
# restriction surface. 'all' = every intent the brand defines (UCS-572).
meta:
  intents: all

roles:
  primary:
    background:
      alpha: 0.06
    foreground:
      contrast: 1.0
      chroma: 0.3
    border-width: 1
    border-style: solid
    border:
      contrast: 0.7
      chroma: 0.5
    opacity: 1.0
    states:
      hover:
        background:
          alpha: 0.1
        border:
          contrast: 0.85
          chroma: 0.6
      focus:
        outline-width: 2px
        outline-offset: 2px
      disabled:
        opacity: 0.5
        cursor: not-allowed
        pointer-events: none

modes:
  selected:
    border:
      contrast: 1.0
      chroma: 0.8
    background:
      alpha: 0.08
    states:
      hover:
        background:
          alpha: 0.12
      pressed:
        background:
          alpha: 0.15
  indeterminate:
    border:
      contrast: 0.85
      chroma: 0.6
    states:
      hover:
        border:
          contrast: 0.95

semantic-map:
  border:
    thin: 1
    medium: 1.5
    heavy: 2
```

Input is the only archetype with a single role (`primary`) and it adds an `indeterminate`
mode alongside `selected`.

### 5.5 `src/types/feedback/config.yaml` (verbatim, 87 lines)

```yaml
type: feedback
effect: backdrop-filter

# Consumable-intent capability — intents are universal; this is the only
# restriction surface. 'all' = every intent the brand defines (UCS-572).
meta:
  intents: all

roles:
  primary:
    background:
      alpha: 1.0
    foreground:
      contrast: auto
      chroma: 0
    states:
      hover:
        background:
          lightness: "+0.03"
      pressed:
        background:
          lightness: "-0.02"
      disabled:
        opacity: 0.5
        cursor: not-allowed
        pointer-events: none
      focus:
        outline-width: 2px
        outline-offset: 2px

  secondary:
    background:
      alpha: 0.15
    foreground:
      contrast: 1.0
      chroma: 1.0
    border-width: 1
    border-style: solid
    border:
      contrast: 0.8
      chroma: 0.6
    states:
      hover:
        background:
          tint: 0.06
      pressed:
        background:
          tint: 0.10
      disabled:
        opacity: 0.5
        cursor: not-allowed
        pointer-events: none
      focus:
        outline-width: 2px
        outline-offset: 2px

  auxiliary:
    background:
      alpha: 0
    foreground:
      contrast: 1.0
      chroma: 1.0
    border-x-start-width: 3
    border-style: solid
    border:
      contrast: 1.0
      chroma: 0.8
    states:
      hover:
        background:
          tint: 0.04
      pressed:
        background:
          tint: 0.08
      disabled:
        opacity: 0.5
        cursor: not-allowed
        pointer-events: none
      focus:
        outline-width: 2px
        outline-offset: 2px

semantic-map:
  border:
    thin: 1
    medium: 1.5
    heavy: 2
```

`auxiliary` uses `border-x-start-width: 3` — the logical-property spelling that produces the
familiar left-accent-bar alert treatment (and mirrors correctly in RTL).

### 5.6 `src/types/chart/config.yaml` (verbatim, 85 lines)

Chart is structurally different from the other four: no `roles:`, no `modes:`. It has
`series:`, `overlays:`, `states:`, `axis:`.

```yaml
type: chart
effect: backdrop-filter

# Consumable-intent capability — intents are universal; this is the only
# restriction surface. 'all' = every intent the brand defines (UCS-572).
meta:
  intents: all

# Series palettes — named compositions of intents for multi-line/bar charts.
# Each palette is a list of series stops. A stop references a system intent
# and a contrast level (0-1). The generator emits CSS variables per series
# index: --chart-series-0-stroke, --chart-series-0-fill, etc.
series:
  solo:
    - intent: brand
      contrast: 0.85
  comparison:
    - intent: brand
      contrast: 0.85
    - intent: neutral
      contrast: 0.55
  percentile:
    - intent: neutral
      contrast: 0.55
    - intent: brand
      contrast: 0.7
    - intent: warning
      contrast: 0.85
  categorical:
    - intent: brand
      contrast: 0.85
    - intent: success
      contrast: 0.8
    - intent: info
      contrast: 0.8
    - intent: warning
      contrast: 0.8
    - intent: danger
      contrast: 0.8

# Overlays — threshold bands, target lines drawn atop chart areas.
overlays:
  threshold-warning:
    stroke:
      intent: warning
      contrast: 0.7
    fill:
      intent: warning
      alpha: 0.08
  threshold-danger:
    stroke:
      intent: danger
      contrast: 0.85
    fill:
      intent: danger
      alpha: 0.1
  target:
    stroke:
      intent: neutral
      contrast: 0.4
      dash: [4, 4]

# Interaction states applied to series elements.
states:
  default:
    opacity: 1
    stroke-width: 1.5
  selected:
    opacity: 1
    stroke-width: 2.5
  dimmed:
    opacity: 0.25
    stroke-width: 1.5

# Axis and grid styling.
axis:
  text:
    intent: neutral
    contrast: 0.5
  line:
    intent: neutral
    contrast: 0.15
  grid:
    intent: neutral
    contrast: 0.08
```

---

## 6. The card / panel / inset roles

The task brief asked about roles named `card`, `panel`, `inset`. **These are not roles of the
`card` component.** They are the three roles of a separate `surface` component,
`src/components/surface/config.yaml` (verbatim, complete file):

```yaml
component: surface

style: {}

roles:
  card:
    padding-x: 5
    padding-y: 4
    border-radius: 1.5
    border-width: 0.25
    border-style: solid
    border:
      lightness: 0.50
      chroma: 0
      alpha: 0.12

  panel:
    padding-x: 4
    padding-y: 3
    border-radius: 1.0

  inset:
    padding-x: 4
    padding-y: 3
    border-radius: 1.0
```

`surface` has no `extends:` and an empty `style: {}`; it is a pure spatial/containment
vocabulary. The `card` **component** (`src/components/card/config.yaml`) is a different
artifact that `extends: types/feedback` and uses the conventional
`primary`/`secondary`/`auxiliary` roles plus `parts:` and `modes: {interactive, selected}`.

**This is a genuine naming trap for docs** — "card" is simultaneously a component name and a
surface role name, and they mean different things. `tab` is the only other component whose
config mentions panel/inset.

---

## 7. How a component config becomes CSS

### 7.1 The resolution cascade (6 layers)

`src/kernel/system/resolver.ts:610-626` documents the order authoritatively:

```
 1. Load base component config
 2. Load type config (if extends: is specified) and deep merge
 3. If platform, load and merge platform override
 4. If brandName, load and merge brand override (flat sibling config.{brand}.yaml)
 4a. If brandName + extends, load brand type override (brands/{brand}/types/{type}/)
 4b. If brandName, load brand component override — colocated
     ({componentDir}/brands/{brandDir}/config.yaml) if present, else the brand
     directory ({brands/{brand}/components/{comp}/config.yaml})
 5. If subBrandName, load and merge sub-brand override
 6. Resolve uses: references in parts
 7. Return fully resolved config
```

The same source block defines two terms docs should keep straight:

> Terminology: step 4's `config.{brand}.yaml` is the *flat sibling*. Step 4b's
> `brands/{brandDir}/` subdirectory is the *colocated layout*. Both sit next to
> the component; only the latter is what "colocated" means in UCS-1114/1119.

`cascade.md:120-124` states the condensed order: **base → type → brand-type → sub-brand-type →
brand → sub-brand**, all using the same merge and null-delete rules via `deepMerge`.

### 7.2 Merge semantics

`src/kernel/system/cascade.md:71-92` is the canonical contract. Key rules:

| Override value at a key | Result |
| --- | --- |
| `null` | **Delete** — the key is removed from the result. |
| `undefined` (default) | Skipped — base value kept. |
| object over object | **Deep-merged** recursively. |
| anything else | **Replaces** the base value wholesale. |

Explicitly called out: *"Arrays are replaced, never concatenated or index-merged."* and
*"Type changes replace."*

Key normalization is kebab→camel, but **named-resource keys round-trip verbatim** — the
preserved set is `intents, materials, gradients, ramps, rampOutputs`, preserved exactly one
level deep (`cascade.md:37-56`). Collisions after normalization **throw**
(`Duplicate cascade key after normalization`), by design, rather than silently dropping a
spelling.

### 7.3 Generated CSS — badge worked example

`generated/global/css/components/badge/badge.gen.css` (first 40 lines, verbatim):

```css
/* DO NOT EDIT — generated from components/badge/config.yaml */
/* Run: npx tsx scripts/generate-css.ts */

@layer ucs.component-specific {
  .sub-badge[data-ucs] {
    --surface-display: inline-flex;
    --surface-align-items: center;
    /* 6px at default density=1, scale=1, space-unit=4 */
    --surface-gap-x: calc(var(--density) * var(--scale) * var(--space-unit) * 1.5);
    /* 8px at default density=1, scale=1, space-unit=4 */
    --surface-padding-x: calc(var(--density) * var(--scale) * var(--space-unit) * 2);
    /* 2px at default density=1, scale=1, space-unit=4 */
    --surface-padding-y: calc(var(--density) * var(--scale) * var(--space-unit) * 0.5);
    --_computed: round(nearest, calc(var(--font-size-base) * pow(var(--effective-ratio), var(--_font-scale))), var(--font-size-quantum, 0.25rem));
    --surface-font-size: var(--_computed);
    --surface-font-weight: calc(600 + var(--density-fw-k, 0) * var(--density, 1));
    --surface-border-radius: 9999px;
    --surface-white-space: nowrap;
    --surface-vertical-align: middle;
    --surface-pointer-events: none;
    --surface-transition-duration: 0ms;
    --surface-transition-timing: var(--easing);
    --_font-scale: calc(-1 + var(--density-fs-k, 0) * var(--density, 1));
  }

  .sub-badge[data-mode~="primary"] {
    --surface-bg-l: var(--solved-bg-l);
    /* gamut-safe: chroma tapers at extreme lightness */
    --surface-bg-c: calc(var(--intent-chroma) * min(1, calc(4 * var(--surface-bg-l) * (1 - var(--surface-bg-l)) * 2)));
    --surface-bg-alpha: 1;
    --surface-background: oklch(var(--surface-bg-l) var(--surface-bg-c) var(--intent-hue));
    /* auto-contrast: black on light, white on dark */
    --surface-fg-l: clamp(0, calc((0.6 - var(--surface-bg-l)) * 100), 1);
    --surface-fg-c: 0;
    --surface-foreground: oklch(var(--surface-fg-l) var(--surface-fg-c) var(--intent-hue));
  }
```

The mapping is direct and teachable:

| Config | Generated CSS |
| --- | --- |
| `style:` bag | `.sub-badge[data-ucs] { … }` — base rule |
| `roles.primary` | `.sub-badge[data-mode~="primary"] { … }` |
| `modes.selected` | `.sub-badge[data-mode~="selected"] { … }` |
| `layer:` | the `@layer ucs.component-specific { … }` wrapper |
| `padding-x: 2` | `calc(var(--density) * var(--scale) * var(--space-unit) * 2)` |
| `font-scale: -1` | `--_font-scale: calc(-1 + …)` feeding a `pow()` |
| `shape: full` | `--surface-border-radius: 9999px` |
| `foreground: {contrast: auto}` | `clamp(0, calc((0.6 - var(--surface-bg-l)) * 100), 1)` |
| `foreground: {contrast: 1.0}` | `--surface-fg-l: var(--solved-fg-l)` |

**Roles and modes both emit `[data-mode~="…"]` selectors.** This answers the brief's question
about how `data-mode` tokens relate to states/modes: at the CSS level a role name and a mode
name are both just tokens in the same space-separated `data-mode` attribute. The transformer
confirms this — `src/platforms/web/css/transformer.ts:115-117` returns
`.${className}[data-mode~="${scope.role}"]` for roles and
`.${className}[data-mode~="${scope.mode}"]` for modes, from the same function.

Interaction states get a **`data-mode` alias twin** alongside the real pseudo-class, so a
state can be forced for testing or documentation (`transformer.ts:136-137`):

```js
      // The data-mode alias twin of an interaction state (delta semantics).
      rule.selector = `${selector}[data-mode~="${node.state}"]`;
```

A scaffolded component shows the intended authoring shape of the attribute
(`scripts/new-component.ts:82`):

```
<${element} data-ucs data-mode="filled brand md" class="…">
```

— i.e. a variant token, an intent token, and a size token coexisting in one attribute.

There is a dev-time guard: `src/platforms/web/runtime/dev-validate.ts:1-2` —
*"Watches the DOM for [data-mode] attributes and warns on unrecognized tokens."*

---

## 8. How text roles drive APCA role-specific foregrounds

This is the most interesting cross-system link in the engine, and the chain is fully
traceable.

**Step 1 — role discovery + baseline election.** `scripts/generate-css.ts:444-474` loads
`types/text/config.yaml` and elects the **baseline role** as the one whose `font-scale` is
closest to zero, ties broken alphabetically:

```js
function createTextRoleInfo(
  roleConfigs: Record<string, Record<string, unknown>>,
): TextRoleInfo | null {
  const allRoles = Object.keys(roleConfigs);
  if (allRoles.length === 0) return null;
  let baselineRole = '';
  let baselineDistance = Infinity;
  for (const [name, role] of Object.entries(roleConfigs)) {
    const dist = Math.abs(Number(role['font-scale'] ?? 0));
    if (dist < baselineDistance || (dist === baselineDistance && name < baselineRole)) {
      baselineDistance = dist;
      baselineRole = name;
    }
  }
```

With the shipped config, `body` (`font-scale: 0`) wins. This is *derived*, not hard-coded — a
brand that reshapes the type scale could elect a different baseline.

**Step 2 — spatial solve per non-baseline role.** `src/kernel/color/solver.ts:230-261`
computes a per-role foreground lightness. This is where font-scale, font-weight, and APCA
meet:

```js
export function computeSpatialPrimitives(
  surface: OklchColor,
  brand: BrandConfig,
  prefs: UserPreferences,
  intentHC: HueChroma,
): readonly ColorSolverSpatialPrimitive[] {
  const result: ColorSolverSpatialPrimitive[] = [];

  const baseFontSizeRem = brand.typography.baseFontSize;
  const scaleRatio = brand.typography.scaleRatio;
  const effectiveRatio = 1 + (scaleRatio - 1) * prefs.typeScaleFactor;

  const { roles: textRoles, baselineRole } = getEngineTextRoles();
  for (const [roleName, metrics] of Object.entries(textRoles)) {
    if (roleName === baselineRole) continue;

    const fontSizePx = baseFontSizeRem * 16 * Math.pow(effectiveRatio, metrics.fontScale);
    const bronzeLc = lookupBronzeLc(fontSizePx, metrics.fontWeight);
    const targetLc = bronzeLc >= 999 ? 100 : bronzeLc;
    const solved = resolveForeground(surface, targetLc, prefs.contrastFactor, intentHC);
```

The logic: the role's `font-scale` exponent and brand ratio give a **pixel size**; size +
`font-weight` index into the **APCA Bronze** lookup for a required Lc; that Lc is solved
against the actual surface to a foreground lightness. Larger/bolder text legitimately needs
less contrast, so each role gets its own solved value rather than one global foreground.

**Step 3 — emit per-role CSS variables.** `solver.ts:172-180`:

```js
function addSpatialVars(
  vars: Record<string, string>,
  intentName: string,
  spatial: readonly ColorSolverSpatialPrimitive[],
): void {
  for (const { role, fgL } of spatial) {
    vars[`--ucs-${intentName}-fg-l-${role}`] = String(fgL);
  }
}
```

This is the `--ucs-{intent}-fg-l-{role}` variable the brief asked about. Confirmed present in
generated output — `generated/global/css/modes.system.gen.css:216-228` declares
`@property --ucs-brand-fg-l-heading`, `--ucs-brand-fg-l-caption`, `--ucs-brand-fg-l-label`,
etc., one per intent × non-baseline role.

**Step 4 — narrow intent-scoped to element-scoped.** `generate-css.ts:211-212` aliases the
intent-qualified variable to a plain one inside the `[data-mode~="{intent}"]` block:

```js
      const prop = `--intent-fg-l-${role}:`;
      const value = `var(--ucs-${intent}-fg-l-${role})`;
```

**Step 5 — apply per text role, with fallback.** `generate-css.ts:503-535`:

```js
  for (const role of roleInfo.allRoles) {
    if (autoContrastRoles?.has(role)) {
      lines.push(`  /* ${role}: spatial foreground suppressed — parent uses contrast: auto */`);
      continue;
    }

    const isBaseline = role === roleInfo.baselineRole;
    lines.push(`  .${componentClass}[data-mode~="${role}"] {`);
    // Baseline uses the intent's base fg lightness directly.
    // Non-baseline roles pick up their spatially-tuned variant,
    // falling back to the base when the spatial var is absent.
    lines.push(isBaseline
      ? `    --solved-fg-l: var(--intent-fg-l);`
      : `    --solved-fg-l: var(--intent-fg-l-${role}, var(--intent-fg-l));`);
```

Two behaviors docs should mention: the baseline role uses the plain `--intent-fg-l`; and where
a parent already declares `contrast: auto`, the spatial foreground is **suppressed** with an
explanatory comment in the output rather than silently fighting it.

**The full chain, end to end:**

```
types/text/config.yaml  roles.heading.font-scale: 3, font-weight: 700
   → fontSizePx = baseFontSize × 16 × ratio^3
   → lookupBronzeLc(fontSizePx, 700)          [APCA Bronze]
   → resolveForeground(surface, targetLc, …)  → fgL
   → --ucs-brand-fg-l-heading: <fgL>
   → --intent-fg-l-heading: var(--ucs-brand-fg-l-heading)
   → .sub-text[data-mode~="heading"] { --solved-fg-l: var(--intent-fg-l-heading, var(--intent-fg-l)) }
   → --surface-foreground: oklch(var(--solved-fg-l) … var(--intent-hue))
```

**Bootstrap defaults.** The engine cannot depend on its own generated output to start, so
`src/kernel/system/text-roles.ts:9-26` seals a mirror of the shipped text roles:

```ts
export const ENGINE_DEFAULT_TEXT_ROLES: Readonly<
  Record<string, EngineTextRoleMetrics>
> = {
  heading: { fontScale: 3, fontWeight: 700 },
  body: { fontScale: 0, fontWeight: 400 },
  caption: { fontScale: -0.75, fontWeight: 400 },
  label: { fontScale: -0.5, fontWeight: 600 },
  code: { fontScale: -0.25, fontWeight: 400 },
  kbd: { fontScale: -0.5, fontWeight: 600 },
};

export const ENGINE_DEFAULT_BASELINE_TEXT_ROLE = 'body';
```

The file's header comment explains why (`text-roles.ts:1-8`): *"Client text declarations may
project a different generated text-role manifest, but the engine compiler cannot depend on
that generated output in order to start."* `configureEngineTextRoles(roles, baselineRole)`
installs the generated client manifest at runtime.

**Note the field-name shift:** YAML authors `font-scale` (kebab); TS consumes `fontScale`
(camel). That is the cascade key normalization from §7.2. `fgContrast` is an optional third
metric applied at `solver.ts:251-253` to pull the solved foreground back toward the surface.

---

## 9. Validation

### 9.1 Component config validation

`src/kernel/system/config-validator.ts` is the generate-time gate. Its header states the
policy (`config-validator.ts:1-4`):

```js
// Generate-time component config validation (UCS-1103). The generator refuses
// to emit dead or corrupt output: unknown property keys, invalid value shapes,
// misplaced channel blocks, and unresolvable gradient references are hard
// errors with actionable diagnostics.
```

Diagnostics are **pathed**, e.g. `parts.bubble.style.margin-y-top`
(`config-validator.ts:11`). Entry point is `validateComponentConfigStrict`
(`config-validator.ts:62`). It walks: `style`, `breakpoints`, `roles` (and each role's
`states` and `parts`), `states`, `modes`, `parts`, `slots`
(`config-validator.ts:82-131`).

Four error classes, each with a "did you mean" suggestion via `nearestNames`:

1. **Unknown property** — key not in the platform property schema
   (`config-validator.ts:190-192`). The schema is loaded from
   `loadPropertySchema('web')` (`config-validator.ts:50`), backed by
   `src/kernel/system/properties.yaml`.
2. **Bad value shape** — `validateValueShape` against the property definition
   (`config-validator.ts:194-195`).
3. **Misplaced channel block** — §4.4.
4. **Unresolvable gradient reference** — a `gradient:` string that no brand defines
   (`config-validator.ts:299-311`):

```js
function unknownGradientMessage(name: string, known: Set<string>): string {
  if (known.size === 0) {
    return (
      `Unknown gradient "${name}" — the brand defines no gradients. ` +
      `Add a "${name}" recipe under the brand's gradients: block, or inline the gradient object here.`
    );
  }
  const suggestions = nearestNames(name, known);
  const didYouMean = suggestions.length > 0
    ? ` Did you mean ${suggestions.map((s) => `"${s}"`).join(' or ')}?`
    : '';
  return `Unknown gradient "${name}" — the brand defines: ${[...known].join(', ')}.${didYouMean}`;
}
```

Plus a fifth, post-resolution check: **unresolved `uses:`**. `findUnresolvedPartUses`
(`config-validator.ts:321-347`) hunts for markers left by the resolver. Its rationale is
worth quoting because it explains a subtle failure mode (`config-validator.ts:313-320`):

> Deep-walk a resolved config for `unresolvedUses` markers — parts whose
> `uses:` target resolvePartUses (resolver.ts) could not consume. A matched
> `uses:` keeps its raw string on the resolved part too, so the marker (not
> the string) is the only post-resolution evidence that the author's
> inheritance intent was dropped.

Three distinct `uses:` failure messages (`config-validator.ts:358-380`):

```js
    case 'missing-config':
      return (
        `${lead} no config exists at ${marker.target}/config.yaml in this source tree — ` +
        'the part would silently inherit nothing. Fix the uses: target or remove it.'
      );
    case 'no-roles':
      return (
        `${lead} that config has no roles: block — the part would silently inherit nothing. ` +
        'Add a roles: block to the type config or remove uses:.'
      );
    case 'no-matching-role': {
      const available = marker.availableRoles ?? [];
      const suggestions = nearestNames(partName, available);
      const didYouMean = suggestions.length > 0
        ? ` Did you mean ${suggestions.map((s) => `"${s}"`).join(' or ')}?`
        : '';
      return (
        `${lead} no role there matches the part name — it defines: ${available.join(', ')}.` +
        `${didYouMean} Rename the part to a defined role (a part named "x-body" matches role ` +
        `"body" by suffix) or add a "${partName}" role to ${marker.target}.`
      );
```

The recurring phrase **"would silently inherit nothing"** is the design rationale: the engine
converts silent no-ops into loud failures.

### 9.2 Error message shapes (for a docs troubleshooting page)

| Situation | Message |
| --- | --- |
| Channel block in root `style:` | `Channel block for "background" is not valid in a root style or breakpoint bag — the emitter treats it as a scalar and corrupts output. Move the block into a role, part, or mode bag.` |
| Unknown channel key | `Unknown channel key "lightnes". Did you mean "lightness"? Valid keys: lightness, chroma, contrast, alpha, tint, gradient, filter, noise.` |
| Bad border scalar | `Invalid border weight "bold". Valid weights: none, thin, medium, heavy — or a number of pixels.` |
| Bad background scalar | `Invalid background "filled". Valid scalars: solid, none, tint(<0-1>) — or a channel block in a role, part, or mode bag.` |
| Bad foreground scalar | `Invalid foreground "contrast". Valid scalars: auto or a contrast number — or a channel block in a role, part, or mode bag.` |
| Missing component config | `Component config not found: {componentDir}/config.yaml` (`resolver.ts:663`) |
| Missing text config | `types/text/config.yaml not found — required for spatial frequency` (`generate-css.ts:542`) |
| Cascade key collision | `Duplicate cascade key after normalization` (`cascade.md:63-65`) |
| Non-object config root | `Invalid {label}: root must be an object` (`cascade.md:98-100`) |

### 9.3 Test surfaces

Corpus-wide validation tests exist, so every shipped config is continuously checked:

- `src/kernel/system/__tests__/config-validator-corpus.test.ts` — scans every
  `src/components/*/config.yaml` (line 24).
- `src/kernel/system/__tests__/config-validator-catalog.test.ts` — catalog + brand overrides;
  its header notes platform subdirectory files are handled separately (line 19).
- `src/kernel/system/__tests__/cascade-contract.test.ts` — end-to-end cascade semantics
  through the public loaders.
- `src/kernel/system/__tests__/chart-config.test.ts` — pins `types/chart/config.yaml`
  (line 10).
- `src/kernel/system/__tests__/alert-config.test.ts`, `type-intent-cascade.test.ts`,
  `spatial-integration.test.ts` (asserts the `--ucs-{intent}-fg-l-{role}` vars exist,
  lines 9-22).

`cascade.md:5-19` states the maintenance contract: *"When the cascade behaviour changes,
update this doc and those suites together — they are the one documented contract and the one
regression surface."*

---

## 10. The generation pipeline

All generation funnels through one entry point, `scripts/generate.ts`, invoked via
`scripts/run-tsx.mjs`. From `package.json` scripts:

| Command | Effect |
| --- | --- |
| `npm run generate` | Full generation |
| `npm run generate:check` | Verify generated output is current (CI gate) |
| `npm run generate:tokens` | Token family; `--target css\|dtcg\|swift\|compose` |
| `npm run generate:ramps` | Ramp family; adds `--target react-native` |
| `npm run generate:descriptors` | Style descriptors |
| `npm run generate:doc-views` | Per-brand doc-view projections |
| `npm run generate:skill-registry` | Skill registry |

The pattern is `--family {ramps|tokens|descriptors|doc-views}` and `--target {css|dtcg|swift|compose|react-native}`.

Validation and audit commands:

| Command | Script |
| --- | --- |
| `npm run validate:docs` | `scripts/validate-docs.ts` |
| `npm run validate:ontology` | `scripts/validate-ontology.ts` |
| `npm run validate:ontology:values` | `scripts/validate-ontology-values.ts` |
| `npm run validate:docs:paths` (+ `:strict`) | `scripts/validate-doc-paths.ts` |
| `npm run validate:brand-doc` | `scripts/validate-brand-doc.ts` |
| `npm run audit` / `audit:ontology` | `scripts/audit.ts` / `audit-ontology.ts` |
| `npm run preflight` | `scripts/preflight.ts` |
| `npm run docs:health` | `scripts/docs-health.ts` |
| `npm run report:staleness` | `scripts/report-staleness.ts` |

`npm run build` runs `generate:check` **first**, then `tsc` — so stale generated output fails
the build.

Generated CSS is emitted per component to
`generated/global/css/components/{component}/{component}.gen.css`, and per brand to
`generated/brands/{brand}/{sub-brand}/css/components/…`. Other targets emit to sibling
`compose/`, `swift/`, `docs/` trees. Every generated file carries a two-line banner
(`generate-css.ts:656`, `546-547`):

```css
/* DO NOT EDIT — generated from components/badge/config.yaml */
/* Run: npx tsx scripts/generate-css.ts */
```

`scripts/new-component.ts` scaffolds a new component, emitting a config that extends the
action archetype (`new-component.ts:73`).

---

## 11. Brand overrides — authoring conventions

Brand overrides are **partial** configs containing only what changes, and by convention open
with a comment block giving the brand, the component, and the real-world source of the design.
Four real examples from `src/components/badge/brands/`:

`src/components/badge/brands/magic-patterns/config.yaml` (verbatim):

```yaml
# Magic Patterns — badge override
# Source: "Business" badge, "Design System" pill, quick-action chips
# Primary uses tinted brand bg (Indigo Tint) with brand-colored text.
# Secondary is outline with brand-colored text.
# Pill shape (9999px) inherited from base badge `shape: full`.

roles:
  primary:
    padding-x: 2
    padding-y: 0.5
    font-scale: -1
    font-weight: 500
    background:
      alpha: 0.1
    foreground:
      contrast: 1.0
      chroma: 1.0
  secondary:
    padding-x: 2
    padding-y: 0.5
    font-scale: -1
    font-weight: 500
    background:
      alpha: 0
    foreground:
      contrast: 1.0
      chroma: 1.0
    border-width: 1
    border-style: solid
    border:
      contrast: 0.6
      chroma: 0.8
```

`src/components/badge/brands/draftkings/corporate/config.yaml` (verbatim):

```yaml
# DraftKings Corporate — badge override
# Source: www.draftkings.com production CSS
# Outline: transparent bg, branded border, 4px radius, uppercase

roles:
  primary:
    border-radius: 1
    padding-x: 1
    padding-y: 0.5
    font-scale: -1.5
    font-weight: 600
    text-transform: uppercase
    background:
      alpha: 0
    foreground:
      contrast: 1.0
      chroma: 1.0
    border-width: 1
    border-style: solid
    border:
      contrast: 1.0
      chroma: 1.0
```

Conventions visible across all four: no `component:` key repeated; only `roles:` present;
a header comment naming brand + component + source; and a note about what is *inherited*
rather than restated (magic-patterns explicitly notes the pill shape comes from the base).

Sub-brand identity rules are in `cascade.md:126-150`. The `familySlug` is
`${parent}-${child}`; a co-located override file `config.{name}.yaml` keys off the **full
family slug**, while `brands/{parent}/{child}/…` paths key off the **child dir alone**.
Passing either form yields the same identity.

---

## 12. Naming rules

Verified rules:

1. **Config filenames are fixed**: `config.yaml` (engine), `config.doc.yaml` (docs),
   `config.doc.gen.yaml` (generated doc view), `entry.yaml` (catalog staging).
2. **Directory name is the component name** — the scan keys off directory names
   (`generate-doc-views.ts:117`) and `component:` matches the directory in every config
   inspected.
3. **Kebab-case throughout YAML**; normalized to camelCase for TS consumption, except the
   preserved named-resource keys and the scheme-track grammar keys (`scheme-end`,
   `scheme-track`, `from-intent`) which *"keep their kebab spelling at any depth"*
   (`cascade.md:58-61`).
4. **CSS class convention `sub-{component}`** — button declares `class: sub-button`; badge
   omits `class:` and still emits `.sub-badge`, so it is derived when absent.
5. **`extends:` values are paths**: `types/action`, not bare `action`.
6. **Part-name → role matching is by exact name, then by suffix** — `emphasized-body` →
   `body` (`resolver.ts:242`).
7. **Layer default** is `ucs.component-specific` (`transformer.ts:1453`); only 8 components
   declare `layer:` explicitly, all with that same value — it is redundant where written.
8. **`null` deletes.** The only removal keyword.

---

## 13. Demo/brand content that needs renaming for public docs

The brief flagged that public docs use a fictional cast (`acme`, `aurora`). Findings:

**Real commercial brands are bundled throughout and would need replacing.** `src/brands/`
contains six real companies:

```
src/brands/{delta,descript,draftkings,google,magic-patterns,stripe}
```

With sub-brands visible in `generated/`: `stripe/{checkout,dashboard,docs,marketing}`,
`draftkings/{corporate,pick6,casino,sportsbook}`, `delta/{corporate,skymiles,booking,cargo,premium}`,
`google/{workspace,youtube,search,android,cloud}`, `descript/{editor,underlord,marketing}`.

Component-level brand overrides also carry brand names in paths *and* in comments that cite
production sources — e.g. `# Source: www.draftkings.com production CSS`,
`# Source: casino.draftkings.com production CSS`,
`# Source: cc-badge on sportsbook.draftkings.com`. **Any doc example drawn from
`src/components/*/brands/**` will leak both a real brand name and a claim about that
company's production CSS.** These need rewriting, not just renaming.

**`acme` is already the engine's own fictional placeholder** and is safe to keep. It appears
in engine docs as an example identity, notably the sub-brand identity table in
`cascade.md:138-143` (`acme` + `seasonal` → `acme-seasonal`), and in
`docs/delivery-runbook.md:176`, `docs/superpowers/plans/`, and `docs/agents/` notes. One other
fictional name, `northwind`, appears in `docs/archive/plans/2026-07-08-loam-config-studio-concept.md:158`.

**Caution — `aurora` is NOT a brand in this checkout.** It is a real gradient name in
`src/brands/stripe/config.global.yaml:64`:

```yaml
  # Purple-to-pink sweep used in marketing sections
  aurora:
    type: linear
    angle: 120
    stops:
      - intent: brand
        lightness: 0.50
        at: 0
      - intent: stripe-pink
        lightness: 0.72
        at: 100
```

If the docs use `aurora` as a fictional brand name, that will collide with a real Stripe
gradient identifier in the engine. Worth deciding deliberately rather than by accident.

**Other real-brand surface:** `docs/agents/2026-08-10-ucs-1114-client-path-reachability-exploration.md:54`
enumerates the corpus (`descript 9 (underlord/marketing/editor × 3), magic-patterns 3, acme 1`),
and intent names like `stripe-cyan`, `stripe-mint`, `stripe-pink` are baked into the Stripe
brand config. A `beta` intent appears in `generated/global/css/modes.system.gen.css:198`
alongside the six standard intents.

---

## 14. Open questions / unverified

Stated explicitly rather than guessed:

1. **`scale:` and `defaults:`** are in `STRUCTURAL_KEYS` but I found no component config using
   them. Their semantics are unverified.
2. **`platforms:` and `breakpoints:` blocks** are structurally supported and validated, but I
   did not find a component config exercising `platforms:` in the configs I read. The
   platform layer is instead expressed as a `web/` subdirectory.
3. **`contract.bindings:`** — I confirmed the key and its values (`on-click`, `disabled`) in
   button and card, but did not trace what consumes it or whether the binding vocabulary is
   closed.
4. **`effect: backdrop-filter` vs `filter`** — the distinction (text uses `filter`) is visible
   in the configs, but I did not trace how `effect:` is consumed.
5. **Composition layer** (`Pattern`, `Page template`, `Composes`, `As`, `Region`) is defined
   in `CONTEXT.md:24-56` but was out of scope here; a `composes:` reference to a nonexistent
   component is stated to be *"a validation failure, not a typo."*
6. **`catalog-staging/` promotion process** — the directory exists with a parallel structure
   and some entries lack `config.yaml`; the promotion workflow into `src/components/` was not
   traced.
7. **`fgContrast`** appears in the TS metrics interface and is applied at `solver.ts:251-253`,
   but no role in the shipped `types/text/config.yaml` sets it. How an author would set it
   (what the YAML key is called) is unverified.
8. **`--density-fs-k` / `--density-fw-k`** density-coupling coefficients appear in generated
   CSS; their source was not traced.
9. **`shape:` property** — badge uses `shape: full` → `9999px`. The full value vocabulary was
   not enumerated.
10. **Swift/Compose/DTCG emission** of component configs was not examined; this report covers
    the CSS target only.

---

## Appendix — file index

Primary sources cited:

| Path | What it is |
| --- | --- |
| `src/types/{action,input,text,feedback,chart}/config.yaml` | The five type configs |
| `src/components/{badge,button,card,surface}/config.yaml` | Component configs quoted here |
| `src/components/badge/config.doc.yaml` | Doc-config example (296 lines) |
| `src/components/badge/brands/**/config.yaml` | Brand overrides |
| `references/ontology/classes/300-type-config.yaml` | Ontology class S-300, concepts S-310–S-380 |
| `CONTEXT.md` | Glossary — role/mode/state/part/slot definitions |
| `src/kernel/system/config-validator.ts` | Generate-time validation (563 lines) |
| `src/kernel/system/cascade.md` | Canonical cascade contract |
| `src/kernel/system/cascade.ts` | Cascade implementation (399 lines) |
| `src/kernel/system/resolver.ts` | 6-layer resolution (815 lines) |
| `src/kernel/system/text-roles.ts` | Sealed engine text-role defaults |
| `src/kernel/system/properties.yaml` | Property schema |
| `src/kernel/system/system.config.yaml` | System tuning values |
| `src/kernel/color/solver.ts` | Spatial/APCA solve |
| `scripts/generate-css.ts` | CSS generator |
| `scripts/new-component.ts` | Component scaffold |
| `src/platforms/web/css/transformer.ts` | Config → CSS rules |
| `generated/global/css/components/badge/badge.gen.css` | Worked generated example |
