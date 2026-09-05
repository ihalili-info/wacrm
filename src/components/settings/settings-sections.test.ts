import { describe, expect, it } from 'vitest';
import {
  SECTION_META,
  SETTINGS_SECTIONS,
  resolveSection,
  sectionAllowedForRole,
  RESTRICTED_FALLBACK_SECTION,
} from './settings-sections';

describe('resolveSection', () => {
  it('maps legacy tab values onto their new home', () => {
    expect(resolveSection('tags')).toBe('fields');
    expect(resolveSection('custom-fields')).toBe('fields');
  });

  it('passes through a known section', () => {
    expect(resolveSection('members')).toBe('members');
  });

  it('falls back to overview for unknown / empty', () => {
    expect(resolveSection(null)).toBe('overview');
    expect(resolveSection('nope')).toBe('overview');
  });
});

describe('sectionAllowedForRole', () => {
  it('lets an admin (canEditSettings) open every section', () => {
    for (const s of SETTINGS_SECTIONS) {
      expect(sectionAllowedForRole(s, true)).toBe(true);
    }
  });

  it('restricts agents/viewers to the personal Account sections', () => {
    const allowed = SETTINGS_SECTIONS.filter((s) =>
      sectionAllowedForRole(s, false),
    );
    expect([...allowed].sort()).toEqual(['appearance', 'profile', 'security']);
  });

  it('blocks the account-wide Overview and every Workspace section', () => {
    const blocked = SETTINGS_SECTIONS.filter(
      (s) => !sectionAllowedForRole(s, false),
    );
    expect(blocked).toContain('overview');
    for (const s of SETTINGS_SECTIONS) {
      if (SECTION_META[s].group === 'workspace') {
        expect(blocked).toContain(s);
      }
    }
  });

  it('the restricted fallback is itself allowed for a restricted role', () => {
    expect(sectionAllowedForRole(RESTRICTED_FALLBACK_SECTION, false)).toBe(true);
  });
});
