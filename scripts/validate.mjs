#!/usr/bin/env node
/**
 * validate.mjs — lint every soul in the registry.
 *
 * Zero dependencies. Node 18+.
 *
 *   node scripts/validate.mjs            # validate all souls
 *   node scripts/validate.mjs <slug>     # validate one soul
 *   node scripts/validate.mjs --json     # machine-readable output
 *
 * Exits 0 when every soul passes, 1 otherwise.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOULS_DIR = join(ROOT, 'souls');
const SPEC_VERSION = '1.0.0';

const CATEGORIES = [
  'research', 'engineering', 'operations', 'security', 'education',
  'product', 'creative', 'support', 'personal', 'experimental',
];

const REQUIRED_SECTIONS = [
  'core identity',
  'worldview',
  'decision heuristics',
  'voice & tone',
  'boundaries',
  'edge cases',
];

const OPTIONAL_SECTIONS = ['continuity', 'failure modes'];

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HANDLE_RE = /^[A-Za-z0-9-]+$/;

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const onlySlug = args.find((a) => !a.startsWith('-'));

const errors = [];
const warnings = [];
const pass = [];

function err(soul, message) {
  errors.push({ soul, message });
}
function warn(soul, message) {
  warnings.push({ soul, message });
}

/** Minimal YAML frontmatter reader: flat `key: value` pairs only. */
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    val = val.replace(/^["']|["']$/g, '');
    out[key] = val;
  }
  return out;
}

function headingList(md) {
  const body = md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  const out = [];
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) out.push(m[1].trim().toLowerCase());
  }
  return out;
}

function listSouls() {
  if (!existsSync(SOULS_DIR)) return [];
  const found = [];
  for (const author of readdirSync(SOULS_DIR)) {
    const authorDir = join(SOULS_DIR, author);
    if (!statSync(authorDir).isDirectory()) continue;
    for (const slug of readdirSync(authorDir)) {
      const dir = join(authorDir, slug);
      if (!statSync(dir).isDirectory()) continue;
      found.push({ author, slug, dir });
    }
  }
  return found;
}

function validateSoul({ author, slug, dir }) {
  const id = `${author}/${slug}`;
  const metaPath = join(dir, 'soul.json');
  const soulPath = join(dir, 'SOUL.md');

  if (!existsSync(metaPath)) {
    err(id, 'missing soul.json');
    return;
  }
  if (!existsSync(soulPath)) {
    err(id, 'missing SOUL.md');
    return;
  }

  // ---- soul.json -----------------------------------------------------------
  let meta;
  try {
    meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  } catch (e) {
    err(id, `soul.json is not valid JSON: ${e.message}`);
    return;
  }

  const required = [
    'name', 'slug', 'version', 'description', 'category',
    'tags', 'author', 'license', 'soul_format', 'created', 'updated',
  ];
  for (const key of required) {
    if (meta[key] === undefined || meta[key] === null || meta[key] === '') {
      err(id, `soul.json missing required field "${key}"`);
    }
  }

  const allowed = new Set([...required, 'compatibility', 'maintainers']);
  for (const key of Object.keys(meta)) {
    if (!allowed.has(key)) warn(id, `soul.json has unknown field "${key}"`);
  }

  if (typeof meta.name === 'string' && (meta.name.length < 2 || meta.name.length > 48)) {
    err(id, 'name must be 2–48 characters');
  }
  if (typeof meta.slug === 'string') {
    if (!SLUG_RE.test(meta.slug)) err(id, `slug "${meta.slug}" is not URL-safe kebab-case`);
    if (meta.slug !== slug) err(id, `slug "${meta.slug}" does not match directory "${slug}"`);
  }
  if (typeof meta.version === 'string' && !SEMVER_RE.test(meta.version)) {
    err(id, `version "${meta.version}" is not semver`);
  }
  if (typeof meta.description === 'string') {
    if (meta.description.length > 140) err(id, `description is ${meta.description.length} chars (max 140)`);
    if (meta.description.length < 10) err(id, 'description is too short');
    if (/[\r\n]/.test(meta.description)) err(id, 'description must be a single line');
  }
  if (typeof meta.category === 'string' && !CATEGORIES.includes(meta.category)) {
    err(id, `category "${meta.category}" is not one of: ${CATEGORIES.join(', ')}`);
  }
  if (!Array.isArray(meta.tags) || meta.tags.length === 0) {
    err(id, 'tags must be a non-empty array');
  } else {
    if (meta.tags.length > 8) err(id, `too many tags (${meta.tags.length}, max 8)`);
    if (new Set(meta.tags).size !== meta.tags.length) err(id, 'tags contain duplicates');
    for (const t of meta.tags) {
      if (typeof t !== 'string' || !SLUG_RE.test(t)) err(id, `tag "${t}" is not kebab-case`);
    }
  }
  if (typeof meta.author === 'string') {
    if (!HANDLE_RE.test(meta.author)) err(id, `author "${meta.author}" is not a valid GitHub handle`);
    if (meta.author !== author) err(id, `author "${meta.author}" does not match directory "${author}"`);
  }
  if (typeof meta.soul_format === 'string' && !SEMVER_RE.test(meta.soul_format)) {
    err(id, `soul_format "${meta.soul_format}" is not semver`);
  }
  for (const key of ['created', 'updated']) {
    if (typeof meta[key] === 'string' && !DATE_RE.test(meta[key])) {
      err(id, `${key} "${meta[key]}" is not YYYY-MM-DD`);
    }
  }
  if (meta.created && meta.updated && meta.updated < meta.created) {
    err(id, 'updated is before created');
  }

  // ---- SOUL.md -------------------------------------------------------------
  const body = readFileSync(soulPath, 'utf8');

  const fm = parseFrontmatter(body);
  if (!fm) {
    err(id, 'SOUL.md is missing YAML frontmatter');
  } else {
    for (const key of ['name', 'slug', 'version']) {
      if (!fm[key]) {
        err(id, `SOUL.md frontmatter missing "${key}"`);
      } else if (meta[key] && fm[key] !== String(meta[key])) {
        err(id, `SOUL.md frontmatter ${key} "${fm[key]}" != soul.json "${meta[key]}"`);
      }
    }
  }

  const headings = headingList(body);
  const requiredSet = REQUIRED_SECTIONS;
  let cursor = 0;
  for (const want of requiredSet) {
    const at = headings.indexOf(want, cursor);
    if (at === -1) {
      if (headings.includes(want)) {
        err(id, `section "## ${want}" is out of order`);
      } else {
        err(id, `missing required section "## ${want}"`);
      }
    } else {
      cursor = at + 1;
    }
  }
  for (const h of headings) {
    if (!requiredSet.includes(h) && !OPTIONAL_SECTIONS.includes(h)) {
      warn(id, `unknown section "## ${h}"`);
    }
  }

  // Content quality heuristics
  const lower = body.toLowerCase();
  const banned = [
    'lorem ipsum',
    'as an ai language model',
    'todo:',
    '[insert',
    'placeholder',
  ];
  for (const phrase of banned) {
    if (lower.includes(phrase)) err(id, `SOUL.md contains banned filler: "${phrase}"`);
  }
  const lines = body.split(/\r?\n/).length;
  if (lines > 400) warn(id, `SOUL.md is ${lines} lines (recommended max 400)`);
  if (body.replace(/\s/g, '').length < 1200) {
    warn(id, 'SOUL.md is thin — under ~1200 non-whitespace characters');
  }
  if (!/##\s+boundaries/i.test(body)) {
    err(id, 'no boundaries section — a soul with no refusals is a yes-machine');
  }

  if (!errors.some((e) => e.soul === id)) pass.push(id);
}

const targets = listSouls().filter((s) => !onlySlug || s.slug === onlySlug);

if (targets.length === 0) {
  if (onlySlug) {
    console.error(`No soul found matching "${onlySlug}".`);
  } else {
    console.error('No souls found under souls/ — nothing to validate.');
  }
  process.exit(1);
}

for (const t of targets) validateSoul(t);

if (JSON_OUT) {
  console.log(JSON.stringify({ spec: SPEC_VERSION, checked: targets.length, pass, errors, warnings }, null, 2));
} else {
  for (const p of pass) console.log(`  \x1b[32m✓\x1b[0m ${p}`);
  for (const w of warnings) console.log(`  \x1b[33m!\x1b[0m ${w.soul}: ${w.message}`);
  for (const e of errors) console.log(`  \x1b[31m✗\x1b[0m ${e.soul}: ${e.message}`);
  console.log('');
  console.log(
    `${targets.length} soul(s) checked · ${pass.length} valid · ` +
    `${errors.length} error(s) · ${warnings.length} warning(s)`
  );
}

process.exit(errors.length === 0 ? 0 : 1);