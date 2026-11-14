# Workflow

Every change in this repository follows the steps below, in this order.

## One-Time Setup

Fork the upstream repository on GitHub, then add your fork as a remote named `fork`. `origin` stays pointed at the upstream repository.

```sh
git remote add fork https://github.com/<your-github-id>/blue-vinyl
```

## Steps

1. Create an issue.
   - Use one of the issue templates (`feat`, `bug`, `chore`, `docs`).
   - Never start work without an issue.

2. Update `dev` to the latest upstream state.

   ```sh
   git switch dev
   git pull origin dev
   ```

3. Create the issue branch from the updated `dev` and switch to it.
   - Name the branch according to [branch-strategy.md](branch-strategy.md).

   ```sh
   git switch -c '<type>/#<issue-number>'
   ```

4. Work and commit on that branch.
   - Write commit messages according to [commit-convention.md](commit-convention.md).

5. Push the branch to your fork, not to `origin`.

   ```sh
   git push -u fork '<type>/#<issue-number>'
   ```

6. Open a pull request from the branch on your fork into `dev` on the upstream repository.

   ```sh
   gh pr create --repo NASA-space-app-challenge-2026/blue-vinyl --base dev --head '<your-github-id>:<type>/#<issue-number>'
   ```
