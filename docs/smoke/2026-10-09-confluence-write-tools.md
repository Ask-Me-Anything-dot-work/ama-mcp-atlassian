# Live smoke — Confluence write tools (issue #20)

- **Date:** 2026-10-09
- **Session:** `issue-0-00a343`
- **Executed via:** MCP gateway profile `ama-mcp-atlassian` (upstream `atlassian-ama`, tool namespace `atlassian-tm.*`), bare-host URL `http://host.docker.internal:3105/mcp/profiles/ama-mcp-atlassian`
- **Target:** space `2795995144` (DAWW), parent page `2827517958`
- **Verdict:** **FAIL** — the deployed Confluence server still exhibits the pre-#19 wire shape. No page was created.

## Results

| # | Step | Expected | Actual |
|---|---|---|---|
| 1 | `confluence_create_page` | 200 + page `id`/`title` | **400** `INVALID_REQUEST_BODY — spaceId: must not be null` (exact #18 symptom) |
| 2 | `confluence_update_page` | 200, version 2 | not executed — prerequisite (page) failed |
| 3 | `confluence_add_comment` | comment created | not executed — prerequisite failed |
| 4 | `confluence_get_page` (read-back) | body round-trips | not executed for the new page; **read path itself verified healthy** (below) |

### Step 1 — create (identical result on 3 attempts)

Request shape (all attempts):

```json
{
  "spaceId": "2795995144",
  "parentId": "2827517958",
  "title": "[SMOKE] mcp-atlassian #20 — Confluence write tools",
  "body": "Live smoke test for issue #20 (refs: #18, PR #19) ..."
}
```

Response (attempts at 10:03, 10:27, and 10:41 UTC — the last one after a full
upstream eviction/spawn cycle):

```json
{
  "error": true,
  "text": "Request failed: 400 Bad Request - {\"errors\":[{\"status\":400,\"code\":\"INVALID_REQUEST_BODY\",\"title\":\"spaceId: must not be null\",\"detail\":null}]}"
}
```

### Read-path contrast (control)

`confluence_get_page` with `pageId: "2827517958"` returned 200 with full page
JSON (`title`, `spaceId: "2795995144"`, `status: "current"`, rendered markdown
`body`). Reads work; writes fail — exactly the bug class fixed in PR #19.

## Root cause

**The PR #19 fix is merged on `main` but was never released, so the
gateway-spawned server still runs published `1.2.1` (2026-08-27, pre-fix).**

Evidence chain:

1. **Code under test is correct on `main`.** Host clone at
   `/home/thomas/workspace/agent/ama-mcp-atlassian` is at `3cc67f9` (contains
   `aec2ba4` = PR #19). `src/tools/confluence-create.ts` nests fields under
   `parameters.body` and `JSON.stringify`s the ADF value.
2. **Local `dist/` rebuilt and still fails.** `dist/` (gitignored) was stale
   (2026-08-26, flat-params build). Rebuilt at 10:03 UTC with `bun run build`
   (verified: nested `body` + `JSON.stringify(adfDoc)` present).
3. **Fresh spawn still serves the old wire shape.** All gateway sessions
   holding the `atlassian-ama` upstream were released; the pool idle-evicted
   the upstream at 10:41 UTC (health: `status: "disconnected"`,
   `holding sessions: 0`). The next session triggered a fresh lazy-spawn, which
   still returned the exact pre-#19 400. The running artifact is therefore
   neither workspace `src/` nor workspace `dist/` — it is the published package.
4. **Publish registry confirms no release:** `@ama-work/mcp-atlassian` latest
   on both Verdaccio (`http://verdaccio.homelab`) and npmjs is `1.2.1`,
   published 2026-08-27 — before the fix (`aec2ba4`, 2026-10-09).
5. **Why no release:** semantic-release run for the #19 merge
   (run [37902172888](https://github.com/Ask-Me-Anything-dot-work/ama-mcp-atlassian/actions/runs/37902172888)):

   ```
   Analyzing commit: Fix #18: nest Confluence v2 write params under `body`, stringify ADF value (#19)
   The commit should not trigger a release
   ...
   There are no relevant changes, so no new version is released.
   ```

   The squash subject `Fix #18: ...` (capital `Fix`) is not a conventional
   commit to `@semantic-release/commit-analyzer` — and it also fails this
   repo's own `commitlint` locally (`✖ type may not be empty [type-empty]`).
   Squash-merge subjects come from PR titles on GitHub and never pass the
   local husky `commitlint` hook, so non-releasable titles merge silently and
   the release workflow exits green without publishing. The same gap applies
   to `Ref #21: ...` merges (#22, #23).

## Remediation

1. **Merge a PR whose title is a conventional `fix:`/`feat:`/`perf:` commit**
   (this PR qualifies) → semantic-release on `main` publishes `1.2.2` from
   `main` HEAD, which contains the PR #19 fix.
2. **Guard against recurrence** (in this PR): CI now lints PR titles with
   `commitlint` (`.github/workflows/ci.yml` → `pr-title` job), closing the
   GitHub-squash ↔ husky-commitlint gap.
3. **Re-run this smoke after `1.2.2` is published** and the gateway upstream
   has respawned (idle eviction ≤ 300 s after sessions release, or gateway
   restart). Then steps 1–4 are expected to pass.

## Side effects of this run

- No Confluence objects were created (every write attempt returned 400).
- Host workspace `dist/` was rebuilt (gitignored; matches `main` source).
- Gateway MCP sessions for profile `ama-mcp-atlassian` were cycled to force
  the upstream respawn (read-only effect on the gateway).
