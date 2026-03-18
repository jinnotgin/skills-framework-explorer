<template>
  <div v-if="explorerStore.isAnalysisLoading" class="empty-results">
    <div class="empty-results-icon">⏳</div>
    <h2>Loading comparison</h2>
    <p>Fetching the selected role analysis.</p>
  </div>

  <div v-else-if="!results" class="empty-results">
    <div class="empty-results-icon">⚖️</div>
    <h2>Run an analysis to compare roles</h2>
    <p>Select and analyse at least two roles to compare shared skills and proficiency differences.</p>
    <UiButton v-if="datasetStore.hasDataset" class="mt-4" variant="primary" @click="uiStore.setSidebarOpen(true)">
      Select roles
    </UiButton>
  </div>

  <div v-else-if="results.roleKeys.length < 2" class="empty-results">
    <div class="empty-results-icon">⚖️</div>
    <h2>Select at least two roles</h2>
    <p>Compare becomes available once the analysis includes two or more roles.</p>
  </div>

  <div v-else class="space-y-4">
    <section class="page-panel px-5 py-4">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-[var(--text-primary)]">Compare roles</h2>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">Choose two analysed roles and review shared skills, missing skills, and mismatched levels.</p>
        </div>
        <div class="grid gap-3 md:grid-cols-2 xl:min-w-[36rem]">
          <UiSelect v-model="role1Value">
            <option v-for="role in roleOptions" :key="role.key" :value="role.key">{{ role.label }}</option>
          </UiSelect>
          <UiSelect v-model="role2Value">
            <option v-for="role in roleOptions" :key="role.key" :value="role.key">{{ role.label }}</option>
          </UiSelect>
        </div>
      </div>

      <div class="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="filter in filters"
            :key="filter.value"
            class="rounded-[8px] border px-3 py-2 text-sm font-medium transition-colors"
            :class="
              explorerStore.compareFilter === filter.value
                ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--text-primary)]'
                : 'border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'
            "
            type="button"
            @click="explorerStore.setCompareFilter(filter.value)"
          >
            {{ filter.label }}
          </button>
        </div>

        <UiButton
          size="sm"
          variant="secondary"
          :title="explorerStore.compareShowDescriptions ? 'Hide details' : 'Show details'"
          @click="explorerStore.setCompareShowDescriptions(!explorerStore.compareShowDescriptions)"
        >
          <FileText class="mr-2 h-4 w-4" />
          <span>{{ explorerStore.compareShowDescriptions ? 'Hide details' : 'Show details' }}</span>
        </UiButton>
      </div>
    </section>

    <section class="table-shell overflow-visible">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Skill</th>
            <th>{{ role1Label }}</th>
            <th>{{ role2Label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in filteredRows"
            :key="row.skillKey"
            :class="{ active: isActiveRow(row.skillKey) }"
            @click="openCompareDetail(row.skillKey, row.title)"
          >
            <td>
              <div class="font-medium text-[var(--text-primary)]">{{ row.title }}</div>
              <div v-if="row.subtitle" class="mt-1 text-xs text-[var(--text-muted)]">{{ row.subtitle }}</div>
            </td>
            <td>
              <div v-if="row.skill1" class="space-y-2">
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="level in row.skill1.proficiencyLevels.slice().reverse()"
                    :key="level"
                    class="level-badge"
                    :class="{ 'border-[var(--warning)] bg-[var(--warning-soft)]': highlightLeft(row, level) }"
                  >
                    {{ formatLevelBadge(level) }}
                  </span>
                </div>
                <div
                  v-if="explorerStore.compareShowDescriptions"
                  class="space-y-1 text-xs text-[var(--text-muted)]"
                >
                  <div v-for="level in row.skill1.proficiencyLevels.slice().reverse()" :key="`left-${row.title}-${level}`">
                    <span class="font-medium text-[var(--text-secondary)]">{{ formatLevelHeading(level) }}:</span>
                    {{ levelDescription(row.skill1, level) || 'No description available.' }}
                  </div>
                </div>
              </div>
              <span v-else class="text-sm text-[var(--text-muted)]">Not required</span>
            </td>
            <td>
              <div v-if="row.skill2" class="space-y-2">
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="level in row.skill2.proficiencyLevels.slice().reverse()"
                    :key="level"
                    class="level-badge"
                    :class="{ 'border-[var(--warning)] bg-[var(--warning-soft)]': highlightRight(row, level) }"
                  >
                    {{ formatLevelBadge(level) }}
                  </span>
                </div>
                <div
                  v-if="explorerStore.compareShowDescriptions"
                  class="space-y-1 text-xs text-[var(--text-muted)]"
                >
                  <div v-for="level in row.skill2.proficiencyLevels.slice().reverse()" :key="`right-${row.title}-${level}`">
                    <span class="font-medium text-[var(--text-secondary)]">{{ formatLevelHeading(level) }}:</span>
                    {{ levelDescription(row.skill2, level) || 'No description available.' }}
                  </div>
                </div>
              </div>
              <span v-else class="text-sm text-[var(--text-muted)]">Not required</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { FileText } from 'lucide-vue-next';

import UiButton from '../ui/UiButton.vue';
import UiSelect from '../ui/UiSelect.vue';
import { buildCompareRows } from '../../lib/skills-framework/analysis';
import { formatLevelBadge, formatLevelHeading, formatRoleLabel, getLevelSortValue } from '../../lib/skills-framework/utils';
import { useDatasetStore } from '../../stores/dataset';
import { useExplorerStore } from '../../stores/explorer';
import { useUiStore } from '../../stores/ui';

const datasetStore = useDatasetStore();
const explorerStore = useExplorerStore();
const uiStore = useUiStore();

const filters = [
  { value: 'all', label: 'All' },
  { value: 'shared', label: 'Shared skills' },
  { value: 'diff', label: 'Gaps only' },
  { value: 'role1', label: 'Only in role 1' },
  { value: 'role2', label: 'Only in role 2' },
] as const;

const results = computed(() => explorerStore.analysisResults);

const roleOptions = computed(() =>
  results.value?.roleKeys.map((roleKey) => ({
    key: roleKey,
    label: formatRoleLabel(results.value!.roles[roleKey]),
  })) ?? [],
);

const role1 = computed({
  get: () => explorerStore.compareSelection.role1,
  set: (value: string | null) => {
    const currentRole2 = explorerStore.compareSelection.role2;
    if (value && value === currentRole2) {
      explorerStore.setCompareSelection(currentRole2, explorerStore.compareSelection.role1);
      return;
    }

    explorerStore.setCompareSelection(value, currentRole2);
  },
});

const role2 = computed({
  get: () => explorerStore.compareSelection.role2,
  set: (value: string | null) => {
    const currentRole1 = explorerStore.compareSelection.role1;
    if (value && value === currentRole1) {
      explorerStore.setCompareSelection(explorerStore.compareSelection.role2, currentRole1);
      return;
    }

    explorerStore.setCompareSelection(currentRole1, value);
  },
});

const role1Value = computed({
  get: () => role1.value ?? '',
  set: (value: string) => {
    role1.value = value || null;
  },
});

const role2Value = computed({
  get: () => role2.value ?? '',
  set: (value: string) => {
    role2.value = value || null;
  },
});

const role1Label = computed(() => (role1.value && results.value ? formatRoleLabel(results.value.roles[role1.value]) : 'Role 1'));
const role2Label = computed(() => (role2.value && results.value ? formatRoleLabel(results.value.roles[role2.value]) : 'Role 2'));

const compareRows = computed(() => buildCompareRows(results.value, role1.value, role2.value));

const filteredRows = computed(() =>
  compareRows.value.filter((row) => {
    if (explorerStore.compareFilter === 'shared') {
      return Boolean(row.skill1 && row.skill2);
    }
    if (explorerStore.compareFilter === 'role1') {
      return Boolean(row.skill1 && !row.skill2);
    }
    if (explorerStore.compareFilter === 'role2') {
      return Boolean(row.skill2 && !row.skill1);
    }
    if (explorerStore.compareFilter === 'diff') {
      const leftMax = row.prof1.length ? Math.max(...row.prof1) : null;
      const rightMax = row.prof2.length ? Math.max(...row.prof2) : null;
      return !row.skill1 || !row.skill2 || leftMax !== rightMax;
    }
    return true;
  }),
);

function levelDescription(skill: NonNullable<(typeof compareRows.value)[number]['skill1']>, level: string) {
  return skill.proficiencies[level]?.proficiencyDescription ?? '';
}

function highlightLeft(row: (typeof compareRows.value)[number], level: string) {
  const current = getLevelSortValue(level);
  const leftMax = row.prof1.length ? Math.max(...row.prof1) : null;
  const rightMax = row.prof2.length ? Math.max(...row.prof2) : null;
  return current !== null && leftMax !== null && rightMax !== null && leftMax > rightMax && current === leftMax;
}

function highlightRight(row: (typeof compareRows.value)[number], level: string) {
  const current = getLevelSortValue(level);
  const leftMax = row.prof1.length ? Math.max(...row.prof1) : null;
  const rightMax = row.prof2.length ? Math.max(...row.prof2) : null;
  return current !== null && leftMax !== null && rightMax !== null && rightMax > leftMax && current === rightMax;
}

function isActiveRow(skillKey: string) {
  return explorerStore.detail.kind === 'compare-skill' && explorerStore.detail.skillKey === skillKey;
}

function openCompareDetail(skillKey: string, skillTitle: string) {
  if (!role1.value || !role2.value) {
    return;
  }

  explorerStore.openCompareSkillDetail(skillKey, skillTitle, role1.value, role2.value);
}
</script>
