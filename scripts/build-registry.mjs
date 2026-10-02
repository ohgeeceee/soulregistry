#!/usr/bin/env node
/**
 * build-registry.mjs — regenerate the generated artifacts.
 *
 *   registry.json           metadata index of every soul (for the CLI)
 *   data/souls.json         metadata + full bodies (for the marketplace)
 *   data/stats.json         counts used by the marketplace header
 *
 * Zero dependencies. Run after adding or editing a soul.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOULS_DIR = join(ROOT, 'souls');
const DOCS_DATA = join(ROOT, 'data');
const SPEC_VERSION = '1.0.0';

const OPTIONAL_FILES = ['IDENTITY.md', 'STYLE.md', 'AGENTS.md'];

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { frontmatter: {}, body: text };
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
  }
  return { frontmatter: fm, body: text.slice(m[0].length) };
}

function collect() {
  const souls = [];
  if (!existsSync(SOULS_DIR)) return souls;
  for (const author of readdirSync(SOULS_DIR).sort()) {
    const authorDir = join(SOULS_DIR, author);
    if (!statSync(authorDir).isDirectory()) continue;
    for (const slug of readdirSync(authorDir).sort()) {
      const dir = join(authorDir, slug);
      if (!statSync(dir).isDirectory()) continue;
      const metaPath = join(dir, 'soul.json');
      const soulPath = join(dir, 'SOUL.md');
      if (!existsSync(metaPath) || !existsSync(soulPath)) {
        console.warn(`skip ${author}/${slug} — missing soul.json or SOUL.md`);
        continue;
      }
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      const raw = readFileSync(soulPath, 'utf8');
      const { frontmatter, body } = parseFrontmatter(raw);

      const extras = {};
      for (const name of OPTIONAL_FILES) {
        const p = join(dir, name);
        if (existsSync(p)) extras[name] = readFileSync(p, 'utf8');
      }

      const sections = [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1].trim());

      souls.push({
        ...meta,
        author,
        dir: `souls/${author}/${slug}`,
        frontmatter,
        sections,
        extras: Object.keys(extras),
        body,
        extrasBody: extras,
        lines: raw.split(/\r?\n/).length,
        bytes: Buffer.byteLength(raw, 'utf8'),
      });
    }
  }
  return souls;
}

const souls = collect();
souls.sort((a, b) => a.name.localeCompare(b.name));

const byCategory = {};
const tagCount = {};
const compatCount = {};
for (const s of souls) {
  byCategory[s.category] = (byCategory[s.category] || 0) + 1;
  for (const t of s.tags || []) tagCount[t] = (tagCount[t] || 0) + 1;
  for (const c of s.compatibility || []) compatCount[c] = (compatCount[c] || 0) + 1;
}

const generatedNow = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

/**
 * Keep rebuilds idempotent: if the payload is unchanged, reuse the timestamp that is
 * already on disk. CI diffs these files, so a fresh timestamp on every run would fail
 * the build for no reason. `generated` therefore means "when the registry last changed".
 */
function stableGenerated(path, payload) {
  try {
    const prev = JSON.parse(readFileSync(path, 'utf8'));
    const strip = (o) => { const c = { ...o }; delete c.generated; return JSON.stringify(c); };
    if (strip(prev) === strip(payload)) return prev.generated || generatedNow;
  } catch { /* no previous file, or unreadable — use now */ }
  return generatedNow;
}

// The generated timestamps are resolved against whatever is already on disk, before
// anything is written, so an unchanged registry rebuilds byte-for-byte identically.
const REGISTRY_PATH = join(ROOT, 'registry.json');
const MARKET_PATH = join(DOCS_DATA, 'souls.json');
const STATS_PATH = join(DOCS_DATA, 'stats.json');

const registry = {
  $schema: 'https://ohgeeceee.github.io/soulregistry/schema/soul.schema.json',
  name: 'SOUL.md Registry',
  spec: SPEC_VERSION,
  generated: generatedNow,
  count: souls.length,
  categories: byCategory,
  souls: souls.map((s) => ({
    name: s.name,
    slug: s.slug,
    version: s.version,
    description: s.description,
    category: s.category,
    tags: s.tags,
    author: s.author,
    license: s.license,
    soul_format: s.soul_format,
    compatibility: s.compatibility || [],
    created: s.created,
    updated: s.updated,
    dir: s.dir,
    raw: `https://raw.githubusercontent.com/ohgeeceee/soulregistry/main/${s.dir}/SOUL.md`,
    extras: s.extras,
  })),
};

// ---- data/souls.json (with bodies, for the marketplace) -------------------
mkdirSync(DOCS_DATA, { recursive: true });

const market = {
  spec: SPEC_VERSION,
  generated: generatedNow,
  count: souls.length,
  souls: souls.map((s) => ({
    name: s.name,
    slug: s.slug,
    version: s.version,
    description: s.description,
    category: s.category,
    tags: s.tags,
    author: s.author,
    license: s.license,
    soul_format: s.soul_format,
    compatibility: s.compatibility || [],
    created: s.created,
    updated: s.updated,
    dir: s.dir,
    sections: s.sections,
    extras: s.extras,
    body: s.body,
    extrasBody: s.extrasBody,
  })),
};

const stats = {
  spec: SPEC_VERSION,
  generated: generatedNow,
  souls: souls.length,
  categories: byCategory,
  tags: tagCount,
  compatibility: compatCount,
  authors: [...new Set(souls.map((s) => s.author))].length,
};

registry.generated = stableGenerated(REGISTRY_PATH, registry);
market.generated = stableGenerated(MARKET_PATH, market);
stats.generated = stableGenerated(STATS_PATH, stats);

writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');
writeFileSync(MARKET_PATH, JSON.stringify(market, null, 2) + '\n');
writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2) + '\n');

console.log(`Wrote registry.json (${souls.length} souls)`);
console.log(`Wrote data/souls.json`);
console.log(`Wrote data/stats.json`);
for (const s of souls) console.log(`  · ${s.slug} — ${s.sections.length} sections, ${s.lines} lines`);