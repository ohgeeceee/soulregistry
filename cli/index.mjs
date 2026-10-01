#!/usr/bin/env node
/**
 * soul — the SOUL.md registry CLI.
 *
 * Zero dependencies. Node 18+.
 *
 *   soul list [--category <c>] [--tag <t>] [--json]
 *   soul search <query>
 *   soul info <slug>
 *   soul install <slug> [--to <dir>] [--host <host>]
 *   soul validate
 *   soul help
 *
 * Reads registry.json from the repo when run from a clone, otherwise fetches it
 * from raw.githubusercontent.com.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const REPO = 'ohgeeceee/soulregistry';
const BRANCH = 'main';
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
const VERSION = '1.0.0';

const HERE = dirname(fileURLToPath(import.meta.url));
const LOCAL_REGISTRY = resolve(HERE, '..', 'registry.json');

const HOST_HINTS = {
  'claude-code': (slug) => `append to CLAUDE.md (project root or ~/.claude/CLAUDE.md)`,
  cursor: (slug) => `write to .cursor/rules/${slug}.mdc`,
  openclaw: (slug) => `paste into the agent's SOUL.md slot`,
  hermes: (slug) => `write to ~/.hermes/SOUL.md`,
  generic: (slug) => `paste verbatim into your system prompt`,
};

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
};

function fail(msg, code = 1) {
  console.error(`${C.red('error')} ${msg}`);
  process.exit(code);
}

async function loadRegistry() {
  if (existsSync(LOCAL_REGISTRY)) {
    return { data: JSON.parse(readFileSync(LOCAL_REGISTRY, 'utf8')), source: 'local' };
  }
  if (typeof fetch !== 'function') fail('Node 18+ is required (no global fetch).');
  const url = `${RAW}/registry.json`;
  try {
    const res = await fetch(url);
    if (!res.ok) fail(`could not fetch registry (${res.status}) from ${url}`);
    return { data: await res.json(), source: 'remote' };
  } catch (e) {
    fail(`could not reach the registry: ${e.message}`);
  }
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out.flags[key] = true;
      } else {
        out.flags[key] = next;
        i++;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function score(soul, q) {
  const s = q.toLowerCase();
  let n = 0;
  if (soul.slug === s) n += 100;
  if (soul.name.toLowerCase() === s) n += 100;
  if (soul.slug.includes(s)) n += 40;
  if (soul.name.toLowerCase().includes(s)) n += 30;
  if (soul.category === s) n += 25;
  for (const t of soul.tags) if (t.includes(s)) n += 20;
  if (soul.description.toLowerCase().includes(s)) n += 10;
  return n;
}

function row(soul) {
  const slug = C.cyan(soul.slug.padEnd(20));
  const cat = C.dim(soul.category.padEnd(12));
  return `  ${slug} ${cat} ${soul.description}`;
}

function header(reg, source) {
  console.log('');
  console.log(`${C.bold('SOUL.md Registry')} ${C.dim(`v${reg.spec} · ${reg.count} souls · ${source}`)}`);
  console.log('');
}

// ---------------------------------------------------------------- commands

async function cmdList(flags) {
  const { data, source } = await loadRegistry();
  let souls = data.souls;
  if (flags.category) souls = souls.filter((s) => s.category === flags.category);
  if (flags.tag) souls = souls.filter((s) => s.tags.includes(flags.tag));
  if (flags.json) return console.log(JSON.stringify(souls, null, 2));
  header(data, source);
  if (souls.length === 0) return console.log(C.dim('  no souls match those filters'));
  for (const s of souls) console.log(row(s));
  console.log('');
  console.log(C.dim(`  categories: ${Object.keys(data.categories).join(', ')}`));
  console.log('');
}

async function cmdSearch(query) {
  if (!query) fail('usage: soul search <query>');
  const { data, source } = await loadRegistry();
  const hits = data.souls
    .map((s) => ({ s, n: score(s, query) }))
    .filter((h) => h.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((h) => h.s);
  header(data, source);
  if (hits.length === 0) {
    console.log(`  no souls match ${C.yellow(query)}`);
    console.log(C.dim('  try: soul list'));
    return;
  }
  for (const s of hits) console.log(row(s));
  console.log('');
}

async function cmdInfo(slug) {
  if (!slug) fail('usage: soul info <slug>');
  const { data } = await loadRegistry();
  const s = data.souls.find((x) => x.slug === slug);
  if (!s) fail(`no soul named "${slug}" — try: soul search ${slug}`);
  console.log('');
  console.log(C.bold(s.name) + C.dim(`  v${s.version}`));
  console.log('');
  console.log(`  ${s.description}`);
  console.log('');
  console.log(`  slug          ${s.slug}`);
  console.log(`  category      ${s.category}`);
  console.log(`  tags          ${s.tags.join(', ')}`);
  console.log(`  author        ${s.author}`);
  console.log(`  license       ${s.license}`);
  console.log(`  soul format   ${s.soul_format}`);
  console.log(`  compatibility ${(s.compatibility || []).join(', ') || '—'}`);
  console.log(`  created       ${s.created}`);
  console.log(`  updated       ${s.updated}`);
  console.log(`  extras        ${(s.extras || []).join(', ') || '—'}`);
  console.log('');
  console.log(`  ${C.dim('install:')}  soul install ${s.slug} --to ./souls`);
  console.log(`  ${C.dim('raw:')}      ${s.raw}`);
  console.log('');
}

async function cmdInstall(slug, flags) {
  if (!slug) fail('usage: soul install <slug> [--to <dir>] [--host <host>]');
  const { data } = await loadRegistry();
  const s = data.souls.find((x) => x.slug === slug);
  if (!s) fail(`no soul named "${slug}" — try: soul search ${slug}`);

  const dest = resolve(flags.to && flags.to !== true ? flags.to : '.', s.slug);
  mkdirSync(dest, { recursive: true });

  const files = ['soul.json', 'SOUL.md', ...(s.extras || [])];
  const written = [];
  const localDir = resolve(HERE, '..', s.dir);
  const useLocal = existsSync(localDir);
  for (const f of files) {
    let text;
    if (useLocal && existsSync(join(localDir, f))) {
      text = readFileSync(join(localDir, f), 'utf8');
    } else {
      if (typeof fetch !== 'function') fail('Node 18+ is required (no global fetch).');
      text = await fetchText(`${RAW}/${s.dir}/${f}`);
    }
    writeFileSync(join(dest, f), text);
    written.push(f);
  }

  console.log('');
  console.log(`${C.green('installed')} ${C.bold(s.name)} ${C.dim(`→ ${dest}`)}`);
  console.log('');
  for (const f of written) console.log(`  ${f}`);
  console.log('');
  const host = flags.host && flags.host !== true ? flags.host : 'generic';
  const hint = (HOST_HINTS[host] || HOST_HINTS.generic)(s.slug);
  console.log(`  ${C.dim(`next (${host}):`)} ${hint}`);
  console.log(`  ${C.dim('note:')} paste SOUL.md verbatim — paraphrasing destroys voice.`);
  console.log('');
}

function cmdValidate() {
  const script = resolve(HERE, '..', 'scripts', 'validate.mjs');
  if (!existsSync(script)) fail('scripts/validate.mjs not found — run this from a clone of the repo.');
  try {
    execFileSync(process.execPath, [script], { stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
}

function cmdHelp() {
  console.log(`
${C.bold('soul')} — the SOUL.md registry CLI ${C.dim(`v${VERSION}`)}

${C.bold('usage')}
  soul <command> [options]

${C.bold('commands')}
  list                       list every soul in the registry
  search <query>             rank souls against a query
  info <slug>                show one soul's metadata
  install <slug>             download a soul's files
  validate                   lint every soul (requires a clone)

${C.bold('options')}
  --category <name>          filter list by category
  --tag <name>               filter list by tag
  --json                     machine-readable output (list)
  --to <dir>                 install destination (default: .)
  --host <host>              print host-specific install hint
                             claude-code | cursor | openclaw | hermes | generic

${C.bold('examples')}
  soul search incident
  soul list --category research
  soul install grim-operator --to ./souls --host claude-code
  npx github:${REPO} search citations

${C.bold('registry')}  https://github.com/${REPO}
${C.bold('spec')}      https://github.com/${REPO}/blob/${BRANCH}/SPEC.md
`);
}

// -------------------------------------------------------------------- main

const argv = process.argv.slice(2);
const { _: positional, flags } = parseArgs(argv);
const cmd = positional[0] || 'help';

switch (cmd) {
  case 'list':
  case 'ls':
    await cmdList(flags);
    break;
  case 'search':
  case 'find':
    await cmdSearch(positional.slice(1).join(' '));
    break;
  case 'info':
  case 'show':
    await cmdInfo(positional[1]);
    break;
  case 'install':
  case 'add':
    await cmdInstall(positional[1], flags);
    break;
  case 'validate':
  case 'lint':
    cmdValidate();
    break;
  case 'version':
  case '--version':
  case '-v':
    console.log(VERSION);
    break;
  case 'help':
  case '--help':
  case '-h':
    cmdHelp();
    break;
  default:
    console.error(`${C.red('unknown command')} "${cmd}"`);
    cmdHelp();
    process.exit(1);
}