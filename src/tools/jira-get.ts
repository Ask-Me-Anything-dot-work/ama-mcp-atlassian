import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createJiraClient } from "../client/atlassian.js";

export function registerJiraGetTools(server: McpServer): void {
  server.tool(
    "jira_get_issue",
    "Get full details of a single Jira issue by its key (e.g. PROJ-123). Returns fields including summary, description, status, assignee, comments, and subtasks.",
    {
      issueKey: z.string().describe("Issue key (e.g. PROJ-42)"),
      fields: z
        .array(z.string())
        .optional()
        .describe("Fields to return. Omit for all fields."),
    },
    async ({ issueKey, fields }) => {
      const client = await createJiraClient();
      const issue = await client.issues.getIssue({
        issueIdOrKey: issueKey,
        fields,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(issue, null, 2) }],
      };
    },
  );
}
