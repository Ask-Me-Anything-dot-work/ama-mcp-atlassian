# ama-mcp-atlassian

Standalone TypeScript MCP server wrapping the Atlassian REST API (Jira + Confluence). Works standalone via env vars or registry-integrated via [ama-mcp-registry](https://github.com/Ask-Me-Anything-dot-work/ama-mcp-registry).

## Install

```bash
npm install -g @ama-work/mcp-atlassian
# or
bunx @ama-work/mcp-atlassian
```

## Usage

### Standalone mode

Provide an Atlassian OAuth access token and your cloud ID directly:

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "bunx",
      "args": ["@ama-work/mcp-atlassian"],
      "env": {
        "ATLASSIAN_ACCESS_TOKEN": "your-oauth-access-token",
        "ATLASSIAN_CLOUD_ID": "your-atlassian-cloud-id"
      }
    }
  }
}
```

### Registry-integrated mode

If you run [ama-mcp-registry](https://github.com/Ask-Me-Anything-dot-work/ama-mcp-registry), the server fetches its token automatically:

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "bunx",
      "args": ["@ama-work/mcp-atlassian"],
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
