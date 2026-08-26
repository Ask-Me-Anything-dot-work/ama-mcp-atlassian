import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createJiraClient } from "../client/atlassian.js";

export function registerJiraProjectTools(server: McpServer): void {
  server.tool(
    "jira_get_projects",
    "List all Jira projects accessible to the authenticated user. Returns project key, name, type, and lead.",
    {
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50)
        .describe("Max projects to return (default 50)"),
      query: z.string().optional().describe("Optional name filter string"),
    },
    async ({ maxResults, query }) => {
      const client = await createJiraClient();
      const result = await client.projects.searchProjects({
        maxResults,
        query,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
