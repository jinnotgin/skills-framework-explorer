<template>
  <div v-if="explorerStore.isAnalysisLoading" class="empty-results">
    <div class="empty-results-icon">⏳</div>
    <h2>Loading analysis</h2>
    <p>Fetching the selected role analysis.</p>
  </div>

  <div v-else-if="!results" class="empty-results">
    <div class="empty-results-icon">🎯</div>
    <h2>Ready to explore roles?</h2>
    <p>
      {{
        datasetStore.hasDataset
          ? 'Select roles in the left rail and run analysis to open the role workspace.'
          : 'Load the bundled data or upload the latest workbooks, then select roles to begin.'
      }}
    </p>
    <UiButton v-if="datasetStore.hasDataset" class="mt-4" variant="primary" @click="uiStore.setSidebarOpen(true)">
      Filter roles
    </UiButton>
  </div>

  <div v-else-if="!activeRole" class="empty-results">
    <div class="empty-results-icon">📂</div>
    <h2>No analysed role is selected</h2>
    <p>Choose one of the analysed roles to inspect it.</p>
  </div>

  <div v-else class="space-y-4">
    <section class="page-panel overflow-hidden">
      <div class="border-b border-[var(--border-default)] px-4 py-3">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="w-full lg:w-[28rem]">
            <UiSelect v-model="rolePickerValue">
              <option v-for="role in analyzedRoleOptions" :key="role.key" :value="role.key">{{ role.label }}</option>
            </UiSelect>
          </div>
          <div class="text-left lg:text-right">
            <div class="text-base font-semibold text-[var(--text-primary)]">{{ activeRole.sector }}</div>
            <div class="mt-1 text-sm text-[var(--text-secondary)]">{{ activeRole.track }}</div>
          </div>
        </div>
      </div>

      <div class="grid gap-4 px-4 py-4">
        <section class="grid gap-4 lg:grid-cols-2">
          <section>
            <h3 class="text-sm font-semibold text-[var(--text-primary)]">Role description</h3>
            <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]" :style="descriptionExpanded ? undefined : clampStyle">
              {{ activeRole.description || 'No role description available.' }}
            </p>
            <button
              v-if="shouldClamp(activeRole.description)"
              class="mt-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              type="button"
              @click="descriptionExpanded = !descriptionExpanded"
            >
              {{ descriptionExpanded ? 'Show less' : 'Read more' }}
            </button>
          </section>
          <section>
            <h3 class="text-sm font-semibold text-[var(--text-primary)]">Performance expectations</h3>
            <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]" :style="performanceExpanded ? undefined : clampStyle">
              {{ activeRole.performance || 'No performance expectations available.' }}
            </p>
            <button
              v-if="shouldClamp(activeRole.performance)"
              class="mt-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              type="button"
              @click="performanceExpanded = !performanceExpanded"
            >
              {{ performanceExpanded ? 'Show less' : 'Read more' }}
            </button>
          </section>
        </section>

        <section v-if="activeRole.cwf.length" class="rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold text-[var(--text-primary)]">Critical work functions</h3>
              <p class="mt-1 text-xs text-[var(--text-muted)]">Collapse this section when you want to focus on skills only.</p>
            </div>
            <UiButton size="sm" variant="ghost" @click="cwfOpen = !cwfOpen">
              {{ cwfOpen ? 'Hide' : 'Show' }}
            </UiButton>
          </div>

          <div v-show="cwfOpen" class="mt-3 space-y-3">
            <div v-for="cwf in activeRole.cwf" :key="cwf.title" class="rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-default)] px-3 py-3">
              <div class="text-sm font-semibold text-[var(--text-primary)]">{{ cwf.title }}</div>
              <ul class="mt-2 space-y-1.5 text-sm text-[var(--text-secondary)]">
                <li v-for="task in cwf.tasks" :key="task" class="flex gap-2">
                  <span class="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-muted)]"></span>
                  <span>{{ task }}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </section>

    <section class="table-shell">
      <div class="border-b border-[var(--border-default)] px-4 py-3">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 class="text-sm font-semibold text-[var(--text-primary)]">Skills in this role ({{ activeRole.uniqueSkills.length }})</h3>
          </div>
          <div class="w-full max-w-sm">
            <UiInput v-model="skillQuery" placeholder="Filter skills within this role" />
          </div>
        </div>
      </div>

      <table class="dense-table">
        <thead>
          <tr>
            <th>Skill</th>
            <th>Type</th>
            <th>Levels</th>
            <th>Flags</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="skill in filteredSkills"
            :key="skill.skillKey"
            :class="{ active: isActiveSkill(skill.skillKey, activeRoleKey) }"
            @click="openDetail(skill.skillKey, skill.title, activeRoleKey)"
          >
            <td>
              <div class="font-medium text-[var(--text-primary)]">{{ skill.title }}</div>
              <div v-if="skill.subtitle" class="mt-1 text-xs text-[var(--text-muted)]">{{ skill.subtitle }}</div>
            </td>
            <td>{{ skill.skillType || 'N/A' }}</td>
            <td>
              <div class="flex flex-wrap gap-2">
                <span v-for="level in skill.proficiencyLevels" :key="level" class="level-badge">{{ level }}</span>
              </div>
            </td>
            <td>
              <div class="flex flex-wrap gap-2">
                <span v-if="skill.isEmerging" class="badge badge-warning">Emerging</span>
                <span v-if="skill.isCasl" class="badge badge-success">CASL</span>
                <span v-if="!skill.isEmerging && !skill.isCasl" class="text-xs text-[var(--text-muted)]">None</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!filteredSkills.length" class="border-t border-[var(--border-default)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
        No skills match this filter.
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import UiButton from '../ui/UiButton.vue';
import UiInput from '../ui/UiInput.vue';
import UiSelect from '../ui/UiSelect.vue';
import { formatRoleLabel } from '../../lib/skills-framework/utils';
import { useDatasetStore } from '../../stores/dataset';
import { useExplorerStore } from '../../stores/explorer';
import { useUiStore } from '../../stores/ui';

const datasetStore = useDatasetStore();
const explorerStore = useExplorerStore();
const uiStore = useUiStore();

const skillQuery = ref('');
const cwfOpen = ref(false);
const descriptionExpanded = ref(false);
const performanceExpanded = ref(false);

const results = computed(() => explorerStore.analysisResults);
const activeRoleKey = computed(() => explorerStore.activeRoleKey ?? '');
const rolePickerValue = computed({
  get: () => explorerStore.activeRoleKey ?? '',
  set: (value: string) => explorerStore.setActiveRole(value || null),
});
const activeRole = computed(() => {
  if (!results.value || !explorerStore.activeRoleKey) {
    return null;
  }

  return results.value.roles[explorerStore.activeRoleKey] ?? null;
});
const analyzedRoleOptions = computed(() =>
  results.value?.roleKeys.map((roleKey) => ({
    key: roleKey,
    label: formatRoleLabel(results.value!.roles[roleKey]),
  })) ?? [],
);
const clampStyle = {
  display: '-webkit-box',
  overflow: 'hidden',
  WebkitBoxOrient: 'vertical' as const,
  WebkitLineClamp: '3',
};

const filteredSkills = computed(() => {
  const role = activeRole.value;
  const query = skillQuery.value.trim().toLowerCase();
  if (!role) {
    return [];
  }

  return role.uniqueSkills.filter((skill) => !query || skill.title.toLowerCase().includes(query));
});

watch(
  () => explorerStore.activeRoleKey,
  () => {
    skillQuery.value = '';
    cwfOpen.value = false;
    descriptionExpanded.value = false;
    performanceExpanded.value = false;
  },
);

function openDetail(skillKey: string, skillTitle: string, roleKey: string) {
  explorerStore.openRoleSkillDetail(skillKey, skillTitle, roleKey);
}

function isActiveSkill(skillKey: string, roleKey: string) {
  return explorerStore.detail.kind === 'role-skill' && explorerStore.detail.skillKey === skillKey && explorerStore.detail.roleKey === roleKey;
}

function shouldClamp(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 180);
}
</script>
