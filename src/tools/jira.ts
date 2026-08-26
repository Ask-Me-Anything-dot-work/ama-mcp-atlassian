import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerJiraSearchTools } from "./jira-search.js";
import { registerJiraGetTools } from "./jira-get.js";
import { registerJiraCreateTools } from "./jira-create.js";
import { registerJiraUpdateTools } from "./jira-update.js";
import { registerJiraTransitionTools } from "./jira-transition.js";
import { registerJiraCommentTools } from "./jira-comment.js";
import { registerJiraProjectTools } from "./jira-projects.js";

export function registerJiraTools(server: McpServer): void {
  registerJiraSearchTools(server);
  registerJiraGetTools(server);
  registerJiraCreateTools(server);
  registerJiraUpdateTools(server);
  registerJiraTransitionTools(server);
  registerJiraCommentTools(server);
  registerJiraProjectTools(server);
}
