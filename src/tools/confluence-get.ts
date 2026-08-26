import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createConfluenceClient } from "../client/atlassian.js";
import { fromADF } from "../client/adf.js";

export function registerConfluenceGetTools(server: McpServer): void {
  server.tool(
    "confluence_get_page",
    "Get the full content of a Confluence page by its numeric page ID. Returns title, spaceKey, body as markdown, version number, and last-modified date.",
    {
      pageId: z.string().describe('Numeric page ID (e.g. "98383"). Find IDs via confluence_search.'),
    },
    async ({ pageId }) => {
      const client = await createConfluenceClient();
      const page = await client.page.getPageById({
        id: Number(pageId),
        bodyFormat: "atlas_doc_format",
        includeVersion: true,
      });

      const body = page.body as Record<string, unknown> | undefined;
      const adfBody = body?.atlas_doc_format as { value?: string } | undefined;
      const markdown = adfBody?.value ? fromADF(JSON.parse(adfBody.value)) : "";

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            pageId: page.id,
            title: page.title,
            spaceId: page.spaceId,
            parentId: page.parentId,
            status: page.status,
            body: markdown,
            version: page.version?.number,
            lastModified: page.version?.createdAt,
          }, null, 2),
        }],
      };
    },
  );
}
