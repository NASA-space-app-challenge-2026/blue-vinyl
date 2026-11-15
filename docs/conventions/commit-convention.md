# Commit Convention

Every commit message in this repository follows the format below. The local `commit-msg` hook (`.githooks/commit-msg`) checks it at commit time.

## Format

```
<prefix>: <description>.
```

- `prefix` must be one of the four values below, always lowercase.
  - `feat` — add a new feature
  - `fix` — fix a bug
  - `chore` — build, config, scripts, dependencies and other maintenance
  - `docs` — documentation changes
- Put exactly one space right after the colon (`:`).
- The description must not start with a space.
- The subject ends with a period (`.`).
- Only the first line (the subject) is checked.

## Examples

Allowed:

```
feat: add new feature.
chore: add something.
fix: fix the bug.
docs: update commit convention.
```

Rejected:

```
Feat: add new feature.     # uppercase prefix
feat:add new feature.      # no space after the colon
feat: add new feature      # no trailing period
refactor: clean up code.   # prefix not allowed
```

## Hook Setup

Run this once after cloning the repository.

```sh
git config core.hooksPath .githooks
```
