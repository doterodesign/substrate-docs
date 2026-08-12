# Decisions (UCS-1129, 2026-08-12)

- Tracker is Linear (team "Unknown creatives studio"); site publishing goes
  through the Mintlify MCP (OAuth is interactive — user runs /mcp).
- One test seam: committed ground-truth manifest (generated inside an engine
  checkout; engine exports as values > structured artifacts > never free
  text; open maps = patterns + required members; provenance + supportive
  copy; engine SHA recorded) + doc checker
  (checkDocs({manifest,allowlist,pages}) → violations) running in docs CI
  with no engine checkout. Sentinel lists live in tests, not the manifest.
- Reference tables are generated partials (snippets/generated/*) rendered
  from manifest supportive copy by scripts/generate-reference-partials.mjs;
  hand-edits rejected by `npm run check:partials`.
- Examples policy (REVISED 2026-08-12, legal sweep): example VALUES and
  structure are copied from the engine's bundled demo configs, but the
  brands are RENAMED to a fictional cast — `acme` (standalone brand,
  `acme-cyan`/`acme-mint`/`acme-pink` custom intents) and `aurora` /
  `aurora-rewards` (Aurora Airways family, `tier-gold`/`aurora-navy`
  intents). Never claim a fictional example is "shipped"; phrase real
  catalog references as "bundled demo brand families" and import
  snippets/demo-brands-note.mdx (the not-clients disclaimer). The manifest
  generator excludes brand-scoped native symbols (prefixes derived from
  src/brands dir names at generation time; boundary-checked so Descript
  can't swallow Descriptor*; Substrate* always kept).
- Prose semantics (runtime-vs-build, dimmed position, deep merge, CVD
  caveats) are human-reviewed via .claude/reports/prose-review-checklist.md
  (moved out of docs/ — Mintlify serves unlinked .md files as hidden pages) —
  deliberately not machine-checked.
- Pages corrected in place under existing URLs; two structural additions:
  integration.mdx and the generated partials.
