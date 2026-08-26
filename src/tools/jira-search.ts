import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createJiraClient } from "../client/atlassian.js";

const DEFAULT_FIELDS = [
  "summary",
  "status",
  "assignee",
  "priority",
  "issuetype",
  "created",
  "updated",
];

export function registerJiraSearchTools(server: McpServer): void {
  server.tool(
    "jira_search_issues",
    "Search Jira issues using JQL. Returns a list of matching issues with key, summary, status, assignee, and priority.",
    {
      jql: z.string().describe("JQL query string"),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .describe("Max issues to return (1-100, default 20)"),
      fields: z
        .array(z.string())
        .optional()
        .describe("Fields to include in results"),
    },
    async ({ jql, maxResults, fields }) => {
      const client = await createJiraClient();
      const result = await client.issueSearch.searchAndReconsileIssuesUsingJql({
        jql,
        maxResults,
        fields: fields ?? DEFAULT_FIELDS,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
