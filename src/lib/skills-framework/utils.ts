import type { RawRow, RoleKey, RoleSummary } from './types';

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

export function sortLevels(levels: Iterable<string>): string[] {
  return Array.from(levels).sort((left, right) => {
    const leftNum = Number(left);
    const rightNum = Number(right);
    const leftNumeric = Number.isFinite(leftNum);
    const rightNumeric = Number.isFinite(rightNum);

    if (leftNumeric && rightNumeric) {
      return leftNum - rightNum;
    }

    if (leftNumeric) {
      return -1;
    }

    if (rightNumeric) {
      return 1;
    }

    return left.localeCompare(right);
  });
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
