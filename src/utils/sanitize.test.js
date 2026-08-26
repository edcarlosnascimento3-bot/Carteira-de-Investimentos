import { describe, it, expect } from 'vitest';

function sanitizeDbName(name) {
  if (typeof name !== 'string') return '';
  return name.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

describe('sanitizeDbName', () => {
  it('allows alphanumeric, underscore, hyphen', () => {
    expect(sanitizeDbName('my-db_123')).toBe('my-db_123');
  });

  it('removes path traversal characters', () => {
    expect(sanitizeDbName('../etc/passwd')).toBe('etcpasswd');
    expect(sanitizeDbName('db/../../secret')).toBe('dbsecret');
  });

  it('removes special characters', () => {
    expect(sanitizeDbName('db name with spaces')).toBe('dbnamewithspaces');
    expect(sanitizeDbName('db@#$%name')).toBe('dbname');
  });

  it('truncates to 64 characters', () => {
    const long = 'a'.repeat(100);
    expect(sanitizeDbName(long)).toHaveLength(64);
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeDbName(null)).toBe('');
    expect(sanitizeDbName(undefined)).toBe('');
    expect(sanitizeDbName(123)).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeDbName('')).toBe('');
  });
});
