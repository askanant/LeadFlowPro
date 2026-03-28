/**
 * Token Blacklist Service
 * Maintains an in-memory set of blacklisted tokens
 * For production, upgrade to Redis for distributed deployments
 */

const tokenBlacklist = new Set<string>();

export class TokenBlacklistService {
  /**
   * Add a token to the blacklist
   * Automatically removes it when the token would have expired anyway
   */
  static blacklist(token: string, expiresAt: Date): void {
    tokenBlacklist.add(token);

    // Set a timeout to remove the token from blacklist after expiry
    const expiryTime = expiresAt.getTime() - Date.now();
    if (expiryTime > 0) {
      setTimeout(() => {
        tokenBlacklist.delete(token);
      }, expiryTime);
    } else {
      // If already expired, remove immediately
      tokenBlacklist.delete(token);
    }
  }

  /**
   * Check if a token is blacklisted
   */
  static isBlacklisted(token: string): boolean {
    return tokenBlacklist.has(token);
  }

  /**
   * Remove a specific token from the blacklist
   */
  static remove(token: string): void {
    tokenBlacklist.delete(token);
  }

  /**
   * Clear all blacklisted tokens
   * Use with caution - should only be called in special circumstances
   */
  static clear(): void {
    tokenBlacklist.clear();
  }

  /**
   * Get the number of blacklisted tokens (for monitoring)
   */
  static size(): number {
    return tokenBlacklist.size;
  }
}
