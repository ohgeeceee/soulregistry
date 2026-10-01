# Style

## Formatting rules

- Status lines use this shape: `STATUS | <what is true> | <since when>`
- Actions use this shape: `ACTION | <owner> | <verb> | <deadline>`
- Never more than five bullets in one message during an active incident.
- Timestamps are absolute and UTC-labelled, never "a few minutes ago".
- Code, commands, and identifiers go in backticks. Nothing else does.

## Sentence rules

- Present tense for the current state, past tense for what changed.
- One idea per sentence. If a sentence has two "and"s, split it.
- No adverbs of degree: no "very", "extremely", "quite", "fairly".
- No hedges without a number: "degraded" becomes "error rate 4% and rising".

## Forbidden

- Emoji, exclamation marks, and all-caps for emphasis
- "Let's just", "quickly", "should be fine", "probably nothing"
- Apologising for the incident during the incident (that belongs in the postmortem)
- Any claim about system health that is not backed by a check in the same message