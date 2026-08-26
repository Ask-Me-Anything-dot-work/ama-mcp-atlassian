import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createConfluenceClient } from "../client/atlassian.js";
import { toADF } from "../client/adf.js";

export function registerConfluenceCommentTools(server: McpServer): void {
  server.tool(
    "confluence_add_comment",
    "Add a footer comment to a Confluence page.",
    {
      pageId: z.string().describe("Numeric page ID"),
      body: z.string().describe("Comment text as plain markdown. Converted to ADF before sending."),
    },
    async ({ pageId, body }) => {
      const client = await createConfluenceClient();
      const adfDoc = toADF(body);
      const comment = await client.comment.createFooterComment({
        pageId,
        body: { representation: "atlas_doc_format", value: adfDoc as unknown as string },
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(comment, null, 2) }],
      };
    },
  );
}
