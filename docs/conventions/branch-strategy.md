# Branch Strategy

Every working branch is tied to exactly one GitHub issue. The branch name is built from the issue type and the issue number.

## Format

```
<type>/#<issue-number>
```

- `type` must be one of the four values below, always lowercase. It matches the issue template the issue was created from.
  - `feat` — issue created from the Feat template
  - `bug` — issue created from the Bug template
  - `chore` — issue created from the Chore template
  - `docs` — issue created from the Docs template
- Put exactly one slash (`/`) between the type and the issue number.
- The issue number is prefixed with `#` and contains digits only.
- Nothing else goes in the name: no description, no extra suffix.

## Rules

- Create the issue first, then create the branch from its number.
- One issue maps to one branch, and one branch maps to one issue.
- The branch type must match the issue type. If the issue type changes, rename the branch.

## Examples

Allowed:

```
feat/#1
bug/#2
chore/#3
docs/#4
```

Rejected:

```
Feat/#1             # uppercase type
feat#1              # no slash
feat/1              # missing '#'
feat/#1-login       # extra suffix
fix/#2              # type not allowed (use 'bug')
```

## Shell Note

`#` starts a comment in many shells when it follows a space. Quote the branch name when typing it.

```sh
git switch -c 'feat/#1'
```
