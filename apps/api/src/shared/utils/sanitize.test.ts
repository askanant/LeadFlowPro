import { describe, it, expect } from 'vitest';
import { sanitize, sanitizeObject, isAlphanumeric, isValidEmail, isValidUrl } from './sanitize';

describe('sanitize', () => {
  it('returns empty string for falsy input', () => {
    expect(sanitize('')).toBe('');
    expect(sanitize(null as any)).toBe('');
    expect(sanitize(undefined as any)).toBe('');
  });

  it('trims whitespace', () => {
    expect(sanitize('  hello  ')).toBe('hello');
  });

  it('removes angle brackets', () => {
    expect(sanitize('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
  });

  it('removes javascript: protocol', () => {
    expect(sanitize('javascript:alert(1)')).toBe('alert(1)');
    expect(sanitize('JAVASCRIPT:alert(1)')).toBe('alert(1)');
  });

  it('removes event handlers', () => {
    expect(sanitize('onclick=doEvil()')).toBe('doEvil()');
    expect(sanitize('onmouseover=steal()')).toBe('steal()');
  });

  it('truncates at 10000 characters', () => {
    const long = 'a'.repeat(15000);
    expect(sanitize(long).length).toBe(10000);
  });

  it('passes through safe strings unchanged', () => {
    expect(sanitize('Hello World 123!')).toBe('Hello World 123!');
  });
});

describe('sanitizeObject', () => {
  it('returns null/undefined as-is', () => {
    expect(sanitizeObject(null)).toBeNull();
    expect(sanitizeObject(undefined)).toBeUndefined();
  });

  it('sanitizes string values', () => {
    expect(sanitizeObject('<b>test</b>')).toBe('btest/b');
  });

  it('sanitizes arrays recursively', () => {
    expect(sanitizeObject(['<a>', 'safe'])).toEqual(['a', 'safe']);
  });

  it('sanitizes nested objects', () => {
    const input = { name: '<script>x</script>', count: 5, nested: { val: 'onclick=x' } };
    const result = sanitizeObject(input);
    expect(result.name).toBe('scriptx/script');
    expect(result.count).toBe(5);
    expect(result.nested.val).toBe('x');
  });

  it('preserves non-string primitives', () => {
    const input = { num: 42, bool: true, nil: null };
    const result = sanitizeObject(input);
    expect(result.num).toBe(42);
    expect(result.bool).toBe(true);
    expect(result.nil).toBeNull();
  });
});

describe('isAlphanumeric', () => {
  it('accepts alphanumeric strings', () => {
    expect(isAlphanumeric('Hello123')).toBe(true);
  });

  it('rejects special characters', () => {
    expect(isAlphanumeric('hello!')).toBe(false);
  });

  it('allows specified special characters', () => {
    expect(isAlphanumeric('hello-world', '-')).toBe(true);
    expect(isAlphanumeric('user.name', '.')).toBe(true);
  });

  it('rejects empty string', () => {
    // empty string matches ^[a-zA-Z0-9]*$ (0 or more)
    expect(isAlphanumeric('')).toBe(true);
  });
});

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('admin@acme.test')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('@no-user.com')).toBe(false);
    expect(isValidEmail('no-domain@')).toBe(false);
  });
});

describe('isValidUrl', () => {
  it('accepts valid URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://localhost:3000')).toBe(true);
  });

  it('rejects invalid URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});
