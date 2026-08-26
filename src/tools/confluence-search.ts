import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createConfluenceV1Client } from "../client/atlassian.js";

export function registerConfluenceSearchTools(server: McpServer): void {
  server.tool(
    "confluence_search",
    "Search Confluence content using CQL (Confluence Query Language). Returns matching pages, blog posts, and spaces with title, spaceKey, URL, and a short excerpt.",
    {
      cql: z.string().describe('CQL query string. Examples: space = "ENG" AND type = page AND text ~ "deploy", title = "Architecture Overview"'),
      limit: z.number().int().min(1).max(50).default(10).describe("Max results (1-50, default 10)"),
    },
    async ({ cql, limit }) => {
      const client = await createConfluenceV1Client();
      const result = await client.search.searchByCQL({ cql, limit });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
