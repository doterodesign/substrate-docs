// Doc accuracy checker — the single seam of the ground-truth gate.
//
// checkDocs({ manifest, allowlist, pages }) -> violations[]
//
// Scans MDX page content for concrete identifiers (fenced code blocks and
// inline code spans), classifies them, and asserts membership against the
// committed ground-truth manifest. Placeholders used for illustration must
// appear in the annotated allowlist with a reason. Extraction and
// classification rules are implementation details; only this interface is
// stable (UCS-1129).

const FENCED_BLOCK = /```([^\n]*)\n([\s\S]*?)```/g;
const INLINE_CODE = /`([^`\n]+)`/g;

// In shell code, `--foo` is a CLI flag, not a CSS custom property.
const SHELL_LANGS = new Set(['bash', 'sh', 'shell', 'zsh', 'console', '']);

function extractCodeTexts(content) {
  const texts = [];
  const withoutFences = content.replace(FENCED_BLOCK, (match, info, body) => {
    const lang = info.trim().split(/\s/)[0].toLowerCase();
    texts.push({ lang, text: body });
    return '\n';
  });
  for (const match of withoutFences.matchAll(INLINE_CODE)) {
    texts.push({ lang: 'inline', text: match[1] });
  }
  return texts;
}

function membership(category = {}) {
  const exactSet = new Set(category.exact ?? []);
  const regexes = (category.patterns ?? []).map((p) => new RegExp(p.pattern ?? p));
  return (identifier) =>
    exactSet.has(identifier) || regexes.some((re) => re.test(identifier));
}

const CSS_VAR = /--[a-zA-Z][a-zA-Z0-9-]*/g;

function checkCssVariables(text, manifest, report) {
  if (!manifest.categories.cssVariables) return;
  const known = membership(manifest.categories.cssVariables);
  const knownFlag = membership(manifest.categories.cliFlags);
  for (const match of text.matchAll(CSS_VAR)) {
    const identifier = match[0];
    // `--ucs-*` (wildcard) and `--ucs-{intent}-…` (template) are family
    // mentions in the engine's own notation, not variable references.
    const next = text[match.index + identifier.length];
    if (next === '*' || next === '{') continue;
    if (known(identifier) || knownFlag(identifier)) continue;
    report({ kind: 'css-variable', identifier });
  }
}

const DATA_ATTR = /data-[a-z][a-z0-9-]*/g;

function checkDataAttributes(text, manifest, report) {
  if (!manifest.categories.dataAttributes) return;
  const known = membership(manifest.categories.dataAttributes);
  for (const match of text.matchAll(DATA_ATTR)) {
    if (known(match[0])) continue;
    report({ kind: 'data-attribute', identifier: match[0] });
  }
}

function checkCliInvocations(text, manifest, report) {
  const category = manifest.categories.cliCommands;
  if (!category) return;
  const binary = category.binary ?? 'substrate';
  const verbs = new Set(category.verbs ?? []);
  const npmScripts = new Set(category.npmScripts ?? []);
  const verbRe = new RegExp(`(?:^|[\\s;("\`])${binary} ([a-z][a-z-]*)`, 'g');
  for (const match of text.matchAll(verbRe)) {
    if (verbs.has(match[1])) continue;
    report({ kind: 'cli-invocation', identifier: `${binary} ${match[1]}` });
  }
  for (const match of text.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)) {
    if (npmScripts.has(match[1])) continue;
    report({ kind: 'npm-script', identifier: match[1] });
  }
}

const ENGINE_IMPORT = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]@substrate\/engine['"]/g;

function checkEngineExports(text, manifest, report) {
  if (!manifest.categories.engineExports) return;
  const known = membership(manifest.categories.engineExports);
  for (const match of text.matchAll(ENGINE_IMPORT)) {
    const names = match[1]
      .split(',')
      .map((n) => n.trim().split(/\s+as\s+/)[0])
      .filter(Boolean);
    for (const name of names) {
      if (known(name)) continue;
      report({ kind: 'engine-export', identifier: name });
    }
  }
}

// Substrate-branded native identifiers (Swift/Kotlin). Anything spelled
// `Substrate<X>` must be a real generated/kernel symbol.
const NATIVE_SYMBOL = /\bSubstrate[A-Z][A-Za-z0-9]*/g;

function checkNativeSymbols(text, manifest, report) {
  if (!manifest.categories.nativeSymbols) return;
  const known = membership(manifest.categories.nativeSymbols);
  for (const match of text.matchAll(NATIVE_SYMBOL)) {
    if (known(match[0])) continue;
    report({ kind: 'native-symbol', identifier: match[0] });
  }
}

// YAML config-key checking with an indentation stack. Keys that are direct
// children of an open map (intents, gradients, presets, …) are brand-chosen
// names, not schema keys, and are exempt.
const YAML_KEY = /^(\s*)(?:- )?["']?([A-Za-z][A-Za-z0-9_-]*)["']?:(?:\s|$)/;

function checkConfigKeys(text, lang, manifest, report) {
  const category = manifest.categories.configKeys;
  if (!category || (lang !== 'yaml' && lang !== 'yml')) return;
  const known = membership(category);
  const openMaps = new Set(category.openMaps ?? []);
  const stack = []; // { indent, key }
  for (const line of text.split('\n')) {
    const match = line.match(YAML_KEY);
    if (!match) continue;
    const indent = match[1].length;
    const key = match[2];
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1];
    stack.push({ indent, key });
    if (parent && openMaps.has(parent.key)) continue;
    if (known(key)) continue;
    report({ kind: 'config-key', identifier: key });
  }
}

const CHECKS = [
  checkCssVariables,
  checkDataAttributes,
  checkCliInvocations,
  checkEngineExports,
  checkNativeSymbols,
];

export function checkDocs({ manifest, allowlist = [], pages }) {
  const violations = [];
  const allowed = new Set();
  for (const entry of allowlist) {
    if (!entry.reason) {
      violations.push({
        kind: 'allowlist-missing-reason',
        identifier: entry.identifier,
        page: 'allowlist',
      });
    }
    allowed.add(entry.identifier);
  }
  for (const { path, content } of pages) {
    const seen = new Set();
    const report = (violation) => {
      if (allowed.has(violation.identifier)) return;
      const key = `${violation.kind} ${violation.identifier}`;
      if (seen.has(key)) return;
      seen.add(key);
      violations.push({ ...violation, page: path });
    };
    for (const { lang, text } of extractCodeTexts(content)) {
      for (const check of CHECKS) {
        if (check === checkCssVariables && SHELL_LANGS.has(lang)) continue;
        check(text, manifest, report);
      }
      checkConfigKeys(text, lang, manifest, report);
    }
  }
  return violations;
}
