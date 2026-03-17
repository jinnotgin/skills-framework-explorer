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

function uniqueValidRoleKeys(roleKeys: Array<string | null>, roleLookup: Record<string, unknown>) {
  return Array.from(new Set(roleKeys.filter((key): key is string => Boolean(key && roleLookup[key]))));
}

export function useUrlSync() {
  const router = useRouter();
  const route = useRoute();
  const datasetStore = useDatasetStore();
  const explorerStore = useExplorerStore();
  let isApplyingQuery = false;
  let isSyncingRoute = false;

  const routeName = computed(() => {
    const value = route.name?.toString();
    return value === 'roles' || value === 'compare' || value === 'skills' ? value : null;
  });

  function isSameSkillCentricDetail(skillKey: string, focusedRoleKey: string | null) {
    return (
      explorerStore.detail.open &&
      explorerStore.detail.kind === 'skill-centric' &&
      explorerStore.detail.skillKey === skillKey &&
      explorerStore.detail.focusedRoleKey === focusedRoleKey
    );
  }

  const syncStoreToRoute = async () => {
    if (!routeName.value || !datasetStore.hasDataset || isApplyingQuery || isSyncingRoute) {
      return;
    }

    const query: Record<string, string | string[]> = {};
    const analyzedRoleKeys = explorerStore.analysisResults?.roleKeys ?? [];

    if (analyzedRoleKeys.length) {
      query.roles = analyzedRoleKeys;
    }

    if (routeName.value === 'roles') {
      if (explorerStore.roleSearchQuery) {
        query.q = explorerStore.roleSearchQuery;
      }
      if (explorerStore.sectorFilter) {
        query.sector = explorerStore.sectorFilter;
      }
      if (explorerStore.activeRoleKey) {
        query.role = explorerStore.activeRoleKey;
      }
    }

    if (routeName.value === 'compare') {
      if (explorerStore.compareSelection.role1) {
        query.role1 = explorerStore.compareSelection.role1;
      }
      if (explorerStore.compareSelection.role2) {
        query.role2 = explorerStore.compareSelection.role2;
      }
      if (explorerStore.compareFilter !== 'all') {
        query.filter = explorerStore.compareFilter;
      }
      if (explorerStore.compareShowDescriptions) {
        query.details = '1';
      }
    }

    if (routeName.value === 'skills') {
      if (explorerStore.skillSearchQuery) {
        query.q = explorerStore.skillSearchQuery;
      }
      if (explorerStore.detail.open && explorerStore.detail.kind === 'skill-centric' && explorerStore.detail.skillKey) {
        query.skill = explorerStore.detail.skillKey;
        if (explorerStore.detail.focusedRoleKey) {
          query.role = explorerStore.detail.focusedRoleKey;
        }
      }
    }

    const currentQuery = JSON.stringify(route.query);
    const nextQuery = JSON.stringify(query);
    if (currentQuery !== nextQuery) {
      isSyncingRoute = true;

      try {
        await router.replace({ name: routeName.value, query });
      } finally {
        isSyncingRoute = false;
      }
    }
  };

  const applyQueryToStore = async () => {
    if (!routeName.value || !datasetStore.hasDataset || isSyncingRoute) {
      return;
    }

    const incomingRouteName = routeName.value;
    const incomingQuery = route.query;

    isApplyingQuery = true;

    try {
      const compareRole1 = typeof incomingQuery.role1 === 'string' ? incomingQuery.role1 : null;
      const compareRole2 = typeof incomingQuery.role2 === 'string' ? incomingQuery.role2 : null;
      const focusedRole = typeof incomingQuery.role === 'string' ? incomingQuery.role : null;
      const roleKeys = (() => {
        const explicitRoleKeys = uniqueValidRoleKeys(readStringArray(incomingQuery.roles), datasetStore.roleByKey);
        if (explicitRoleKeys.length > 0) {
          return explicitRoleKeys;
        }

        if (incomingRouteName === 'compare') {
          return uniqueValidRoleKeys([compareRole1, compareRole2], datasetStore.roleByKey);
        }

        if (incomingRouteName === 'skills' && focusedRole) {
          return uniqueValidRoleKeys([focusedRole], datasetStore.roleByKey);
        }

        return [];
      })();

      if (roleKeys.length && JSON.stringify(roleKeys) !== JSON.stringify(explorerStore.analyzedRoleKeys)) {
        explorerStore.setSelection(roleKeys);
        await explorerStore.runAnalysis(datasetStore.dataset, roleKeys);
      }

      if (typeof incomingQuery.q === 'string') {
        if (incomingRouteName === 'roles') {
          explorerStore.setRoleSearchQuery(incomingQuery.q);
        }
        if (incomingRouteName === 'skills') {
          explorerStore.setSkillSearchQuery(incomingQuery.q);
        }
      }

      if (typeof incomingQuery.sector === 'string' && incomingRouteName === 'roles') {
        explorerStore.setSectorFilter(incomingQuery.sector);
      }

      if (incomingRouteName === 'roles') {
        const activeRole = typeof incomingQuery.role === 'string' ? incomingQuery.role : null;
        if (activeRole && datasetStore.roleByKey[activeRole]) {
          explorerStore.setActiveRole(activeRole);
        } else {
          explorerStore.ensureActiveRole();
        }
      }

      if (incomingRouteName === 'compare') {
        const role1 = compareRole1;
        const role2 = compareRole2;
        if (role1 || role2) {
          explorerStore.setCompareSelection(role1, role2);
          explorerStore.ensureCompareSelection();
        }

        if (typeof incomingQuery.filter === 'string') {
          explorerStore.setCompareFilter(incomingQuery.filter as never);
        }

        explorerStore.setCompareShowDescriptions(incomingQuery.details === '1');
      }

      if (incomingRouteName === 'skills' && typeof incomingQuery.skill === 'string') {
        if (!explorerStore.selectedRoleKeys.length) {
          await datasetStore.ensureGlobalSkillsLoaded();
        }

        const results =
          incomingRouteName === 'skills' && !explorerStore.selectedRoleKeys.length ? datasetStore.globalSkillsResults : explorerStore.analysisResults;
        const directMatch = results?.uniqueSkills[incomingQuery.skill] ?? null;
        const titleMatches =
          directMatch || !results
            ? []
            : results.uniqueSkillKeys
                .map((skillKey) => results.uniqueSkills[skillKey])
                .filter((skill) => skill.title === incomingQuery.skill);
        const focusedRoleKey = focusedRole;
        const resolvedSkill = directMatch ?? (titleMatches.length === 1 ? titleMatches[0] : null);
        if (resolvedSkill && !isSameSkillCentricDetail(resolvedSkill.skillKey, focusedRoleKey)) {
          explorerStore.openSkillCentricDetail(resolvedSkill.skillKey, resolvedSkill.title, focusedRoleKey);
        } else if (!resolvedSkill && explorerStore.detail.kind === 'skill-centric') {
          explorerStore.closeDetail();
        }
      } else if (incomingRouteName === 'skills' && explorerStore.detail.kind === 'skill-centric') {
        explorerStore.closeDetail();
      }
    } finally {
      isApplyingQuery = false;
    }

    await syncStoreToRoute();
  };

  watch(
    () => [datasetStore.hasDataset, datasetStore.importMode, datasetStore.generatedAt],
    () => {
      void applyQueryToStore();
    },
    { immediate: true },
  );

  watch(
    () => route.fullPath,
    () => {
      void applyQueryToStore();
    },
  );

  watch(
    () => [
      routeName.value,
      ...(explorerStore.analysisResults?.roleKeys ?? []),
      explorerStore.roleSearchQuery,
      explorerStore.sectorFilter,
      explorerStore.skillSearchQuery,
      explorerStore.activeRoleKey,
      explorerStore.compareSelection.role1,
      explorerStore.compareSelection.role2,
      explorerStore.compareFilter,
      explorerStore.compareShowDescriptions ? '1' : '0',
      explorerStore.detail.open ? '1' : '0',
      explorerStore.detail.kind,
      explorerStore.detail.skillKey,
      explorerStore.detail.focusedRoleKey,
    ],
    () => {
      void syncStoreToRoute();
    },
  );
}
