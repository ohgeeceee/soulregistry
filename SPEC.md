# The SOUL.md Specification

**Version:** 1.0.0
**Status:** Stable
**Registry:** https://ohgeeceee.github.io/soulregistry

---

## 1. Purpose

A `SOUL.md` file describes **who an agent is**, not what it is doing.

System prompts, tool declarations, and task briefs answer *"what should you do right now?"*.
A Soul answers *"how do you decide, what do you care about, and how do you sound while doing it?"*
— and it keeps answering that consistently across turns, sessions, models, and hosts.

A Soul is therefore portable, model-agnostic, and human-readable. It is the character sheet
that survives the context window.

---

## 2. File layout

A soul is a directory, not a single loose file:

```
souls/<author>/<slug>/
├── soul.json        # required — registry metadata (machine-readable)
├── SOUL.md          # required — the soul itself (human-readable)
├── IDENTITY.md      # optional — name, role, self-description
├── STYLE.md         # optional — voice, tone, formatting rules
└── AGENTS.md        # optional — workflow and host integration rules
```

`soul.json` is for the registry. `SOUL.md` is for the model. Neither replaces the other.

---

## 3. `soul.json`

```json
{
  "name": "Aurora Archivist",
  "slug": "aurora-archivist",
  "version": "1.0.0",
  "description": "One-line summary, under 140 characters.",
  "category": "research",
  "tags": ["provenance", "citations", "archive"],
  "author": "ohgeeceee",
  "license": "MIT",
  "soul_format": "1.0.0",
  "compatibility": ["claude-code", "cursor", "openclaw", "hermes"],
  "created": "2026-09-30",
  "updated": "2026-09-30"
}
```

### Field rules

| Field | Required | Rule |
|---|---|---|
| `name` | yes | Display name, 2–48 chars |
| `slug` | yes | `^[a-z0-9]+(-[a-z0-9]+)*$`, must equal the directory name |
| `version` | yes | Semver `MAJOR.MINOR.PATCH` |
| `description` | yes | ≤ 140 chars, no newlines |
| `category` | yes | One of the values in §3.1 |
| `tags` | yes | 1–8 lowercase tags, each `^[a-z0-9]+(-[a-z0-9]+)*$` |
| `author` | yes | GitHub handle of the contributor |
| `license` | yes | SPDX identifier, `MIT` or `Apache-2.0` recommended |
| `soul_format` | yes | Spec version this soul targets |
| `compatibility` | no | Hosts known to work; unknown values are ignored |
| `created` / `updated` | yes | `YYYY-MM-DD` |

### 3.1 Categories

`research`, `engineering`, `operations`, `security`, `education`, `product`,
`creative`, `support`, `personal`, `experimental`.

A soul belongs to exactly one category. Use `tags` for the rest.

---

## 4. `SOUL.md`

### 4.1 Frontmatter

`SOUL.md` opens with YAML frontmatter:

```markdown
---
name: Aurora Archivist
slug: aurora-archivist
version: 1.0.0
---
```

`name`, `slug`, and `version` must match `soul.json`. Mismatches fail CI.

### 4.2 Required sections

In order. Section headings are `##` and their titles are matched case-insensitively.

| # | Section | What it must contain |
|---|---|---|
| 1 | `## Core Identity` | Who the agent is in 2–5 sentences, in the agent's own voice |
| 2 | `## Worldview` | The beliefs and values that generate its judgment |
| 3 | `## Decision Heuristics` | Concrete, testable rules for ambiguous moments |
| 4 | `## Voice & Tone` | How it sounds; what it never sounds like |
| 5 | `## Boundaries` | What it refuses, escalates, or will not do alone |
| 6 | `## Edge Cases` | Named situations and the required response to each |

Two sections are optional but recommended:

- `## Continuity` — what the agent remembers between sessions, and how
- `## Failure Modes` — how this soul tends to go wrong, honestly

### 4.3 Quality bar

A Soul is rejected if it is:

- **A task list.** Souls define judgment, not deliverables.
- **Generic.** "I am helpful, harmless, and honest" describes nothing. Specificity is the product.
- **Unfalsifiable.** Every heuristic must be testable against a scenario.
- **Unbounded.** A soul with no refusals is not a character; it is a yes-machine.

---

## 5. Distribution

Any file tree matching §2 is a valid soul. The registry adds:

- `registry.json` — generated index of every soul, built by `scripts/build-registry.mjs`
- `data/souls.json` — the same index plus full `SOUL.md` bodies, for the web marketplace
- `data/stats.json` — the counts the marketplace header displays

Both are generated artifacts. Never hand-edit them; CI regenerates and diffs them.

---

## 6. Host integration

A Soul is loaded by injecting `SOUL.md` into the host's system context. Suggested mapping:

| Host | Placement |
|---|---|
| Claude Code | `~/.claude/CLAUDE.md` or project `CLAUDE.md` |
| Cursor | `.cursor/rules/*.mdc` |
| OpenClaw | agent `SOUL.md` slot |
| Hermes | `~/.hermes/SOUL.md` / persona config |

`SOUL.md` should be pasted **verbatim**. Hosts that must wrap it should use a single
fenced block with no paraphrasing — rewrites destroy voice, which is the entire point.

---

## 7. Versioning

- `soul_format` tracks this spec. Breaking format changes bump `MAJOR`.
- Each soul's own `version` follows semver: voice or heuristic changes bump `MINOR`,
  clarifying edits bump `PATCH`, refusals/boundary changes bump `MAJOR`.