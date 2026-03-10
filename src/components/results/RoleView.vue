<template>
  <div v-if="!results" class="empty-results">
    <div class="empty-results-icon">🎯</div>
    <h2>Ready to explore roles?</h2>
    <p>
      {{
        datasetStore.hasDataset
          ? 'Select roles in the left rail and run analysis to open the role workspace.'
          : 'Load the bundled data or upload the latest workbooks, then select roles to begin.'
      }}
    </p>
  </div>

  <div v-else-if="!activeRole" class="empty-results">
    <div class="empty-results-icon">📂</div>
    <h2>No analysed role is selected</h2>
    <p>Choose one of the analysed roles to inspect it.</p>
  </div>

  <div v-else class="space-y-4">
    <section class="page-panel overflow-hidden">
      <div class="border-b border-[var(--border-default)] px-4 py-3">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div class="text-sm font-semibold text-[var(--text-primary)]">{{ activeRole.role }}</div>
            <div class="mt-1 text-sm text-[var(--text-secondary)]">{{ activeRole.sector }} · {{ activeRole.track }}</div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="roleKey in results.roleKeys"
              :key="roleKey"
              class="rounded-[8px] border px-3 py-2 text-sm transition-colors"
              :class="
                explorerStore.activeRoleKey === roleKey
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--text-primary)]'
                  : 'border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'
              "
              type="button"
              @click="explorerStore.setActiveRole(roleKey)"
            >
              {{ shortRoleLabel(results.roles[roleKey].role) }}
            </button>
          </div>
        </div>
      </div>

      <div class="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section class="grid gap-4">
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-3">
              <div class="text-xs text-[var(--text-muted)]">Skills</div>
              <div class="mt-1 text-lg font-semibold text-[var(--text-primary)]">{{ activeRole.uniqueSkills.length }}</div>
            </div>
            <div class="rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-3">
              <div class="text-xs text-[var(--text-muted)]">Work functions</div>
              <div class="mt-1 text-lg font-semibold text-[var(--text-primary)]">{{ activeRole.cwf.length }}</div>
            </div>
            <div class="rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-3">
              <div class="text-xs text-[var(--text-muted)]">TSC rows</div>
              <div class="mt-1 text-lg font-semibold text-[var(--text-primary)]">{{ activeRole.tscs.length }}</div>
            </div>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <section>
              <h3 class="text-sm font-semibold text-[var(--text-primary)]">Role description</h3>
              <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {{ activeRole.description || 'No role description available.' }}
              </p>
            </section>
            <section>
              <h3 class="text-sm font-semibold text-[var(--text-primary)]">Performance expectations</h3>
              <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {{ activeRole.performance || 'No performance expectations available.' }}
              </p>
            </section>
          </div>
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
        <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 class="text-sm font-semibold text-[var(--text-primary)]">Skills in this role</h3>
            <p class="mt-1 text-sm text-[var(--text-secondary)]">Open any row in the inspector for detailed proficiency, knowledge, abilities, and TSC mappings.</p>
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
            :key="skill.title"
            :class="{ active: isActiveSkill(skill.title, activeRoleKey) }"
            @click="openDetail(skill.title, activeRoleKey)"
          >
            <td class="font-medium text-[var(--text-primary)]">{{ skill.title }}</td>
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
import { useDatasetStore } from '../../stores/dataset';
import { useExplorerStore } from '../../stores/explorer';

const datasetStore = useDatasetStore();
const explorerStore = useExplorerStore();

const skillQuery = ref('');
const cwfOpen = ref(true);

const results = computed(() => explorerStore.analysisResults);
const activeRoleKey = computed(() => explorerStore.activeRoleKey ?? '');
const activeRole = computed(() => {
  if (!results.value || !explorerStore.activeRoleKey) {
    return null;
  }

  return results.value.roles[explorerStore.activeRoleKey] ?? null;
});

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
    cwfOpen.value = true;
  },
);

function openDetail(skillTitle: string, roleKey: string) {
  explorerStore.openRoleSkillDetail(skillTitle, roleKey);
}

function isActiveSkill(skillTitle: string, roleKey: string) {
  return explorerStore.detail.kind === 'role-skill' && explorerStore.detail.skillTitle === skillTitle && explorerStore.detail.roleKey === roleKey;
}

function shortRoleLabel(role: string) {
  return role.length > 28 ? `${role.slice(0, 28).trim()}...` : role;
}
</script>
