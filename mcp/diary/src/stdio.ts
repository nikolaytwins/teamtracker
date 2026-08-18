import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createDiaryMcpServer } from "./server.js";

const server = createDiaryMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
