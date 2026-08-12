// Tests for the ground-truth manifest generator. These run only when a
// Substrate checkout is available (SUBSTRATE_REPO); docs CI runs the checker
// against the committed manifest and never needs the engine.
//
// Sentinel lists live HERE, not in the manifest (UCS-1129 Testing Decisions):
// a generated manifest must include identifiers the audits verified as real
// and exclude the audits' known fabrications.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ENGINE = process.env.SUBSTRATE_REPO;
const skip = ENGINE ? false : 'SUBSTRATE_REPO not set — generator tests need an engine checkout';

const SCRIPT = new URL('../scripts/generate-manifest.ts', import.meta.url).pathname;

function generate(outPath) {
  // cwd must be the engine checkout: the engine barrel resolves its own
  // @substrate/* aliases through the checkout's tsconfig.
  execFileSync(
    join(ENGINE, 'node_modules/.bin/tsx'),
    [SCRIPT, ENGINE, outPath],
    { stdio: 'pipe', cwd: ENGINE },
  );
  return readFileSync(outPath, 'utf8');
}

test('two consecutive runs are byte-identical', { skip }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'manifest-'));
  const a = generate(join(dir, 'a.json'));
  const b = generate(join(dir, 'b.json'));
  assert.equal(a, b);
});

test('manifest includes sentinel identifiers and excludes known fabrications', { skip }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'manifest-'));
  const manifest = JSON.parse(generate(join(dir, 'm.json')));
  const c = manifest.categories;

  // Provenance of the whole artifact
  assert.match(manifest.engineCommit, /^[0-9a-f]{40}$/);

  // Real identifiers, per the audit reports
  for (const v of ['--ucs-brand-hue', '--space-unit', '--density', '--effective-ratio', '--ctx-surface-l']) {
    assert.ok(c.cssVariables.exact.includes(v), `missing css var ${v}`);
  }
  for (const a of ['data-ucs', 'data-mode', 'data-brand']) {
    assert.ok(c.dataAttributes.exact.includes(a), `missing data attribute ${a}`);
  }
  assert.deepEqual(
    [...c.cliCommands.verbs].sort(),
    ['add', 'adopt', 'artifact', 'init', 'setup', 'upgrade'],
  );
  for (const f of ['--refresh', '--dry-run', '--platform', '--report-aliases', '--engine-artifact']) {
    assert.ok(c.cliCommands.flags.includes(f), `missing cli flag ${f}`);
    assert.ok(c.cliFlags.exact.includes(f), `missing cli flag (cliFlags) ${f}`);
  }
  for (const k of ['light', 'dark', 'dimmed', 'highContrast', 'darkHighContrast']) {
    assert.ok(k in c.presets.values, `missing preset ${k}`);
  }
  for (const e of ['updateAllVars', 'syncBrandToCssVars', 'syncPrefsToCssVars', 'defaultPreferences', 'BRAND_REGISTRY']) {
    assert.ok(c.engineExports.exact.includes(e), `missing engine export ${e}`);
  }
  for (const s of ['SubstrateSystemTokens', 'SubstrateSystemTokenSet', 'SubstrateKernel']) {
    assert.ok(c.nativeSymbols.exact.includes(s), `missing native symbol ${s}`);
  }
  assert.equal(c.apcaPolicy.values.foregroundLc, 75);
  assert.equal(c.apcaPolicy.values.borderLc, 50);
  assert.equal(c.apcaPolicy.values.focusRingLc, 60);
  assert.ok(c.configKeys.exact.includes('intents'), 'missing config key intents');
  // Component/type config keys (UCS component-config docs): schema keys,
  // shipped role/state/mode/part names, and style properties from the
  // component corpus and the five type archetypes.
  for (const k of [
    'component', 'extends', 'semantic-map', 'platforms', 'slots',
    'roles', 'states', 'modes', 'parts',
    'primary', 'secondary', 'auxiliary', 'hover', 'pressed', 'selected',
    'font-scale', 'gap-column', 'padding-x', 'border-width',
    'heading', 'body', 'caption', 'label', 'fluid',
  ]) {
    assert.ok(c.configKeys.exact.includes(k), `missing component/type config key ${k}`);
  }
  // Skill operation flags must be known so `--build` in prose is not
  // mistaken for a CSS variable.
  for (const f of ['--build', '--classify', '--resolve', '--audit', '--explain']) {
    assert.ok(c.cliFlags.exact.includes(f), `missing skill flag ${f}`);
  }
  assert.ok(c.importAliases.exact.includes('@substrate/engine'));

  // Known fabrications must be absent
  assert.ok(!c.dataAttributes.exact.includes('data-theme'));
  assert.ok(!c.cliCommands.verbs.includes('build'));
  assert.ok(!c.cliCommands.verbs.includes('audit'));
  for (const fake of ['--color-primary', '--type-size-md', '--space-4', '--motion-fast', '--ease-standard']) {
    assert.ok(!c.cssVariables.exact.includes(fake), `fabrication present: ${fake}`);
  }
  assert.ok(!c.nativeSymbols.exact.includes('SubstrateTokens'));

  // Brand-scoped artifact symbols must be excluded wholesale: the docs may
  // never reference the bundled demo brands by name (legal), so the manifest
  // carries only brand-agnostic symbols. The brand list is derived from the
  // engine checkout itself — an independent source, no names hardcoded here.
  const brandDirs = readdirSync(join(ENGINE, 'src/brands'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const brandPrefixes = brandDirs
    .map((name) => name.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join(''));
  for (const sym of c.nativeSymbols.exact) {
    if (sym.startsWith('Substrate')) continue;
    for (const p of brandPrefixes) {
      const scoped = sym.startsWith(p) && (sym.length === p.length || /[A-Z0-9]/.test(sym[p.length]));
      assert.ok(!scoped, `brand-scoped symbol leaked into manifest: ${sym}`);
    }
  }

  // Brand-named intent variables (--ucs-{brandSlug}-*-…) must be excluded
  // from cssVariables.exact for the same legal reason: the intent-family
  // patterns already validate any declared intent, so the manifest never
  // needs to name a demo brand's intents. Slugs include sub-brand dirs.
  const subBrandDirs = brandDirs.flatMap((b) =>
    readdirSync(join(ENGINE, 'src/brands', b), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name));
  for (const slug of [...brandDirs, ...subBrandDirs]) {
    for (const v of c.cssVariables.exact) {
      assert.ok(
        !v.startsWith(`--ucs-${slug}-`),
        `brand-named css variable leaked into manifest: ${v}`,
      );
    }
  }
});
