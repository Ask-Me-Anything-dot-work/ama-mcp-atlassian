import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getToken } from "../config.js";

export function registerMetaTools(server: McpServer): void {
  server.tool(
    "atlassian_whoami",
    "Returns the identity of the currently authenticated Atlassian user — account ID, display name, email, and accessible site URLs.",
    {},
    async () => {
      const token = await getToken();
      const res = await fetch("https://api.atlassian.com/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: true, status: res.status, message: `Failed to fetch user info: ${res.statusText}` }) }],
        };
      }
      const data = await res.json();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
