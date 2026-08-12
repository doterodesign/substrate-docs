# Docs architecture design review — structure, layout, and example formats

Date: 2026-08-12. Scope: all 31 published MDX pages + docs.json nav at commit 68fd0de
(post-restructure: Integrate group live; CLI published as @unknown-creatives/substrate).
Method: the codebase-design lens — each page is a **module**; its title/sidebar
label/description/opening is its **interface**; page and group splits (and heading
anchors) are **seams**; formats (tables, tabs, accordions, steps, prose, code) are
**adapters**; **depth** = reader payoff per unit of navigation; **locality** = one
place to fix a fact.

---

## What is working (keep these patterns)

1. **Generated reference partials are deep modules done right.** The manifest is the
   single implementation; `snippets/generated/*.mdx` are its interface; the token
   pages are callers. Proven by the engine drift on 2026-08-12: one SHA bump updated
   every table with zero page edits. This is the pattern the rest of the review
   asks to extend.
2. **FAQ accordions are the correct adapter.** A question is a genuinely small
   interface; the answer is the implementation; the reader exercises only what they
   need. 11 accordions, 0 headings — right shape for that page.
3. **Every page closes with a CardGroup** — explicit seams to adjacent modules,
   applied consistently across all 31 pages.
4. **One token-reference page per CSS namespace** mirrors the engine's real seams
   (`--ucs-*`, type, spacing, motion). Thin pages (33–73 lines) are fine here:
   small interface, generated implementation.
5. **The Integrate group** (post-restructure) puts necessity in the interface:
   required-vs-situational checklist, "This step is required," "Required when
   surfaces nest."
6. **Platform tabs in core-concepts** (`Web / iOS / Android`) are genuine
   alternatives — a reader picks one. Correct use of tabs.

---

## Findings, by severity

### 1. Two landing pages at one seam: `index.mdx` vs `introduction.mdx`  [structural]

The live root (`/`) serves `index.mdx` ("Substrate: Runtime-Solved Design System
Engine for Teams") — a page **no nav entry references**. The sidebar's first item,
Introduction, is a second, longer version of the same pitch. Two modules filling one
role means the positioning copy is maintained twice; this repo's core historical
failure mode is exactly this kind of drift (both pages carry independent claims
about the engine).

Options: (a) merge — make `index.mdx` the nav's first page and delete
`introduction.mdx` (or vice versa with a redirect); (b) differentiate — root stays a
thin card-only launcher with **no independent technical claims**, introduction owns
the narrative. Either restores one module per role. (b) is lower-effort; (a) is
cleaner.

### 2. Canonical examples are copy-pasted, not shared  [locality]

The highest-leverage fix available. Current duplication counts:

| Canonical example | Copies | Pages |
|---|---|---|
| Three-call runtime sequence | 4 (+1 partial) | quickstart §4, integration, platforms/web, modes/overview (partial variant) |
| `data-ucs`/`data-mode` opt-in pair | 6 | quickstart, markup, platforms/web, modes/overview, core-concepts (prose), reference/color-tokens |
| Five-preset enumeration | 2 | core-concepts (tabs), modes/overview (tabs + values table) |

Each copy is a call site with its own implementation. When `syncBrandToCssVars`
gains a parameter or a preset value moves, someone must find every copy — the same
drift mechanics as the brand-name problem. The repo already owns the fix pattern
(generated partials, demo-brands-note snippet): extract `snippets/runtime-init.mdx`
and `snippets/markup-opt-in.mdx`, import them at each call site, keep the
surrounding prose page-specific. One page remains each example's *narrative* home
(integration and markup respectively); the others become callers.

Check before doing it: confirm the accuracy gate scans `snippets/*.mdx` (the
generated ones are covered via the freshness check; hand-authored snippets should be
inside the gate's page glob).

### 3. Accordions used where headings belong  [wrong adapter]

`brand-config/overview` documents the seven required + five optional schema sections
behind **12 accordions**; `brand-config/typography` uses 6 more. Accordions have no
anchor links, no TOC presence, and their content is hidden from scanning until
clicked — for the exact content this page exists to deliver. The *same content
type* in `reference/config-schema` uses `###` headings: scannable, deep-linkable,
in the TOC. Two adapters at the same seam, and the better one already exists in the
repo.

Recommendation: convert the schema-section accordions on overview and typography to
`###` subsections. Keep accordions only where progressive disclosure is the point
(FAQ; arguably introduction's five benefit accordions, which are marketing-shaped —
acceptable as is).

### 4. Schema documented twice: brand-config/overview vs reference/config-schema  [seam]

Overview (257 lines) carries file layout + key normalization + full
required-sections example + per-section docs + optional-sections docs + loader
behavior. Config-schema carries the same sections again in reference form. The two
have already drifted stylistically (accordions vs headings) and will drift factually.

Recommendation: split the roles cleanly. Overview keeps what is *narrative* — file
layout, normalization rule, the single worked example, loader behavior — and
compresses the per-section docs to a table of one-line summaries linking to
config-schema's anchors. Config-schema stays the one schema module. (If #3 is done
first, the link targets exist.)

### 5. Preset tabs force serial reading of comparative content  [wrong adapter, duplicated]

The five preset write-ups appear as tab blocks in both modes/overview and
core-concepts. Tabs are for alternatives; presets are an enumeration a reader
compares (dimmed vs dark is the classic confusion, and the two tabs can't be seen
together). modes/overview already has the values table — fold each preset's one
paragraph into a third table column or a definition list under it. core-concepts
should summarize in a sentence and link (it already links to /modes/overview);
its five-tab block can go entirely.

### 6. Two adapters for task sequences  [consistency, minor]

Quickstart uses numbered `##` headings ("## 1. Obtain Substrate" … "## 6."); 
multi-brand/adding-a-brand uses `<Steps>`. Both work; numbered headings win for
long flows (TOC + anchors), Steps read better for short ones. Not worth churn on
its own — pick a rule ("Steps under ~5, numbered headings above") and apply it the
next time either page is edited.

### 7. apca-solver straddles concept and reference  [placement, minor]

Half the page is narrative ("What is APCA", "Why Substrate uses APCA") that
Documentation-tab readers won't encounter in the Reference tab; the other half is
the generated policy table, which is exactly where it belongs. Cheapest fix:
keep placement, make sure core-concepts §APCA Contrast Solving links to it
prominently (it should be the "full detail" pointer). A fuller fix moves the two
narrative sections into core-concepts and leaves a pure policy reference.

### 8. Small gaps  [minor]

- `tooling/bloom` has zero code/console examples — one activation exchange and one
  `init` output line ("OK Linked agents to agents/bloom/") would ground it.
- `reference/motion-tokens` (33 lines) is the thinnest reference page; fine, but if
  it ever grows a second section, check whether it's really motion *tokens* or
  motion *behavior* (which belongs on brand-config/motion).

---

## Suggested order if implemented

1. #2 snippet extraction (highest leverage, no visible redesign risk)
2. #3 accordions → headings (unlocks #4's link targets)
3. #4 overview/config-schema role split
4. #1 landing-page merge
5. #5 preset tabs → table
6. #6–#8 opportunistically

Each step keeps URLs stable; only #1 might change what `/` serves — decide the
redirect story first.
