import { defineStore } from 'pinia';

import { buildAnalysisResultsFromSkillIndex, buildSkillsIndex } from '../lib/skills-framework/analysis';
import { createNormalizedDataset, deriveWorkbookStatusFromRawData, parseWorkbookFiles } from '../lib/skills-framework/parser';
import { preloadedDatasetRepository } from '../lib/skills-framework/preloadedRepository';
import type {
  AnalysisResults,
  DatasetSyncState,
  GlobalSkillAnalysis,
  ImportMode,
  NormalizedDataset,
  PreloadedDataSource,
  RoleKey,
  RoleSummary,
  SkillIndexRecord,
  WorkbookKind,
  WorkbookStatus,
} from '../lib/skills-framework/types';

interface DatasetState {
  dataset: NormalizedDataset | null;
  importMode: ImportMode;
  isLoading: boolean;
  isGlobalSkillsLoading: boolean;
  syncState: DatasetSyncState;
  dataSource: PreloadedDataSource | null;
  generatedAt: string;
  workbookStatus: Record<WorkbookKind, WorkbookStatus>;
  error: string;
  rolesCatalog: RoleSummary[];
  roleByKey: Record<RoleKey, RoleSummary>;
  sectorsCatalog: string[];
  globalSkillsIndex: Record<string, GlobalSkillAnalysis>;
  globalSkillTitles: string[];
}

function emptyWorkbookStatus(): Record<WorkbookKind, WorkbookStatus> {
  return {
    framework: { loaded: false, filename: '' },
    tscMap: { loaded: false, filename: '' },
    unique: { loaded: false, filename: '' },
  };
}

function preloadedWorkbookStatus(): Record<WorkbookKind, WorkbookStatus> {
  return {
    framework: { loaded: true, filename: 'Bundled dataset' },
    tscMap: { loaded: true, filename: 'Bundled dataset' },
    unique: { loaded: true, filename: 'Bundled dataset' },
  };
}

function buildRoleLookup(roles: RoleSummary[]) {
  const roleByKey: Record<RoleKey, RoleSummary> = {};
  for (const role of roles) {
    roleByKey[role.key] = role;
  }

  const sectors = Array.from(new Set(roles.map((role) => role.sector))).sort((left, right) => left.localeCompare(right));
  return { roleByKey, sectors };
}

function skillIndexToMap(skills: SkillIndexRecord[]) {
  const globalSkillsIndex: Record<string, GlobalSkillAnalysis> = {};
  for (const skill of skills) {
    globalSkillsIndex[skill.title] = skill;
  }

  return {
    globalSkillsIndex,
    globalSkillTitles: skills.map((skill) => skill.title).sort((left, right) => left.localeCompare(right)),
  };
}

export const useDatasetStore = defineStore('dataset', {
  state: (): DatasetState => ({
    dataset: null,
    importMode: 'none',
    isLoading: false,
    isGlobalSkillsLoading: false,
    syncState: 'idle',
    dataSource: null,
    generatedAt: '',
    workbookStatus: emptyWorkbookStatus(),
    error: '',
    rolesCatalog: [],
    roleByKey: {},
    sectorsCatalog: [],
    globalSkillsIndex: {},
    globalSkillTitles: [],
  }),
  getters: {
    hasDataset: (state) => state.rolesCatalog.length > 0,
    roles: (state) => state.rolesCatalog,
    sectors: (state) => state.sectorsCatalog,
    loadedCount: (state) => Object.values(state.workbookStatus).filter((entry) => entry.loaded).length,
    isFullyLoaded(): boolean {
      return this.loadedCount === 3;
    },
    isPreloading: (state) => ['checking', 'downloading', 'rebuilding'].includes(state.syncState),
    preloadStatusMessage: (state) => {
      if (state.syncState === 'checking') {
        return 'Checking local cache before loading bundled data.';
      }
      if (state.syncState === 'downloading') {
        return 'Downloading bundled dataset.';
      }
      if (state.syncState === 'rebuilding') {
        return 'Rebuilding local IndexedDB cache.';
      }
      if (state.importMode === 'preloaded' && state.dataSource === 'fallback-memory') {
        return 'Using fallback memory mode because the local IndexedDB cache is unavailable.';
      }
      return '';
    },
    globalSkillsResults(state): AnalysisResults | null {
      const skills = state.globalSkillTitles.map((title) => state.globalSkillsIndex[title]).filter(Boolean);
      return buildAnalysisResultsFromSkillIndex(skills, state.rolesCatalog.map((role) => role.key));
    },
  },
  actions: {
    clearGlobalSkillsCache() {
      this.globalSkillsIndex = {};
      this.globalSkillTitles = [];
    },
    setRoleCatalog(roles: RoleSummary[]) {
      this.rolesCatalog = roles;
      const { roleByKey, sectors } = buildRoleLookup(roles);
      this.roleByKey = roleByKey;
      this.sectorsCatalog = sectors;
    },
    setDataset(dataset: NormalizedDataset | null, mode: ImportMode, workbookStatus?: Record<WorkbookKind, WorkbookStatus>) {
      this.dataset = dataset;
      this.importMode = mode;
      this.workbookStatus = workbookStatus ?? emptyWorkbookStatus();
      this.error = '';
      this.clearGlobalSkillsCache();

      if (!dataset) {
        this.generatedAt = '';
        this.dataSource = null;
        this.setRoleCatalog([]);
        return;
      }

      this.generatedAt = dataset.generatedAt ?? '';
      this.dataSource = null;
      this.syncState = 'ready';
      this.setRoleCatalog(dataset.roles);
    },
    async preload() {
      this.error = '';
      this.dataset = null;
      this.importMode = 'preloaded';
      this.dataSource = null;
      this.generatedAt = '';
      this.workbookStatus = emptyWorkbookStatus();
      this.clearGlobalSkillsCache();
      this.setRoleCatalog([]);
      this.syncState = 'checking';

      preloadedDatasetRepository.setStatusListener((status) => {
        this.syncState = status;
      });

      try {
        await preloadedDatasetRepository.syncPreloadedDataset();
        const [meta, roles] = await Promise.all([
          preloadedDatasetRepository.getDatasetMeta(),
          preloadedDatasetRepository.getRolesCatalog(),
        ]);

        this.importMode = 'preloaded';
        this.dataSource = meta?.source ?? 'indexeddb';
        this.generatedAt = meta?.generatedAt ?? '';
        this.workbookStatus = preloadedWorkbookStatus();
        this.setRoleCatalog(roles);
        this.syncState = 'ready';

        return roles.length ? roles : null;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to load preloaded data';
        this.syncState = 'error';
        return null;
      } finally {
        preloadedDatasetRepository.setStatusListener(undefined);
      }
    },
    async loadFromFiles(files: File[]) {
      this.isLoading = true;
      this.error = '';

      try {
        const rawData = await parseWorkbookFiles(files);
        const dataset = createNormalizedDataset(rawData);
        this.setDataset(dataset, 'upload', deriveWorkbookStatusFromRawData(rawData));
        return dataset;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to parse uploaded workbooks';
        return null;
      } finally {
        this.isLoading = false;
      }
    },
    async ensureGlobalSkillsLoaded(force = false) {
      if (!force && this.globalSkillTitles.length) {
        return this.globalSkillsResults;
      }

      this.isGlobalSkillsLoading = true;

      try {
        if (this.importMode === 'upload' && this.dataset) {
          const results = buildSkillsIndex(this.dataset);
          if (!results) {
            this.clearGlobalSkillsCache();
            return null;
          }

          const skills = results.uniqueSkillTitles.map((title) => results.uniqueSkills[title]);
          const { globalSkillsIndex, globalSkillTitles } = skillIndexToMap(skills);
          this.globalSkillsIndex = globalSkillsIndex;
          this.globalSkillTitles = globalSkillTitles;
          return results;
        }

        if (this.importMode !== 'preloaded') {
          this.clearGlobalSkillsCache();
          return null;
        }

        const skills = await preloadedDatasetRepository.getGlobalSkillsIndex();
        const { globalSkillsIndex, globalSkillTitles } = skillIndexToMap(skills);
        this.globalSkillsIndex = globalSkillsIndex;
        this.globalSkillTitles = globalSkillTitles;
        return this.globalSkillsResults;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to load skill index';
        return null;
      } finally {
        this.isGlobalSkillsLoading = false;
      }
    },
  },
});
