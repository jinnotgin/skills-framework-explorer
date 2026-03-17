import JSZip from 'jszip';
import * as XLSX from 'xlsx';

import { makeRoleKey, safeStr, toBool, uniqueBy } from './utils';
import type {
  CriticalWorkFunction,
  DatasetRawData,
  KAndAEntry,
  NormalizedDataset,
  PreloadedDatasetMetadata,
  RawRow,
  RoleSummary,
  WorkbookKind,
} from './types';

const EMPTY_DATA: DatasetRawData = {
  generatedAt: '',
  jobRoleDescriptions: [],
  jobRoleTcsCcs: [],
  tscKAndA: [],
  tscToUnique: [],
  uniqueSkillsList: [],
  jobRoleCwfKt: [],
};

function sheetToJsonIfExists(workbook: XLSX.WorkBook, sheetName: string): RawRow[] {
  if (!workbook.SheetNames.includes(sheetName)) {
    return [];
  }

  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: null }) as RawRow[];
}

function detectWorkbookKind(sheetNames: string[]): WorkbookKind | null {
  const sheets = new Set(sheetNames);

  if (sheets.has('Job Role_Description') && sheets.has('Job Role_TCS_CCS')) {
    return 'framework';
  }

  if (sheets.has('TSC to Unique Skill Mapping')) {
    return 'tscMap';
  }

  if (sheets.has('Unique Skills List')) {
    return 'unique';
  }

  return null;
}

export async function loadPreloadedDataset(url = 'data/skills-framework-data.json.zip'): Promise<DatasetRawData | null> {
  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const jsonFileName = Object.keys(zip.files).find((name) => name.endsWith('.json'));

  if (!jsonFileName) {
    return null;
  }

  const jsonFile = zip.file(jsonFileName);
  if (!jsonFile) {
    return null;
  }

  const jsonContent = await jsonFile.async('string');
  const parsed = JSON.parse(jsonContent) as Partial<DatasetRawData>;

  return {
    generatedAt: typeof parsed.generatedAt === 'string' ? parsed.generatedAt : '',
    jobRoleDescriptions: parsed.jobRoleDescriptions ?? [],
    jobRoleTcsCcs: parsed.jobRoleTcsCcs ?? [],
    tscKAndA: parsed.tscKAndA ?? [],
    tscToUnique: parsed.tscToUnique ?? [],
    uniqueSkillsList: parsed.uniqueSkillsList ?? [],
    jobRoleCwfKt: parsed.jobRoleCwfKt ?? [],
  };
}

export async function loadPreloadedDatasetMetadata(
  url = 'data/skills-framework-data.meta.json',
): Promise<PreloadedDatasetMetadata | null> {
  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const parsed = (await response.json()) as Partial<PreloadedDatasetMetadata>;
  if (typeof parsed.generatedAt !== 'string' || !parsed.generatedAt) {
    return null;
  }

  return {
    generatedAt: parsed.generatedAt,
  };
}

export async function parseWorkbookFiles(files: File[]): Promise<DatasetRawData> {
  const partial: Partial<Record<WorkbookKind, XLSX.WorkBook>> = {};

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const kind = detectWorkbookKind(workbook.SheetNames);

    if (kind) {
      partial[kind] = workbook;
    }
  }

  return {
    jobRoleDescriptions: partial.framework ? sheetToJsonIfExists(partial.framework, 'Job Role_Description') : [],
    jobRoleTcsCcs: partial.framework ? sheetToJsonIfExists(partial.framework, 'Job Role_TCS_CCS') : [],
    tscKAndA: partial.framework ? sheetToJsonIfExists(partial.framework, 'TSC_CCS_K&A') : [],
    jobRoleCwfKt: partial.framework ? sheetToJsonIfExists(partial.framework, 'Job Role_CWF_KT') : [],
    tscToUnique: partial.tscMap ? sheetToJsonIfExists(partial.tscMap, 'TSC to Unique Skill Mapping') : [],
    uniqueSkillsList: partial.unique ? sheetToJsonIfExists(partial.unique, 'Unique Skills List') : [],
  };
}

function normalizeRoleCwf(rows: RawRow[]): Record<string, CriticalWorkFunction[]> {
  const grouped = new Map<string, Map<string, Set<string>>>();

  for (const row of rows) {
    const roleKey = makeRoleKey(row);
    const cwfTitle = safeStr(row['Critical Work Function'] ?? row['Job Role_Critical Work Function'] ?? row.CWF);
    const keyTask = safeStr(row['Key Tasks'] ?? row['Key Task'] ?? row.Tasks);

    if (!roleKey || (!cwfTitle && !keyTask)) {
      continue;
    }

    if (!grouped.has(roleKey)) {
      grouped.set(roleKey, new Map());
    }

    const cwfMap = grouped.get(roleKey)!;
    if (!cwfMap.has(cwfTitle)) {
      cwfMap.set(cwfTitle, new Set());
    }

    if (keyTask) {
      cwfMap.get(cwfTitle)!.add(keyTask);
    }
  }

  const result: Record<string, CriticalWorkFunction[]> = {};

  for (const [roleKey, cwfMap] of grouped.entries()) {
    result[roleKey] = Array.from(cwfMap.entries())
      .map(([title, tasks]) => ({
        title: title || 'Critical Work Function',
        tasks: Array.from(tasks).sort((left, right) => left.localeCompare(right)),
      }))
      .sort((left, right) => left.title.localeCompare(right.title));
  }

  return result;
}

export function createNormalizedDataset(rawData: DatasetRawData | null): NormalizedDataset | null {
  if (!rawData) {
    return null;
  }

  const data = {
    ...EMPTY_DATA,
    ...rawData,
  };

  const uniqueRoles = uniqueBy(data.jobRoleDescriptions, (row) => makeRoleKey(row)).filter((row) => makeRoleKey(row));
  const roles: RoleSummary[] = uniqueRoles
    .map((row) => ({
      key: makeRoleKey(row),
      role: safeStr(row['Job Role']),
      sector: safeStr(row.Sector) || 'Unknown Sector',
      track: safeStr(row.Track),
      description: safeStr(row['Job Role Description']),
      performance: safeStr(row['Performance Expectation']),
    }))
    .sort((left, right) => {
      const sectorCompare = left.sector.localeCompare(right.sector);
      if (sectorCompare !== 0) {
        return sectorCompare;
      }
      const roleCompare = left.role.localeCompare(right.role);
      if (roleCompare !== 0) {
        return roleCompare;
      }
      return left.track.localeCompare(right.track);
    });

  const roleByKey: Record<string, RoleSummary> = {};
  for (const role of roles) {
    roleByKey[role.key] = role;
  }

  const sectors = Array.from(new Set(roles.map((role) => role.sector))).sort((left, right) => left.localeCompare(right));

  const tscInfoByCode: NormalizedDataset['tscInfoByCode'] = {};
  const kAndAByCodeProf: Record<string, KAndAEntry> = {};

  for (const row of data.tscKAndA) {
    const code = safeStr(row['TSC_CCS Code']);
    const type = safeStr(row['TSC_CCS Type']).toLowerCase();
    if (!code) {
      continue;
    }

    if (!tscInfoByCode[code] && type) {
      tscInfoByCode[code] = {
        title: safeStr(row['TSC_CCS Title']),
        description: safeStr(row['TSC_CCS Description']),
        category: safeStr(row['TSC_CCS Category']),
        sector: safeStr(row.Sector),
      };
    }

    const proficiency = safeStr(row['Proficiency Level']);
    if (!proficiency) {
      continue;
    }

    const key = `${code}|${proficiency}`;
    if (!kAndAByCodeProf[key]) {
      kAndAByCodeProf[key] = {
        code,
        proficiencyLevel: proficiency,
        proficiencyDescription: '',
        knowledgeItems: [],
        abilityItems: [],
      };
    }

    const entry = kAndAByCodeProf[key];
    const proficiencyDescription = safeStr(row['Proficiency Description']);
    if (proficiencyDescription && !entry.proficiencyDescription) {
      entry.proficiencyDescription = proficiencyDescription;
    }

    const item = safeStr(row['Knowledge / Ability Items']);
    const classification = safeStr(row['Knowledge / Ability Classification']).toLowerCase();
    if (!item) {
      continue;
    }

    if (classification.includes('ability')) {
      entry.abilityItems.push(item);
    } else {
      entry.knowledgeItems.push(item);
    }
  }

  const uniqueSkillByTitle: Record<string, RawRow> = {};
  for (const row of data.uniqueSkillsList) {
    const title = safeStr(row.parent_skill_title);
    if (title && !uniqueSkillByTitle[title]) {
      uniqueSkillByTitle[title] = row;
    }
  }

  const tscMappingByCodeProf: Record<string, RawRow> = {};
  const tscMappingByCode: Record<string, RawRow> = {};
  for (const row of data.tscToUnique) {
    const code = safeStr(row.tsc_code);
    const proficiency = safeStr(row.proficiency_level);
    if (!code) {
      continue;
    }

    if (proficiency) {
      const key = `${code}|${proficiency}`;
      if (!tscMappingByCodeProf[key]) {
        tscMappingByCodeProf[key] = row;
      }
    }

    if (!tscMappingByCode[code]) {
      tscMappingByCode[code] = row;
    }
  }

  return {
    ...data,
    roles,
    roleByKey,
    sectors,
    tscInfoByCode,
    tscMappingByCodeProf,
    tscMappingByCode,
    uniqueSkillByTitle,
    kAndAByCodeProf,
    roleCwfByKey: normalizeRoleCwf(data.jobRoleCwfKt),
  };
}

export function buildWorkbookStatus(files: File[]): Record<WorkbookKind, { loaded: boolean; filename: string }> {
  const status = {
    framework: { loaded: false, filename: '' },
    tscMap: { loaded: false, filename: '' },
    unique: { loaded: false, filename: '' },
  };

  for (const file of files) {
    const extension = file.name.toLowerCase();
    if (!extension.endsWith('.xlsx')) {
      continue;
    }
  }

  return status;
}

export function deriveWorkbookStatusFromRawData(data: DatasetRawData | null): Record<WorkbookKind, { loaded: boolean; filename: string }> {
  if (!data) {
    return {
      framework: { loaded: false, filename: '' },
      tscMap: { loaded: false, filename: '' },
      unique: { loaded: false, filename: '' },
    };
  }

  return {
    framework: {
      loaded: data.jobRoleDescriptions.length > 0 && data.jobRoleTcsCcs.length > 0,
      filename: '',
    },
    tscMap: {
      loaded: data.tscToUnique.length > 0,
      filename: '',
    },
    unique: {
      loaded: data.uniqueSkillsList.length > 0,
      filename: '',
    },
  };
}

export function detectWorkbookTypeFromWorkbook(workbook: XLSX.WorkBook): WorkbookKind | null {
  return detectWorkbookKind(workbook.SheetNames);
}

export function valueAsBoolean(value: unknown): boolean {
  return toBool(value);
}
