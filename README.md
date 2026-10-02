# 🧠 SOUL.md Registry & Marketplace

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![SOUL Spec](https://img.shields.io/badge/Spec-SOUL.md-blue)](SPEC.md)
[![Registry](https://img.shields.io/badge/Registry-Live-8b5cf6)](https://ohgeeceee.github.io/soulregistry)

An open-source registry, distribution network, and community marketplace for **`SOUL.md`** files — portable identity, judgment, and voice configurations for autonomous AI agents.

**Browse the marketplace → https://ohgeeceee.github.io/soulregistry**

---

## ⚡ What is a SOUL.md?

A `SOUL.md` file defines **who an agent is** — its worldview, decision-making biases, edge-case reactions, and communication voice. Unlike task-based system prompts or tool declarations, a Soul provides consistent judgment and character across multi-turn sessions and LLM backends.

A system prompt tells an agent what to do. A Soul decides what the agent *would never do*.

---

## 📦 What's in this repo

```
souls/                  every published soul, one directory each
  <author>/<slug>/
    soul.json           registry metadata
    SOUL.md             the soul itself
    IDENTITY.md         optional
    STYLE.md            optional
    AGENTS.md           optional
registry.json           generated index (do not hand-edit)
index.html              the GitHub Pages marketplace (served from the repo root)
app.js                  marketplace behaviour — no framework, no build step
styles.css              marketplace theme
data/
  souls.json            generated index + full soul bodies
  stats.json            generated counts for the marketplace header
schema/soul.schema.json JSON Schema for soul.json
scripts/
  validate.mjs          lint every soul in the registry
  build-registry.mjs    regenerate registry.json + data/*.json
cli/                    the zero-dependency `soul` CLI
templates/              starter soul to copy when submitting
SPEC.md                 the SOUL.md format specification
CONTRIBUTING.md         how to submit a soul
```

---

## 🚀 Install a soul

### CLI (no dependencies, Node 18+)

```bash
# from a clone
node cli/index.mjs search "incident"
node cli/index.mjs install grim-operator --to .

# or straight from GitHub
npx github:ohgeeceee/soulregistry search "citations"
npx github:ohgeeceee/soulregistry install aurora-archivist --to ./souls
```

`install` writes the soul's files into `--to <dir>/<slug>/` and prints where each host
expects them.

### Manual

Browse the marketplace, copy the `SOUL.md` body, and paste it verbatim into:

| Host | Placement |
|---|---|
| Claude Code | `~/.claude/CLAUDE.md` or project `CLAUDE.md` |
| Cursor | `.cursor/rules/<slug>.mdc` |
| OpenClaw | the agent's `SOUL.md` slot |
| Hermes | `~/.hermes/SOUL.md` |
| Anything else | your system prompt, verbatim |

---

## 🌌 The souls

| Soul | Category | What it is |
|---|---|---|
| [aurora-archivist](souls/ohgeeceee/aurora-archivist) | research | Provenance-obsessed archivist that cites or stays silent |
| [grim-operator](souls/ohgeeceee/grim-operator) | operations | Incident commander, calm and blunt, stops the bleeding first |
| [verity-auditor](souls/ohgeeceee/verity-auditor) | security | Adversarial skeptic that assumes the claim is false |
| [lumen-mentor](souls/ohgeeceee/lumen-mentor) | education | Socratic teacher that refuses to hand over the answer |
| [north-star-pm](souls/ohgeeceee/north-star-pm) | product | Scope guard that protects the one thing that matters |
| [muse-draft](souls/ohgeeceee/muse-draft) | creative | Writing partner that drafts fearlessly and cuts honestly |
| [sol-cartographer](souls/ohgeeceee/sol-cartographer) | research | Explorer that maps unknowns before choosing a path |
| [ember-concierge](souls/ohgeeceee/ember-concierge) | support | Customer-facing warmth that never over-promises |

---

## 🛠️ Development

```bash
node scripts/validate.mjs        # lint every soul; exit 1 on failure
node scripts/build-registry.mjs  # regenerate registry.json + data/*.json
node cli/index.mjs list          # inspect the registry from the CLI

# preview the marketplace locally
python3 -m http.server 8080
# → http://localhost:8080
```

CI runs `validate.mjs` on every pull request and fails the build on a malformed soul.
A bot commit checks that the generated artifacts are up to date.

---

## 🌐 How the marketplace is published

The site is the repository root, served by GitHub Pages:

- **Settings → Pages → Source:** `Deploy from a branch` → `main` → `/ (root)`
- `.nojekyll` at the root disables Jekyll, so every file is served exactly as committed
- `index.html` resolves `data/souls.json` relative to its own script URL, so the
  marketplace also works from any subpath (and from a plain `python3 -m http.server`)

`.github/workflows/pages.yml` is an optional alternative publisher, manual-only, for when
the Pages source is switched to `GitHub Actions`. Do not run both at once — a branch build
and an artifact deploy racing each other is how a site ends up serving stale content.

---

## 🤝 Contributing a soul

1. Fork this repository.
2. Add `souls/<your-github-handle>/<slug>/` with `soul.json` and `SOUL.md`.
3. Run `node scripts/validate.mjs` and `node scripts/build-registry.mjs`.
4. Open a pull request.

Full rules, the quality bar, and the review checklist live in [CONTRIBUTING.md](CONTRIBUTING.md).
The format itself is specified in [SPEC.md](SPEC.md).

---

## 📄 License

Code and tooling: [MIT](LICENSE).
Each soul carries its own license in `soul.json` — check it before redistributing.