<template>
  <div v-if="loadingState" class="empty-results">
    <div
      class="h-10 w-10 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--primary)]"
      aria-hidden="true"
    ></div>
    <h2>Loading skills</h2>
    <p>Preparing the skill index from the current dataset source.</p>
  </div>

  <div v-else-if="!results" class="empty-results">
    <div class="empty-results-icon">💡</div>
    <h2>Skill view appears after analysis</h2>
    <p>Analyse one or more roles to browse the normalized skills across them.</p>
    <UiButton v-if="datasetStore.hasDataset" class="mt-4" variant="primary" @click="uiStore.setSidebarOpen(true)">
      Select roles
    </UiButton>
  </div>

  <div v-else class="flex min-h-0 flex-1 flex-col gap-4">
    <section class="page-panel px-5 py-4">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-col gap-2 text-sm text-[var(--text-secondary)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
          <div class="text-lg font-semibold text-[var(--text-primary)]">Skill index</div>
          <div class="hidden sm:block"><span class="font-semibold text-[var(--text-primary)]">{{ filteredSkills.length }}</span> shown</div>
        </div>

        <div class="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[36rem] lg:flex-row lg:items-center lg:justify-end">
          <div class="w-full lg:min-w-[18rem]">
            <UiInput v-model="skillInput" placeholder="Search skills" />
          </div>
          <UiCopyButton
            v-if="!uiStore.isMobile"
            size="sm"
            variant="secondary"
            :disabled="!filteredSkills.length"
            :text="copyPayload"
            tooltip="Copy JSON"
            success-tooltip="Copied JSON"
          />
        </div>
      </div>
    </section>

    <section class="table-shell flex min-h-0 flex-1 flex-col">
      <div v-if="filteredSkills.length && uiStore.isMobile" class="divide-y divide-[var(--border-default)]">
        <button
          v-for="skill in filteredSkills"
          :key="skill.skillKey"
          class="block w-full px-4 py-4 text-left transition-colors hover:bg-[var(--surface-muted)]"
          :class="{ 'bg-[var(--primary-soft)]': explorerStore.detail.kind === 'skill-centric' && explorerStore.detail.skillKey === skill.skillKey }"
          type="button"
          @click="explorerStore.openSkillCentricDetail(skill.skillKey, skill.title)"
        >
          <div class="text-base font-semibold text-[var(--text-primary)]">{{ skill.title }}</div>
          <div v-if="skill.subtitle" class="mt-1 text-xs text-[var(--text-muted)]">{{ skill.subtitle }}</div>
          <div class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="role in skill.roles.slice(0, 2)"
              :key="role.key"
              class="badge badge-primary"
            >
              {{ role.name }}
            </span>
            <span v-if="skill.roles.length > 2" class="inline-flex items-center text-xs text-[var(--text-muted)]">+{{ skill.roles.length - 2 }} more</span>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <span v-for="level in skill.proficiencyLevels" :key="level" class="level-badge">{{ level }}</span>
          </div>
        </button>
      </div>

      <UiVirtualTable
        v-else-if="filteredSkills.length"
        class="min-h-0 flex-1"
        table-class="compare-table skills-table"
        :items="filteredSkills"
        :item-height="92"
        :column-count="3"
        item-key="skillKey"
      >
        <template #header>
          <tr>
            <th>Skill</th>
            <th>Roles</th>
            <th>Levels</th>
          </tr>
        </template>

        <template #row="{ item: skill, rowStyle }">
          <tr
            :style="rowStyle"
            class="skills-table-row"
            :class="{ active: explorerStore.detail.kind === 'skill-centric' && explorerStore.detail.skillKey === skill.skillKey }"
            @click="explorerStore.openSkillCentricDetail(skill.skillKey, skill.title)"
          >
            <td>
              <div class="font-medium text-[var(--text-primary)]">{{ skill.title }}</div>
              <div v-if="skill.subtitle" class="mt-1 text-xs text-[var(--text-muted)]">{{ skill.subtitle }}</div>
            </td>
            <td>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="role in skill.roles.slice(0, 3)"
                  :key="role.key"
                  class="badge badge-primary"
                >
                  {{ role.name }}
                </span>
                <span v-if="skill.roles.length > 3" class="inline-flex items-center text-xs text-[var(--text-muted)]">+{{ skill.roles.length - 3 }} more</span>
              </div>
            </td>
            <td>
              <div class="flex flex-wrap gap-2">
                <span v-for="level in skill.proficiencyLevels" :key="level" class="level-badge">{{ level }}</span>
              </div>
            </td>
          </tr>
        </template>
      </UiVirtualTable>

      <div v-else class="px-4 py-16 text-center">
        <div class="text-base font-semibold text-[var(--text-primary)]">No matching skills</div>
        <div class="mt-2 text-sm text-[var(--text-secondary)]">
          No skills match
          <span class="font-medium text-[var(--text-primary)]">{{ debouncedSkillQuery || 'the current filter' }}</span>.
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import UiButton from '../ui/UiButton.vue';
import UiCopyButton from '../ui/UiCopyButton.vue';
import UiInput from '../ui/UiInput.vue';
import UiVirtualTable from '../ui/UiVirtualTable.vue';
import { useDatasetStore } from '../../stores/dataset';
import { useExplorerStore } from '../../stores/explorer';
import { useUiStore } from '../../stores/ui';

const datasetStore = useDatasetStore();
const explorerStore = useExplorerStore();
const uiStore = useUiStore();

const skillInput = ref(explorerStore.skillSearchQuery);
const debouncedSkillQuery = ref(explorerStore.skillSearchQuery);
let debounceTimer: number | undefined;

const showAllSkills = computed(() => datasetStore.hasDataset && !explorerStore.selectedRoleKeys.length);
const results = computed(() => (showAllSkills.value ? datasetStore.globalSkillsResults : explorerStore.analysisResults));
const loadingState = computed(() => explorerStore.isAnalysisLoading || (showAllSkills.value && datasetStore.isGlobalSkillsLoading));
const allSkills = computed(() =>
  results.value?.uniqueSkillKeys.map((skillKey) => results.value!.uniqueSkills[skillKey]) ?? [],
);

const filteredSkills = computed(() => {
  const query = debouncedSkillQuery.value.trim().toLowerCase();

  return allSkills.value.filter((skill) => !query || skill.title.toLowerCase().includes(query));
});

const copyPayload = computed(() => {
  if (!results.value || !filteredSkills.value.length) {
    return '';
  }

  return JSON.stringify(
    {
      copiedAt: new Date().toISOString(),
      query: explorerStore.skillSearchQuery,
      analysedRoleKeys: results.value.roleKeys,
      skillCount: filteredSkills.value.length,
      skills: filteredSkills.value,
    },
    null,
    2,
  );
});

watch(
  skillInput,
  (value) => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      explorerStore.setSkillSearchQuery(value);
      debouncedSkillQuery.value = value;
    }, 160);
  },
  { immediate: true },
);

watch(
  () => explorerStore.skillSearchQuery,
  (value) => {
    if (value !== skillInput.value) {
      skillInput.value = value;
    }
    debouncedSkillQuery.value = value;
  },
);

watch(
  showAllSkills,
  (value) => {
    if (value) {
      void datasetStore.ensureGlobalSkillsLoaded();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  window.clearTimeout(debounceTimer);
});
</script>
