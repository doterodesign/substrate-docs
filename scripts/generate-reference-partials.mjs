#!/usr/bin/env node
// Renders reference-table MDX partials from the ground-truth manifest
// (UCS-1129). Pure function of the committed manifest — no engine checkout
// needed, so this runs in docs CI.
//
//   node scripts/generate-reference-partials.mjs           # write snippets
//   node scripts/generate-reference-partials.mjs --check   # verify freshness
//
// The partials are derived artifacts: hand-edits are rejected by --check.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'ground-truth', 'manifest.json'), 'utf8'));
const c = manifest.categories;

const HEADER = `{/* DO NOT EDIT — generated from ground-truth/manifest.json (engine ${manifest.engineCommit.slice(0, 7)}) by scripts/generate-reference-partials.mjs */}\n\n`;

const code = (s) => `\`${s}\``;

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n') + '\n';
}

const partials = {
  'scalar-tokens.mdx': table(
    ['Token', 'Description'],
    c.scalarTokens.entries.map((e) => [code(e.name), e.description]),
  ),
  'intent-primitives.mdx': table(
    ['Variable', 'Description'],
    c.intentPrimitives.entries.map((e) => [code(e.variable), e.description]),
  ),
  'presets.mdx': table(
    ['Preset', 'scheme', 'contrastFactor'],
    Object.entries(c.presets.values).map(([key, p]) => [code(key), p.scheme, p.contrastFactor]),
  ),
  'apca-policy.mdx': table(
    ['Channel', 'Target'],
    [
      ['Foreground', `Lc ${c.apcaPolicy.values.foregroundLc}`],
      ['Border', `Lc ${c.apcaPolicy.values.borderLc}`],
      ['Focus ring', `Lc ${c.apcaPolicy.values.focusRingLc}`],
      ['Ceiling', `Lc ${c.apcaPolicy.values.maxLc}`],
    ],
  ),
  'preference-defaults.mdx': table(
    ['Axis', 'Default'],
    Object.entries(c.preferences.values).map(([axis, value]) => [
      code(axis),
      code(typeof value === 'object' ? JSON.stringify(value) : String(value)),
    ]),
  ),
};

const outDir = join(root, 'snippets', 'generated');
mkdirSync(outDir, { recursive: true });

const checkMode = process.argv.includes('--check');
let stale = 0;
for (const [name, body] of Object.entries(partials)) {
  const content = HEADER + body;
  const path = join(outDir, name);
  if (checkMode) {
    const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
    if (current !== content) {
      console.error(`stale or hand-edited partial: snippets/generated/${name}`);
      stale += 1;
    }
  } else {
    writeFileSync(path, content);
    console.log(`wrote snippets/generated/${name}`);
  }
}
if (checkMode) {
  if (stale) {
    console.error(`\npartials check: FAIL (${stale} stale) — run: node scripts/generate-reference-partials.mjs`);
    process.exit(1);
  }
  console.log('partials check: PASS');
}
