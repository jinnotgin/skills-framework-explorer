import { defineStore } from 'pinia';

import type { ImportMode, NormalizedDataset, WorkbookKind, WorkbookStatus } from '../lib/skills-framework/types';

interface DatasetState {
  dataset: NormalizedDataset | null;
  importMode: ImportMode;
  isLoading: boolean;
  isPreloading: boolean;
  workbookStatus: Record<WorkbookKind, WorkbookStatus>;
  error: string;
}

function emptyWorkbookStatus(): Record<WorkbookKind, WorkbookStatus> {
  return {
    framework: { loaded: false, filename: '' },
    tscMap: { loaded: false, filename: '' },
    unique: { loaded: false, filename: '' },
  };
}

export const useDatasetStore = defineStore('dataset', {
  state: (): DatasetState => ({
    dataset: null,
    importMode: 'none',
    isLoading: false,
    isPreloading: false,
    workbookStatus: emptyWorkbookStatus(),
    error: '',
  }),
  getters: {
    hasDataset: (state) => Boolean(state.dataset),
    roles: (state) => state.dataset?.roles ?? [],
    sectors: (state) => state.dataset?.sectors ?? [],
    loadedCount: (state) => Object.values(state.workbookStatus).filter((entry) => entry.loaded).length,
    isFullyLoaded(): boolean {
      return this.loadedCount === 3;
    },
  },
  actions: {
    setDataset(dataset: NormalizedDataset | null, mode: ImportMode, workbookStatus?: Record<WorkbookKind, WorkbookStatus>) {
      this.dataset = dataset;
      this.importMode = mode;
      this.workbookStatus = workbookStatus ?? emptyWorkbookStatus();
      this.error = '';
    },
    async preload() {
      this.isPreloading = true;
      this.error = '';

      try {
        const { createNormalizedDataset, deriveWorkbookStatusFromRawData, loadPreloadedDataset } = await import('../lib/skills-framework/parser');
        const rawData = await loadPreloadedDataset();
        const dataset = createNormalizedDataset(rawData);
        this.setDataset(dataset, dataset ? 'preloaded' : 'none', deriveWorkbookStatusFromRawData(rawData));
        return dataset;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to load preloaded data';
        return null;
      } finally {
        this.isPreloading = false;
      }
    },
    async loadFromFiles(files: File[]) {
      this.isLoading = true;
      this.error = '';

      try {
        const { createNormalizedDataset, deriveWorkbookStatusFromRawData, parseWorkbookFiles } = await import('../lib/skills-framework/parser');
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
  },
});
