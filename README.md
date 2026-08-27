# ama-mcp-atlassian

Standalone TypeScript MCP server wrapping the Atlassian REST API (Jira + Confluence). Works standalone via env vars or registry-integrated via [ama-mcp-registry](https://github.com/Ask-Me-Anything-dot-work/ama-mcp-registry).

## Install

```bash
npx -y @ama-work/mcp-atlassian
# or
bunx @ama-work/mcp-atlassian
```

## Usage

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "npx",
      "args": ["-y", "@ama-work/mcp-atlassian"],
      "env": {
        "ATLASSIAN_EMAIL": "you@company.com",
        "ATLASSIAN_API_TOKEN": "your-api-token",
        "ATLASSIAN_CLOUD_ID": "your-cloud-id"
      }
    }
  }
}
```

> Works with `bunx` too — replace `npx` with `bunx` and remove `-y`.

### Standalone mode

Provide your Atlassian credentials directly via environment variables.

**1. Create an API token:**

Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens) and create a new token.

**2. Find your Cloud ID:**

Your Cloud ID is the first part of your Atlassian URL. For example, if your Jira is at `https://mycompany.atlassian.net`, your Cloud ID is `mycompany`.

**3. Configure the env vars:**

```
ATLASSIAN_EMAIL=you@company.com
ATLASSIAN_API_TOKEN=ATATT3xFfGF0...
ATLASSIAN_CLOUD_ID=mycompany
```

### Registry-integrated mode

If you run [ama-mcp-registry](https://github.com/Ask-Me-Anything-dot-work/ama-mcp-registry), the server fetches its token automatically:

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "npx",
      "args": ["-y", "@ama-work/mcp-atlassian"],
      "env": {
        "REGISTRY_URL": "https://your-registry.example.com",
        "INSTANCE_ID": "your-instance-id",
        "GATEWAY_PSK": "your-pre-shared-key"
      }
    }
  }
}
```

The token is cached and proactively refreshed 5 minutes before expiry.

## MCP Registry Integration

Import the canonical definition via URL:

```
https://raw.githubusercontent.com/Ask-Me-Anything-dot-work/ama-mcp-atlassian/main/definitions/atlassian.json
```

## Tools

**Jira:** `jira_search_issues`, `jira_get_issue`, `jira_create_issue`, `jira_update_issue`, `jira_transition_issue`, `jira_add_comment`, `jira_get_projects`

**Confluence:** `confluence_search`, `confluence_get_page`, `confluence_create_page`, `confluence_update_page`, `confluence_add_comment`, `confluence_get_spaces`

**Meta:** `atlassian_whoami`

## Development

```bash
bash bootstrap.sh
bun run typecheck
bun run lint
```

## License

MIT
