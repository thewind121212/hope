#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools.js";
import { handleToolCall } from "./handlers.js";

// ============================================================================
// Main Server Setup
// ============================================================================

/**
 * Main function to initialize and run the MCP server
 */
async function main(): Promise<void> {
  try {
    // Create the MCP server instance
    const server = new Server(
      {
        name: "bookmark-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Register the "tools/list" request handler
    // This handler returns the list of available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools };
    });

    // Register the "tools/call" request handler
    // This handler dispatches tool calls to the appropriate handlers
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return await handleToolCall(request);
    });

    // Create stdio transport for communication with Claude Code
    const transport = new StdioServerTransport();

    // Connect the server to the transport
    await server.connect(transport);

    // Log success message to stderr (stdout is reserved for MCP protocol)
    console.error("Bookmark MCP server running on stdio");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error("Uncaught error:", error);
  process.exit(1);
});
