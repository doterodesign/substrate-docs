// Ground-truth manifest generator (UCS-1129).
//
// Runs INSIDE a Substrate engine checkout, using the checkout's own tsx:
//
//   "$SUBSTRATE_REPO/node_modules/.bin/tsx" scripts/generate-manifest.ts "$SUBSTRATE_REPO" [outPath]
//
// Extraction methods, in order of preference (never free-text scraping):
//   1. Import the engine's own exported values (presets, APCA policy,
//      intent suffixes, text roles, barrel exports).
//   2. Read structured artifacts (generated CSS glob, brand YAML configs,
//      CLI dispatch, native declaration scans, alias SSOT).
//
// Output is deterministic: no timestamps, all collections sorted, fixed key
// order. Records the engine commit SHA it was generated from.

import { execFileSync } from 'node:child_process';
import { globSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [engineArg, outArg] = process.argv.slice(2);
if (!engineArg) {
  console.error('usage: tsx generate-manifest.ts <engine-checkout> [out-path]');
  process.exit(1);
}
const ENGINE = resolve(engineArg);
const OUT = resolve(outArg ?? join(import.meta.dirname, '..', 'ground-truth', 'manifest.json'));

const requireFromEngine = createRequire(join(ENGINE, 'package.json'));
const yaml = requireFromEngine('js-yaml');

const engineImport = (rel: string) => import(pathToFileURL(join(ENGINE, rel)).href);

const sorted = (iter: Iterable<string>) => [...new Set(iter)].sort();

function readAll(patterns: string[]): Array<{ path: string; text: string }> {
  const paths = sorted(patterns.flatMap((p) => globSync(p, { cwd: ENGINE })));
  return paths.map((path) => ({ path, text: readFileSync(join(ENGINE, path), 'utf8') }));
}

function matches(files: Array<{ text: string }>, re: RegExp, group = 1): string[] {
  const out: string[] = [];
  for (const { text } of files) {
    for (const m of text.matchAll(re)) out.push(m[group]);
  }
  return sorted(out);
}

// ─── Tier 1: engine exports as values ────────────────────────────────────────

const barrel = await engineImport('src/index.ts');
const { SCHEME_PRESETS, defaultPreferences } = await engineImport('src/kernel/system/preferences.ts');
const { COLOR_SOLVER_APCA_POLICY, COLOR_SOLVER_TRANSFORM_ORDER } = await engineImport('src/kernel/color/solver.ts');
const { SYSTEM_INTENTS, INTENT_PRIMITIVE_SUFFIXES } = await engineImport('src/kernel/system/config.ts');
const { TEXT_ROLES } = await engineImport('generated/global/typescript/text-roles.gen.ts');

// ─── Tier 2: structured artifacts ────────────────────────────────────────────

const cssFiles = readAll(['generated/**/*.css', 'src/platforms/web/styles/**/*.css']);
const cssExact = sorted([
  ...matches(cssFiles, /(?:^|[\s{;(])(--[a-zA-Z][\w-]*)\s*:/gm),
  ...matches(cssFiles, /@property\s+(--[\w-]+)/g),
]);

const runtimeFiles = readAll(['src/platforms/web/runtime/*.ts', 'src/platforms/web/css/*.ts']);
const dataAttributes = sorted([
  ...matches(cssFiles, /\[(data-[a-z][a-z0-9-]*)/g),
  ...matches(runtimeFiles, /(?:setAttribute|toggleAttribute|removeAttribute)\(\s*'(data-[a-z][a-z0-9-]*)'/g),
  ...matches(runtimeFiles, /\[(data-[a-z][a-z0-9-]*)/g),
]);

const cliFiles = readAll(['packages/cli/bin/substrate-init.js']);
const cliVerbs = sorted([
  ...matches(cliFiles, /command === '([a-z][a-z-]*)'/g),
  ...matches(cliFiles, /Usage: substrate ([a-z][a-z-]*)/g),
]);
const cliFlags = matches(cliFiles, /(--[a-z][a-z-]*)/g);

const enginePkg = JSON.parse(readFileSync(join(ENGINE, 'package.json'), 'utf8'));
const npmScripts = sorted(Object.keys(enginePkg.scripts ?? {}));

const swiftFiles = readAll(['generated/**/*.swift', 'packages/kernel-swift/Sources/**/*.swift']);
const kotlinFiles = readAll(['generated/**/*.kt', 'packages/kernel-kotlin/src/main/**/*.kt']);
const nativeSymbols = sorted([
  ...matches(swiftFiles, /(?:enum|struct|class|protocol|typealias)\s+([A-Z][A-Za-z0-9_]*)/g),
  ...matches(swiftFiles, /^import\s+([A-Z][A-Za-z0-9_]*)/gm),
  ...matches(kotlinFiles, /(?:object|class|interface|typealias)\s+([A-Z][A-Za-z0-9_]*)/g),
]);

// Config keys from shipped brand YAML + the system config overlay source.
// Children of open maps are brand-chosen names, not schema keys: their KEY
// names are skipped but their values are descended into.
const OPEN_MAPS = ['intents', 'gradients', 'materials', 'ramps', 'rampOutputs', 'presets', 'system'];

function collectKeys(node: unknown, out: Set<string>, underOpenMap = false): void {
  if (Array.isArray(node)) {
    for (const item of node) collectKeys(item, out, false);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    if (!underOpenMap) out.add(key);
    collectKeys(value, out, !underOpenMap && OPEN_MAPS.includes(key));
  }
}

const configKeySet = new Set<string>();
for (const { text } of readAll(['src/brands/**/config*.yaml', 'src/kernel/system/system.config.yaml'])) {
  collectKeys(yaml.load(text), configKeySet);
}
// Merged (camelCase-normalized) keys, via the engine's own loader.
const { loadAllBrandsWithPaths } = await engineImport('src/kernel/system/brand-loader.ts');
for (const entry of loadAllBrandsWithPaths(join(ENGINE, 'src/brands'))) {
  collectKeys(entry.brand ?? entry, configKeySet);
}
// Declaration scan of the config-shape types module: catches schema-valid keys
// no shipped brand exercises (scheme-end, scheme-track, from-intent, blend).
const typesFiles = readAll(['src/kernel/system/types.ts']);
for (const key of matches(typesFiles, /^\s+(?:readonly\s+)?['"]?([A-Za-z][A-Za-z0-9_-]*)['"]?\?*:\s/gm)) {
  configKeySet.add(key);
}
// Docs may spell any camelCase key in its authored kebab-case form.
for (const key of [...configKeySet]) {
  const kebab = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  configKeySet.add(kebab);
}

const aliasFiles = readAll(['src/aliases.ts']);
const importAliases = matches(aliasFiles, /(@substrate\/[a-z]+(?:\/\*)?)/g);

const engineCommit = execFileSync('git', ['-C', ENGINE, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

// ─── Assemble (fixed key order, sorted collections) ──────────────────────────

const intentName = '[a-z][a-z0-9-]*';
const manifest = {
  description:
    'Ground-truth manifest for substrate-docs: every identifier the docs may reference, extracted from a Substrate engine checkout. Regenerate with scripts/generate-manifest.ts; never hand-edit.',
  engineCommit,
  categories: {
    cssVariables: {
      provenance: 'generated-css-glob (generated/**/*.css, src/platforms/web/styles/**/*.css): custom-property definitions and @property registrations',
      description:
        'CSS custom properties the engine defines. Exact names cover shipped brands; patterns cover the open intent map (a brand may declare any intent, so its --ucs-{intent}-* family is pattern-shaped).',
      exact: cssExact,
      patterns: [
        {
          pattern: `^--ucs-${intentName}-(${INTENT_PRIMITIVE_SUFFIXES.join('|')})$`,
          provenance: 'INTENT_PRIMITIVE_SUFFIXES (src/kernel/system/config.ts), engine value import',
          description: 'Solver-written intent primitives for any declared intent.',
        },
        {
          pattern: `^--ucs-${intentName}-(surface|text|border)$`,
          provenance: 'per-mode baked token files (SubstrateSystemTokenSet fields surface/text/border)',
          description: 'Baked per-mode intent triptych for any declared intent.',
        },
        {
          pattern: `^--ucs-${intentName}-fg-l-(${sorted(Object.keys(TEXT_ROLES)).join('|')})$`,
          provenance: 'TEXT_ROLES (generated/global/typescript/text-roles.gen.ts), engine value import',
          description: 'Per-text-role foreground lightness for any declared intent.',
        },
      ],
    },
    dataAttributes: {
      provenance: 'generated/shipped CSS selectors + runtime attribute writes (src/platforms/web/runtime, src/platforms/web/css)',
      description: 'HTML data attributes the engine reads (cascade opt-in, role selection) or writes (brand, CVD state).',
      exact: dataAttributes,
    },
    cliCommands: {
      provenance: 'CLI dispatch and usage banner (packages/cli/bin/substrate-init.js); npm scripts from engine package.json',
      description: 'The real CLI surface. There is no `substrate build`; generation runs through npm scripts in the engine checkout.',
      binary: 'substrate',
      verbs: cliVerbs,
      flags: cliFlags,
      npmScripts,
    },
    cliFlags: {
      provenance: 'flag spellings in packages/cli/bin/substrate-init.js',
      description: 'CLI flags, so `--flag` spellings in shell/inline code are not mistaken for CSS variables.',
      exact: cliFlags,
    },
    engineExports: {
      provenance: 'Object.keys of the @substrate/engine barrel (src/index.ts), engine value import',
      description: 'Runtime symbols importable from @substrate/engine.',
      exact: sorted(Object.keys(barrel)),
    },
    nativeSymbols: {
      provenance: 'declaration scan of generated Swift/Kotlin artifacts and the kernel-swift / kernel-kotlin packages',
      description: 'Type/object names a native example may reference, including the SubstrateKernel package name.',
      exact: nativeSymbols,
    },
    configKeys: {
      provenance: 'shipped brand YAML configs (src/brands/**/config*.yaml), system.config.yaml, and merged BrandConfig objects from the engine brand loader',
      description: 'Valid brand-config keys, both kebab-case as authored and camelCase as normalized. Children of open maps (intents, gradients, materials, ramps, presets levels, system) are brand-chosen names and are not enumerated.',
      exact: sorted(configKeySet),
      openMaps: sorted(OPEN_MAPS),
    },
    importAliases: {
      provenance: 'alias SSOT (src/aliases.ts)',
      description: 'The @substrate/* import aliases. Public contract: @substrate/engine, @substrate/components/*, @substrate/generated/*.',
      exact: importAliases,
    },
    presets: {
      provenance: 'SCHEME_PRESETS (src/kernel/system/preferences.ts), engine value import',
      description: 'Named modes are presets over the continuous scheme/contrastFactor axes. dimmed sits mid-track at scheme 0.65 — lighter than dark.',
      values: SCHEME_PRESETS,
    },
    preferences: {
      provenance: 'defaultPreferences() (src/kernel/system/preferences.ts), engine value import',
      description: 'The continuous preference vector and its engine defaults. Note motionFactor defaults to 0.75.',
      values: defaultPreferences(),
    },
    apcaPolicy: {
      provenance: 'COLOR_SOLVER_APCA_POLICY / COLOR_SOLVER_TRANSFORM_ORDER (src/kernel/color/solver.ts), engine value import',
      description: 'Fixed APCA targets, scaled at runtime by contrastFactor; transforms run warmth → cvd → apca.',
      values: COLOR_SOLVER_APCA_POLICY,
      transformOrder: COLOR_SOLVER_TRANSFORM_ORDER,
    },
    systemIntents: {
      provenance: 'SYSTEM_INTENTS (src/kernel/system/config.ts), engine value import',
      description: 'Conventional intent names. NOT a closed set: the brand\'s own intents map is the source of truth; only brand and neutral are required.',
      exact: [...SYSTEM_INTENTS],
      required: ['brand', 'neutral'],
    },
  },
};

writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest written: ${OUT} (engine ${engineCommit.slice(0, 7)})`);
