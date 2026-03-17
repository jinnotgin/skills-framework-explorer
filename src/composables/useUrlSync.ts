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

  function isSameSkillCentricDetail(skillKey: string, focusedRoleKey: string | null) {
    return (
      explorerStore.detail.open &&
      explorerStore.detail.kind === 'skill-centric' &&
      explorerStore.detail.skillKey === skillKey &&
      explorerStore.detail.focusedRoleKey === focusedRoleKey
    );
  }

  const applyQueryToStore = async () => {
    if (!datasetStore.hasDataset) {
      return;
    }

    const roleKeys = readStringArray(route.query.roles).filter((key) => Boolean(datasetStore.roleByKey[key]));
    if (roleKeys.length && JSON.stringify(roleKeys) !== JSON.stringify(explorerStore.analyzedRoleKeys)) {
      explorerStore.setSelection(roleKeys);
      await explorerStore.runAnalysis(datasetStore.dataset, roleKeys);
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
      if (activeRole && datasetStore.roleByKey[activeRole]) {
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
      if (!explorerStore.selectedRoleKeys.length) {
        await datasetStore.ensureGlobalSkillsLoaded();
      }

      const results =
        routeName.value === 'skills' && !explorerStore.selectedRoleKeys.length ? datasetStore.globalSkillsResults : explorerStore.analysisResults;
      const directMatch = results?.uniqueSkills[route.query.skill] ?? null;
      const titleMatches =
        directMatch || !results
          ? []
          : results.uniqueSkillKeys
              .map((skillKey) => results.uniqueSkills[skillKey])
              .filter((skill) => skill.title === route.query.skill);
      const focusedRoleKey = typeof route.query.role === 'string' ? route.query.role : null;
      const resolvedSkill = directMatch ?? (titleMatches.length === 1 ? titleMatches[0] : null);
      if (resolvedSkill && !isSameSkillCentricDetail(resolvedSkill.skillKey, focusedRoleKey)) {
        explorerStore.openSkillCentricDetail(resolvedSkill.skillKey, resolvedSkill.title, focusedRoleKey);
      } else if (!resolvedSkill && explorerStore.detail.kind === 'skill-centric') {
        explorerStore.closeDetail();
      }
    } else if (routeName.value === 'skills' && explorerStore.detail.kind === 'skill-centric') {
      explorerStore.closeDetail();
    }
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
        router.replace({ name: routeName.value, query });
      }
    },
  );
}
