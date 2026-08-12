#!/usr/bin/env node
// CLI wrapper for the doc accuracy gate (UCS-1129).
//
//   npm run check:docs            # check all MDX pages
//   npm run check:docs -- <page>  # check specific page(s)
//
// Runs in docs CI with no Substrate checkout: it needs only the committed
// ground-truth manifest and allowlist.

import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkDocs } from '../lib/doc-checker.mjs';

const root = join(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'ground-truth', 'manifest.json'), 'utf8'));
const allowlist = JSON.parse(readFileSync(join(root, 'ground-truth', 'allowlist.json'), 'utf8'));

const args = process.argv.slice(2);
const paths = args.length
  ? args
  : globSync('**/*.mdx', { cwd: root }).filter((p) => !p.startsWith('docs/'));

const pages = paths
  .sort()
  .map((path) => ({ path, content: readFileSync(join(root, path), 'utf8') }));

const violations = checkDocs({ manifest, allowlist, pages });

if (violations.length === 0) {
  console.log(`accuracy gate: PASS (${pages.length} pages, engine ${manifest.engineCommit.slice(0, 7)})`);
  process.exit(0);
}

const byPage = new Map();
for (const v of violations) {
  if (!byPage.has(v.page)) byPage.set(v.page, []);
  byPage.get(v.page).push(v);
}
for (const [page, list] of byPage) {
  console.error(`\n${page}: ${list.length} violation(s)`);
  for (const v of list) console.error(`  [${v.kind}] ${v.identifier}`);
}
console.error(`\naccuracy gate: FAIL (${violations.length} violations across ${byPage.size} pages)`);
process.exit(1);
