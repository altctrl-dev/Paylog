/**
 * Fuzzy String Matching Utilities
 *
 * Provides fuzzy matching for duplicate vendor name detection.
 * Uses Levenshtein distance algorithm (no external dependencies).
 */

/**
 * Calculate Levenshtein distance between two strings
 *
 * Measures the minimum number of single-character edits (insertions, deletions, substitutions)
 * required to change one string into the other.
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Distance value (0 = identical)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create 2D array for dynamic programming
  const dp: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    dp[0][j] = j;
  }

  // Fill DP table
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // Deletion
        dp[i][j - 1] + 1,      // Insertion
        dp[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return dp[len1][len2];
}

/**
 * Calculate similarity ratio between two strings
 *
 * Returns a value between 0 (completely different) and 1 (identical).
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity ratio (0-1)
 */
export function similarityRatio(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;

  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  return 1 - distance / maxLength;
}

/**
 * Find similar strings in a list
 *
 * Returns strings that exceed the similarity threshold.
 *
 * @param query - Query string
 * @param candidates - List of candidate strings
 * @param threshold - Similarity threshold (0-1, default: 0.8)
 * @returns Array of similar strings with scores
 */
export function findSimilar(
  query: string,
  candidates: string[],
  threshold: number = 0.8
): Array<{ value: string; score: number }> {
  const normalizedQuery = query.toLowerCase().trim();

  const results = candidates
    .map((candidate) => {
      const normalizedCandidate = candidate.toLowerCase().trim();
      const score = similarityRatio(normalizedQuery, normalizedCandidate);

      return {
        value: candidate,
        score,
      };
    })
    .filter((result) => result.score >= threshold)
    .sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Check if a string is similar to any in a list
 *
 * Returns true if any candidate exceeds the similarity threshold.
 *
 * @param query - Query string
 * @param candidates - List of candidate strings
 * @param threshold - Similarity threshold (0-1, default: 0.8)
 * @returns True if similar match found
 */
export function hasSimilar(
  query: string,
  candidates: string[],
  threshold: number = 0.8
): boolean {
  return findSimilar(query, candidates, threshold).length > 0;
}

/**
 * Get best match from a list of candidates
 *
 * Returns the most similar string if it exceeds the threshold.
 *
 * @param query - Query string
 * @param candidates - List of candidate strings
 * @param threshold - Similarity threshold (0-1, default: 0.8)
 * @returns Best match or null
 */
export function getBestMatch(
  query: string,
  candidates: string[],
  threshold: number = 0.8
): { value: string; score: number } | null {
  const similar = findSimilar(query, candidates, threshold);
  return similar.length > 0 ? similar[0] : null;
}
