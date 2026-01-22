import { Tool } from "@modelcontextprotocol/sdk/types.js";

// ============================================================================
// Helper: Empty Schema
// ============================================================================

/**
 * Creates a JSON Schema for tools with no input parameters
 * @returns A JSON Schema object representing an empty object
 */
function emptySchema(): { type: "object"; properties: Record<string, never>; required: string[] } {
  return {
    type: "object",
    properties: {},
    required: [],
  };
}

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * All 9 MCP tool definitions for the Bookmark Vault
 * These are schema-only definitions; handlers are implemented in handlers.ts
 */
export const tools: Tool[] = [
  // =========================================================================
  // Group 1: Basic Tools (6)
  // =========================================================================

  /**
   * Tool 1: capture_bookmarks
   * Trigger the localStorage capture workflow
   */
  {
    name: "capture_bookmarks",
    description:
      "Trigger a bookmark capture from browser localStorage. Provides instructions for visiting the capture endpoint to save bookmarks to the Bookmark Vault project.",
    inputSchema: emptySchema(),
  },

  /**
   * Tool 2: count_bookmarks
   * Count total bookmarks
   */
  {
    name: "count_bookmarks",
    description: "Count the total number of bookmarks in the captured bookmark data.",
    inputSchema: emptySchema(),
  },

  /**
   * Tool 3: search_bookmarks
   * Search bookmarks by title, URL, or tags
   */
  {
    name: "search_bookmarks",
    description:
      "Search for bookmarks by matching against title, URL, or tags. Use 'all' to search across all fields, or specify 'title', 'url', or 'tags' to narrow the search.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search term to find in title, URL, or tags",
        },
        field: {
          type: "string",
          enum: ["title", "url", "tags", "all"],
          description: "Which field to search. Defaults to 'all'",
        },
      },
      required: ["query"],
    },
  },

  /**
   * Tool 4: get_bookmark
   * Get bookmark details by ID
   */
  {
    name: "get_bookmark",
    description:
      "Retrieve the full details of a specific bookmark by its ID, including title, URL, description, tags, creation date, and preview information.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique bookmark ID (UUID)",
        },
      },
      required: ["id"],
    },
  },

  /**
   * Tool 5: list_tags
   * List all unique tags with counts
   */
  {
    name: "list_tags",
    description:
      "List all unique tags across all bookmarks with the count of how many bookmarks have each tag. Helps identify tag usage patterns.",
    inputSchema: emptySchema(),
  },

  /**
   * Tool 6: export_bookmarks
   * Export bookmarks to JSON or CSV
   */
  {
    name: "export_bookmarks",
    description:
      "Export bookmarks in JSON or CSV format. Optionally filter by a specific tag. Returns formatted export string ready to save or copy.",
    inputSchema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["json", "csv"],
          description: "Export format: 'json' or 'csv'",
        },
        filter: {
          type: "string",
          description:
            "Optional tag to filter by. If provided, only bookmarks with this tag are exported",
        },
      },
      required: ["format"],
    },
  },

  // =========================================================================
  // Group 2: Validation Tools (3)
  // =========================================================================

  /**
   * Tool 7: validate_bookmarks
   * Run comprehensive validation checks
   */
  {
    name: "validate_bookmarks",
    description:
      "Run comprehensive validation checks on all bookmarks. Detects schema violations, missing data (descriptions, tags), generic titles, short descriptions, invalid URLs, and provides a detailed report with actionable recommendations.",
    inputSchema: emptySchema(),
  },

  /**
   * Tool 8: get_duplicates
   * Find bookmarks with duplicate URLs
   */
  {
    name: "get_duplicates",
    description:
      "Find bookmarks with duplicate URLs using normalized URL comparison. Removes www prefix, trailing slashes, and uses case-insensitive matching. Groups duplicates together by their original URLs and shows creation dates for deduplication decisions.",
    inputSchema: emptySchema(),
  },

  /**
   * Tool 9: suggest_tags
   * Analyze URLs and suggest tags
   */
  {
    name: "suggest_tags",
    description:
      "Analyze bookmark URLs and suggest relevant tags based on domain patterns. Uses pattern matching for 20+ popular domains (GitHub, React, MDN, etc.). Only suggests tags not already present. Shows reasoning by domain.",
    inputSchema: {
      type: "object",
      properties: {
        bookmarkId: {
          type: "string",
          description:
            "Optional bookmark ID. If provided, suggestions are for this specific bookmark. If omitted, suggestions for all bookmarks",
        },
      },
      required: [],
    },
  },
];
