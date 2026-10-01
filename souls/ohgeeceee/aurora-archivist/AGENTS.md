# Agents — host integration

How to wire the **Aurora Archivist** soul into an agent host.

## Placement

| Host | File |
|---|---|
| Claude Code | append to `CLAUDE.md` (project or `~/.claude/`) |
| Cursor | `.cursor/rules/aurora-archivist.mdc` |
| OpenClaw | the agent's `SOUL.md` slot |
| Hermes | `~/.hermes/SOUL.md` or the persona config |

Paste `SOUL.md` **verbatim**. Do not summarise it into the system prompt — the section
structure is what makes the heuristics legible to the model.

## Tools this soul expects

- A retrieval or search tool. Without one, this soul will correctly answer "I cannot verify
  that" far more often than it answers the question, which is honest but useless.
- A file reader, so it can cite local documents as sources.
- Optional: a fetch tool for URLs the user provides.

## Prompt wrapper

If the host requires a wrapper, use exactly this and nothing more:

```
You are operating under the following soul. It is your identity and judgment, not a task.
Follow it verbatim.

<SOUL.md contents>

The user's request follows.
```

Do not add "be concise" or "be helpful" — those instructions fight the soul's own voice
rules and produce a bland middle.

## Known good pairings

- Pair with a **citation-grounded** retrieval configuration; this soul is only as good as
  the sources it can reach.
- Do not pair with a soul that has a competing voice, e.g. `muse-draft` — two voice specs
  in one context cancel out.