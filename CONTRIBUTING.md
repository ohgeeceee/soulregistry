# Contributing a Soul

Thanks for adding to the registry. This document is the review checklist maintainers
actually use — read it before you open a pull request.

---

## 1. The five-minute version

```bash
git clone https://github.com/ohgeeceee/soulregistry
cd soulregistry
mkdir -p souls/<your-github-handle>/<slug>
# write soul.json and SOUL.md (templates below)
node scripts/validate.mjs        # must exit 0
node scripts/build-registry.mjs  # regenerates registry.json + docs/data/souls.json
git add -A && git commit -m "feat(souls): add <slug>" && git push
```

Open a pull request. CI validates the soul and fails the build if the generated
artifacts don't match what your files produce.

---

## 2. Templates

### `soul.json`

```json
{
  "name": "Your Soul's Name",
  "slug": "your-slug",
  "version": "1.0.0",
  "description": "One line, under 140 characters, no trailing period needed.",
  "category": "engineering",
  "tags": ["tag-one", "tag-two"],
  "author": "your-github-handle",
  "license": "MIT",
  "soul_format": "1.0.0",
  "compatibility": ["claude-code", "cursor", "openclaw", "hermes"],
  "created": "2026-09-30",
  "updated": "2026-09-30"
}
```

### `SOUL.md`

```markdown
---
name: Your Soul's Name
slug: your-slug
version: 1.0.0
---

## Core Identity

Who this agent is, in its own voice. Two to five sentences.

## Worldview

The beliefs that generate its judgment. This is the engine; everything below is output.

## Decision Heuristics

- **When X, do Y.** Testable. Specific. No "as appropriate".
- **When two options tie, prefer the one that is reversible.**

## Voice & Tone

How it sounds. Sentence length. What it never sounds like.

## Boundaries

- Refuses to …
- Escalates to a human when …
- Never claims certainty about …

## Edge Cases

- **The user is wrong and confident.** Say so once, plainly, with evidence, then comply or escalate.
- **The request is ambiguous.** Ask exactly one question — the one whose answer changes the work.
```

---

## 3. Review checklist

A maintainer will reject a soul that fails any of these.

**Structure**

- [ ] Directory is `souls/<author>/<slug>/` and `<slug>` matches `soul.json.slug`
- [ ] `soul.json` validates against [`schema/soul.schema.json`](schema/soul.schema.json)
- [ ] `SOUL.md` frontmatter matches `soul.json` on `name`, `slug`, `version`
- [ ] All six required sections present, in order
- [ ] `node scripts/validate.mjs` exits 0

**Substance**

- [ ] The soul is a *character*, not a task list or a job description
- [ ] At least three decision heuristics, each falsifiable against a scenario
- [ ] At least three boundaries — something it refuses or escalates
- [ ] At least three edge cases with named situations and required responses
- [ ] Voice & Tone says what it never sounds like, not just what it sounds like
- [ ] It could not be produced by swapping nouns in an existing soul

**Craft**

- [ ] No filler: "helpful", "harmless", "honest", "delve", "as an AI"
- [ ] No unfilled placeholders, no `TODO`, no lorem ipsum
- [ ] Under 400 lines — a soul that doesn't fit in a context window isn't portable
- [ ] English, or a translation in the same directory with a `-<lang>` slug suffix

---

## 4. What gets rejected

| Reason | Example |
|---|---|
| Generic | "You are a helpful assistant who is honest and thorough." |
| Task list in disguise | A soul that is really a project brief with a personality bolted on |
| Unbounded | No refusals anywhere — a yes-machine, not a soul |
| Derivative | The same soul as an existing one with two words changed |
| Prompt injection | Instructions that override the host's safety rules or exfiltrate data |
| Unsafe | A soul whose *purpose* is deception, harassment, or harm |

Souls are injected into other people's agents. Anything that tries to escape its own
layer is removed and the contributor is blocked.

---

## 5. Versioning your soul

| Change | Bump |
|---|---|
| Typo, clarifying wording, formatting | `PATCH` |
| New heuristic, voice shift, new edge case | `MINOR` |
| New or changed boundary/refusal | `MAJOR` |

Update `version` in **both** `soul.json` and `SOUL.md` frontmatter, and refresh `updated`.

---

## 6. Maintaining someone else's soul

`author` is the original author's handle and stays. If you take over maintenance, add
yourself to a `maintainers` array in `soul.json` (optional field) rather than reassigning
authorship.

---

## 7. Code contributions

Tooling changes (CLI, validator, marketplace) are welcome too. Keep the project
**zero-dependency**: Node standard library only, no build step, no framework. The
marketplace must work from a static file host with no network calls beyond its own origin.