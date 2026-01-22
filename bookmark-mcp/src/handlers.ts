import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { getBookmarks, isCaptureFileAvailable, Bookmark } from "./data-access.js";
import {
  findDuplicates,
  normalizeUrl,
  suggestTags,
  validateBookmarks,
  ValidationResult,
} from "./validation.js";

// ============================================================================
// Helper Functions: Formatting
// ============================================================================

/**
 * Formats a single bookmark with all details
 */
function formatBookmark(bookmark: Bookmark): string {
  const lines: string[] = [
    `ID: ${bookmark.id}`,
    `Title: ${bookmark.title}`,
    `URL: ${bookmark.url}`,
  ];

  if (bookmark.description) {
    lines.push(`Description: ${bookmark.description}`);
  }

  if (bookmark.tags && bookmark.tags.length > 0) {
    lines.push(`Tags: ${bookmark.tags.join(", ")}`);
  } else {
    lines.push(`Tags: (none)`);
  }

  lines.push(`Created: ${bookmark.createdAt}`);

  if (bookmark.updatedAt) {
    lines.push(`Updated: ${bookmark.updatedAt}`);
  }

  if (bookmark.color) {
    lines.push(`Color: ${bookmark.color}`);
  }

  if (bookmark.spaceId) {
    lines.push(`Space ID: ${bookmark.spaceId}`);
  }

  if (bookmark.preview) {
    lines.push(`\nPreview:`);
    if (bookmark.preview.siteName) {
      lines.push(`  Site Name: ${bookmark.preview.siteName}`);
    }
    if (bookmark.preview.previewTitle) {
      lines.push(`  Title: ${bookmark.preview.previewTitle}`);
    }
    if (bookmark.preview.previewDescription) {
      lines.push(`  Description: ${bookmark.preview.previewDescription}`);
    }
    if (bookmark.preview.faviconUrl) {
      lines.push(`  Favicon: ${bookmark.preview.faviconUrl}`);
    }
    if (bookmark.preview.ogImageUrl) {
      lines.push(`  OG Image: ${bookmark.preview.ogImageUrl}`);
    }
  }

  return lines.join("\n");
}

/**
 * Formats an array of bookmarks for list display
 */
function formatBookmarksList(bookmarks: Bookmark[]): string {
  if (bookmarks.length === 0) {
    return "(none)";
  }

  return bookmarks
    .map((bm) => {
      let entry = `[${bm.id}] ${bm.title}\n`;
      entry += `  URL: ${bm.url}\n`;

      if (bm.tags && bm.tags.length > 0) {
        entry += `  Tags: ${bm.tags.join(", ")}\n`;
      }

      entry += `  Created: ${bm.createdAt}`;

      if (bm.description) {
        entry += `\n  Description: ${bm.description}`;
      }

      return entry;
    })
    .join("\n\n");
}

/**
 * Formats a validation report
 */
function formatValidationReport(result: ValidationResult): string {
  const lines: string[] = ["Validation Report", "=================", ""];

  // Summary
  const totalIssues =
    result.schemaViolations.length +
    result.missingDescriptions.length +
    result.missingTags.length +
    result.genericTitles.length +
    result.shortDescriptions.length +
    result.invalidUrls.length +
    result.duplicates.size;

  lines.push("Summary:");
  lines.push(`  Schema violations: ${result.schemaViolations.length}`);
  lines.push(`  Missing descriptions: ${result.missingDescriptions.length}`);
  lines.push(`  Missing tags: ${result.missingTags.length}`);
  lines.push(`  Generic titles: ${result.genericTitles.length}`);
  lines.push(`  Short descriptions: ${result.shortDescriptions.length}`);
  lines.push(`  Invalid URLs: ${result.invalidUrls.length}`);
  lines.push(`  Duplicate groups: ${result.duplicates.size}`);
  lines.push(`  Total issues: ${totalIssues}`);
  lines.push("");

  // Schema violations
  if (result.schemaViolations.length > 0) {
    lines.push("Schema Violations:");
    for (const violation of result.schemaViolations) {
      lines.push(`  [${violation.id}] ${violation.field}: ${violation.issue}`);
    }
    lines.push("");
  }

  // Missing descriptions
  if (result.missingDescriptions.length > 0) {
    lines.push("Missing Descriptions:");
    for (const bm of result.missingDescriptions) {
      lines.push(`  [${bm.id}] ${bm.title}`);
    }
    lines.push("");
  }

  // Missing tags
  if (result.missingTags.length > 0) {
    lines.push("Missing Tags:");
    for (const bm of result.missingTags) {
      lines.push(`  [${bm.id}] ${bm.title}`);
    }
    lines.push("");
  }

  // Generic titles
  if (result.genericTitles.length > 0) {
    lines.push("Generic Titles:");
    for (const bm of result.genericTitles) {
      lines.push(`  [${bm.id}] ${bm.title}`);
    }
    lines.push("");
  }

  // Short descriptions
  if (result.shortDescriptions.length > 0) {
    lines.push("Short Descriptions:");
    for (const bm of result.shortDescriptions) {
      lines.push(`  [${bm.id}] ${bm.title}: "${bm.description}"`);
    }
    lines.push("");
  }

  // Invalid URLs
  if (result.invalidUrls.length > 0) {
    lines.push("Invalid URLs:");
    for (const bm of result.invalidUrls) {
      lines.push(`  [${bm.id}] ${bm.title}: ${bm.url}`);
    }
    lines.push("");
  }

  // Recommendations
  lines.push("Recommendations:");
  if (result.missingDescriptions.length > 0) {
    lines.push(
      `  - Add descriptions to ${result.missingDescriptions.length} bookmarks for better discoverability`
    );
  }
  if (result.missingTags.length > 0) {
    lines.push(
      `  - Add tags to ${result.missingTags.length} bookmarks for better organization`
    );
  }
  if (result.genericTitles.length > 0) {
    lines.push(
      `  - Update ${result.genericTitles.length} bookmarks with generic titles`
    );
  }
  if (result.invalidUrls.length > 0) {
    lines.push(
      `  - Fix ${result.invalidUrls.length} bookmarks with invalid URLs`
    );
  }
  if (result.duplicates.size > 0) {
    lines.push(
      `  - Consolidate ${result.duplicates.size} groups of duplicate bookmarks`
    );
  }

  return lines.join("\n");
}

/**
 * Formats duplicate report
 */
function formatDuplicateReport(
  duplicates: Map<string, Bookmark[]>
): string {
  if (duplicates.size === 0) {
    return "No duplicate URLs found";
  }

  const lines: string[] = [
    `Found ${duplicates.size} groups of duplicates:`,
    "",
  ];

  for (const [normalizedUrl, group] of duplicates) {
    lines.push(`Normalized URL: ${normalizedUrl}`);
    for (const bm of group) {
      lines.push(
        `  - [${bm.id}] ${bm.title}`
      );
      lines.push(`    Original: ${bm.url}`);
      lines.push(`    Created: ${bm.createdAt}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Formats tag suggestions
 */
function formatTagSuggestions(
  suggestions: Array<{ id: string; title: string; url: string; suggestions: string[] }>
): string {
  if (suggestions.length === 0) {
    return "No tag suggestions available";
  }

  const lines: string[] = [
    `Tag suggestions for ${suggestions.length} bookmark(s):`,
    "",
  ];

  for (const item of suggestions) {
    lines.push(`[${item.id}] ${item.title}`);
    lines.push(`  URL: ${item.url}`);

    try {
      const url = new URL(item.url);
      let domain = url.hostname || "";
      if (domain.startsWith("www.")) {
        domain = domain.slice(4);
      }
      lines.push(`  Domain: ${domain}`);
    } catch {
      // ignore invalid URLs
    }

    lines.push(`  Suggested tags: ${item.suggestions.join(", ")}`);
    lines.push("");
  }

  return lines.join("\n");
}

// ============================================================================
// Handler Functions
// ============================================================================

/**
 * Handler: capture_bookmarks
 * Provides instructions for capturing bookmarks from localStorage
 */
async function handleCaptureBookmarks(): Promise<{ content: any[] }> {
  // Check if dev server is running
  let serverRunning = false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    try {
      const response = await fetch("http://localhost:3000", {
        method: "HEAD",
        signal: controller.signal,
      });
      serverRunning = response.ok || response.status === 404;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    serverRunning = false;
  }

  const statusIcon = serverRunning ? "✅" : "⚠️";
  const statusText = serverRunning
    ? "Server is running"
    : "Server is not running (start it first)";

  const text = `To capture bookmarks from localStorage:

1. ${statusIcon} ${statusText}
2. Visit: http://localhost:3000/api/debug/capture-bookmarks
3. Wait for "✅ Captured!" message
4. Bookmarks will be saved to validator-check/bookmarks-captured.json

Then you can use other tools like:
  - count_bookmarks: Get total count
  - search_bookmarks: Find specific bookmarks
  - validate_bookmarks: Check for quality issues
  - get_duplicates: Find duplicate URLs
  - suggest_tags: Get tag recommendations
  - export_bookmarks: Export as JSON or CSV
  - list_tags: See all tags and their usage`;

  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

/**
 * Handler: count_bookmarks
 * Count total bookmarks
 */
async function handleCountBookmarks(): Promise<{ content: any[] }> {
  const bookmarks = await getBookmarks();
  const text = `Found ${bookmarks.length} bookmark${bookmarks.length !== 1 ? "s" : ""} in captured data`;

  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

/**
 * Handler: search_bookmarks
 * Search bookmarks by query and field
 */
async function handleSearchBookmarks(
  query: string,
  field: string = "all"
): Promise<{ content: any[] }> {
  const bookmarks = await getBookmarks();
  const queryLower = query.toLowerCase();

  const filtered = bookmarks.filter((bm) => {
    if (field === "title" || field === "all") {
      if (bm.title.toLowerCase().includes(queryLower)) return true;
    }
    if (field === "url" || field === "all") {
      if (bm.url.toLowerCase().includes(queryLower)) return true;
    }
    if (field === "tags" || field === "all") {
      if (bm.tags.some((tag) => tag.toLowerCase().includes(queryLower))) {
        return true;
      }
    }
    return false;
  });

  const fieldText = field === "all" ? "all fields" : field;
  let text = `Found ${filtered.length} bookmark${filtered.length !== 1 ? "s" : ""} matching "${query}" in ${fieldText}\n\n`;

  text += formatBookmarksList(filtered);

  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

/**
 * Handler: get_bookmark
 * Get full details of a single bookmark by ID
 */
async function handleGetBookmark(id: string): Promise<{ content: any[] }> {
  const bookmarks = await getBookmarks();
  const bookmark = bookmarks.find((bm) => bm.id === id);

  if (!bookmark) {
    return {
      content: [
        {
          type: "text",
          text: `Bookmark with ID "${id}" not found`,
        },
      ],
    };
  }

  const text = formatBookmark(bookmark);

  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

/**
 * Handler: list_tags
 * List all unique tags with counts
 */
async function handleListTags(): Promise<{ content: any[] }> {
  const bookmarks = await getBookmarks();

  // Count tag occurrences
  const tagCounts = new Map<string, number>();
  for (const bm of bookmarks) {
    for (const tag of bm.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  // Sort by count (descending), then alphabetically
  const sorted = Array.from(tagCounts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1]; // Count descending
    }
    return a[0].localeCompare(b[0]); // Alphabetical
  });

  let text = `Found ${tagCounts.size} unique tag${tagCounts.size !== 1 ? "s" : ""}:\n\n`;

  if (sorted.length === 0) {
    text += "(no tags)";
  } else {
    text += sorted.map(([tag, count]) => `${tag}: ${count} bookmark${count !== 1 ? "s" : ""}`).join("\n");
  }

  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

/**
 * Handler: export_bookmarks
 * Export bookmarks as JSON or CSV
 */
async function handleExportBookmarks(
  format: string,
  filter?: string
): Promise<{ content: any[] }> {
  let bookmarks = await getBookmarks();

  // Filter by tag if provided
  if (filter) {
    bookmarks = bookmarks.filter((bm) =>
      bm.tags.some((tag) => tag.toLowerCase() === filter.toLowerCase())
    );
  }

  let exportContent = "";
  const formatUpper = format.toLowerCase();

  if (formatUpper === "json") {
    exportContent = JSON.stringify(bookmarks, null, 2);
  } else if (formatUpper === "csv") {
    // CSV headers
    const headers = ["id", "title", "url", "tags", "description", "createdAt"];
    exportContent = headers.join(",") + "\n";

    // CSV rows
    for (const bm of bookmarks) {
      const row = [
        `"${bm.id}"`,
        `"${bm.title.replace(/"/g, '""')}"`,
        `"${bm.url.replace(/"/g, '""')}"`,
        `"${bm.tags.join(";")}"`,
        `"${(bm.description || "").replace(/"/g, '""')}"`,
        `"${bm.createdAt}"`,
      ];
      exportContent += row.join(",") + "\n";
    }
  }

  const filterText = filter ? ` with tag "${filter}"` : "";
  let text = `Exporting ${bookmarks.length} bookmark${bookmarks.length !== 1 ? "s" : ""}${filterText} as ${format.toUpperCase()}...\n\n`;
  text += exportContent;

  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

/**
 * Handler: validate_bookmarks
 * Run comprehensive validation checks
 */
async function handleValidateBookmarks(): Promise<{ content: any[] }> {
  const bookmarks = await getBookmarks();
  const result = validateBookmarks(bookmarks);

  const text = formatValidationReport(result);

  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

/**
 * Handler: get_duplicates
 * Find duplicate bookmarks
 */
async function handleGetDuplicates(): Promise<{ content: any[] }> {
  const bookmarks = await getBookmarks();
  const duplicates = findDuplicates(bookmarks);

  const text = formatDuplicateReport(duplicates);

  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

/**
 * Handler: suggest_tags
 * Suggest tags for bookmarks
 */
async function handleSuggestTags(
  bookmarkId?: string
): Promise<{ content: any[] }> {
  let bookmarks = await getBookmarks();

  // Filter by bookmark ID if provided
  if (bookmarkId) {
    bookmarks = bookmarks.filter((bm) => bm.id === bookmarkId);
    if (bookmarks.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `Bookmark with ID "${bookmarkId}" not found`,
          },
        ],
      };
    }
  }

  // Get suggestions for each bookmark
  const suggestions = bookmarks
    .map((bm) => {
      const suggested = suggestTags(bm);
      if (suggested.length === 0) {
        return null;
      }
      return {
        id: bm.id,
        title: bm.title,
        url: bm.url,
        suggestions: suggested,
      };
    })
    .filter((item) => item !== null) as Array<{
    id: string;
    title: string;
    url: string;
    suggestions: string[];
  }>;

  const text = formatTagSuggestions(suggestions);

  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

// ============================================================================
// Main Router Function
// ============================================================================

/**
 * Main handler that dispatches tool calls to appropriate handlers
 */
export async function handleToolCall(
  request: CallToolRequest
): Promise<{ content: any[] }> {
  const toolName = request.params.name;
  const toolArgs = (request.params.arguments || {}) as Record<string, any>;

  try {
    // Check if capture file exists (skip for capture_bookmarks tool)
    if (toolName !== "capture_bookmarks") {
      const captureFileExists = await isCaptureFileAvailable();
      if (!captureFileExists) {
        return {
          content: [
            {
              type: "text",
              text: 'No captured bookmarks found. Please run the "capture_bookmarks" tool first to capture your bookmarks from localStorage.',
            },
          ],
        };
      }
    }

    // Dispatch to appropriate handler
    switch (toolName) {
      case "capture_bookmarks":
        return await handleCaptureBookmarks();

      case "count_bookmarks":
        return await handleCountBookmarks();

      case "search_bookmarks":
        return await handleSearchBookmarks(
          toolArgs.query || "",
          toolArgs.field || "all"
        );

      case "get_bookmark":
        return await handleGetBookmark(toolArgs.id || "");

      case "list_tags":
        return await handleListTags();

      case "export_bookmarks":
        return await handleExportBookmarks(
          toolArgs.format || "json",
          toolArgs.filter
        );

      case "validate_bookmarks":
        return await handleValidateBookmarks();

      case "get_duplicates":
        return await handleGetDuplicates();

      case "suggest_tags":
        return await handleSuggestTags(toolArgs.bookmarkId);

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${toolName}`,
            },
          ],
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
    };
  }
}
