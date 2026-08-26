# Agent Context — ama-mcp-atlassian

This document gives a dev agent everything needed to implement issues in this repo without prior project knowledge.

## What this repo is

A standalone, **publicly published** TypeScript MCP server (`@ama-work/mcp-atlassian`) that wraps the Atlassian REST API (Jira + Confluence). It exposes MCP tools over **stdio transport** using `@modelcontextprotocol/sdk`.

It has two operating modes:

### Mode 1 — Standalone (env vars)

The user provides an Atlassian OAuth access token directly via environment variables. No registry involved.

```
ATLASSIAN_ACCESS_TOKEN=<token>
ATLASSIAN_CLOUD_ID=<cloud-id>
```

### Mode 2 — Registry-integrated

The server fetches its token from a running `ama-mcp-registry` instance via a pre-shared key. This is how the homelab mesh uses it.

```
REGISTRY_URL=https://registry.example.com
INSTANCE_ID=<instance-id>
GATEWAY_PSK=<pre-shared-key>
```

At startup, `src/config.ts` checks for `ATLASSIAN_ACCESS_TOKEN`. If absent, it falls back to fetching from the registry.

## Registry secrets endpoint

```
GET /instances/:id/secrets
Authorization: Bearer <GATEWAY_PSK>
```

Response shape (`Secrets` type from ama-mcp-registry):

```json
{
  "env": {},
  "headers": {},
  "oauth": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_at": "2026-08-26T10:00:00.000Z",
    "scope": "read:jira-work write:jira-work ...",
    "cloud_id": "abc123-..."
  }
}
```

- `expires_at` is an ISO 8601 datetime string.
- `cloud_id` is stored here by the registry's OAuth flow — the server does **not** need to resolve it separately.
- If `oauth` is absent or `access_token` is missing, the server should exit with a clear error.

## Token cache & proactive refresh

`src/config.ts` must implement a token cache:
- Parse `expires_at` on fetch.
- Re-fetch from registry **5 minutes before** expiry (i.e. `Date.now() >= expiresAt - 5 * 60 * 1000`).
- In standalone mode no refresh is attempted — the token is static.

## Atlassian API base URLs

```
Jira REST v3:       https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/
Confluence REST v2: https://api.atlassian.com/ex/confluence/{cloudId}/wiki/api/v2/
WhoAmI:             https://api.atlassian.com/me
```

All requests inject `Authorization: Bearer <access_token>`.

## Toolset

### Jira (7 tools)
- `jira_search_issues` — JQL search
- `jira_get_issue` — single issue by key
- `jira_create_issue` — create issue
- `jira_update_issue` — update fields
- `jira_transition_issue` — change status
- `jira_add_comment` — add comment
- `jira_get_projects` — list projects

### Confluence (6 tools)
- `confluence_search` — CQL search
- `confluence_get_page` — get page content as markdown
- `confluence_create_page` — create page (markdown input → ADF)
- `confluence_update_page` — update page (markdown input → ADF)
- `confluence_add_comment` — add inline comment
- `confluence_get_spaces` — list spaces

### Meta (1 tool)
- `atlassian_whoami` — returns authenticated user info

All tool schemas use **Zod** and are registered via `@modelcontextprotocol/sdk`'s `registerTool`. Tools return structured JSON, never markdown prose.

## Project structure

```
src/
  index.ts          # stdio transport entrypoint
  config.ts         # token resolution (standalone or registry), cache + refresh
  client/
    atlassian.ts    # fetch wrapper: injects Authorization header, 401 retry
  tools/
    jira.ts         # all 7 Jira tools
    confluence.ts   # all 6 Confluence tools + atlassian_whoami
```

## Publishing

This repo publishes to **public npm** as `@ama-work/mcp-atlassian` via semantic-release on merge to `main`. The npm token is stored in the GitHub Actions secret `NPM_TOKEN`. Do not add an `.npmrc` pointing to a private registry.

## GitHub Actions

- `ci.yml` — typecheck + lint on PRs
- `release.yml` — semantic-release on push to `main` (publishes npm + creates GitHub release)

## Registry definition

Issue #4 requires committing `definitions/atlassian.json` — a canonical `McpDefinition` JSON for import into `ama-mcp-registry` via its GUI "import from URL" feature. The raw GitHub URL of that file is what gets pasted into the GUI.

Required OAuth fields:
```json
{
  "auth_strategy": "static_oauth",
  "oauth_config": {
    "authorization_url": "https://auth.atlassian.com/authorize",
    "token_url": "https://auth.atlassian.com/oauth/token",
    "scopes": [
      "read:jira-work",
      "write:jira-work",
      "read:confluence-content.all",
      "write:confluence-content",
      "read:me",
      "offline_access"
    ]
  }
}
```

## Dependencies

- **Runtime:** `@modelcontextprotocol/sdk`, `zod`
- **Dev:** `typescript`, `@biomejs/biome`, `husky`, `semantic-release` plugins
- **ADF conversion:** `@atlaskit/adf-utils` or a minimal custom renderer for Confluence tools
- **Runtime:** Bun
