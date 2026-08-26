import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerConfluenceSearchTools } from "./confluence-search.js";
import { registerConfluenceGetTools } from "./confluence-get.js";
import { registerConfluenceCreateTools } from "./confluence-create.js";
import { registerConfluenceUpdateTools } from "./confluence-update.js";
import { registerConfluenceCommentTools } from "./confluence-comment.js";
import { registerConfluenceSpaceTools } from "./confluence-spaces.js";

export function registerConfluenceTools(server: McpServer): void {
  registerConfluenceSearchTools(server);
  registerConfluenceGetTools(server);
  registerConfluenceCreateTools(server);
  registerConfluenceUpdateTools(server);
  registerConfluenceCommentTools(server);
  registerConfluenceSpaceTools(server);
}
