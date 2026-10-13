# Live smoke — Confluence write tools re-run (issue #26, PASS on 1.2.3)

> **Filename note:** path is the one approved in #26's plan (written when `1.2.2`
> was the expected target). The actual run happened 2026-10-13 against published
> **`1.2.3`** — the 1.2.2 attempt failed on step 2 (update path, see below) and
> #30/#32 shipped the follow-up fix before this passing re-run.

- **Date:** 2026-10-13
- **Session:** `issue-0-e1c7c8`
- **Executed via:** MCP gateway profile `ama-mcp-atlassian` (upstream `atlassian-ama`, tool namespace `atlassian-tm.*`), bare-host URL `http://host.docker.internal:3105/mcp/profiles/ama-mcp-atlassian`
- **Target:** space `2795995144` (DAWW), parent page `2827517958`
- **Package under test:** `@ama-work/mcp-atlassian@1.2.3` (npmjs, contains #19 fix `aec2ba4` + #32 fix `da020c7`)
- **Verdict:** **PASS** — all 4 steps (#20 steps 1–4) succeed. First fully passing run.

## Preflight (trigger conditions)

| Check | Result |
|---|---|
| npmjs `@ama-work/mcp-atlassian` | ✅ `npm view` → **1.2.3** (release commit `bfae77d`, merge `da020c7` = PR #32) |
| Consumption registry | npmjs — repo `.npmrc` → `registry=https://registry.npmjs.org`; `npm config get registry` → same. Verdaccio is not on this package's consumption path (`agents.md`: publishes to public npm) |
| Spawn definition | unpinned `bunx @ama-work/mcp-atlassian` (`definitions/atlassian.json`) → resolves npmjs latest at spawn |
| Gateway upstream `atlassian-ama` | `connected` (stdio, 14 tools), `GET /health` at `host.docker.internal:3105`; session `b8705358…` (profile `ama-mcp-atlassian`) created 2026-10-13T07:29Z. Host `journalctl` not reachable from this EE container → exact spawn timestamp not re-provable |
| **Behavioral proof artifact ≥ 1.2.3** | ✅ **step 2 update passed** (version 1 → 2, title/body persisted). Pre-#32 artifacts fail update deterministically (`id: must not be null`, 2/2 attempts on 2026-10-09). Update passing ⇒ running code contains `da020c7` ⇒ npm `1.2.3` |

## Results

| # | Step | Expected | Actual |
|---|---|---|---|
| 1 | `confluence_create_page` | 200 + page `id`/`title` (not the #18 `spaceId: must not be null` 400) | ✅ **PASS** — 200, `id=2862415873`, title persisted, `version.number=1`, `createdAt 2026-10-13T07:31:31Z` |
| 2 | `confluence_update_page` (`versionNumber: 1`) | 200, `version.number === 2`, title/body persisted | ✅ **PASS** — 200, `version.number=2` (`07:31:42Z`), title `…— updated` + body persisted |
| 3 | `confluence_add_comment` | comment created with rendered body | ✅ **PASS** — comment `id=2862514177`, storage-rendered HTML body (`07:31:55Z`) |
| 4 | `confluence_get_page` read-back | body round-trips step-2 markdown; `version === 2` | ✅ **PASS** — exact markdown round-trip, `version=2`, `lastModified 2026-10-13T07:31:42Z` |

### Step 1 — create (request shape)

```json
{
  "spaceId": "2795995144",
  "parentId": "2827517958",
  "title": "[SMOKE] mcp-atlassian #26 — Confluence write tools (1.2.3)",
  "body": "# Smoke run — issue #26 re-run on 1.2.3\n…Refs: #18 #19 #20 #26 #30 #32"
}
```

Response (key fields): `200` → `{"id":"2862415873","status":"current","spaceId":"2795995144","parentId":"2827517958","version":{"number":1,…},"body":{"storage":{…}}}`.

### Step 2 — update (request shape)

```json
{
  "pageId": "2862415873",
  "versionNumber": 1,
  "status": "current",
  "title": "[SMOKE] mcp-atlassian #26 — Confluence write tools (1.2.3) — updated",
  "body": "Smoke run — issue #26 re-run on 1.2.3 (updated).…"
}
```

Response (key fields): `200` → `{"id":"2862415873","title":"…— updated","version":{"number":2,…},"body":{"storage":{…}}}`.

This is the step that failed on published `1.2.2` with
`400 INVALID_REQUEST_BODY — id: must not be null` (2/2 attempts, 2026-10-09
14:34/14:36 UTC, session `issue-0-992999`), root-caused in #26's FAIL comment
and fixed by PR #32 (`id: pageId` inside `body` of
`src/tools/confluence-update.ts`).

### Step 3 — comment (request shape)

```json
{
  "pageId": "2862415873",
  "body": "[SMOKE] issue #26 — step 3 comment on `1.2.3`. …refs #18 #19 #20 #26."
}
```

Response: `200` → `{"id":"2862514177","pageId":"2862415873","version":{"number":1,…},"body":{"storage":{"value":"<p>[SMOKE] …</p>"}}}`.

### Step 4 — read-back (request shape)

```json
{ "pageId": "2862415873" }
```

Response: `200` → body is the exact step-2 markdown, `"version": 2`.

## History of this smoke (release chain)

1. **2026-10-09, `1.2.1` (pre-fix)** — FAIL: create returned
   `400 … spaceId: must not be null` (the #18 symptom). Log:
   [`2026-10-09-confluence-write-tools.md`](./2026-10-09-confluence-write-tools.md)
   (PR #24). Root cause: PR #19 merged but unreleased (non-conventional squash
   subject skipped semantic-release).
2. **2026-10-09, `1.2.2`** — partial FAIL (session `issue-0-992999`): steps 1/3/4
   pass, step 2 returns `400 … id: must not be null`. New wire-shape gap in the
   update path → issues #26/#30, fix PR #32.
3. **2026-10-10** — PR #32 merged (`da020c7`) → semantic-release published
   **`1.2.3`** (`bfae77d`).
4. **2026-10-13, `1.2.3`** — **PASS** (this log). All four #20 acceptance steps
   verified against the published package through the gateway.

## Created artifacts (live DAWW space — cleanup flag)

- Page `[SMOKE] mcp-atlassian #26 — Confluence write tools (1.2.3) — updated` →
  **`2862415873`** — https://tmjira.atlassian.net/wiki/spaces/DAWW/pages/2862415873/SMOKE+mcp-atlassian+26+Confluence+write+tools+1.2.3+updated
- Comment `2862514177` on that page.
- **Not deleted by default** — @thomasvanwijk remove manually if wanted (per #26 issue body).

## Verdict

**PASS.** #20's acceptance criteria (steps 1–4) are met on published
`1.2.3`. The PR recording this run carries `Closes #20` per #26's closing
mechanism; `Closes #26` attaches at submit.
