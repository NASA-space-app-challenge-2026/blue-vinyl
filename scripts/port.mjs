// Prints the port to serve the app on, fixed per checkout so several worktrees can run side by side: a worktree named
// after its issue (`feat-26`, `fix-30`) gets BASE_PORT + the issue number (3026), any other checkout gets BASE_PORT.

import { basename } from 'node:path';

const BASE_PORT = 3000;
const ISSUE_WORKTREE = /^[a-z]+-(\d+)$/;

const issue = basename(process.cwd()).match(ISSUE_WORKTREE)?.[1];
console.log(BASE_PORT + Number(issue ?? 0));
