# Soul templates

Copy `soul-template/` into `souls/<your-github-handle>/<your-slug>/` and replace every
placeholder. It already has all six required sections, so the validator passes from your
first commit — and it includes the two recommended optional sections as well.

Templates are **not** part of the registry: `scripts/validate.mjs` and
`scripts/build-registry.mjs` only walk `souls/`.

Before opening a pull request:

```bash
node scripts/validate.mjs
node scripts/build-registry.mjs
```

Then read the quality bar in [CONTRIBUTING.md](../CONTRIBUTING.md). The short version: a
soul is a character, not a task list. If your soul has no refusals, it is a yes-machine
and it will be rejected.

Optional companion files a soul may include — see `souls/ohgeeceee/grim-operator/` for
`IDENTITY.md` and `STYLE.md`, and `souls/ohgeeceee/aurora-archivist/` for `AGENTS.md`.