import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useDatasetStore } from '../stores/dataset';
import { useExplorerStore } from '../stores/explorer';

function readStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === 'string' && value) {
    return [value];
  }

  return [];
}

export function useUrlSync() {
  const router = useRouter();
  const route = useRoute();
  const datasetStore = useDatasetStore();
  const explorerStore = useExplorerStore();

  const routeName = computed(() => route.name?.toString() ?? 'roles');

  const applyQueryToStore = () => {
    if (!datasetStore.dataset) {
      return;
    }

    const roleKeys = readStringArray(route.query.roles).filter((key) => Boolean(datasetStore.dataset?.roleByKey[key]));
    if (roleKeys.length && JSON.stringify(roleKeys) !== JSON.stringify(explorerStore.analyzedRoleKeys)) {
      explorerStore.setSelection(roleKeys);
      explorerStore.runAnalysis(datasetStore.dataset, roleKeys);
    }

    if (typeof route.query.q === 'string') {
      if (routeName.value === 'roles') {
        explorerStore.setRoleSearchQuery(route.query.q);
      }
      if (routeName.value === 'skills') {
        explorerStore.setSkillSearchQuery(route.query.q);
      }
    }

    if (typeof route.query.sector === 'string' && routeName.value === 'roles') {
      explorerStore.setSectorFilter(route.query.sector);
    }

    if (routeName.value === 'roles') {
      const activeRole = typeof route.query.role === 'string' ? route.query.role : null;
      if (activeRole && datasetStore.dataset?.roleByKey[activeRole]) {
        explorerStore.setActiveRole(activeRole);
      } else {
        explorerStore.ensureActiveRole();
      }
    }

    if (routeName.value === 'compare') {
      const role1 = typeof route.query.role1 === 'string' ? route.query.role1 : null;
      const role2 = typeof route.query.role2 === 'string' ? route.query.role2 : null;
      if (role1 || role2) {
        explorerStore.setCompareSelection(role1, role2);
        explorerStore.ensureCompareSelection();
      }

      if (typeof route.query.filter === 'string') {
        explorerStore.setCompareFilter(route.query.filter as never);
      }

      if (route.query.details === '1') {
        explorerStore.setCompareShowDescriptions(true);
      }
    }

    if (routeName.value === 'skills' && typeof route.query.skill === 'string') {
      const focusedRoleKey = typeof route.query.role === 'string' ? route.query.role : null;
      explorerStore.openSkillCentricDetail(route.query.skill, focusedRoleKey);
    }
  };

  watch(
    () => datasetStore.dataset,
    () => {
      applyQueryToStore();
    },
    { immediate: true },
  );

  watch(
    () => route.fullPath,
    () => {
      applyQueryToStore();
    },
  );

  watch(
    () => ({
      name: routeName.value,
      roles: explorerStore.analysisResults?.roleKeys ?? [],
      roleSearchQuery: explorerStore.roleSearchQuery,
      sectorFilter: explorerStore.sectorFilter,
      skillSearchQuery: explorerStore.skillSearchQuery,
      activeRoleKey: explorerStore.activeRoleKey,
      compareSelection: explorerStore.compareSelection,
      compareFilter: explorerStore.compareFilter,
      compareShowDescriptions: explorerStore.compareShowDescriptions,
      detail: explorerStore.detail,
    }),
    (state) => {
      const query: Record<string, string | string[]> = {};

      if (state.roles.length) {
        query.roles = state.roles;
      }

      if (state.name === 'roles') {
        if (state.roleSearchQuery) {
          query.q = state.roleSearchQuery;
        }
        if (state.sectorFilter) {
          query.sector = state.sectorFilter;
        }
        if (state.activeRoleKey) {
          query.role = state.activeRoleKey;
        }
      }

      if (state.name === 'compare') {
        if (state.compareSelection.role1) {
          query.role1 = state.compareSelection.role1;
        }
        if (state.compareSelection.role2) {
          query.role2 = state.compareSelection.role2;
        }
        if (state.compareFilter !== 'all') {
          query.filter = state.compareFilter;
        }
        if (state.compareShowDescriptions) {
          query.details = '1';
        }
      }

      if (state.name === 'skills') {
        if (state.skillSearchQuery) {
          query.q = state.skillSearchQuery;
        }
        if (state.detail.kind === 'skill-centric' && state.detail.skillTitle) {
          query.skill = state.detail.skillTitle;
          if (state.detail.focusedRoleKey) {
            query.role = state.detail.focusedRoleKey;
          }
        }
      }

      const currentQuery = JSON.stringify(route.query);
      const nextQuery = JSON.stringify(query);
      if (currentQuery !== nextQuery) {
        router.replace({ name: state.name, query });
      }
    },
    { deep: true },
  );
}
