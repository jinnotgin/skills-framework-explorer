<template>
  <div v-if="!results" class="empty-results">
    <div class="empty-results-icon">💡</div>
    <h2>Skill view appears after analysis</h2>
    <p>Analyse one or more roles to browse the normalized skills across them.</p>
    <UiButton v-if="datasetStore.hasDataset" class="mt-4" variant="primary" @click="uiStore.setSidebarOpen(true)">
      Select roles
    </UiButton>
  </div>

  <div v-else class="space-y-4">
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
          <UiButton
            v-if="!uiStore.isMobile"
            size="sm"
            variant="secondary"
            :disabled="!filteredSkills.length"
            :title="copyButtonLabel"
            @click="copySkills"
          >
            <Clipboard class="h-4 w-4" />
          </UiButton>
        </div>
      </div>
    </section>

    <section class="table-shell">
      <div v-if="filteredSkills.length && uiStore.isMobile" class="divide-y divide-[var(--border-default)]">
        <button
          v-for="skill in filteredSkills"
          :key="skill.title"
          class="block w-full px-4 py-4 text-left transition-colors hover:bg-[var(--surface-muted)]"
          :class="{ 'bg-[var(--primary-soft)]': explorerStore.detail.kind === 'skill-centric' && explorerStore.detail.skillTitle === skill.title }"
          type="button"
          @click="explorerStore.openSkillCentricDetail(skill.title)"
        >
          <div class="text-base font-semibold text-[var(--text-primary)]">{{ skill.title }}</div>
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

      <table v-else-if="filteredSkills.length" class="compare-table skills-table">
        <thead>
          <tr>
            <th>Skill</th>
            <th>Roles</th>
            <th>Levels</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="skill in filteredSkills"
            :key="skill.title"
            class="skills-table-row"
            :class="{ active: explorerStore.detail.kind === 'skill-centric' && explorerStore.detail.skillTitle === skill.title }"
            @click="explorerStore.openSkillCentricDetail(skill.title)"
          >
            <td class="font-medium text-[var(--text-primary)]">{{ skill.title }}</td>
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
        </tbody>
      </table>

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
import { Clipboard } from 'lucide-vue-next';

import { buildSkillsIndex } from '../../lib/skills-framework/analysis';
import UiButton from '../ui/UiButton.vue';
import UiInput from '../ui/UiInput.vue';
import { useDatasetStore } from '../../stores/dataset';
import { useExplorerStore } from '../../stores/explorer';
import { useUiStore } from '../../stores/ui';

const datasetStore = useDatasetStore();
const explorerStore = useExplorerStore();
const uiStore = useUiStore();

const copyState = ref<'idle' | 'done' | 'error'>('idle');
const skillInput = ref(explorerStore.skillSearchQuery);
const debouncedSkillQuery = ref(explorerStore.skillSearchQuery);
let debounceTimer: number | undefined;

const showAllSkills = computed(() => datasetStore.hasDataset && !explorerStore.selectedRoleKeys.length);
const results = computed(() =>
  showAllSkills.value ? buildSkillsIndex(datasetStore.dataset) : explorerStore.analysisResults,
);
const allSkills = computed(() =>
  results.value?.uniqueSkillTitles.map((title) => results.value!.uniqueSkills[title]) ?? [],
);

const filteredSkills = computed(() => {
  const query = debouncedSkillQuery.value.trim().toLowerCase();

  return allSkills.value.filter((skill) => !query || skill.title.toLowerCase().includes(query));
});

const copyButtonLabel = computed(() => {
  if (copyState.value === 'done') {
    return 'Copied';
  }
  if (copyState.value === 'error') {
    return 'Copy failed';
  }
  return 'Copy shown skills';
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

onBeforeUnmount(() => {
  window.clearTimeout(debounceTimer);
});

async function copySkills() {
  if (!results.value || !filteredSkills.value.length) {
    return;
  }

  const payload = {
    copiedAt: new Date().toISOString(),
    query: explorerStore.skillSearchQuery,
    analysedRoleKeys: results.value.roleKeys,
    skillCount: filteredSkills.value.length,
    skills: filteredSkills.value,
  };

  const text = JSON.stringify(payload, null, 2);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopy(text);
    }
    copyState.value = 'done';
  } catch {
    try {
      fallbackCopy(text);
      copyState.value = 'done';
    } catch {
      copyState.value = 'error';
    }
  }

  window.setTimeout(() => {
    copyState.value = 'idle';
  }, 2000);
}

function fallbackCopy(text: string) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}
</script>
