<template>
  <aside class="detail-shell" :class="{ open: detail.open }">
    <template v-if="detail.open">
      <div class="flex items-start justify-between gap-4 border-b border-[var(--border-default)] px-5 py-4">
        <div>
          <div class="text-sm font-semibold text-[var(--text-primary)]">{{ detail.skillTitle }}</div>
          <div v-if="detailSubtitle" class="mt-1 text-xs text-[var(--text-muted)]">{{ detailSubtitle }}</div>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-secondary)]"
            type="button"
            @click="explorerStore.closeDetail()"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref="scrollContainer" class="flex-1 overflow-y-auto px-5 pb-0 pt-5">
        <template v-if="detail.kind === 'role-skill' && roleSkillDetail">
          <section class="detail-section">
            <button class="flex w-full items-center justify-between gap-3 text-left" type="button" @click="toggleSection('overview')">
              <h3>Overview</h3>
              <ChevronDown class="h-4 w-4 text-[var(--text-muted)] transition" :class="{ 'rotate-180': sectionOpen.overview }" />
            </button>
            <div v-show="sectionOpen.overview" class="mt-2 space-y-4">
              <p>{{ roleSkillDetail.description || 'No description available.' }}</p>
              <div class="flex flex-wrap gap-2">
                <span v-if="roleSkillDetail.isEmerging" class="badge badge-warning">Emerging skill</span>
                <span v-if="roleSkillDetail.isCasl" class="badge badge-success">CASL skill</span>
              </div>
            </div>
          </section>

          <section class="detail-section">
            <button class="flex w-full items-center justify-between gap-3 text-left" type="button" @click="toggleSection('levels')">
              <h3>Proficiency levels</h3>
              <ChevronDown class="h-4 w-4 text-[var(--text-muted)] transition" :class="{ 'rotate-180': sectionOpen.levels }" />
            </button>
            <div v-show="sectionOpen.levels" class="mt-3">
              <div v-if="roleSkillDetail.proficiencyLevels.length > 1" class="mb-3 flex flex-wrap gap-2">
                <button
                  v-for="level in roleSkillDetail.proficiencyLevels"
                  :key="level"
                  class="level-badge transition-colors"
                  :class="{ 'border-[var(--primary)] bg-[var(--primary-soft)]': activeLevel === level }"
                  type="button"
                  @click="activeLevel = level"
                >
                  {{ formatLevelBadge(level) }}
                </button>
              </div>

              <article v-if="currentRoleSkillLevel" class="detail-card">
                <div class="detail-card-header">
                  <span class="level-badge">{{ formatLevelBadge(activeLevel) }}</span>
                  <div class="text-sm font-semibold text-[var(--text-primary)]">{{ formatLevelHeading(activeLevel) }}</div>
                </div>
                <p v-if="currentRoleSkillLevel.proficiencyDescription" class="detail-blurb">
                  {{ currentRoleSkillLevel.proficiencyDescription }}
                </p>

                <div v-if="currentRoleSkillLevel.knowledgeItems.length" class="detail-list-block knowledge">
                  <div class="detail-list-heading knowledge">📚 Knowledge ({{ currentRoleSkillLevel.knowledgeItems.length }})</div>
                  <ul class="detail-list">
                    <li v-for="item in currentRoleSkillLevel.knowledgeItems" :key="item">{{ item }}</li>
                  </ul>
                </div>

                <div v-if="currentRoleSkillLevel.abilityItems.length" class="detail-list-block ability">
                  <div class="detail-list-heading ability">⚡ Abilities ({{ currentRoleSkillLevel.abilityItems.length }})</div>
                  <ul class="detail-list">
                    <li v-for="item in currentRoleSkillLevel.abilityItems" :key="item">{{ item }}</li>
                  </ul>
                </div>

                <div v-if="currentRoleSkillLevel.tscs.length" class="detail-list-block">
                  <div class="detail-list-heading">Related TSCs</div>
                  <div class="grid gap-2">
                    <div
                      v-for="tsc in currentRoleSkillLevel.tscs"
                      :key="`${tsc.code}-${tsc.proficiency}`"
                      class="rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-secondary)]"
                    >
                      <span class="mr-2 font-mono text-xs text-[var(--text-muted)]">{{ tsc.code }}</span>
                      {{ tsc.title }}
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </template>

        <template v-else-if="detail.kind === 'compare-skill' && compareSkillDetail">
          <section class="detail-section">
            <button class="flex w-full items-center justify-between gap-3 text-left" type="button" @click="toggleSection('overview')">
              <h3>Overview</h3>
              <ChevronDown class="h-4 w-4 text-[var(--text-muted)] transition" :class="{ 'rotate-180': sectionOpen.overview }" />
            </button>
            <div v-show="sectionOpen.overview" class="mt-2 space-y-3">
              <p>{{ compareSkillDetail.description }}</p>
              <div class="grid gap-2">
                <div class="rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3">
                  <div class="text-sm font-semibold text-[var(--text-primary)]">{{ compareSkillDetail.role1Label }}</div>
                  <div class="mt-1 text-sm text-[var(--text-secondary)]">{{ compareSkillDetail.role1Levels }}</div>
                </div>
                <div class="rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3">
                  <div class="text-sm font-semibold text-[var(--text-primary)]">{{ compareSkillDetail.role2Label }}</div>
                  <div class="mt-1 text-sm text-[var(--text-secondary)]">{{ compareSkillDetail.role2Levels }}</div>
                </div>
              </div>
            </div>
          </section>

          <section class="detail-section">
            <button class="flex w-full items-center justify-between gap-3 text-left" type="button" @click="toggleSection('levels')">
              <h3>Proficiency levels</h3>
              <ChevronDown class="h-4 w-4 text-[var(--text-muted)] transition" :class="{ 'rotate-180': sectionOpen.levels }" />
            </button>
            <div v-show="sectionOpen.levels" class="mt-3">
              <div v-if="compareSkillDetail.levels.length > 1" class="mb-3 flex flex-wrap gap-2">
                <button
                  v-for="level in compareSkillDetail.levels"
                  :key="level.level"
                  class="level-badge transition-colors"
                  :class="{ 'border-[var(--primary)] bg-[var(--primary-soft)]': activeLevel === level.level }"
                  type="button"
                  @click="activeLevel = level.level"
                >
                  {{ formatLevelBadge(level.level) }}
                </button>
              </div>

              <article v-if="currentCompareLevel" class="detail-card">
                <div class="detail-card-header">
                  <span class="level-badge">{{ formatLevelBadge(currentCompareLevel.level) }}</span>
                  <div class="text-sm font-semibold text-[var(--text-primary)]">{{ formatLevelHeading(currentCompareLevel.level) }}</div>
                </div>
                <p v-if="currentCompareLevel.proficiencyDescription" class="detail-blurb">{{ currentCompareLevel.proficiencyDescription }}</p>

                <div v-if="currentCompareLevel.knowledgeItems.length" class="detail-list-block knowledge">
                  <div class="detail-list-heading knowledge">📚 Knowledge ({{ currentCompareLevel.knowledgeItems.length }})</div>
                  <ul class="detail-list">
                    <li v-for="item in currentCompareLevel.knowledgeItems" :key="item">{{ item }}</li>
                  </ul>
                </div>

                <div v-if="currentCompareLevel.abilityItems.length" class="detail-list-block ability">
                  <div class="detail-list-heading ability">⚡ Abilities ({{ currentCompareLevel.abilityItems.length }})</div>
                  <ul class="detail-list">
                    <li v-for="item in currentCompareLevel.abilityItems" :key="item">{{ item }}</li>
                  </ul>
                </div>

                <div v-if="currentCompareLevel.tscs.length" class="detail-list-block">
                  <div class="detail-list-heading">Related TSCs</div>
                  <div class="grid gap-2">
                    <div
                      v-for="tsc in currentCompareLevel.tscs"
                      :key="`${tsc.code}-${tsc.proficiency}`"
                      class="rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-secondary)]"
                    >
                      <span class="mr-2 font-mono text-xs text-[var(--text-muted)]">{{ tsc.code }}</span>
                      {{ tsc.title }}
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </template>

        <template v-else-if="detail.kind === 'skill-centric' && skillCentricDetail">
          <section class="detail-section">
            <button class="flex w-full items-center justify-between gap-3 text-left" type="button" @click="toggleSection('overview')">
              <h3>Overview</h3>
              <ChevronDown class="h-4 w-4 text-[var(--text-muted)] transition" :class="{ 'rotate-180': sectionOpen.overview }" />
            </button>
            <div v-show="sectionOpen.overview" class="mt-2">
              <p>{{ skillCentricDetail.description || 'No description available.' }}</p>
            </div>
          </section>

          <section class="detail-section">
            <button class="flex w-full items-center justify-between gap-3 text-left" type="button" @click="toggleSection('levels')">
              <h3>Proficiency levels</h3>
              <ChevronDown class="h-4 w-4 text-[var(--text-muted)] transition" :class="{ 'rotate-180': sectionOpen.levels }" />
            </button>
            <div v-show="sectionOpen.levels" class="mt-3">
              <div v-if="skillCentricDetail.proficiencyLevels.length > 1" class="mb-3 flex flex-wrap gap-2">
                <button
                  v-for="level in skillCentricDetail.proficiencyLevels"
                  :key="level"
                  class="level-badge transition-colors"
                  :class="{ 'border-[var(--primary)] bg-[var(--primary-soft)]': activeLevel === level }"
                  type="button"
                  @click="activeLevel = level"
                >
                  {{ formatLevelBadge(level) }}
                </button>
              </div>

              <article v-if="currentSkillCentricLevel" class="detail-card">
                <div class="detail-card-header">
                  <span class="level-badge">{{ formatLevelBadge(activeLevel) }}</span>
                  <div class="text-sm font-semibold text-[var(--text-primary)]">{{ formatLevelHeading(activeLevel) }}</div>
                </div>
                <p v-if="currentSkillCentricLevel.proficiencyDescription" class="detail-blurb">
                  {{ currentSkillCentricLevel.proficiencyDescription }}
                </p>

                <div v-if="currentSkillCentricLevel.knowledgeItems.length" class="detail-list-block knowledge">
                  <div class="detail-list-heading knowledge">📚 Knowledge ({{ currentSkillCentricLevel.knowledgeItems.length }})</div>
                  <ul class="detail-list">
                    <li v-for="item in currentSkillCentricLevel.knowledgeItems" :key="item">{{ item }}</li>
                  </ul>
                </div>

                <div v-if="currentSkillCentricLevel.abilityItems.length" class="detail-list-block ability">
                  <div class="detail-list-heading ability">⚡ Abilities ({{ currentSkillCentricLevel.abilityItems.length }})</div>
                  <ul class="detail-list">
                    <li v-for="item in currentSkillCentricLevel.abilityItems" :key="item">{{ item }}</li>
                  </ul>
                </div>

                <div v-if="currentSkillCentricLevel.tscs.length" class="detail-list-block">
                  <div class="detail-list-heading">Related TSCs</div>
                  <div class="grid gap-2">
                    <div
                      v-for="tsc in currentSkillCentricLevel.tscs"
                      :key="`${tsc.code}-${tsc.proficiency}`"
                      class="rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-secondary)]"
                    >
                      <span class="mr-2 font-mono text-xs text-[var(--text-muted)]">{{ tsc.code }}</span>
                      {{ tsc.title }}
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section class="detail-section">
            <button class="flex w-full items-center justify-between gap-3 text-left" type="button" @click="toggleSection('roles')">
              <h3>Required by roles</h3>
              <ChevronDown class="h-4 w-4 text-[var(--text-muted)] transition" :class="{ 'rotate-180': sectionOpen.roles }" />
            </button>
            <div v-show="sectionOpen.roles" class="mt-3 grid gap-2">
              <div
                v-for="role in skillCentricDetail.roles"
                :key="role.key"
                class="flex items-center justify-between gap-4 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3"
              >
                <div>
                  <div class="text-sm font-semibold text-[var(--text-primary)]">{{ role.name }}</div>
                  <div class="text-xs text-[var(--text-muted)]">{{ role.sector }} · {{ role.track }}</div>
                </div>
                <span class="level-badge">{{ formatRoleLevelBadge(role.proficiencies ?? []) }}</span>
              </div>
            </div>
          </section>
        </template>
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { ChevronDown, X } from 'lucide-vue-next';
import { useRoute } from 'vue-router';

import { compareTscEntries } from '../../lib/skills-framework/analysis';
import { formatLevelBadge, formatLevelHeading, formatLevelSummary, sortLevels } from '../../lib/skills-framework/utils';
import { useDatasetStore } from '../../stores/dataset';
import { useExplorerStore } from '../../stores/explorer';
import { useUiStore } from '../../stores/ui';

const datasetStore = useDatasetStore();
const explorerStore = useExplorerStore();
const uiStore = useUiStore();
const route = useRoute();

const sectionOpen = reactive({
  overview: true,
  roles: true,
  levels: true,
});
const activeLevel = ref('');
const scrollContainer = ref<HTMLElement | null>(null);

const analysisResults = computed(() => {
  if (explorerStore.analysisResults && explorerStore.selectedRoleKeys.length > 0) {
    return explorerStore.analysisResults;
  }

  if (route.path === '/skills' && datasetStore.hasDataset && !explorerStore.selectedRoleKeys.length) {
    return datasetStore.globalSkillsResults;
  }

  return explorerStore.analysisResults;
});
const detail = computed(() => explorerStore.detail);

watch(
  () => [route.path, datasetStore.hasDataset, explorerStore.selectedRoleKeys.length],
  ([path, hasDataset, selectedCount]) => {
    if (path === '/skills' && hasDataset && selectedCount === 0) {
      void datasetStore.ensureGlobalSkillsLoaded();
    }
  },
  { immediate: true },
);

watch(
  () => detail.value.skillKey,
  () => {
    sectionOpen.overview = true;
    sectionOpen.roles = true;
    sectionOpen.levels = true;
  },
  { immediate: true },
);

watch(
  () => [detail.value.open, detail.value.kind, detail.value.skillKey, detail.value.roleKey, detail.value.role1Key, detail.value.role2Key, detail.value.focusedRoleKey],
  async () => {
    await nextTick();
    scrollContainer.value?.scrollTo({ top: 0, behavior: 'auto' });
  },
);

const roleSkillDetail = computed(() => {
  if (!analysisResults.value || detail.value.kind !== 'role-skill' || !detail.value.roleKey || !detail.value.skillKey) {
    return null;
  }

  return analysisResults.value.roles[detail.value.roleKey]?.uniqueSkills.find((skill) => skill.skillKey === detail.value.skillKey) ?? null;
});

const compareSkillDetail = computed(() => {
  if (!analysisResults.value || detail.value.kind !== 'compare-skill' || !detail.value.role1Key || !detail.value.role2Key) {
    return null;
  }

  const role1 = analysisResults.value.roles[detail.value.role1Key];
  const role2 = analysisResults.value.roles[detail.value.role2Key];
  if (!role1 || !role2) {
    return null;
  }

  const skill1 = role1.uniqueSkills.find((skill) => skill.skillKey === detail.value.skillKey) ?? null;
  const skill2 = role2.uniqueSkills.find((skill) => skill.skillKey === detail.value.skillKey) ?? null;
  if (!skill1 && !skill2) {
    return null;
  }

  const allLevels = sortLevels([
    ...Object.keys(skill1?.proficiencies ?? {}),
    ...Object.keys(skill2?.proficiencies ?? {}),
  ]);

  return {
    title: skill1?.title || skill2?.title || detail.value.skillTitle,
    subtitle: skill1?.subtitle || skill2?.subtitle || '',
    description: skill1?.description || skill2?.description || 'No description available.',
    role1Label: role1.role,
    role2Label: role2.role,
    role1Levels: skill1 ? formatLevelSummary(skill1.proficiencyLevels) : 'Not required',
    role2Levels: skill2 ? formatLevelSummary(skill2.proficiencyLevels) : 'Not required',
    levels: allLevels.map((level) => {
      const left = skill1?.proficiencies[level];
      const right = skill2?.proficiencies[level];
      const knowledgeItems = Array.from(new Set([...(left?.knowledgeItems ?? []), ...(right?.knowledgeItems ?? [])]));
      const abilityItems = Array.from(new Set([...(left?.abilityItems ?? []), ...(right?.abilityItems ?? [])]));
      const tscs = [...(left?.tscs ?? []), ...(right?.tscs ?? [])].filter(
        (tsc, index, items) => items.findIndex((candidate) => candidate.code === tsc.code && candidate.proficiency === tsc.proficiency) === index,
      ).sort(compareTscEntries);

      return {
        level,
        proficiencyDescription: left?.proficiencyDescription || right?.proficiencyDescription || '',
        knowledgeItems,
        abilityItems,
        tscs,
      };
    }),
  };
});

const skillCentricDetail = computed(() => {
  if (!analysisResults.value || detail.value.kind !== 'skill-centric' || !detail.value.skillKey) {
    return null;
  }

  const skill = analysisResults.value.uniqueSkills[detail.value.skillKey];
  if (!skill) {
    return null;
  }

  const roles = detail.value.focusedRoleKey ? skill.roles.filter((role) => role.key === detail.value.focusedRoleKey) : skill.roles;
  return {
    ...skill,
    roles,
  };
});

const detailSubtitle = computed(() => roleSkillDetail.value?.subtitle || compareSkillDetail.value?.subtitle || skillCentricDetail.value?.subtitle || '');

const currentRoleSkillLevel = computed(() =>
  roleSkillDetail.value && activeLevel.value ? roleSkillDetail.value.proficiencies[activeLevel.value] ?? null : null,
);

const currentCompareLevel = computed(() =>
  compareSkillDetail.value && activeLevel.value
    ? compareSkillDetail.value.levels.find((level) => level.level === activeLevel.value) ?? null
    : null,
);

const currentSkillCentricLevel = computed(() =>
  skillCentricDetail.value && activeLevel.value ? skillCentricDetail.value.proficiencies[activeLevel.value] ?? null : null,
);

watch(
  [
    () => roleSkillDetail.value?.proficiencyLevels,
    () => compareSkillDetail.value?.levels,
    () => skillCentricDetail.value?.proficiencyLevels,
  ],
  () => {
    const nextLevels =
      roleSkillDetail.value?.proficiencyLevels ??
      compareSkillDetail.value?.levels.map((level) => level.level) ??
      skillCentricDetail.value?.proficiencyLevels ??
      [];

    if (!nextLevels.length) {
      activeLevel.value = '';
      return;
    }

    if (!nextLevels.includes(activeLevel.value)) {
      activeLevel.value = nextLevels[0] ?? '';
    }
  },
  { immediate: true },
);

function toggleSection(section: keyof typeof sectionOpen) {
  sectionOpen[section] = !sectionOpen[section];
}

function formatRoleLevelBadge(levels: string[]) {
  return levels.map((level) => formatLevelBadge(level)).join(', ');
}
</script>
