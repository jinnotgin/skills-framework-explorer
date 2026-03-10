<template>
  <div v-if="!results" class="empty-results">
    <div class="empty-results-icon">💡</div>
    <h2>Skill view appears after analysis</h2>
    <p>Analyse one or more roles to browse the normalized skills across them.</p>
  </div>

  <div v-else class="space-y-4">
    <section class="page-panel px-5 py-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-[var(--text-primary)]">Skill index</h2>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">Search across all skills in the current analysis and open one to inspect the contributing roles.</p>
        </div>
        <div class="w-full max-w-sm">
          <UiInput v-model="skillQuery" placeholder="Search skills" />
        </div>
      </div>
    </section>

    <section class="table-shell">
      <table class="compare-table">
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
                <span v-if="skill.roles.length > 3" class="text-xs text-[var(--text-muted)]">+{{ skill.roles.length - 3 }} more</span>
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
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import UiInput from '../ui/UiInput.vue';
import { useExplorerStore } from '../../stores/explorer';

const explorerStore = useExplorerStore();

const results = computed(() => explorerStore.analysisResults);
const skillQuery = computed({
  get: () => explorerStore.skillSearchQuery,
  set: (value: string) => explorerStore.setSkillSearchQuery(value),
});

const filteredSkills = computed(() => {
  const query = explorerStore.skillSearchQuery.trim().toLowerCase();
  if (!results.value) {
    return [];
  }

  return results.value.uniqueSkillTitles
    .map((title) => results.value!.uniqueSkills[title])
    .filter((skill) => !query || skill.title.toLowerCase().includes(query));
});
</script>
