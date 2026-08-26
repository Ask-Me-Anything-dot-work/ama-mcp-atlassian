import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createJiraClient } from "../client/atlassian.js";
import { toADF } from "../client/adf.js";

export function registerJiraCommentTools(server: McpServer): void {
  server.tool(
    "jira_add_comment",
    "Add a comment to a Jira issue.",
    {
      issueKey: z.string().describe("Issue key"),
      body: z
        .string()
        .describe("Comment text (plain text, auto-converted to ADF)"),
    },
    async ({ issueKey, body }) => {
      const client = await createJiraClient();
      const comment = await client.issueComments.addComment({
        issueIdOrKey: issueKey,
        body: toADF(body),
      } as never);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(comment, null, 2) }],
      };
    },
  );
}
