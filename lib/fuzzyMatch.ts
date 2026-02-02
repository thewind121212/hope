import type { TagWithCount } from "@/lib/tagsStorage";

/**
 * Simple fuzzy match scoring.
 * Returns 0-1 score where 1 is exact match.
 *
 * @example
 * fuzzyMatch("react", "react") // 1 (exact)
 * fuzzyMatch("re", "react") // 0.95 (starts with)
 * fuzzyMatch("act", "react") // 0.9 (contains)
 * fuzzyMatch("rct", "react") // ~0.7 (fuzzy)
 * fuzzyMatch("xyz", "react") // 0 (no match)
 */
export function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact match
  if (q === t) return 1;

  // Starts with (higher priority than contains)
  if (t.startsWith(q)) return 0.95;

  // Contains (substring)
  if (t.includes(q)) return 0.9;

  // Fuzzy: all query chars must appear in order
  let qIdx = 0;
  let score = 0;
  let consecutive = 0;

  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) {
      score += 1 + consecutive * 0.5; // Bonus for consecutive matches
      consecutive++;
      qIdx++;
    } else {
      consecutive = 0;
    }
  }

  // All query chars found?
  if (qIdx < q.length) return 0;

  // Normalize score (0-1), capped below contains/startsWith scores
  const maxScore = q.length + (q.length - 1) * 0.5;
  return Math.min(score / maxScore, 0.89);
}

/**
 * Sort tags by match quality, then by usage count.
 * Returns only tags with score > 0.
 *
 * Sort order: exact → starts-with → contains → fuzzy → by count (descending)
 */
export function sortByMatchQuality(
  tags: TagWithCount[],
  query: string
): TagWithCount[] {
  if (!query.trim()) {
    return [...tags].sort((a, b) => b.count - a.count);
  }

  return [...tags]
    .map((tag) => ({ tag, score: fuzzyMatch(query, tag.name) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      // Sort by score descending, then by count descending
      if (b.score !== a.score) return b.score - a.score;
      return b.tag.count - a.tag.count;
    })
    .map(({ tag }) => tag);
}
