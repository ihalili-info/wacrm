import { describe, expect, it } from 'vitest';
import {
  generateTempPassword,
  isValidEmail,
  MIN_MEMBER_PASSWORD,
} from './provision-member';

describe('generateTempPassword', () => {
  it('returns the requested length', () => {
    expect(generateTempPassword()).toHaveLength(16);
    expect(generateTempPassword(24)).toHaveLength(24);
    expect(generateTempPassword(10)).toHaveLength(10);
  });

  it('clears the server-side minimum by default', () => {
    expect(generateTempPassword().length).toBeGreaterThanOrEqual(
      MIN_MEMBER_PASSWORD,
    );
  });

  it('omits visually ambiguous characters so a hand-off survives typing', () => {
    // No O/0, I/l/1 — a spoken or retyped password shouldn't be
    // transcribed into a different one.
    const sample = Array.from({ length: 40 }, () =>
      generateTempPassword(32),
    ).join('');
    expect(sample).not.toMatch(/[O0Il1]/);
  });

  it('uses only characters from the documented alphabet', () => {
    const sample = Array.from({ length: 20 }, () =>
      generateTempPassword(32),
    ).join('');
    expect(sample).toMatch(/^[A-HJ-KM-NP-Za-km-np-z2-9]+$/);
  });

  it('does not repeat across calls', () => {
    const seen = new Set(
      Array.from({ length: 200 }, () => generateTempPassword()),
    );
    expect(seen.size).toBe(200);
  });
});

describe('isValidEmail', () => {
  it.each([
    'a@b.co',
    'jane@balkania.ie',
    'first.last+tag@sub.example.com',
  ])('accepts %s', (value) => {
    expect(isValidEmail(value)).toBe(true);
  });

  it.each([
    '',
    'nope',
    'no@domain',
    'no@domain.c',
    'spaces in@example.com',
    'two@@example.com',
    '@example.com',
  ])('rejects %j', (value) => {
    expect(isValidEmail(value)).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(42)).toBe(false);
  });

  it('rejects an over-long address', () => {
    expect(isValidEmail(`${'a'.repeat(250)}@example.com`)).toBe(false);
  });
});
