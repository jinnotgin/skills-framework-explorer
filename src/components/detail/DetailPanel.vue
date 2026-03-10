<template>
  <button
    v-if="detail.open && uiStore.detailCollapsed"
    class="fixed bottom-6 right-6 z-40 hidden h-10 items-center gap-2 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-default)] px-3 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-subtle)] lg:inline-flex"
    type="button"
    @click="uiStore.setDetailCollapsed(false)"
  >
    <PanelRightOpen class="h-4 w-4" />
    <span class="max-w-[12rem] truncate">{{ detail.skillTitle }}</span>
  </button>

  <aside
    v-if="detail.open || uiStore.isMobile"
    class="detail-shell"
    :class="{
      open: detail.open,
      collapsed: detail.open && uiStore.detailCollapsed && !uiStore.isMobile,
    }"
  >
    <template v-if="detail.open && (!uiStore.detailCollapsed || uiStore.isMobile)">
      <div class="flex items-start justify-between gap-4 border-b border-[var(--border-default)] px-5 py-4">
        <div>
          <div class="text-sm font-semibold text-[var(--text-primary)]">{{ detail.skillTitle }}</div>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">
            Review descriptions, levels, knowledge, abilities, and role coverage.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="!uiStore.isMobile"
            class="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-secondary)]"
            type="button"
            @click="uiStore.setDetailCollapsed(true)"
          >
            <PanelRightClose class="h-4 w-4" />
          </button>
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-secondary)]"
            type="button"
            @click="explorerStore.closeDetail()"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-5">
        <template v-if="detail.kind === 'role-skill' && roleSkillDetail">
          <section class="detail-section">
            <button class="flex w-full items-center justify-between gap-3 text-left" type="button" @click="toggleSection('overview')">
              <h3>Overview</h3>
              <ChevronDown class="h-4 w-4 text-[var(--text-muted)] transition" :class="{ 'rotate-180': sectionOpen.overview }" />
            </button>
            <div v-show="sectionOpen.overview" class="mt-2 space-y-4">
              <p>{{ roleSkillDetail.description || 'No description available.' }}</p>
              <div class="flex flex-wrap gap-2">
                <span class="badge badge-primary">{{ roleSkillDetail.skillType || 'No type' }}</span>
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
              <article v-for="level in roleSkillDetail.proficiencyLevels" :key="level" class="detail-card">
                <div class="detail-card-header">
                  <span class="level-badge">{{ level }}</span>
                  <div class="text-sm font-semibold text-[var(--text-primary)]">Level {{ level }}</div>
                </div>
                <p v-if="roleSkillDetail.proficiencies[level]?.proficiencyDescription" class="detail-blurb">
                  {{ roleSkillDetail.proficiencies[level]?.proficiencyDescription }}
                </p>

                <div v-if="roleSkillDetail.proficiencies[level]?.knowledgeItems.length" class="detail-list-block">
                  <div class="detail-list-heading">Knowledge</div>
                  <ul class="detail-list">
                    <li v-for="item in roleSkillDetail.proficiencies[level]?.knowledgeItems" :key="item">{{ item }}</li>
                  </ul>
                </div>

                <div v-if="roleSkillDetail.proficiencies[level]?.abilityItems.length" class="detail-list-block">
                  <div class="detail-list-heading">Abilities</div>
                  <ul class="detail-list">
                    <li v-for="item in roleSkillDetail.proficiencies[level]?.abilityItems" :key="item">{{ item }}</li>
                  </ul>
                </div>

                <div v-if="roleSkillDetail.proficiencies[level]?.tscs.length" class="detail-list-block">
                  <div class="detail-list-heading">Related TSCs</div>
                  <div class="grid gap-2">
                    <div
                      v-for="tsc in roleSkillDetail.proficiencies[level]?.tscs"
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
              <article v-for="level in compareSkillDetail.levels" :key="level.level" class="detail-card">
                <div class="detail-card-header">
                  <span class="level-badge">{{ level.level }}</span>
                  <div class="text-sm font-semibold text-[var(--text-primary)]">Level {{ level.level }}</div>
                </div>
                <p v-if="level.proficiencyDescription" class="detail-blurb">{{ level.proficiencyDescription }}</p>

                <div v-if="level.knowledgeItems.length" class="detail-list-block">
                  <div class="detail-list-heading">Knowledge</div>
                  <ul class="detail-list">
                    <li v-for="item in level.knowledgeItems" :key="item">{{ item }}</li>
                  </ul>
                </div>

                <div v-if="level.abilityItems.length" class="detail-list-block">
                  <div class="detail-list-heading">Abilities</div>
                  <ul class="detail-list">
                    <li v-for="item in level.abilityItems" :key="item">{{ item }}</li>
                  </ul>
                </div>

                <div v-if="level.tscs.length" class="detail-list-block">
                  <div class="detail-list-heading">Related TSCs</div>
                  <div class="grid gap-2">
                    <div
                      v-for="tsc in level.tscs"
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
                <span class="level-badge">{{ role.proficiency }}</span>
              </div>
            </div>
          </section>

          <section class="detail-section">
            <button class="flex w-full items-center justify-between gap-3 text-left" type="button" @click="toggleSection('levels')">
              <h3>Proficiency levels</h3>
              <ChevronDown class="h-4 w-4 text-[var(--text-muted)] transition" :class="{ 'rotate-180': sectionOpen.levels }" />
            </button>
            <div v-show="sectionOpen.levels" class="mt-3">
              <article v-for="level in skillCentricDetail.proficiencyLevels" :key="level" class="detail-card">
                <div class="detail-card-header">
                  <span class="level-badge">{{ level }}</span>
                  <div class="text-sm font-semibold text-[var(--text-primary)]">Level {{ level }}</div>
                </div>
                <p v-if="skillCentricDetail.proficiencies[level]?.proficiencyDescription" class="detail-blurb">
                  {{ skillCentricDetail.proficiencies[level]?.proficiencyDescription }}
                </p>

                <div v-if="skillCentricDetail.proficiencies[level]?.knowledgeItems.length" class="detail-list-block">
                  <div class="detail-list-heading">Knowledge</div>
                  <ul class="detail-list">
                    <li v-for="item in skillCentricDetail.proficiencies[level]?.knowledgeItems" :key="item">{{ item }}</li>
                  </ul>
                </div>

                <div v-if="skillCentricDetail.proficiencies[level]?.abilityItems.length" class="detail-list-block">
                  <div class="detail-list-heading">Abilities</div>
                  <ul class="detail-list">
                    <li v-for="item in skillCentricDetail.proficiencies[level]?.abilityItems" :key="item">{{ item }}</li>
                  </ul>
                </div>

                <div v-if="skillCentricDetail.proficiencies[level]?.tscs.length" class="detail-list-block">
                  <div class="detail-list-heading">Related TSCs</div>
                  <div class="grid gap-2">
                    <div
                      v-for="tsc in skillCentricDetail.proficiencies[level]?.tscs"
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
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { ChevronDown, PanelRightClose, PanelRightOpen, X } from 'lucide-vue-next';

import { sortLevels } from '../../lib/skills-framework/utils';
import { useExplorerStore } from '../../stores/explorer';
import { useUiStore } from '../../stores/ui';

const explorerStore = useExplorerStore();
const uiStore = useUiStore();

const sectionOpen = reactive({
  overview: true,
  roles: true,
  levels: true,
});

const analysisResults = computed(() => explorerStore.analysisResults);
const detail = computed(() => explorerStore.detail);

watch(
  () => detail.value.skillTitle,
  () => {
    sectionOpen.overview = true;
    sectionOpen.roles = true;
    sectionOpen.levels = true;
    if (detail.value.open) {
      uiStore.setDetailCollapsed(false);
    }
  },
  { immediate: true },
);

const roleSkillDetail = computed(() => {
  if (!analysisResults.value || detail.value.kind !== 'role-skill' || !detail.value.roleKey) {
    return null;
  }

  return analysisResults.value.roles[detail.value.roleKey]?.uniqueSkills.find((skill) => skill.title === detail.value.skillTitle) ?? null;
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

  const skill1 = role1.uniqueSkills.find((skill) => skill.title === detail.value.skillTitle) ?? null;
  const skill2 = role2.uniqueSkills.find((skill) => skill.title === detail.value.skillTitle) ?? null;
  if (!skill1 && !skill2) {
    return null;
  }

  const allLevels = sortLevels([
    ...Object.keys(skill1?.proficiencies ?? {}),
    ...Object.keys(skill2?.proficiencies ?? {}),
  ]);

  return {
    description: skill1?.description || skill2?.description || 'No description available.',
    role1Label: role1.role,
    role2Label: role2.role,
    role1Levels: skill1 ? `Level ${skill1.proficiencyLevels.join(', ')}` : 'Not required',
    role2Levels: skill2 ? `Level ${skill2.proficiencyLevels.join(', ')}` : 'Not required',
    levels: allLevels.map((level) => {
      const left = skill1?.proficiencies[level];
      const right = skill2?.proficiencies[level];
      const knowledgeItems = Array.from(new Set([...(left?.knowledgeItems ?? []), ...(right?.knowledgeItems ?? [])]));
      const abilityItems = Array.from(new Set([...(left?.abilityItems ?? []), ...(right?.abilityItems ?? [])]));
      const tscs = [...(left?.tscs ?? []), ...(right?.tscs ?? [])].filter(
        (tsc, index, items) => items.findIndex((candidate) => candidate.code === tsc.code && candidate.proficiency === tsc.proficiency) === index,
      );

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
  if (!analysisResults.value || detail.value.kind !== 'skill-centric') {
    return null;
  }

  const skill = analysisResults.value.uniqueSkills[detail.value.skillTitle];
  if (!skill) {
    return null;
  }

  const roles = detail.value.focusedRoleKey ? skill.roles.filter((role) => role.key === detail.value.focusedRoleKey) : skill.roles;
  return {
    ...skill,
    roles,
  };
});

function toggleSection(section: keyof typeof sectionOpen) {
  sectionOpen[section] = !sectionOpen[section];
}
</script>
