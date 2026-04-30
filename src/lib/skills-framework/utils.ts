import type { RawRow, RoleKey, RoleSummary } from './types';

const LEVEL_ALIAS_MAP = {
  basic: { sortValue: 1, badgeLabel: 'B', fullLabel: 'Basic' },
  intermediate: { sortValue: 2, badgeLabel: 'I', fullLabel: 'Intermediate' },
  intermidate: { sortValue: 2, badgeLabel: 'I', fullLabel: 'Intermediate' },
  advanced: { sortValue: 3, badgeLabel: 'A', fullLabel: 'Advanced' },
} as const;

function resolveLevelAlias(level: string) {
  const normalized = safeStr(level).toLowerCase();
  return LEVEL_ALIAS_MAP[normalized as keyof typeof LEVEL_ALIAS_MAP] ?? null;
}

export function safeStr(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

export function toBool(value: unknown): boolean {
  const text = safeStr(value).toLowerCase();
  return text === 'true' || text === 'yes' || text === '1' || text === 'y';
}

export function makeRoleKey(row: RawRow): RoleKey {
  return `${safeStr(row.Sector)}|||${safeStr(row.Track)}|||${safeStr(row['Job Role'])}`;
}

export function parseRoleKey(key: RoleKey): { sector: string; track: string; role: string } {
  const [sector, track, role] = key.split('|||');
  return {
    sector: sector ?? '',
    track: track ?? '',
    role: role ?? '',
  };
}

export function formatRoleLabel(role: Pick<RoleSummary, 'role' | 'track'>): string {
  return role.track ? `${role.role} · ${role.track}` : role.role;
}

export function isGenericSkillType(type: string): boolean {
  return safeStr(type).toLowerCase() === 'ccs';
}

export function formatTscCcsTypeLabel(type: string): string {
  const normalized = safeStr(type).toLowerCase();
  if (normalized === 'tsc' || normalized === 'tts') {
    return 'Technical';
  }
  if (normalized === 'ccs') {
    return 'Generic';
  }

  return safeStr(type) || 'N/A';
}

export function uniqueBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const output: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
  }

  return output;
}

export function getLevelSortValue(level: string): number | null {
  const alias = resolveLevelAlias(level);
  if (alias) {
    return alias.sortValue;
  }

  const numericValue = Number(level);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function sortLevels(levels: Iterable<string>): string[] {
  return Array.from(levels).sort((left, right) => {
    const leftOrder = getLevelSortValue(left);
    const rightOrder = getLevelSortValue(right);
    const leftKnown = leftOrder !== null;
    const rightKnown = rightOrder !== null;

    if (leftKnown && rightKnown && leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    if (leftKnown && !rightKnown) {
      return -1;
    }

    if (!leftKnown && rightKnown) {
      return 1;
    }

    return left.localeCompare(right);
  });
}

export function formatLevelBadge(level: string): string {
  return resolveLevelAlias(level)?.badgeLabel ?? safeStr(level);
}

export function formatLevelLabel(level: string): string {
  return resolveLevelAlias(level)?.fullLabel ?? safeStr(level);
}

export function formatLevelHeading(level: string): string {
  if (resolveLevelAlias(level)) {
    return formatLevelLabel(level);
  }

  const label = safeStr(level);
  return label ? `Level ${label}` : 'Level';
}

export function formatLevelSummary(levels: Iterable<string>): string {
  const orderedLevels = sortLevels(levels);
  if (!orderedLevels.length) {
    return '';
  }

  const hasAlias = orderedLevels.some((level) => resolveLevelAlias(level));
  const labels = orderedLevels.map((level) => formatLevelLabel(level));
  return hasAlias ? labels.join(', ') : `Level ${labels.join(', ')}`;
}

export function hashString(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function escapeHtml(value: unknown): string {
  return safeStr(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
