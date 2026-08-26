import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createJiraClient } from "../client/atlassian.js";

export function registerMetaTools(server: McpServer): void {
  server.tool(
    "atlassian_whoami",
    "Get the current authenticated Atlassian user",
    {},
    async () => {
      const client = await createJiraClient();
      const user = await client.myself.getCurrentUser();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(user, null, 2) }],
      };
    },
  );
}
