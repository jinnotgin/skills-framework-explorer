import { defineStore } from 'pinia';

export type ExplorerView = 'role' | 'compare' | 'skill';

export const useSelectionStore = defineStore('selection', {
  state: () => ({
    searchTerm: '',
    sectorFilter: 'all',
    currentView: 'role' as ExplorerView,
    selectedRoleKeys: [] as string[],
    chipsExpanded: false,
    activeDetail: null as { roleKey: string; code: string; proficiency: string } | null
  }),
  getters: {
    selectedCount: (state) => state.selectedRoleKeys.length,
    selectedLookup: (state) => new Set(state.selectedRoleKeys)
  },
  actions: {
    restorePersisted() {
      const raw = localStorage.getItem('selection-store');
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.selectedRoleKeys)) {
          this.selectedRoleKeys = parsed.selectedRoleKeys;
        }
        if (typeof parsed.currentView === 'string') {
          this.currentView = parsed.currentView;
        }
      } catch {
        /* ignore */
      }
    },
    persist() {
      const payload = {
        selectedRoleKeys: this.selectedRoleKeys,
        currentView: this.currentView
      };
      localStorage.setItem('selection-store', JSON.stringify(payload));
    },
    setView(view: ExplorerView) {
      this.currentView = view;
      this.persist();
    },
    setSearchTerm(term: string) {
      this.searchTerm = term;
    },
    setSectorFilter(sector: string) {
      this.sectorFilter = sector;
    },
    toggleRole(key: string) {
      const exists = this.selectedRoleKeys.includes(key);
      this.selectedRoleKeys = exists
        ? this.selectedRoleKeys.filter((k) => k !== key)
        : [...this.selectedRoleKeys, key];
      this.persist();
    },
    clearSelection() {
      this.selectedRoleKeys = [];
      this.persist();
    },
    setChipsExpanded(expanded: boolean) {
      this.chipsExpanded = expanded;
    },
    setActiveDetail(payload: { roleKey: string; code: string; proficiency: string } | null) {
      this.activeDetail = payload;
    }
  }
});
