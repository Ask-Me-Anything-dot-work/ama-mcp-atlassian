import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerJiraTools } from "./tools/jira.js";
import { registerConfluenceTools } from "./tools/confluence.js";
import { registerMetaTools } from "./tools/meta.js";

const server = new McpServer({ name: "ama-mcp-atlassian", version: "0.1.0" });

registerJiraTools(server);
registerConfluenceTools(server);
registerMetaTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
