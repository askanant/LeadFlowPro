/**
 * Sanitize a string to prevent XSS and injection attacks
 * Removes dangerous characters and protocols
 */
export function sanitize(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim() // Remove leading/trailing whitespace
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick=, etc)
    .slice(0, 10000); // Hard limit on length
}

/**
 * Sanitize an entire object recursively
 * Returns a new object with all string values sanitized
 */
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitize(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key as well to prevent prototype pollution
      const sanitizedKey = sanitize(key);

      if (typeof value === 'string') {
        sanitized[sanitizedKey] = sanitize(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[sanitizedKey] = sanitizeObject(value);
      } else {
        // Keep non-string values as-is (numbers, booleans, null)
        sanitized[sanitizedKey] = value;
      }
    }

    return sanitized;
  }

  // Return primitive values unchanged
  return obj;
}

/**
 * Validate that a string is only alphanumeric + basic punctuation
 * Useful for usernames, domain names, etc.
 */
export function isAlphanumeric(input: string, allowSpecial = ''): boolean {
  const pattern = new RegExp(`^[a-zA-Z0-9${allowSpecial}]*$`);
  return pattern.test(input);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
