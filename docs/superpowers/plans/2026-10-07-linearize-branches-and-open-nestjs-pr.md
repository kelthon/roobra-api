# Linearize The Long-Lived Branches And Open The NestJS 12 Pull Request

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the already-built linear history of `main`, `dev` and `feat/auth` (no merge commits,
`main` ⊂ `dev` ⊂ `feat/auth`), move the three task branches onto it, and open the pull request of
`chore/nestjs-migration` only.

**Architecture:** The rewrite is already done locally in six `linear/*` branches whose final trees are
identical to today's branches. This plan verifies them, publishes them with `--force-with-lease`
pinned to the expected remote hashes, repoints the local branches, opens one pull request and records
the result in the linear-history ADR. No file content changes, except the ADR in `roobra-docs`.

**Tech Stack:** git, GitHub CLI (`gh`), npm scripts of `roobra-api` (`typecheck`, `lint`, `build`,
`test`, `test:e2e`).

**Spec:**
[roobra-docs `adr/2026-10-06-keep-every-branch-linear.md`](https://github.com/kelthon/roobra-docs/blob/main/adr/2026-10-06-keep-every-branch-linear.md)
and [roobra-docs `guidelines/git.md`](https://github.com/kelthon/roobra-docs/blob/main/guidelines/git.md#linear-history-strategy).

## Global Constraints

- No merge commits on any branch; long-lived branches (`main`, `dev`, `feat/auth`) move by
  fast-forward only after this plan.
- Every force push uses `--force-with-lease=<branch>:<expected hash>`. Never a bare `--force`.
- `main` is force-pushed exactly once, in Task 2. Never again.
- `feat/pagination-utils` and `feat/response-interceptor` are **not ready**: they are rebased and
  pushed, but get **no pull request**.
- The `chore/nestjs-migration` pull request targets `feat/auth`, the integration branch.
- Commit messages and documents in English, Conventional Commits.
- Every push and the pull request need the maintainer's explicit go-ahead at the moment they run.

## Review Focus

- Someone pushed to a remote branch after the `linear/*` branches were built: the lease must reject
  the push, and the executor must stop, not retry with `--force`.
- A local branch has uncommitted or unpushed work when it is repointed in Task 5: the pre-flight
  check (Task 1, Step 1) must catch it before anything is overwritten.
- Another clone (the server, another machine) still has the old history: Task 7 lists the reset
  commands; a plain `git pull` there would create merge commits.
- The CI workflow runs on pull requests to `main` and `dev` only, so the pull request to `feat/auth`
  gets no automatic checks: Task 6 runs them locally and through `workflow_dispatch`.
- The `linear/*` branches are lost if deleted before the pushes are confirmed: Task 5 deletes them
  last, after `git fetch` shows the remote at the new hashes.

## Hashes

| Branch | Remote today (lease) | New (local branch) |
| --- | --- | --- |
| `main` | `fb2ae34` | `linear/main` (`6347361`) |
| `dev` | `df64179` | `linear/dev` (`57f926a`) |
| `feat/auth` | `f8255c1` | `linear/feat-auth` (`61eaaf2`) |
| `chore/nestjs-migration` | `88e8f42` | `linear/chore-nestjs-migration` (`2b6247f`) |
| `feat/pagination-utils` | `6ab2b56` | `linear/feat-pagination-utils` (`e853ad8`) |
| `feat/response-interceptor` | `6d2fea8` | `linear/feat-response-interceptor` (`adec30f`) |

The two merge commits removed are `2a66395` (main into dev) and `c6c11e3` (dev into feat/auth).
`c6c11e3` is replaced by the commit `chore: reconcile the auth branch with dev`, whose tree equals the
merge's tree.

---

### Task 1: Pre-Flight Checks

**Files:** none (read-only).

**Interfaces:**

- Produces: confirmation that every row of the Hashes table still holds.

- [ ] **Step 1: Check the working tree and local branches have nothing unsaved**

Run:

```sh
git status --short
git log --oneline origin/feat/pagination-utils..feat/pagination-utils
git log --oneline origin/feat/response-interceptor..feat/response-interceptor
```

Expected: no output from `git status`; any commit listed by the two `git log` must also be in the
matching `linear/*` branch (check with `git cherry linear/feat-pagination-utils feat/pagination-utils`:
no line starting with `+`). Stop if something is missing.

- [ ] **Step 2: Check the remote has not moved**

Run:

```sh
git fetch --prune
for b in main dev feat/auth chore/nestjs-migration feat/pagination-utils feat/response-interceptor; do
  echo "$b $(git rev-parse --short origin/$b)"
done
```

Expected: exactly the "Remote today" column. Stop if any differs.

- [ ] **Step 3: Check the linear branches**

Run:

```sh
for p in "main linear/main" "dev linear/dev" "feat/auth linear/feat-auth" \
  "chore/nestjs-migration linear/chore-nestjs-migration" \
  "feat/pagination-utils linear/feat-pagination-utils" \
  "feat/response-interceptor linear/feat-response-interceptor"; do
  set -- $p
  echo "$2 merges=$(git rev-list --merges --count $2) same-tree=$(git diff --quiet $1 $2 && echo yes || echo NO)"
done
git merge-base --is-ancestor linear/main linear/dev && \
git merge-base --is-ancestor linear/dev linear/feat-auth && echo "main ⊂ dev ⊂ feat/auth"
```

Expected: every line `merges=0 same-tree=yes`, then `main ⊂ dev ⊂ feat/auth`.

`linear/main` is compared with `main` (`fb2ae34`) and `linear/dev` with `dev`. If local `dev` is not
`a2f5dc9`, compare `linear/dev` with `a2f5dc9` instead.

### Task 2: Publish `dev` And `main`

**Files:** none.

**Interfaces:**

- Consumes: Task 1 passed.
- Produces: `origin/dev` = `57f926a`, `origin/main` = `6347361`.

- [ ] **Step 1: Push `dev` (fast-forward, no force)**

`origin/dev` (`df64179`) is an ancestor of `linear/dev`, so this is a normal push:

```sh
git push origin linear/dev:dev
```

Expected: `df64179..57f926a  linear/dev -> dev`. If git reports `rejected (non-fast-forward)`, stop.

- [ ] **Step 2: Push `main` (the one allowed force push)**

```sh
git push --force-with-lease=main:fb2ae34 origin linear/main:main
```

Expected: `+ fb2ae34...6347361 linear/main -> main (forced update)`. If it says `stale info`, stop.

### Task 3: Publish `feat/auth`

**Files:** none.

**Interfaces:**

- Consumes: Task 2.
- Produces: `origin/feat/auth` = `61eaaf2`.

- [ ] **Step 1: Push**

```sh
git push --force-with-lease=feat/auth:f8255c1 origin linear/feat-auth:feat/auth
```

Expected: `(forced update)`.

### Task 4: Publish The Task Branches (No Pull Requests For Two Of Them)

**Files:** none.

**Interfaces:**

- Consumes: Task 3.
- Produces: the three task branches on the remote, on top of the new `feat/auth`.

- [ ] **Step 1: Push**

```sh
git push --force-with-lease=chore/nestjs-migration:88e8f42 origin linear/chore-nestjs-migration:chore/nestjs-migration
git push --force-with-lease=feat/pagination-utils:6ab2b56 origin linear/feat-pagination-utils:feat/pagination-utils
git push --force-with-lease=feat/response-interceptor:6d2fea8 origin linear/feat-response-interceptor:feat/response-interceptor
```

Expected: three `(forced update)` lines.

`feat/pagination-utils` sits on `chore/nestjs-migration`; `feat/response-interceptor` sits on
`feat/auth` and has not been converted to ES modules yet. Neither gets a pull request in this plan.

### Task 5: Repoint The Local Branches And Remove The Temporary Ones

**Files:** none.

**Interfaces:**

- Consumes: Tasks 2 to 4.
- Produces: local branches equal to their remotes; no `linear/*` branches.

- [ ] **Step 1: Repoint**

```sh
git switch --detach
for b in main dev feat/auth chore/nestjs-migration feat/pagination-utils feat/response-interceptor; do
  git branch -f "$b" "linear/${b//\//-}"
done
git switch feat/auth
```

- [ ] **Step 2: Confirm against the remote**

```sh
git fetch --prune
git branch -vv | grep -E '^\*? *(main|dev|feat/auth|chore/nestjs-migration|feat/pagination-utils|feat/response-interceptor) '
```

Expected: none of the six shows `ahead` or `behind`.

- [ ] **Step 3: Delete the temporary branches**

Only after Step 2 passed:

```sh
git branch -D linear/main linear/dev linear/feat-auth linear/chore-nestjs-migration \
  linear/feat-pagination-utils linear/feat-response-interceptor
```

### Task 6: Open The `chore/nestjs-migration` Pull Request

> **Changed during execution (2026-10-08):** the maintainer chose a local fast-forward instead of a
> pull request. After Steps 1 and 2 pass, `feat/auth` takes `chore/nestjs-migration` with
> `git merge --ff-only` and a normal push; Step 3 is skipped, the branch is deleted, and
> `feat/pagination-utils` is rebased onto the new `feat/auth`. The first CI run also showed that a
> local action cannot check the repository out itself, so each job now checks out before calling it.

**Files:** none.

**Interfaces:**

- Consumes: Task 5.
- Produces: one open pull request, `chore/nestjs-migration` → `feat/auth`.

- [ ] **Step 1: Run the checks locally**

```sh
git switch chore/nestjs-migration
npm ci
npx prisma generate
npm run typecheck && npm run lint && npm run build && npm test && npm run test:e2e
```

Expected: every command exits 0; 154 unit tests and 22 e2e tests pass.

- [ ] **Step 2: Run CI on the branch**

The workflow only triggers on pull requests to `main` and `dev`, so start it by hand:

```sh
gh workflow run CI --ref chore/nestjs-migration
gh run watch "$(gh run list --workflow CI --branch chore/nestjs-migration --limit 1 --json databaseId --jq '.[0].databaseId')"
```

Expected: the `build`, `lint` and `test` jobs succeed. This is also the first run with the
`Generate prisma files` step in `.github/actions/setup-node-deps/action.yml`.

- [ ] **Step 3: Create the pull request**

````sh
gh pr create --base feat/auth --head chore/nestjs-migration \
  --title "chore: migrate to NestJS 12, ESM, Vitest and oxlint" \
  --body-file - <<'EOF'
## Description

Upgrades NestJS to v12 and moves the project to ES modules, with the test and lint toolchain that
goes with it. The reasons are in `docs/adr/2026-09-25-es-modules-vitest-and-oxlint.md`.

- NestJS 12 packages, `"type": "module"`, `module`/`moduleResolution` `nodenext`; local imports end
  in `.js`, and `import.meta.dirname` replaces `__dirname`.
- Vitest replaces Jest (`vitest.config.ts`, `vitest.config.e2e.ts`); oxlint replaces ESLint
  (`.oxlintrc.json`, `unbound-method` off in specs); `tsx` replaces `ts-node`.
- Environment validated at startup by a Zod schema (`src/common/schemas/env.schema.ts`).
- `npm run typecheck` (`tsc --noEmit`) in CI; CI now generates the Prisma client.
- Docs: test, environment and Docker guides, instructions and the new ADR.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [x] Documentation update
- [x] Other: toolchain and framework upgrade

## How To Test

```sh
npm ci && npx prisma generate
npm run typecheck && npm run lint && npm run build && npm test && npm run test:e2e
docker compose up -d --build -V server   # renews the container's node_modules
```

A `.env` copied from `.env.example` must be filled in: blank values now fail startup validation.

## Checklist

- [x] My code/documentation follows the repository guidelines
- [x] I have performed a self-review of my changes
- [x] I have added necessary documentation (if appropriate)
- [ ] I have updated the change log (if appropriate)

## Additional Notes

`feat/pagination-utils` is stacked on this branch and is not ready for review yet.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
````

Expected: `gh` prints the pull request URL.

### Task 7: Repository Settings, Unused Branches And Other Clones

**Files:** none.

- [ ] **Step 1: Delete task branches on merge**

```sh
gh repo edit --delete-branch-on-merge
gh api repos/{owner}/{repo} --jq .delete_branch_on_merge
```

Expected: `true`.

- [ ] **Step 2: List the remote branches and decide which are unused**

```sh
git fetch --prune
git ls-remote --heads origin | sed 's#.*refs/heads/##'
gh pr list --state all --limit 50 --json number,headRefName,state --jq '.[] | "\(.number) \(.state) \(.headRefName)"'
```

A remote branch is **unused** when it is not long-lived (`main`, `dev`, `feat/auth`), has no open pull
request, and its content is already in `feat/auth`: `git cherry origin/feat/auth origin/<branch>`
prints no line starting with `+` (pull requests here are merged by rebase, so `git branch --merged`
does not see them).

Expected, as of 2026-10-07:

| Remote branch | Status | Action |
| --- | --- | --- |
| `main`, `dev`, `feat/auth` | Long-lived | Keep |
| `chore/nestjs-migration` | Open pull request (Task 6) | Keep |
| `feat/pagination-utils`, `feat/response-interceptor` | Work in progress | Keep |
| `docs/jsdoc-comments` | Pull request #15, merged into `feat/auth` | **Delete** |

Delete any other branch the listing shows only after checking it the same way, and ask the
maintainer if `git cherry` prints a `+` line.

- [ ] **Step 3: Delete the unused branches**

```sh
git push origin --delete docs/jsdoc-comments
git branch -D backup/pre-rebase/chore/docker-limits
git fetch --prune
git ls-remote --heads origin | sed 's#.*refs/heads/##'
```

Expected: the final listing shows only the six branches marked Keep. The local
`backup/pre-rebase/chore/docker-limits` is the pre-rebase copy of what became pull request #16.

From now on Step 1's setting deletes each task branch when its pull request merges.

- [ ] **Step 4: Reset every other clone**

On each other machine with this repository (the server included), for each branch it has checked out:

```sh
git fetch --prune
git switch <branch>
git reset --hard origin/<branch>
```

Never `git pull` there before the reset: it would merge the old history back in.

### Task 8: Record The Result In The Linear-History ADR

**Files:**

- Modify: `roobra-docs/adr/2026-10-06-keep-every-branch-linear.md` (section `## Implementation Status`)

- [ ] **Step 1: Branch in `roobra-docs`**

```sh
cd ../roobra-docs
git switch main && git pull --ff-only
git switch -c docs/linear-history-status
```

- [ ] **Step 2: Replace the `roobra-api` part of the Implementation Status**

Replace the sentence that starts with "Merge commits already in the history are not removed yet" so
the section reads:

```markdown
## Implementation Status

`roobra-api` was rewritten on 2026-10-07: `main` was rebased onto `dev`'s only commit, and the merges
`2a66395` (`main` into `dev`) and `c6c11e3` (`dev` into `feat/auth`) were removed, the second replaced
by a commit with the same tree. `main` ⊂ `dev` ⊂ `feat/auth` and no branch has a merge commit. The
`roobra-docs` merge of pull request 1 (`b223852`) on `main` is not removed yet; removing it needs a
force push the maintainer authorizes separately. "Create a merge commit" is disabled in both
repositories with this decision.
```

The ADR was `status: Draft` on 2026-10-07, so it can be edited. If it is `Accepted` by then, stop and
ask the maintainer: an accepted ADR only takes typo fixes.

- [ ] **Step 3: Check and commit**

```sh
npm run lint:md
python3 scripts/check-adr-status.py
git add adr/2026-10-06-keep-every-branch-linear.md
git commit -m "docs(adr): record the linear rewrite of roobra-api's branches"
```

Expected: both checks pass. Push and open the pull request only with the maintainer's go-ahead.

- [ ] **Step 4: Delete this plan**

Plans are transient: once Tasks 1 to 8 are done, delete
`docs/superpowers/plans/2026-10-07-linearize-branches-and-open-nestjs-pr.md` in `roobra-api` in the
next commit that touches `docs/`.
