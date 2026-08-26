import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createConfluenceClient } from "../client/atlassian.js";
import { toADF } from "../client/adf.js";

export function registerConfluenceUpdateTools(server: McpServer): void {
  server.tool(
    "confluence_update_page",
    "Update the title and/or content of an existing Confluence page. Requires the current version number — Confluence rejects updates that omit it.",
    {
      pageId: z.string().describe("Numeric page ID"),
      title: z.string().describe("New title (required even if unchanged)"),
      body: z.string().describe("New content as plain markdown. Converted to ADF before sending."),
      versionNumber: z.number().int().describe("Current version number. Fetch with confluence_get_page first. Must increment by 1."),
    },
    async ({ pageId, title, body, versionNumber }) => {
      const client = await createConfluenceClient();
      const adfDoc = toADF(body);
      const params = {
        id: Number(pageId),
        title,
        body: { representation: "atlas_doc_format", value: adfDoc as unknown as string },
        version: { number: versionNumber + 1 },
        status: "current",
      } as Parameters<typeof client.page.updatePage>[0];
      const page = await client.page.updatePage(params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(page, null, 2) }],
      };
    },
  );
}
