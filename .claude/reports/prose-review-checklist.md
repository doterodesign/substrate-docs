# Prose-semantics review checklist (UCS-1129)

The accuracy gate machine-checks *identifiers*. These claims are semantic and
are deliberately human-reviewed instead (spec: Testing Decisions). Apply to
every rewritten page before publish; record the result in the PR/issue.

For each page, verify:

1. **Runtime vs. build time.** The page never says or implies final token
   values are computed at build time. The pipeline emits solver inputs,
   descriptors, and baked per-mode snapshots; kernels solve APCA at runtime
   per surface. Baked artifacts are described as floors/snapshots, not the
   primary path.
2. **Continuous model.** Modes are presets over the continuous preference
   vector (camelCase keys). No page implies five discrete parallel token
   sets, a discrete ladder (space/type/motion), or a theme attribute.
3. **`dimmed` position.** Anywhere dimmed appears: mid-track (engine preset
   scheme 0.65), *lighter than dark*, slightly relaxed contrast (0.95),
   sampled continuously; no baked native artifact. Never "darker than dark"
   or OLED-battery framing.
4. **Deep-merge inheritance.** Partial sub-brand objects merge recursively;
   null deletes; arrays replace; deltas-only is enforced. Never "full
   override"/"no merging of sub-fields".
5. **APCA policy numbers.** fg Lc 75 / border Lc 50 / focus ring Lc 60,
   scaled by contrastFactor (0.75→1.5). High contrast = ×1.3 multiplier,
   never a fixed "Lc 90" target. No Lc 70/60 body-text defaults.
6. **CVD honesty.** protan/deutan/tritan/achromat + continuous severity;
   runtime preference; helps dichromats most, weak for anomalous
   trichromats; an aid not a guarantee; never a substitute for non-color
   cues (WCAG 2.2 §1.4.1); separation threshold is a heuristic.
7. **Accessibility claims.** No overclaims: bronze/size-weight table is
   Substrate's own construction; WCAG 3.0 not final; shortfalls surface as
   unmetLc + the build-failing gate, not silent passes.
8. **CLI honesty.** Never `npx substrate` (unrelated package warning where
   the CLI is introduced); no invented verbs/flags; generation is
   `npm run generate` in the engine checkout.
9. **Open maps.** intents / preset levels / gradients described as open,
   brand-chosen maps with required members — never closed enums.
10. **Not a component library.** Pages that position the product state it
    plainly; component directories are engine internals.

## Review log (2026-08-12, engine origin/main 9a76ab8)

| Page | Reviewer | Result |
|---|---|---|
| core-concepts.mdx | session agent | PASS (items 1–10) |
| quickstart.mdx | session agent | PASS (1, 2, 8) |
| reference/color-tokens.mdx | session agent | PASS (1, 2, 9) |
| reference/type-tokens.mdx | session agent | PASS (2) |
| reference/spacing-tokens.mdx | session agent | PASS (2, 9) |
| reference/motion-tokens.mdx | session agent | PASS (2) |
| reference/config-schema.mdx | session agent | PASS (2, 4, 9) |
| reference/apca-solver.mdx | session agent | PASS (1, 5, 7) |
| reference/faq.mdx | session agent | PASS (1, 2, 5, 6, 8, 9) |
| index.mdx | session agent | PASS (1, 2, 10) |
| introduction.mdx | session agent | PASS (1, 2, 3, 6, 10) |
| brand-config/* (5 pages) | session agent (sub-agent authored) | PASS (2, 4, 8, 9) |
| multi-brand/* (3 pages) | session agent (sub-agent authored) | PASS (4, 9) — deep merge, null-delete, deltas-only verified |
| modes/overview.mdx, modes/light-dark.mdx | session agent (sub-agent authored) | PASS (2, 3, 5) — dimmed mid-track/lighter-than-dark, camelCase presets verified |
| modes/high-contrast.mdx | session agent (sub-agent authored) | PASS (5) — 1.3× multiplier framing verified |
| modes/color-vision.mdx | session agent (sub-agent authored) | PASS (6, 7) — kernel caveats present; protan/deutan/tritan/achromat |
| platforms/* (3 pages) | session agent (sub-agent authored) | PASS (1, 2, 8) — runtime required on web; npx warning; per-mode native files |
| integration.mdx | session agent (sub-agent authored) | PASS (1, 8) — alias contract + runtime sequence match engine docs |
