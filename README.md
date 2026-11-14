# Blue Vinyl

## Run Locally

Requires Node.js.

```sh
npm start
```

Serves the app at http://localhost:3000 and opens it in the browser. A worktree named after its issue (`.claude/worktrees/feat-26`) serves at 3000 plus the issue number (http://localhost:3026), so several worktrees run side by side (see `scripts/port.mjs`). The page updates on its own when `index.html`, `src/` or `data/` changes: CSS is swapped in place, everything else reloads the page. `npm run dev` and `npm run watch` do the same thing.

To serve the app without live reload:

```sh
npm run serve
```
