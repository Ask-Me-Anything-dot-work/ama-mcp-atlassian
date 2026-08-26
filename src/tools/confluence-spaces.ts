import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createConfluenceClient } from "../client/atlassian.js";

export function registerConfluenceSpaceTools(server: McpServer): void {
  server.tool(
    "confluence_get_spaces",
    "List Confluence spaces accessible to the authenticated user. Returns space ID, key, name, type, and homepage ID.",
    {
      limit: z.number().int().min(1).max(50).default(25).describe("Max results (1-50, default 25)"),
      type: z.enum(["global", "personal"]).optional().describe('Filter by type: "global" or "personal"'),
    },
    async ({ limit, type }) => {
      const client = await createConfluenceClient();
      const result = await client.space.getSpaces({
        limit,
        type: type ?? undefined,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
