import Dexie, { type Table } from 'dexie';

import { buildAnalysis, buildSkillsIndex } from './analysis';
import { createNormalizedDataset, loadPreloadedDataset, loadPreloadedDatasetMetadata } from './parser';
import type {
  DatasetMetaRecord,
  DatasetMetaSnapshot,
  DatasetSyncState,
  NormalizedDataset,
  PreloadedDatasetMetadata,
  PreloadedDataSource,
  RoleAnalysisRecord,
  RoleCatalogRecord,
  RoleCwfRecord,
  RoleKey,
  RoleSummary,
  SkillIndexRecord,
} from './types';

export const PRELOADED_DB_NAME = 'sfe_data';
export const PRELOADED_SCHEMA_VERSION = 3;
export const PRELOADED_STORE_PREFIX = 'sfe';

const APP_NAME = 'skills-framework-explorer';
const META_RECORD_ID = 'current';

const STORES = {
  meta: `${PRELOADED_STORE_PREFIX}_meta`,
  roles: `${PRELOADED_STORE_PREFIX}_roles`,
  roleCwf: `${PRELOADED_STORE_PREFIX}_role_cwf`,
  roleAnalysis: `${PRELOADED_STORE_PREFIX}_role_analysis`,
  skillIndex: `${PRELOADED_STORE_PREFIX}_skill_index`,
} as const;

interface PreloadedReadModels {
  generatedAt: string;
  roles: RoleCatalogRecord[];
  roleCwf: RoleCwfRecord[];
  roleAnalysis: RoleAnalysisRecord[];
  skillIndex: SkillIndexRecord[];
}

interface FallbackCache {
  meta: DatasetMetaSnapshot;
  roles: RoleCatalogRecord[];
  roleAnalysesByKey: Map<RoleKey, RoleAnalysisRecord>;
  skillIndex: SkillIndexRecord[];
  skillIndexByKey: Map<string, SkillIndexRecord>;
}

interface RoleSortFields {
  role: string;
  sector: string;
  track: string;
}

class PreloadedDatasetDatabase extends Dexie {
  meta!: Table<DatasetMetaRecord, string>;
  roles!: Table<RoleCatalogRecord, string>;
  roleCwf!: Table<RoleCwfRecord, string>;
  roleAnalysis!: Table<RoleAnalysisRecord, string>;
  skillIndex!: Table<SkillIndexRecord, string>;

  constructor() {
    super(PRELOADED_DB_NAME);
    this.version(PRELOADED_SCHEMA_VERSION).stores({
      [STORES.meta]: 'id, generatedAt',
      [STORES.roles]: '&roleKey, sector, role, track',
      [STORES.roleCwf]: '&roleKey',
      [STORES.roleAnalysis]: '&roleKey',
      [STORES.skillIndex]: '&skillKey, title',
    });

    this.meta = this.table(STORES.meta);
    this.roles = this.table(STORES.roles);
    this.roleCwf = this.table(STORES.roleCwf);
    this.roleAnalysis = this.table(STORES.roleAnalysis);
    this.skillIndex = this.table(STORES.skillIndex);
  }
}

function compareRoles(left: RoleSortFields, right: RoleSortFields): number {
  return left.sector.localeCompare(right.sector) || left.role.localeCompare(right.role) || left.track.localeCompare(right.track);
}

function toRoleSummary(record: RoleCatalogRecord): RoleSummary {
  return {
    key: record.roleKey,
    role: record.role,
    sector: record.sector,
    track: record.track,
    description: record.description,
    performance: record.performance,
  };
}

function createRoleCatalogRecord(role: RoleSummary): RoleCatalogRecord {
  return {
    roleKey: role.key,
    role: role.role,
    sector: role.sector,
    track: role.track,
    description: role.description,
    performance: role.performance,
    searchText: `${role.role} ${role.sector} ${role.track}`.trim().toLowerCase(),
  };
}

function buildPreloadedReadModels(dataset: NormalizedDataset): PreloadedReadModels {
  const roleKeys = dataset.roles.map((role) => role.key);
  const analysis = buildAnalysis(dataset, roleKeys);
  const skillIndex = buildSkillsIndex(dataset, roleKeys);

  if (!analysis || !skillIndex) {
    throw new Error('Failed to build preloaded analysis models');
  }

  const roles = [...dataset.roles].sort(compareRoles).map(createRoleCatalogRecord);
  const roleCwf = roles.map((role) => ({
    roleKey: role.roleKey,
    cwf: dataset.roleCwfByKey[role.roleKey] ?? [],
  }));
  const roleAnalysis = analysis.roleKeys.map((roleKey) => ({
    roleKey,
    ...analysis.roles[roleKey],
  }));
  const skillIndexRecords = skillIndex.uniqueSkillKeys.map((skillKey) => skillIndex.uniqueSkills[skillKey]);

  return {
    generatedAt: dataset.generatedAt || '',
    roles,
    roleCwf,
    roleAnalysis,
    skillIndex: skillIndexRecords,
  };
}

async function loadDatasetForRebuild(metadata: PreloadedDatasetMetadata | null): Promise<PreloadedReadModels> {
  const rawData = await loadPreloadedDataset();
  if (!rawData) {
    throw new Error('Failed to load bundled dataset');
  }

  const dataset = createNormalizedDataset({
    ...rawData,
    generatedAt: rawData.generatedAt || metadata?.generatedAt || '',
  });
  if (!dataset) {
    throw new Error('Failed to parse bundled dataset');
  }

  return buildPreloadedReadModels(dataset);
}

function createDatasetMetaRecord(generatedAt: string): DatasetMetaRecord {
  return {
    id: META_RECORD_ID,
    app: APP_NAME,
    schemaVersion: PRELOADED_SCHEMA_VERSION,
    generatedAt,
    source: 'preloaded',
    rebuiltAt: new Date().toISOString(),
  };
}

export class PreloadedDatasetRepository {
  private db: PreloadedDatasetDatabase | null = null;
  private source: PreloadedDataSource | null = null;
  private fallbackCache: FallbackCache | null = null;
  private statusListener?: (status: DatasetSyncState) => void;

  setStatusListener(listener?: (status: DatasetSyncState) => void) {
    this.statusListener = listener;
  }

  private emitStatus(status: DatasetSyncState) {
    this.statusListener?.(status);
  }

  private async openDatabase(): Promise<PreloadedDatasetDatabase> {
    if (!this.db) {
      this.db = new PreloadedDatasetDatabase();
    }

    await this.db.open();
    return this.db;
  }

  private async hasHealthyCache(db: PreloadedDatasetDatabase, expectedGeneratedAt?: string): Promise<boolean> {
    const [meta, roleCount, roleCwfCount, roleAnalysisCount, skillIndexCount] = await Promise.all([
      db.meta.get(META_RECORD_ID),
      db.roles.count(),
      db.roleCwf.count(),
      db.roleAnalysis.count(),
      db.skillIndex.count(),
    ]);

    if (!meta || meta.app !== APP_NAME || meta.schemaVersion !== PRELOADED_SCHEMA_VERSION) {
      return false;
    }

    if (expectedGeneratedAt && meta.generatedAt !== expectedGeneratedAt) {
      return false;
    }

    return roleCount > 0 && roleCwfCount === roleCount && roleAnalysisCount === roleCount && skillIndexCount > 0;
  }

  private async rebuildDatabase(db: PreloadedDatasetDatabase, models: PreloadedReadModels): Promise<void> {
    const meta = createDatasetMetaRecord(models.generatedAt);

    await db.transaction('rw', [db.meta, db.roles, db.roleCwf, db.roleAnalysis, db.skillIndex], async () => {
      await Promise.all([
        db.meta.clear(),
        db.roles.clear(),
        db.roleCwf.clear(),
        db.roleAnalysis.clear(),
        db.skillIndex.clear(),
      ]);

      await db.meta.put(meta);
      await db.roles.bulkPut(models.roles);
      await db.roleCwf.bulkPut(models.roleCwf);
      await db.roleAnalysis.bulkPut(models.roleAnalysis);
      await db.skillIndex.bulkPut(models.skillIndex);
    });
  }

  private activateIndexedDb(generatedAt: string) {
    this.source = 'indexeddb';
    this.fallbackCache = null;
  }

  private activateFallback(models: PreloadedReadModels) {
    this.source = 'fallback-memory';
    this.fallbackCache = {
      meta: {
        generatedAt: models.generatedAt,
        source: 'fallback-memory',
      },
      roles: models.roles,
      roleAnalysesByKey: new Map(models.roleAnalysis.map((role) => [role.roleKey, role])),
      skillIndex: [...models.skillIndex],
      skillIndexByKey: new Map(models.skillIndex.map((skill) => [skill.skillKey, skill])),
    };
  }

  async syncPreloadedDataset(): Promise<void> {
    this.emitStatus('checking');
    const metadata = await loadPreloadedDatasetMetadata().catch(() => null);

    try {
      const db = await this.openDatabase();
      const healthyCache = await this.hasHealthyCache(db, metadata?.generatedAt);

      if (!healthyCache) {
        this.emitStatus('downloading');
        const models = await loadDatasetForRebuild(metadata);
        if (!models.generatedAt) {
          models.generatedAt = metadata?.generatedAt || '';
        }
        this.emitStatus('rebuilding');
        await this.rebuildDatabase(db, models);
      }

      const currentMeta = await db.meta.get(META_RECORD_ID);
      if (!currentMeta) {
        throw new Error('Missing preloaded dataset metadata');
      }

      this.activateIndexedDb(currentMeta.generatedAt);
      this.emitStatus('ready');
      return;
    } catch (error) {
      this.emitStatus('downloading');
      const models = await loadDatasetForRebuild(metadata);
      if (!models.generatedAt) {
        models.generatedAt = metadata?.generatedAt || '';
      }
      this.activateFallback(models);

      if (error instanceof Error) {
        console.warn(`IndexedDB cache unavailable, using fallback memory mode: ${error.message}`);
      }

      this.emitStatus('ready');
    }
  }

  async getDatasetMeta(): Promise<DatasetMetaSnapshot | null> {
    if (this.source === 'fallback-memory') {
      return this.fallbackCache?.meta ?? null;
    }

    const db = await this.openDatabase();
    const meta = await db.meta.get(META_RECORD_ID);
    if (!meta) {
      return null;
    }

    return {
      generatedAt: meta.generatedAt,
      source: 'indexeddb',
    };
  }

  async getRolesCatalog(): Promise<RoleSummary[]> {
    if (this.source === 'fallback-memory') {
      return [...(this.fallbackCache?.roles ?? [])].sort(compareRoles).map(toRoleSummary);
    }

    const db = await this.openDatabase();
    const roles = await db.roles.toArray();
    return [...roles].sort(compareRoles).map(toRoleSummary);
  }

  async getRoleAnalyses(roleKeys: RoleKey[]): Promise<RoleAnalysisRecord[]> {
    if (!roleKeys.length) {
      return [];
    }

    if (this.source === 'fallback-memory') {
      return roleKeys
        .map((roleKey) => this.fallbackCache?.roleAnalysesByKey.get(roleKey) ?? null)
        .filter((role): role is RoleAnalysisRecord => Boolean(role));
    }

    const db = await this.openDatabase();
    const roles: Array<RoleAnalysisRecord | undefined> = await db.roleAnalysis.bulkGet(roleKeys);
    return roles.filter((role): role is RoleAnalysisRecord => Boolean(role));
  }

  async getGlobalSkillsIndex(): Promise<SkillIndexRecord[]> {
    if (this.source === 'fallback-memory') {
      return [...(this.fallbackCache?.skillIndex ?? [])].sort(
        (left, right) => left.title.localeCompare(right.title) || left.subtitle.localeCompare(right.subtitle) || left.skillKey.localeCompare(right.skillKey),
      );
    }

    const db = await this.openDatabase();
    const skills = await db.skillIndex.toArray();
    return skills.sort(
      (left, right) => left.title.localeCompare(right.title) || left.subtitle.localeCompare(right.subtitle) || left.skillKey.localeCompare(right.skillKey),
    );
  }

  async getGlobalSkill(skillKey: string): Promise<SkillIndexRecord | null> {
    if (!skillKey) {
      return null;
    }

    if (this.source === 'fallback-memory') {
      return this.fallbackCache?.skillIndexByKey.get(skillKey) ?? null;
    }

    const db = await this.openDatabase();
    return (await db.skillIndex.get(skillKey)) ?? null;
  }

  async resetForTests(): Promise<void> {
    this.source = null;
    this.fallbackCache = null;
    this.statusListener = undefined;

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    await Dexie.delete(PRELOADED_DB_NAME);
  }
}

export const preloadedDatasetRepository = new PreloadedDatasetRepository();
