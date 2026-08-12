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
- Examples policy: config examples copied from shipped brands, minimally
  trimmed — never invented.
- Prose semantics (runtime-vs-build, dimmed position, deep merge, CVD
  caveats) are human-reviewed via docs/prose-review-checklist.md —
  deliberately not machine-checked.
- Pages corrected in place under existing URLs; two structural additions:
  integration.mdx and the generated partials.
