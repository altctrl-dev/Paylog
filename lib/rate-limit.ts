/**
 * Rate Limiting Utility for Next.js Server Actions
 * Sprint 13 Phase 1: Security Hardening
 *
 * Prevents brute force attacks on authentication endpoints
 */

import { LRUCache } from 'lru-cache';

type RateLimitOptions = {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max number of unique tokens per interval
};

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

/**
 * Create a rate limiter instance
 * @param options Configuration options
 * @returns Rate limiter function
 */
export function rateLimit(options?: RateLimitOptions) {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000, // Default: 60 seconds
  });

  return {
    /**
     * Check if a token has exceeded the rate limit
     * @param token Unique identifier (e.g., email, IP address)
     * @param limit Max requests per interval (default: 5)
     * @returns Rate limit result
     */
    check: async (token: string, limit: number = 5): Promise<RateLimitResult> => {
      const tokenCount = (tokenCache.get(token) as number[]) || [0];

      if (tokenCount[0] === 0) {
        tokenCache.set(token, [1]);
      } else {
        tokenCount[0] += 1;
        tokenCache.set(token, tokenCount);
      }

      const currentUsage = tokenCount[0];
      const isRateLimited = currentUsage > limit;

      return {
        success: !isRateLimited,
        limit,
        remaining: Math.max(0, limit - currentUsage),
        reset: Date.now() + (options?.interval || 60000),
      };
    },
  };
}

/**
 * Login rate limiter
 * - 5 attempts per minute per email
 * - Prevents credential stuffing and brute force attacks
 */
export const loginRateLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Support 500 unique emails per minute
});

/**
 * Password reset rate limiter
 * - 3 attempts per hour per email
 * - Prevents abuse of password reset flow
 */
export const passwordResetRateLimiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
});
