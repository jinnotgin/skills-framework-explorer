import { defineStore } from 'pinia';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

type RawRow = Record<string, unknown>;

export type DataLoadState = 'idle' | 'loading' | 'ready' | 'error';

export interface PreloadedData {
  jobRoleDescriptions?: RawRow[];
  jobRoleTcsCcs?: RawRow[];
  tscKAndA?: RawRow[];
  tscToUnique?: RawRow[];
  uniqueSkillsList?: RawRow[];
  jobRoleCwfKt?: RawRow[];
}

export interface NormalizedRole {
  key: string;
  sector: string;
  track: string;
  title: string;
  description?: string;
}

export interface RoleSkillEntry {
  code: string;
  title: string;
  proficiency: string;
  uniqueSkills: string[];
  category?: string;
  tscDescription?: string;
  proficiencyDescription?: string;
  knowledgeItems: string[];
  abilityItems: string[];
}

export interface RoleSummary extends NormalizedRole {
  tscCount: number;
  uniqueSkillCount: number;
  cwfCount: number;
}

export interface UniqueSkillUsage {
  roleKey: string;
  roleTitle: string;
  track: string;
  sector: string;
  tscCode: string;
  tscTitle: string;
  proficiency: string;
}

export interface RoleCwfEntry {
  cwf: string;
  keyTask: string;
}

function safeStr(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function makeRoleKey(row: RawRow): string {
  const sector = safeStr(row['Sector']);
  const track = safeStr(row['Track']);
  const role = safeStr(row['Job Role']);
  const altRole = safeStr(row['Job Role Title']);
  const title = role || altRole;
  return [sector, track, title].filter(Boolean).join('|||');
}

function tscProfKey(code: string, proficiency: string): string {
  return `${safeStr(code)}||${safeStr(proficiency)}`;
}

async function fetchPreloadedData(path = '/data/skills-framework-data.json.zip'): Promise<PreloadedData | null> {
  const response = await fetch(path);
  if (!response.ok) return null;

  const buffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const jsonFileName = Object.keys(zip.files).find((name) => name.endsWith('.json'));
  if (!jsonFileName) return null;

  const content = await zip.file(jsonFileName)?.async('string');
  return content ? JSON.parse(content) : null;
}

function buildTscToUniqueIndex(tscToUnique: RawRow[]): Record<string, string[]> {
  const index: Record<string, string[]> = {};

  for (const row of tscToUnique) {
    const code = safeStr(row['TSC_CCS Code'] ?? row['TSC/CCS Code'] ?? row['Skill Code']);
    const proficiency = safeStr(row['Proficiency Level']);
    const uniqueTitle = safeStr(
      row['Unique Skills Title'] ??
        row['Unique Skill Title'] ??
        row['Unique Skills'] ??
        row['Unique Skills Name']
    );

    if (!code && !uniqueTitle) continue;
    const key = tscProfKey(code, proficiency);
    const bucket = index[key] || [];
    if (uniqueTitle && !bucket.includes(uniqueTitle)) {
      bucket.push(uniqueTitle);
    }
    index[key] = bucket;
  }

  return index;
}

function normalizeRoles(jobRoleDescriptions: RawRow[]): Record<string, NormalizedRole> {
  const lookup: Record<string, NormalizedRole> = {};

  for (const row of jobRoleDescriptions) {
    const key = makeRoleKey(row);
    if (!key) continue;

    if (!lookup[key]) {
      lookup[key] = {
        key,
        sector: safeStr(row['Sector']),
        track: safeStr(row['Track']),
        title: safeStr(row['Job Role'] ?? row['Job Role Title']),
        description: safeStr(row['Job Role Description'] ?? row['Description'])
      };
    }
  }

  return lookup;
}

function normalizeData(data: PreloadedData) {
  const jobRoleDescriptions = data.jobRoleDescriptions ?? [];
  const jobRoleTcsCcs = data.jobRoleTcsCcs ?? [];
  const tscToUnique = data.tscToUnique ?? [];
  const jobRoleCwfKt = data.jobRoleCwfKt ?? [];
  const tscKAndA = data.tscKAndA ?? [];
  const uniqueSkillsList = data.uniqueSkillsList ?? [];

  const tscInfoByCode = new Map<
    string,
    { title: string; description: string; category: string; sector: string }
  >();
  const knowledgeByCodeProf = new Map<
    string,
    {
      code: string;
      proficiencyLevel: string;
      proficiencyDescription: string;
      knowledgeItems: string[];
      abilityItems: string[];
    }
  >();

  for (const row of tscKAndA) {
    const code = safeStr(
      row['TSC_CCS Code'] ?? row['TSC/CCS Code'] ?? row['Skill Code'] ?? row['TSC Code']
    );
    if (!code) continue;

    const title = safeStr(row['TSC_CCS Title'] ?? row['TSC/CCS Title'] ?? row['Skill Title']);
    const description = safeStr(
      row['TSC_CCS Description'] ??
        row['TSC/CCS Description'] ??
        row['Skill Description'] ??
        row['Description']
    );
    const category = safeStr(row['TSC_CCS Category'] ?? row['Category']);
    const sector = safeStr(row['Sector']);
    if (!tscInfoByCode.has(code)) {
      tscInfoByCode.set(code, { title, description, category, sector });
    }

    const proficiencyLevel = safeStr(row['Proficiency Level']);
    const profKey = tscProfKey(code, proficiencyLevel);
    const profDesc = safeStr(row['Proficiency Description']);
    const item = safeStr(row['Knowledge / Ability Items']);
    const klass = safeStr(row['Knowledge / Ability Classification']).toLowerCase();

    if (!knowledgeByCodeProf.has(profKey)) {
      knowledgeByCodeProf.set(profKey, {
        code,
        proficiencyLevel,
        proficiencyDescription: profDesc,
        knowledgeItems: [],
        abilityItems: []
      });
    }
    const entry = knowledgeByCodeProf.get(profKey)!;
    if (profDesc && !entry.proficiencyDescription) entry.proficiencyDescription = profDesc;
    if (item) {
      if (klass.includes('ability')) {
        entry.abilityItems.push(item);
      } else {
        entry.knowledgeItems.push(item);
      }
    }
  }

  const uniqueSkillDetails = new Map<
    string,
    { title: string; description: string; type?: string; category?: string; sector?: string }
  >();
  for (const row of uniqueSkillsList) {
    const title = safeStr(
      row['Unique Skills Title'] ??
        row['Unique Skill Title'] ??
        row['Unique Skills'] ??
        row['Unique Skills Name']
    );
    if (!title) continue;
    uniqueSkillDetails.set(title, {
      title,
      description: safeStr(row['Unique Skills Description'] ?? row['Description']),
      type: safeStr(row['Type']),
      category: safeStr(row['Category']),
      sector: safeStr(row['Sector'])
    });
  }

  const roleLookup = normalizeRoles(jobRoleDescriptions);
  const tscToUniqueIndex = buildTscToUniqueIndex(tscToUnique);
  const roleSkillsByRoleKey: Record<string, RoleSkillEntry[]> = {};
  const cwfCountByRole: Record<string, number> = {};
  const cwfByRoleKey: Record<string, RoleCwfEntry[]> = {};
  const uniqueSkillUsage: Record<string, UniqueSkillUsage[]> = {};

  for (const row of jobRoleTcsCcs) {
    const roleKey = makeRoleKey(row);
    if (!roleKey || !roleLookup[roleKey]) continue;

    const code = safeStr(row['TSC_CCS Code'] ?? row['TSC/CCS Code'] ?? row['Skill Code']);
    const title = safeStr(row['TSC_CCS Title'] ?? row['TSC/CCS Title'] ?? row['Skill Title']);
    const proficiency = safeStr(row['Proficiency Level']);
    if (!code && !title) continue;

    const uniqueSkills = tscToUniqueIndex[tscProfKey(code, proficiency)] ?? [];
    const knowledge = knowledgeByCodeProf.get(tscProfKey(code, proficiency));
    const tscInfo = tscInfoByCode.get(code);

    if (!roleSkillsByRoleKey[roleKey]) {
      roleSkillsByRoleKey[roleKey] = [];
    }
    const entry: RoleSkillEntry = {
      code,
      title,
      proficiency,
      uniqueSkills,
      category: tscInfo?.category,
      tscDescription: tscInfo?.description,
      proficiencyDescription: knowledge?.proficiencyDescription,
      knowledgeItems: knowledge?.knowledgeItems ?? [],
      abilityItems: knowledge?.abilityItems ?? []
    };
    roleSkillsByRoleKey[roleKey].push(entry);

    uniqueSkills.forEach((uniqueTitle) => {
      if (!uniqueTitle) return;
      if (!uniqueSkillUsage[uniqueTitle]) uniqueSkillUsage[uniqueTitle] = [];
      uniqueSkillUsage[uniqueTitle].push({
        roleKey,
        roleTitle: roleLookup[roleKey].title,
        track: roleLookup[roleKey].track,
        sector: roleLookup[roleKey].sector,
        tscCode: code,
        tscTitle: title,
        proficiency
      });
    });
  }

  for (const row of jobRoleCwfKt) {
    const roleKey = makeRoleKey(row);
    if (!roleKey) continue;
    const cwf =
      safeStr(row['Critical Work Function'] ?? row['Job Role_Critical Work Function'] ?? row['CWF']);
    const keyTask = safeStr(row['Key Tasks'] ?? row['Key Task'] ?? row['Tasks']);
    if (!cwf && !keyTask) continue;
    cwfCountByRole[roleKey] = (cwfCountByRole[roleKey] ?? 0) + 1;
    if (!cwfByRoleKey[roleKey]) cwfByRoleKey[roleKey] = [];
    cwfByRoleKey[roleKey].push({ cwf, keyTask });
  }

  const roleSummaries: RoleSummary[] = Object.values(roleLookup)
    .map((role) => {
      const skills = roleSkillsByRoleKey[role.key] ?? [];
      const uniqueSet = new Set<string>();
      skills.forEach((skill) => skill.uniqueSkills.forEach((u) => uniqueSet.add(u)));

      return {
        ...role,
        tscCount: skills.length,
        uniqueSkillCount: uniqueSet.size,
        cwfCount: cwfCountByRole[role.key] ?? 0
      };
    })
    .sort((a, b) => a.sector.localeCompare(b.sector) || a.track.localeCompare(b.track) || a.title.localeCompare(b.title));

  const roleSummaryLookup = Object.fromEntries(roleSummaries.map((role) => [role.key, role]));

  return {
    roleSummaries,
    roleSummaryLookup,
    roleSkillsByRoleKey,
    tscInfoByCode,
    knowledgeByCodeProf,
    uniqueSkillDetails,
    uniqueSkillUsage,
    cwfByRoleKey
  };
}

export const useFrameworkStore = defineStore('framework', {
  state: () => ({
    status: 'idle' as DataLoadState,
    error: '',
    jobRoleDescriptions: [] as RawRow[],
    jobRoleTcsCcs: [] as RawRow[],
    tscKAndA: [] as RawRow[],
    tscToUnique: [] as RawRow[],
    uniqueSkillsList: [] as RawRow[],
    jobRoleCwfKt: [] as RawRow[],
    roles: [] as NormalizedRole[],
    roleSummaries: [] as RoleSummary[],
    roleSummaryLookup: {} as Record<string, RoleSummary>,
    roleSkillsByRoleKey: {} as Record<string, RoleSkillEntry[]>,
    cwfByRoleKey: {} as Record<string, RoleCwfEntry[]>,
    tscInfoByCode: new Map<string, { title: string; description: string; category: string; sector: string }>(),
    knowledgeByCodeProf: new Map<
      string,
      {
        code: string;
        proficiencyLevel: string;
        proficiencyDescription: string;
        knowledgeItems: string[];
        abilityItems: string[];
      }
    >(),
    uniqueSkillDetails: new Map<
      string,
      { title: string; description: string; type?: string; category?: string; sector?: string }
    >(),
    uniqueSkillUsage: {} as Record<string, UniqueSkillUsage[]>
  }),
  getters: {
    roleCount: (state) => state.roles.length,
    uniqueSkillCount: (state) => {
      if (state.uniqueSkillsList.length) return state.uniqueSkillsList.length;
      const allSkills = new Set<string>();
      Object.values(state.roleSkillsByRoleKey).forEach((skills) => {
        skills.forEach((entry) => entry.uniqueSkills.forEach((u) => allSkills.add(u)));
      });
      return allSkills.size;
    },
    sectors: (state) => {
      const sectors = new Set<string>();
      state.roles.forEach((r) => sectors.add(r.sector));
      return Array.from(sectors).sort();
    },
    roleSkillLookup: (state) => state.roleSkillsByRoleKey,
    cwfByRole: (state) => state.cwfByRoleKey,
    uniqueSkills: (state) => {
      const titles = new Set<string>(Object.keys(state.uniqueSkillUsage));
      state.uniqueSkillsList.forEach((row) => {
        const title = safeStr(
          row['Unique Skills Title'] ??
            row['Unique Skill Title'] ??
            row['Unique Skills'] ??
            row['Unique Skills Name']
        );
        if (title) titles.add(title);
      });
      return Array.from(titles).sort((a, b) => a.localeCompare(b));
    }
  },
  actions: {
    async preload(path?: string) {
      if (this.status === 'loading') return;
      this.status = 'loading';
      this.error = '';
      try {
        const data = await fetchPreloadedData(path);
        if (!data) throw new Error('No preloaded data found');
        this.hydrate(data);
        this.status = 'ready';
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Unknown error';
        this.status = 'error';
        console.error('Error loading preloaded data', err);
      }
    },
    async loadFiles(files: FileList | File[]) {
      if (!files || files.length === 0) return;
      this.status = 'loading';
      this.error = '';

      let frameworkWb: XLSX.WorkBook | null = null;
      let tscMapWb: XLSX.WorkBook | null = null;
      let uniqueWb: XLSX.WorkBook | null = null;

      for (const file of Array.from(files)) {
        try {
          const buffer = await file.arrayBuffer();
          const wb = XLSX.read(buffer, { type: 'array' });
          const sheets = new Set(wb.SheetNames);
          if (sheets.has('Job Role_Description') && sheets.has('Job Role_TCS_CCS')) {
            frameworkWb = wb;
          } else if (sheets.has('TSC to Unique Skill Mapping')) {
            tscMapWb = wb;
          } else if (sheets.has('Unique Skills List')) {
            uniqueWb = wb;
          }
        } catch (err) {
          console.error('Error reading workbook', file.name, err);
          this.error = 'Failed to read one or more files';
        }
      }

      const readSheet = (wb: XLSX.WorkBook | null, sheetName: string) => {
        if (!wb || !wb.SheetNames.includes(sheetName)) return [];
        const ws = wb.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(ws, { defval: null }) as RawRow[];
      };

      const payload: PreloadedData = {};
      if (frameworkWb) {
        payload.jobRoleDescriptions = readSheet(frameworkWb, 'Job Role_Description');
        payload.jobRoleTcsCcs = readSheet(frameworkWb, 'Job Role_TCS_CCS');
        payload.tscKAndA = readSheet(frameworkWb, 'TSC_CCS_K&A');
        payload.jobRoleCwfKt = readSheet(frameworkWb, 'Job Role_CWF_KT');
      }
      if (tscMapWb) {
        payload.tscToUnique = readSheet(tscMapWb, 'TSC to Unique Skill Mapping');
      }
      if (uniqueWb) {
        payload.uniqueSkillsList = readSheet(uniqueWb, 'Unique Skills List');
      }

      if (!payload.jobRoleDescriptions?.length) {
        this.error = 'Could not find required sheets. Please upload the three Skills Framework files.';
        this.status = 'error';
        return;
      }

      this.hydrate(payload);
      this.status = 'ready';
    },
    hydrate(data: PreloadedData) {
      this.jobRoleDescriptions = data.jobRoleDescriptions ?? [];
      this.jobRoleTcsCcs = data.jobRoleTcsCcs ?? [];
      this.tscKAndA = data.tscKAndA ?? [];
      this.tscToUnique = data.tscToUnique ?? [];
      this.uniqueSkillsList = data.uniqueSkillsList ?? [];
      this.jobRoleCwfKt = data.jobRoleCwfKt ?? [];

      const {
        roleSummaries,
        roleSummaryLookup,
        roleSkillsByRoleKey,
        cwfByRoleKey,
        tscInfoByCode,
        knowledgeByCodeProf,
        uniqueSkillDetails,
        uniqueSkillUsage
      } = normalizeData(data);
      this.roles = roleSummaries.map(({ key, sector, track, title, description }) => ({
        key,
        sector,
        track,
        title,
        description
      }));
      this.roleSummaries = roleSummaries;
      this.roleSummaryLookup = roleSummaryLookup;
      this.roleSkillsByRoleKey = roleSkillsByRoleKey;
      this.cwfByRoleKey = cwfByRoleKey;
      this.tscInfoByCode = tscInfoByCode;
      this.knowledgeByCodeProf = knowledgeByCodeProf;
      this.uniqueSkillDetails = uniqueSkillDetails;
      this.uniqueSkillUsage = uniqueSkillUsage;
    }
  }
});
