import { Bookmark } from './data-access';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of validating a collection of bookmarks
 */
export interface ValidationResult {
  schemaViolations: Array<{
    id: string;
    field: string;
    issue: string;
  }>;
  duplicates: Map<string, Bookmark[]>;
  missingDescriptions: Bookmark[];
  missingTags: Bookmark[];
  genericTitles: Bookmark[];
  shortDescriptions: Bookmark[];
  invalidUrls: Bookmark[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Domain patterns for tag suggestions
 * Maps domain patterns to suggested tags
 */
const DOMAIN_PATTERNS: Record<string, string[]> = {
  'github.com': ['dev', 'code', 'version-control'],
  'stackoverflow.com': ['dev', 'reference', 'qa'],
  'developer.mozilla.org': ['documentation', 'web', 'reference', 'html', 'css', 'js'],
  'mdn.mozilla.org': ['documentation', 'web', 'reference', 'html', 'css', 'js'],
  'youtube.com': ['video', 'media'],
  'medium.com': ['blog', 'article'],
  'twitter.com': ['social', 'twitter'],
  'x.com': ['social', 'twitter'],
  'react.dev': ['react', 'documentation', 'frontend'],
  'nextjs.org': ['nextjs', 'documentation', 'frontend', 'react'],
  'tailwindcss.com': ['css', 'framework', 'styling'],
  'typescript.org': ['typescript', 'documentation', 'dev'],
  'nodejs.org': ['nodejs', 'javascript', 'documentation', 'dev'],
  'npm.org': ['npm', 'javascript', 'packages'],
  'npmjs.com': ['npm', 'javascript', 'packages'],
  'vercel.com': ['hosting', 'deployment', 'frontend'],
  'netlify.com': ['hosting', 'deployment', 'frontend'],
  'notion.so': ['productivity', 'notes'],
  'trello.com': ['productivity', 'management'],
  'figma.com': ['design', 'ui', 'ux'],
  'slack.com': ['communication', 'team'],
  'discord.com': ['communication', 'community'],
};

/**
 * List of generic titles that indicate low-quality bookmarks
 */
const GENERIC_TITLES = new Set([
  'untitled',
  'new tab',
  'page',
  'link',
  'bookmark',
  'article',
  'post',
  'website',
  'site',
  'url',
  'document',
  'note',
  'tab',
  'page 1',
  'home',
]);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if a URL is valid HTTP(S) URL
 * Rejects localhost, javascript:, file://, and other invalid schemes
 *
 * @param url - The URL string to validate
 * @returns true if URL is valid http(s), false otherwise
 */
function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.toLowerCase();

    // Only allow http and https protocols
    if (protocol !== 'http:' && protocol !== 'https:') {
      return false;
    }

    // Reject localhost URLs
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return false;
    }

    return true;
  } catch {
    // If URL parsing fails, it's invalid
    return false;
  }
}

/**
 * Normalizes a URL for duplicate detection
 * Removes www prefix, trailing slashes, and converts to lowercase
 *
 * @param url - The URL string to normalize
 * @returns Normalized URL string (hostname + pathname)
 *
 * @example
 * normalizeUrl('https://www.github.com/anthropics/claude-code')
 * // Returns: 'github.com/anthropics/claude-code'
 *
 * @example
 * normalizeUrl('https://GitHub.com/anthropics/claude-code/')
 * // Returns: 'github.com/anthropics/claude-code'
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    let hostname = parsed.hostname || '';

    // Remove www. prefix if present
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }

    // Get pathname and remove trailing slash
    let pathname = parsed.pathname;
    if (pathname.endsWith('/') && pathname.length > 1) {
      pathname = pathname.slice(0, -1);
    }

    // Combine hostname and pathname, convert to lowercase
    return (hostname + pathname).toLowerCase();
  } catch {
    // If URL parsing fails, return lowercased URL as-is
    return url.toLowerCase();
  }
}

/**
 * Finds duplicate bookmarks based on normalized URL comparison
 * Groups bookmarks by normalized URL and returns only groups with 2+ entries
 *
 * @param bookmarks - Array of bookmarks to check for duplicates
 * @returns Map where key is normalized URL and value is array of duplicate bookmarks
 *          Only includes URLs that appear 2+ times, sorted by createdAt (oldest first)
 */
export function findDuplicates(bookmarks: Bookmark[]): Map<string, Bookmark[]> {
  const urlMap = new Map<string, Bookmark[]>();

  // Group bookmarks by normalized URL
  for (const bookmark of bookmarks) {
    const normalized = normalizeUrl(bookmark.url);
    const existing = urlMap.get(normalized) || [];
    existing.push(bookmark);
    urlMap.set(normalized, existing);
  }

  // Create result map with only duplicates (2+ bookmarks)
  const result = new Map<string, Bookmark[]>();

  for (const [normalizedUrl, group] of urlMap) {
    if (group.length >= 2) {
      // Sort by createdAt (oldest first)
      const sorted = [...group].sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      result.set(normalizedUrl, sorted);
    }
  }

  return result;
}

/**
 * Suggests tags for a bookmark based on its domain
 * Returns tags that are not already present in the bookmark
 *
 * @param bookmark - The bookmark to suggest tags for
 * @returns Array of suggested tag strings not already in bookmark.tags
 *
 * @example
 * suggestTags({ url: 'https://github.com/user/repo', tags: ['dev'], ... })
 * // Returns: ['code', 'version-control'] (dev already present)
 */
export function suggestTags(bookmark: Bookmark): string[] {
  try {
    const url = new URL(bookmark.url);
    let hostname = url.hostname || '';

    // Remove www. prefix if present
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }

    // Look up domain pattern
    const suggestedTags = DOMAIN_PATTERNS[hostname] || [];

    // Filter out tags already present in bookmark
    const existingTagsLower = new Set(
      bookmark.tags.map(tag => tag.toLowerCase())
    );

    return suggestedTags.filter(
      tag => !existingTagsLower.has(tag.toLowerCase())
    );
  } catch {
    // If URL parsing fails, return empty array
    return [];
  }
}

/**
 * Validates a collection of bookmarks for quality and schema issues
 * Performs comprehensive checks including schema violations, duplicates,
 * missing information, and quality issues
 *
 * @param bookmarks - Array of bookmarks to validate
 * @returns ValidationResult containing all found issues categorized by type
 */
export function validateBookmarks(bookmarks: Bookmark[]): ValidationResult {
  const result: ValidationResult = {
    schemaViolations: [],
    duplicates: findDuplicates(bookmarks),
    missingDescriptions: [],
    missingTags: [],
    genericTitles: [],
    shortDescriptions: [],
    invalidUrls: [],
  };

  // Track bookmarks that have already been reported as violations
  const reportedAsViolation = new Set<string>();

  // Validate each bookmark
  for (const bookmark of bookmarks) {
    // Schema violation checks
    let hasViolation = false;

    // Check id field
    if (!bookmark.id || typeof bookmark.id !== 'string') {
      result.schemaViolations.push({
        id: bookmark.id || 'unknown',
        field: 'id',
        issue: 'Missing or invalid id field',
      });
      hasViolation = true;
    }

    // Check title field
    if (
      !bookmark.title ||
      typeof bookmark.title !== 'string' ||
      bookmark.title.length < 3
    ) {
      result.schemaViolations.push({
        id: bookmark.id || 'unknown',
        field: 'title',
        issue: 'Title must be a non-empty string with at least 3 characters',
      });
      hasViolation = true;
    }

    // Check url field
    if (!bookmark.url || typeof bookmark.url !== 'string') {
      result.schemaViolations.push({
        id: bookmark.id || 'unknown',
        field: 'url',
        issue: 'Missing or invalid url field',
      });
      hasViolation = true;
    }

    // Check tags field
    if (!Array.isArray(bookmark.tags)) {
      result.schemaViolations.push({
        id: bookmark.id || 'unknown',
        field: 'tags',
        issue: 'Tags must be an array',
      });
      hasViolation = true;
    }

    // Check createdAt field
    if (
      !bookmark.createdAt ||
      typeof bookmark.createdAt !== 'string'
    ) {
      result.schemaViolations.push({
        id: bookmark.id || 'unknown',
        field: 'createdAt',
        issue: 'Missing or invalid createdAt field',
      });
      hasViolation = true;
    } else {
      // Validate ISO8601 format
      try {
        new Date(bookmark.createdAt);
        // Check if it's a valid ISO8601 string
        if (!bookmark.createdAt.match(/^\d{4}-\d{2}-\d{2}/)) {
          result.schemaViolations.push({
            id: bookmark.id || 'unknown',
            field: 'createdAt',
            issue: 'createdAt must be in ISO8601 format',
          });
          hasViolation = true;
        }
      } catch {
        result.schemaViolations.push({
          id: bookmark.id || 'unknown',
          field: 'createdAt',
          issue: 'createdAt is not a valid date',
        });
        hasViolation = true;
      }
    }

    if (hasViolation) {
      reportedAsViolation.add(bookmark.id);
      continue;
    }

    // Check for duplicates (skip if already reported as violation)
    if (result.duplicates.size > 0) {
      let isDuplicate = false;
      for (const group of result.duplicates.values()) {
        if (group.some(b => b.id === bookmark.id)) {
          isDuplicate = true;
          break;
        }
      }
      if (isDuplicate) {
        reportedAsViolation.add(bookmark.id);
        continue;
      }
    }

    // Check for invalid URLs
    if (!isValidUrl(bookmark.url)) {
      result.invalidUrls.push(bookmark);
      reportedAsViolation.add(bookmark.id);
      continue;
    }

    // Check for missing description
    if (!bookmark.description || bookmark.description.length === 0) {
      result.missingDescriptions.push(bookmark);
    } else if (bookmark.description.length < 10) {
      // Check for short description
      result.shortDescriptions.push(bookmark);
    }

    // Check for missing tags
    if (
      !bookmark.tags ||
      !Array.isArray(bookmark.tags) ||
      bookmark.tags.length === 0
    ) {
      result.missingTags.push(bookmark);
    }

    // Check for generic titles
    if (GENERIC_TITLES.has(bookmark.title.toLowerCase())) {
      result.genericTitles.push(bookmark);
    }
  }

  return result;
}
