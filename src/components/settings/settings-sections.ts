import {
  Coins,
  FileText,
  KeyRound,
  LayoutGrid,
  Palette,
  PlugZap,
  Shield,
  Tags,
  User,
  UsersRound,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Settings information architecture for the redesigned page.
 *
 * The flat tab strip became a grouped left rail with a new Overview
 * landing. The URL query param stays `?tab=` (deep-linkable, and it
 * keeps the existing links in sidebar.tsx / header.tsx working) — we
 * just map the old values onto the new sections.
 */
export const SETTINGS_SECTIONS = [
  'overview',
  'profile',
  'security',
  'appearance',
  'whatsapp',
  'templates',
  'quick-replies',
  'fields',
  'deals',
  'members',
  'api',
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const DEFAULT_SECTION: SettingsSection = 'overview';

/**
 * Rail grouping. `adminOnly` sections (every "Workspace" one) are hidden
 * from agents/viewers in the rail and blocked in `settings/page.tsx`;
 * the "Account" sections + Overview stay open to every role so anyone
 * can manage their own profile, password and appearance.
 */
export interface SectionMeta {
  id: SettingsSection;
  label: string;
  icon: LucideIcon;
  group: 'top' | 'account' | 'workspace';
  adminOnly?: boolean;
}

export const SECTION_META: Record<SettingsSection, SectionMeta> = {
  overview: { id: 'overview', label: 'Overview', icon: LayoutGrid, group: 'top' },
  profile: { id: 'profile', label: 'Your profile', icon: User, group: 'account' },
  security: { id: 'security', label: 'Login & security', icon: Shield, group: 'account' },
  appearance: { id: 'appearance', label: 'Appearance', icon: Palette, group: 'account' },
  whatsapp: { id: 'whatsapp', label: 'WhatsApp', icon: PlugZap, group: 'workspace', adminOnly: true },
  templates: { id: 'templates', label: 'Templates', icon: FileText, group: 'workspace', adminOnly: true },
  'quick-replies': { id: 'quick-replies', label: 'Quick replies', icon: Zap, group: 'workspace', adminOnly: true },
  fields: { id: 'fields', label: 'Fields & tags', icon: Tags, group: 'workspace', adminOnly: true },
  deals: { id: 'deals', label: 'Deals & currency', icon: Coins, group: 'workspace', adminOnly: true },
  members: { id: 'members', label: 'Team members', icon: UsersRound, group: 'workspace', adminOnly: true },
  api: { id: 'api', label: 'API keys', icon: KeyRound, group: 'workspace', adminOnly: true },
};

/**
 * Whether a role that can't edit settings (agent / viewer) may open
 * this section. They get the personal "Account" sections only —
 * profile, password/security, appearance — never the account-wide
 * Overview or any Workspace section.
 */
export function sectionAllowedForRole(
  s: SettingsSection,
  canEditSettings: boolean,
): boolean {
  return canEditSettings || SECTION_META[s].group === 'account';
}

/** Where a restricted user is sent when they hit a disallowed section. */
export const RESTRICTED_FALLBACK_SECTION: SettingsSection = 'profile';

export const RAIL_GROUPS: { label: string | null; group: SectionMeta['group'] }[] = [
  { label: null, group: 'top' },
  { label: 'Account', group: 'account' },
  { label: 'Workspace', group: 'workspace' },
];

function isSection(value: string | null): value is SettingsSection {
  return !!value && (SETTINGS_SECTIONS as readonly string[]).includes(value);
}

/**
 * Resolve a raw `?tab=` value to a section. Legacy tabs from the old
 * flat layout collapse onto their new home (Tags + Custom fields → the
 * merged "Fields & tags" section). Anything unknown falls back to the
 * Overview landing.
 */
export function resolveSection(raw: string | null): SettingsSection {
  if (raw === 'tags' || raw === 'custom-fields') return 'fields';
  if (isSection(raw)) return raw;
  return DEFAULT_SECTION;
}
