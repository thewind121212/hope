# Bookmark MCP Server

An MCP (Model Context Protocol) server for interacting with Bookmark Vault bookmark data. This server allows Claude Code to capture, search, validate, and analyze bookmarks stored locally in your browser's localStorage.

## Overview

The Bookmark MCP Server bridges Claude Code with Bookmark Vault, a Next.js-based bookmark manager. It enables you to:

- **Capture** bookmarks from browser localStorage
- **Search** and explore bookmarks by title, URL, or tags
- **Validate** bookmark data for quality issues
- **Detect** duplicate URLs
- **Suggest** tags based on domain patterns
- **Export** bookmarks as JSON or CSV

Currently, the server operates in **local mode only** - it reads bookmarks from a locally captured file. Cloud sync modes (plaintext and end-to-end encrypted) are planned for future versions.

## Quick Start

### Installation

```bash
# Navigate to the MCP server directory
cd ~/.claude/mcp-servers/bookmark-mcp

# Install dependencies
npm install

# Build TypeScript
npm run build

# Verify the build
ls dist/
# Expected: index.js, tools.js, handlers.js, data-access.js, validation.js
```

### Verify Installation

```bash
# Test the server starts correctly
npm start
# You should see: "Bookmark MCP server running on stdio"
# Press Ctrl+C to exit

# Or use the development mode with watch
npm run dev
```

### Configure in Claude Code

After building, register the server in your Claude Code settings:

**File location:** `~/.claude/settings.json`

```json
{
  "mcpServers": {
    "bookmark-mcp": {
      "command": "node",
      "args": ["/Users/linh/.claude/mcp-servers/bookmark-mcp/dist/index.js"]
    }
  }
}
```

After configuration, restart Claude Code to load the MCP server.

## Project Structure

```
~/.claude/mcp-servers/bookmark-mcp/
├── src/
│   ├── index.ts           # Main MCP server entry point
│   ├── tools.ts           # Tool definitions (9 MCP tools with JSON schemas)
│   ├── handlers.ts        # Tool implementation handlers
│   ├── data-access.ts     # Bookmark data access and file I/O
│   └── validation.ts      # Validation logic (duplicates, tags, quality checks)
├── dist/                  # Compiled JavaScript output
├── package.json           # Dependencies and build scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## Features

The MCP server provides **9 tools** organized in three categories:

### Basic Tools (6)

1. **capture_bookmarks** - Trigger bookmark capture from localStorage
2. **count_bookmarks** - Count total bookmarks
3. **search_bookmarks** - Search by title, URL, or tags
4. **get_bookmark** - Get full details of a bookmark by ID
5. **list_tags** - List all tags with usage counts
6. **export_bookmarks** - Export bookmarks as JSON or CSV

### Validation Tools (3)

7. **validate_bookmarks** - Comprehensive quality checks
8. **get_duplicates** - Find duplicate URLs
9. **suggest_tags** - Suggest tags based on domain patterns

## Usage Guide

### capture_bookmarks

**What it does:** Triggers the bookmark capture workflow from browser localStorage. Provides instructions for visiting the capture endpoint.

**When to use:** Start here when you haven't captured bookmarks yet. Run this first before using other tools.

**Usage:** Ask Claude: "Capture my bookmarks"

**Prerequisites:** Bookmark Vault dev server must be running (`npm run dev` in the Bookmark Vault project)

**Output example:**
```
To capture bookmarks from localStorage:

1. ✅ Server is running
2. Visit: http://localhost:3000/api/debug/capture-bookmarks
3. Wait for "✅ Captured!" message
4. Bookmarks will be saved to validator-check/bookmarks-captured.json
```

**Notes:**
- Checks if the dev server is running and displays status
- Saves captured data to `validator-check/bookmarks-captured.json`
- File format: `{ version: 1, data: Bookmark[] }`

---

### count_bookmarks

**What it does:** Counts the total number of bookmarks in the captured bookmark data.

**When to use:** Get a quick overview of how many bookmarks you have.

**Usage:** Ask Claude: "How many bookmarks do I have?"

**Output example:**
```
Found 157 bookmarks in captured data
```

---

### search_bookmarks

**What it does:** Search for bookmarks by matching against title, URL, tags, or all fields.

**When to use:** Find specific bookmarks or groups of related bookmarks.

**Usage:** Ask Claude: "Find all my React bookmarks" or "Search for github in URLs"

**Parameters:**
- `query` (required): Search term to find
- `field` (optional): `title`, `url`, `tags`, or `all` (default: `all`)

**Output example:**
```
Found 5 bookmarks matching "react" in all fields

[uuid-1] React Documentation
  URL: https://react.dev
  Tags: react, documentation
  Created: 2024-01-15T10:30:00Z
  Description: Official React documentation and guides

[uuid-2] React Patterns
  URL: https://react-patterns.com
  Created: 2024-01-10T14:22:00Z
```

---

### get_bookmark

**What it does:** Retrieve the full details of a specific bookmark by its ID, including title, URL, description, tags, and preview metadata.

**When to use:** View complete information for a single bookmark when you have its ID.

**Usage:** Ask Claude: "Show me bookmark uuid-1" or provide the ID directly.

**Parameters:**
- `id` (required): The bookmark's unique UUID

**Output example:**
```
ID: uuid-1
Title: React Documentation
URL: https://react.dev
Description: Official React documentation
Tags: react, documentation
Created: 2024-01-15T10:30:00Z
Color: #FF6B6B
Preview:
  Site Name: React
  Title: React - A JavaScript library for building user interfaces
  Favicon: https://react.dev/favicon.ico
```

---

### list_tags

**What it does:** Lists all unique tags across your bookmarks with the count of how many bookmarks have each tag.

**When to use:** Understand tag usage patterns and identify gaps in your tagging strategy.

**Usage:** Ask Claude: "Show me all my tags" or "What tags do I use?"

**Output example:**
```
Found 23 unique tags:

react: 12 bookmarks
javascript: 18 bookmarks
documentation: 15 bookmarks
css: 8 bookmarks
web-development: 22 bookmarks
typescript: 7 bookmarks
```

---

### export_bookmarks

**What it does:** Export bookmarks in JSON or CSV format. Optionally filter by a specific tag.

**When to use:** Backup bookmarks, share them with others, or import into another tool.

**Usage:** Ask Claude: "Export my bookmarks as JSON" or "Export all React bookmarks as CSV"

**Parameters:**
- `format` (required): `json` or `csv`
- `filter` (optional): Tag name to filter by

**Output example (JSON):**
```json
[
  {
    "id": "uuid-1",
    "title": "React Documentation",
    "url": "https://react.dev",
    "description": "Official React documentation",
    "tags": ["react", "documentation"],
    "createdAt": "2024-01-15T10:30:00Z"
  },
  ...
]
```

**Output example (CSV):**
```
id,title,url,tags,description,createdAt
"uuid-1","React Documentation","https://react.dev","react;documentation","Official React documentation","2024-01-15T10:30:00Z"
```

---

### validate_bookmarks

**What it does:** Runs comprehensive quality checks on all bookmarks. Detects:
- Schema violations (invalid UUID, missing required fields)
- Missing descriptions
- Missing tags
- Generic or unhelpful titles
- Short or incomplete descriptions
- Invalid URLs (non-HTTPS, localhost, malformed)
- Duplicate URLs

**When to use:** Maintain bookmark quality and identify areas for improvement.

**Usage:** Ask Claude: "Validate my bookmarks" or "Check bookmark quality"

**Output example:**
```
Validation Report
=================

Summary:
  Schema violations: 0
  Missing descriptions: 12
  Missing tags: 8
  Generic titles: 3
  Short descriptions: 2
  Invalid URLs: 1
  Duplicate groups: 2
  Total issues: 28

Missing Descriptions:
  [uuid-5] Quick Link
  [uuid-12] Useful Site

Generic Titles:
  [uuid-3] Link
  [uuid-7] Website
  [uuid-15] Article

Recommendations:
  - Add descriptions to 12 bookmarks for better discoverability
  - Add tags to 8 bookmarks for better organization
  - Update 3 bookmarks with generic titles
  - Fix 1 bookmarks with invalid URLs
```

---

### get_duplicates

**What it does:** Finds bookmarks with duplicate URLs using normalized URL comparison. Removes www prefix, trailing slashes, and uses case-insensitive matching. Groups duplicates together.

**When to use:** Clean up your bookmark collection by identifying and removing redundant entries.

**Usage:** Ask Claude: "Find duplicate bookmarks" or "Show me duplicate URLs"

**Output example:**
```
Found 2 groups of duplicates:

Normalized URL: react.dev
  - [uuid-1] React Documentation
    Original: https://react.dev
    Created: 2024-01-15T10:30:00Z
  - [uuid-8] React Docs
    Original: https://www.react.dev/
    Created: 2024-02-01T15:45:00Z

Normalized URL: github.com/facebook/react
  - [uuid-12] React Repository
    Original: https://github.com/facebook/react
    Created: 2024-01-10T08:00:00Z
  - [uuid-19] React GitHub
    Original: https://www.github.com/facebook/react/
    Created: 2024-02-10T12:30:00Z
```

---

### suggest_tags

**What it does:** Analyzes bookmark URLs and suggests relevant tags based on domain patterns. Uses pattern matching for 20+ popular domains (GitHub, React, MDN, CSS-Tricks, etc.). Only suggests tags not already present.

**When to use:** Automatically tag bookmarks based on their domain, improving organization without manual work.

**Usage:** Ask Claude: "Suggest tags for my bookmarks" or "Suggest tags for bookmark uuid-1"

**Parameters:**
- `bookmarkId` (optional): UUID of a specific bookmark. If omitted, suggestions for all bookmarks.

**Output example:**
```
Tag suggestions for 5 bookmark(s):

[uuid-1] React Documentation
  URL: https://react.dev
  Domain: react.dev
  Suggested tags: react, javascript, documentation

[uuid-5] MDN Web Docs
  URL: https://developer.mozilla.org/en-US/docs/web
  Domain: developer.mozilla.org
  Suggested tags: javascript, css, documentation

[uuid-12] CSS-Tricks Article
  URL: https://css-tricks.com/article
  Domain: css-tricks.com
  Suggested tags: css, web-design
```

## How It Works

### Capture Flow

1. User runs `capture_bookmarks` tool
2. Tool provides the URL: `http://localhost:3000/api/debug/capture-bookmarks`
3. User visits this URL in their browser (with Bookmark Vault dev server running)
4. The debug endpoint extracts all bookmarks from `localStorage`
5. Data is saved to `validator-check/bookmarks-captured.json` in the Bookmark Vault project
6. File format: `{ version: 1, data: Bookmark[] }`

### Tool Execution Flow

1. Claude Code loads the MCP server via `settings.json` configuration
2. MCP server starts and registers 9 tools via `tools/list` response
3. User asks Claude to use a tool (e.g., "search for React bookmarks")
4. Claude sends `tools/call` request with tool name and arguments
5. MCP server's handler processes the request
6. Handler reads from `validator-check/bookmarks-captured.json`
7. Returns formatted results to Claude
8. Results displayed in Claude Code

### Data Flow

```
Bookmark Vault (Browser)
    ↓ (localStorage)
/api/debug/capture-bookmarks (extracts data)
    ↓
validator-check/bookmarks-captured.json (persists)
    ↓
data-access.ts (reads file asynchronously)
    ↓
handlers.ts (processes requests)
    ↓
Claude Code (displays results)
```

## Setup Instructions

### One-time Setup

```bash
# 1. Navigate to project
cd ~/.claude/mcp-servers/bookmark-mcp

# 2. Install dependencies
npm install

# 3. Build TypeScript to JavaScript
npm run build

# 4. Verify build succeeded
ls dist/
# You should see:
# - dist/index.js
# - dist/tools.js
# - dist/handlers.js
# - dist/data-access.js
# - dist/validation.js
```

### Register with Claude Code

Edit or create `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "bookmark-mcp": {
      "command": "node",
      "args": ["/Users/linh/.claude/mcp-servers/bookmark-mcp/dist/index.js"]
    }
  }
}
```

Then restart Claude Code.

## Workflow Examples

### Example 1: Organize and Analyze Bookmarks

**Goal:** Get an overview of your bookmarks and identify organization opportunities.

```
1. "Capture my bookmarks"
   → capture_bookmarks: Sets up captured data

2. "How many bookmarks do I have?"
   → count_bookmarks: Returns total count

3. "Show me all my tags"
   → list_tags: Shows tag usage and patterns

4. "Validate my bookmarks"
   → validate_bookmarks: Reports quality issues

5. "Suggest tags for all bookmarks"
   → suggest_tags: Provides tag recommendations
```

### Example 2: Clean Up Duplicates

**Goal:** Find and remove duplicate bookmarks.

```
1. "Capture my bookmarks"
   → capture_bookmarks

2. "Find duplicate bookmarks"
   → get_duplicates: Groups duplicates by normalized URL

3. Result: User manually removes duplicates from Bookmark Vault UI
```

### Example 3: Find and Export Category

**Goal:** Export all React-related bookmarks.

```
1. "Capture my bookmarks"
   → capture_bookmarks

2. "Find all my React bookmarks"
   → search_bookmarks with query="react"

3. "Export React bookmarks as CSV"
   → export_bookmarks with format="csv" and filter="react"

4. Result: CSV file ready to import elsewhere
```

### Example 4: Deep Dive into a Tag

**Goal:** Explore all bookmarks with a specific tag.

```
1. "Show me all bookmarks with the 'javascript' tag"
   → search_bookmarks with query="javascript" and field="tags"

2. "Export all javascript bookmarks as JSON"
   → export_bookmarks with format="json" and filter="javascript"
```

## Troubleshooting

### "No captured bookmark data found"

**Cause:** You haven't run `capture_bookmarks` yet, or the capture file doesn't exist.

**Solution:**
1. Run the `capture_bookmarks` tool
2. Follow the instructions to visit the capture endpoint
3. Ensure Bookmark Vault dev server is running (`npm run dev`)
4. Verify the file exists: `ls ~/Projects/ai-trainning/validator-check/bookmarks-captured.json`

---

### "Server is running but capture fails"

**Cause:** The Bookmark Vault dev server isn't running or the debug endpoint is disabled.

**Solution:**
1. Start Bookmark Vault dev server: `cd ~/Projects/ai-trainning && npm run dev`
2. Check environment variable: `echo $DEBUG_CAPTURE_ENABLED` (should be set in `.env.local`)
3. Visit endpoint directly: `http://localhost:3000/api/debug/capture-bookmarks`
4. Look for error message in browser console or terminal

---

### "MCP server not appearing in Claude Code"

**Cause:** Configuration issue or incorrect file path.

**Solution:**
1. Verify `~/.claude/settings.json` has the correct entry
2. Check the file path is absolute (not relative)
3. Ensure MCP server is built: `npm run build`
4. Test directly: `cd ~/.claude/mcp-servers/bookmark-mcp && npm start`
5. You should see: "Bookmark MCP server running on stdio"
6. Restart Claude Code after configuration changes

---

### "TypeScript compilation errors"

**Cause:** Dependencies not installed or outdated.

**Solution:**
```bash
cd ~/.claude/mcp-servers/bookmark-mcp
rm -rf node_modules dist/
npm install
npm run build
```

---

### "File not found: validator-check/bookmarks-captured.json"

**Cause:** Capture file is in wrong location.

**Solution:**
1. Check actual location: `find ~/ -name "bookmarks-captured.json" 2>/dev/null`
2. Verify Bookmark Vault project is at: `/Users/linh/Projects/ai-trainning`
3. If different, update `CAPTURE_FILE_PATH` in `/Users/linh/.claude/mcp-servers/bookmark-mcp/src/data-access.ts`

## File Descriptions

### index.ts

**Role:** Main MCP server entry point

**What it does:**
- Initializes the MCP server with name and version
- Registers handlers for `tools/list` and `tools/call` requests
- Creates stdio transport for communication with Claude Code
- Handles errors and exits gracefully

**Key exports:** None (executable via CLI)

---

### tools.ts

**Role:** Tool definitions

**What it does:**
- Defines 9 MCP tools with JSON schemas
- Each tool has: name, description, inputSchema
- Pure schema definitions (no implementation logic)
- Schemas define what parameters tools accept

**Key exports:** `tools` array of Tool objects

---

### handlers.ts

**Role:** Tool implementation handlers

**What it does:**
- Implements logic for all 9 tools
- Processes tool requests and arguments
- Formats output for display
- Calls data-access and validation functions
- Routes requests to appropriate handler functions

**Key exports:** `handleToolCall()` - main dispatcher

---

### data-access.ts

**Role:** Bookmark data access layer

**What it does:**
- Reads bookmark data from `validator-check/bookmarks-captured.json`
- Parses and validates JSON structure
- Provides async functions to access bookmarks
- Handles file errors gracefully
- Defines Bookmark and BookmarkPreview types

**Key exports:**
- `getBookmarks()` - Returns all bookmarks
- `isCaptureFileAvailable()` - Checks if file exists
- `getCaptureFilePath()` - Returns file path for debugging
- `Bookmark` interface

---

### validation.ts

**Role:** Validation and analysis logic

**What it does:**
- URL normalization (removes www, trailing slashes, lowercases)
- Duplicate URL detection
- Tag suggestions based on domain patterns
- Comprehensive quality checks
- Validates required fields and data format

**Key exports:**
- `validateBookmarks()` - Full validation report
- `findDuplicates()` - Find duplicate URLs
- `suggestTags()` - Suggest tags for a bookmark
- `ValidationResult` interface

## Future Extensions

The current server operates in **local mode only**. Future versions will support:

### Cloud Plaintext Mode (Future)

**What it will do:**
- Read bookmarks from cloud server in plaintext mode
- Requires Neon Postgres database connection
- New tools: `count_bookmarks_cloud`, `search_bookmarks_cloud`, etc.
- No encryption on the server

**When available:**
- Check for updates in repository
- Will require server configuration with database credentials

---

### Cloud E2E Mode (Future)

**What it will do:**
- Read bookmarks from cloud server with end-to-end encryption
- Requires passphrase and cloud credentials
- New tools: `count_bookmarks_e2e`, `search_bookmarks_e2e`, etc.
- Automatic decryption of vault data
- Server never sees plaintext

**When available:**
- Check for updates in repository
- Will require Clerk authentication and passphrase

## Development

### Adding a New Tool

To add a new tool to the MCP server:

1. **Add tool schema** in `src/tools.ts`:
   ```typescript
   {
     name: "my_tool",
     description: "What it does",
     inputSchema: { ... }
   }
   ```

2. **Implement handler** in `src/handlers.ts`:
   ```typescript
   async function handleMyTool(args: any) {
     // Implementation
     return { content: [{ type: "text", text: "..." }] };
   }
   ```

3. **Update router** in `src/handlers.ts`:
   ```typescript
   case "my_tool":
     return await handleMyTool(toolArgs);
   ```

4. **Test locally**:
   ```bash
   npm run build
   npm start
   ```

### Build and Watch

Watch for changes and recompile automatically:

```bash
npm run dev
```

### Testing Locally

```bash
# Terminal 1: Start MCP server
npm start

# Terminal 2: Test with sample input
# Send JSON-RPC requests to stdin
```

## Related Projects

- **Bookmark Vault:** https://github.com/yourusername/ai-trainning
- **MCP SDK:** https://github.com/modelcontextprotocol/python-sdk
- **Claude Code:** https://claude.com/claude-code

## License

MIT License - See LICENSE file in repository

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `npm run build && npm start`
5. Submit a pull request

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the workflow examples for common use cases
3. Open an issue on the repository
