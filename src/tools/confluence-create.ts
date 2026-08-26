import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createConfluenceClient } from "../client/atlassian.js";
import { toADF } from "../client/adf.js";

export function registerConfluenceCreateTools(server: McpServer): void {
  server.tool(
    "confluence_create_page",
    "Create a new Confluence page in the specified space.",
    {
      spaceId: z.string().describe("Numeric space ID. Use confluence_get_spaces to look up IDs by name or key."),
      title: z.string().describe("Page title"),
      body: z.string().describe("Page content as plain markdown. Converted to ADF before sending."),
      parentId: z.string().optional().describe("Numeric ID of parent page. If omitted, page is created at space root."),
      status: z.enum(["current", "draft"]).optional().describe('"current" (published, default) or "draft"'),
    },
    async ({ spaceId, title, body, parentId, status }) => {
      const client = await createConfluenceClient();
      const adfDoc = toADF(body);
      const params = {
        spaceId,
        title,
        body: { representation: "atlas_doc_format", value: adfDoc as unknown as string },
        ...(parentId ? { parentId } : {}),
        status: status ?? "current",
      } as Parameters<typeof client.page.createPage>[0];
      const page = await client.page.createPage(params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(page, null, 2) }],
      };
    },
  );
}
