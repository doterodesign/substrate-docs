import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkDocs } from '../lib/doc-checker.mjs';

// Minimal fixture manifest — hand-written, independent of the generator.
const manifest = {
  engineCommit: 'fixture',
  categories: {
    cssVariables: {
      exact: ['--ucs-focus-ring', '--space-unit', '--density'],
      patterns: [],
    },
  },
};

const page = (content) => [{ path: 'fixture.mdx', content }];

test('flags a CSS variable that is not in the manifest', () => {
  const violations = checkDocs({
    manifest,
    pages: page('Some prose.\n\n```css\na { color: var(--color-primary); }\n```\n'),
  });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].identifier, '--color-primary');
  assert.equal(violations[0].kind, 'css-variable');
  assert.equal(violations[0].page, 'fixture.mdx');
});

test('accepts a CSS variable listed exactly in the manifest', () => {
  const violations = checkDocs({
    manifest,
    pages: page('```css\na { outline: var(--ucs-focus-ring); gap: var(--space-unit); }\n```\n'),
  });
  assert.deepEqual(violations, []);
});

test('accepts a CSS variable matching an open-map pattern', () => {
  const withPattern = {
    ...manifest,
    categories: {
      cssVariables: {
        exact: [],
        patterns: [{ pattern: '^--ucs-[a-z0-9-]+-(hue|chroma|fg-l|border-l|surface-l)$' }],
      },
    },
  };
  const violations = checkDocs({
    manifest: withPattern,
    pages: page('```css\na { --x: var(--ucs-medallion-gold-fg-l); }\n```'),
  });
  // --x is flagged (not in manifest); the pattern-matched var is not
  assert.deepEqual(violations.map((v) => v.identifier), ['--x']);
});

test('flags an unknown data attribute and accepts known ones', () => {
  const withAttrs = {
    ...manifest,
    categories: {
      ...manifest.categories,
      dataAttributes: { exact: ['data-ucs', 'data-mode', 'data-brand'] },
    },
  };
  const violations = checkDocs({
    manifest: withAttrs,
    pages: page('```html\n<div data-theme="dark" data-ucs data-mode="brand"></div>\n```'),
  });
  assert.deepEqual(
    violations.map((v) => [v.kind, v.identifier]),
    [['data-attribute', 'data-theme']],
  );
});

test('flags an unknown substrate CLI verb and accepts known verbs and npm scripts', () => {
  const withCli = {
    ...manifest,
    categories: {
      ...manifest.categories,
      cliCommands: {
        binary: 'substrate',
        verbs: ['init', 'add', 'upgrade', 'adopt', 'setup', 'artifact'],
        npmScripts: ['generate', 'test:unit'],
      },
    },
  };
  const violations = checkDocs({
    manifest: withCli,
    pages: page('```bash\nsubstrate build --all\nsubstrate init --dry-run\nnpm run generate\nnpm run bake\n```'),
  });
  assert.deepEqual(
    violations.map((v) => [v.kind, v.identifier]),
    [
      ['cli-invocation', 'substrate build'],
      ['npm-script', 'bake'],
    ],
  );
});

test('flags an unknown engine export in an import from @substrate/engine', () => {
  const withExports = {
    ...manifest,
    categories: {
      ...manifest.categories,
      engineExports: { exact: ['updateAllVars', 'syncBrandToCssVars', 'defaultPreferences'] },
    },
  };
  const violations = checkDocs({
    manifest: withExports,
    pages: page("```ts\nimport { updateAllVars, applyTheme } from '@substrate/engine';\n```"),
  });
  assert.deepEqual(
    violations.map((v) => [v.kind, v.identifier]),
    [['engine-export', 'applyTheme']],
  );
});

test('flags an unknown native symbol and accepts manifest-listed ones', () => {
  const withNative = {
    ...manifest,
    categories: {
      ...manifest.categories,
      nativeSymbols: { exact: ['SubstrateSystemTokens', 'SubstrateSystemTokenSet', 'SubstrateKernel'] },
    },
  };
  const violations = checkDocs({
    manifest: withNative,
    pages: page('```swift\nlet c = SubstrateTokens.Color.primary\nlet ok = SubstrateSystemTokens.surface\n```'),
  });
  assert.deepEqual(
    violations.map((v) => [v.kind, v.identifier]),
    [['native-symbol', 'SubstrateTokens']],
  );
});

test('an allowlisted identifier with a reason is not a violation', () => {
  const violations = checkDocs({
    manifest,
    allowlist: [{ identifier: '--color-primary', reason: 'illustrative traditional-token example' }],
    pages: page('```css\na { color: var(--color-primary); }\n```'),
  });
  assert.deepEqual(violations, []);
});

test('an allowlist entry without a reason is itself a violation', () => {
  const violations = checkDocs({
    manifest,
    allowlist: [{ identifier: '--color-primary' }],
    pages: page('```css\na { color: var(--color-primary); }\n```'),
  });
  assert.deepEqual(
    violations.map((v) => v.kind),
    ['allowlist-missing-reason'],
  );
});

test('inline code spans are scanned too', () => {
  const violations = checkDocs({
    manifest,
    pages: page('The `--color-primary` variable and the `--ucs-focus-ring` variable.'),
  });
  assert.deepEqual(violations.map((v) => v.identifier), ['--color-primary']);
});

test('a family wildcard like `--ucs-*` is not treated as a variable', () => {
  const violations = checkDocs({
    manifest,
    pages: page('The runtime writes `--ucs-*` custom properties to `:root`.'),
  });
  assert.deepEqual(violations, []);
});

test('a template mention like `--ucs-{intent}-hue` is not treated as a variable', () => {
  const violations = checkDocs({
    manifest,
    pages: page('Output is `--ucs-{intent}-{hue,chroma}` primitives.'),
  });
  assert.deepEqual(violations, []);
});
