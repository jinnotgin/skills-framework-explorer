import { defineStore } from 'pinia';

import { buildAnalysis, buildAnalysisFromRoleAnalyses } from '../lib/skills-framework/analysis';
import { preloadedDatasetRepository } from '../lib/skills-framework/preloadedRepository';
import type { AnalysisResults, CompareFilter, DetailState, NormalizedDataset, RoleKey } from '../lib/skills-framework/types';

interface ExplorerState {
  selectedRoleKeys: RoleKey[];
  analyzedRoleKeys: RoleKey[];
  activeRoleKey: RoleKey | null;
  analysisResults: AnalysisResults | null;
  isAnalysisLoading: boolean;
  roleSearchQuery: string;
  sectorFilter: string;
  skillSearchQuery: string;
  compareFilter: CompareFilter;
  compareShowDescriptions: boolean;
  compareSelection: {
    role1: RoleKey | null;
    role2: RoleKey | null;
  };
  detail: DetailState;
  analysisRequestId: number;
}

function emptyDetailState(): DetailState {
  return {
    open: false,
    kind: null,
    skillTitle: '',
    roleKey: null,
    role1Key: null,
    role2Key: null,
    focusedRoleKey: null,
  };
}

export const useExplorerStore = defineStore('explorer', {
  state: (): ExplorerState => ({
    selectedRoleKeys: [],
    analyzedRoleKeys: [],
    activeRoleKey: null,
    analysisResults: null,
    isAnalysisLoading: false,
    roleSearchQuery: '',
    sectorFilter: '',
    skillSearchQuery: '',
    compareFilter: 'all',
    compareShowDescriptions: false,
    compareSelection: {
      role1: null,
      role2: null,
    },
    detail: emptyDetailState(),
    analysisRequestId: 0,
  }),
  getters: {
    selectedRoleSet: (state) => new Set(state.selectedRoleKeys),
    hasSelection: (state) => state.selectedRoleKeys.length > 0,
    hasAnalysis: (state) => Boolean(state.analysisResults),
  },
  actions: {
    resetForDatasetChange() {
      this.selectedRoleKeys = [];
      this.analyzedRoleKeys = [];
      this.activeRoleKey = null;
      this.analysisResults = null;
      this.isAnalysisLoading = false;
      this.analysisRequestId += 1;
      this.compareSelection = { role1: null, role2: null };
      this.closeDetail();
    },
    hydrateSelection(roleKeys: RoleKey[]) {
      this.selectedRoleKeys = Array.from(new Set(roleKeys));
    },
    toggleRole(roleKey: RoleKey) {
      if (this.selectedRoleKeys.includes(roleKey)) {
        this.selectedRoleKeys = this.selectedRoleKeys.filter((key) => key !== roleKey);
      } else {
        this.selectedRoleKeys = [...this.selectedRoleKeys, roleKey];
      }
    },
    setSelection(roleKeys: RoleKey[]) {
      this.selectedRoleKeys = Array.from(new Set(roleKeys));
    },
    clearSelection() {
      this.selectedRoleKeys = [];
    },
    setRoleSearchQuery(value: string) {
      this.roleSearchQuery = value;
    },
    setSectorFilter(value: string) {
      this.sectorFilter = value;
    },
    setSkillSearchQuery(value: string) {
      this.skillSearchQuery = value;
    },
    setCompareFilter(value: CompareFilter) {
      this.compareFilter = value;
    },
    setCompareShowDescriptions(value: boolean) {
      this.compareShowDescriptions = value;
    },
    setCompareSelection(role1: RoleKey | null, role2: RoleKey | null) {
      this.compareSelection = { role1, role2 };
      if (this.analysisResults) {
        this.ensureCompareSelection();
      }
    },
    async runAnalysis(dataset: NormalizedDataset | null = null, roleKeys?: RoleKey[]) {
      const nextKeys = roleKeys ?? this.selectedRoleKeys;
      this.analyzedRoleKeys = [...nextKeys];

      const requestId = this.analysisRequestId + 1;
      this.analysisRequestId = requestId;
      this.isAnalysisLoading = true;

      try {
        const nextResults =
          dataset || nextKeys.length === 0
            ? buildAnalysis(dataset, nextKeys)
            : buildAnalysisFromRoleAnalyses(await preloadedDatasetRepository.getRoleAnalyses(nextKeys));

        if (this.analysisRequestId !== requestId) {
          return;
        }

        this.analysisResults = nextResults;
        this.ensureActiveRole();
        this.ensureCompareSelection();
        this.closeDetail();
      } finally {
        if (this.analysisRequestId === requestId) {
          this.isAnalysisLoading = false;
        }
      }
    },
    setActiveRole(roleKey: RoleKey | null) {
      this.activeRoleKey = roleKey;
      this.ensureActiveRole();
    },
    ensureActiveRole() {
      const roleKeys = this.analysisResults?.roleKeys ?? [];
      if (roleKeys.length === 0) {
        this.activeRoleKey = null;
        return;
      }

      if (!this.activeRoleKey || !roleKeys.includes(this.activeRoleKey)) {
        this.activeRoleKey = roleKeys[0] ?? null;
      }
    },
    ensureCompareSelection() {
      const roleKeys = this.analysisResults?.roleKeys ?? [];
      if (roleKeys.length === 0) {
        this.compareSelection = { role1: null, role2: null };
        return;
      }

      let role1 = this.compareSelection.role1;
      let role2 = this.compareSelection.role2;

      if (!role1 || !roleKeys.includes(role1)) {
        role1 = roleKeys[0] ?? null;
      }

      if (!role2 || !roleKeys.includes(role2) || role1 === role2) {
        role2 = roleKeys.find((key) => key !== role1) ?? null;
      }

      this.compareSelection = { role1, role2 };
    },
    openRoleSkillDetail(skillTitle: string, roleKey: RoleKey) {
      this.detail = {
        open: true,
        kind: 'role-skill',
        skillTitle,
        roleKey,
        role1Key: null,
        role2Key: null,
        focusedRoleKey: null,
      };
    },
    openCompareSkillDetail(skillTitle: string, role1Key: RoleKey, role2Key: RoleKey) {
      this.detail = {
        open: true,
        kind: 'compare-skill',
        skillTitle,
        roleKey: null,
        role1Key,
        role2Key,
        focusedRoleKey: null,
      };
    },
    openSkillCentricDetail(skillTitle: string, focusedRoleKey: RoleKey | null = null) {
      this.detail = {
        open: true,
        kind: 'skill-centric',
        skillTitle,
        roleKey: null,
        role1Key: null,
        role2Key: null,
        focusedRoleKey,
      };
    },
    closeDetail() {
      this.detail = emptyDetailState();
    },
  },
});
