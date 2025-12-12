<script setup lang="ts">
import { computed } from 'vue';
import { useFrameworkStore, type RoleSkillEntry, type RoleSummary } from '../stores/framework';
import { useSelectionStore } from '../stores/selection';

const frameworkStore = useFrameworkStore();
const selectionStore = useSelectionStore();

const selectedRoles = computed<RoleSummary[]>(() =>
  selectionStore.selectedRoleKeys
    .map((key) => frameworkStore.roleSummaryLookup[key])
    .filter((role): role is RoleSummary => Boolean(role))
);

const roleSkills = computed<Record<string, RoleSkillEntry[]>>(
  () => frameworkStore.roleSkillsByRoleKey
);

function openDetail(roleKey: string, skill: RoleSkillEntry) {
  selectionStore.setActiveDetail({
    roleKey,
    code: skill.code,
    proficiency: skill.proficiency
  });
}
</script>

<template>
  <div v-if="!selectedRoles.length" class="empty-hint">
    Select one or more roles to view their skills and proficiencies.
  </div>
  <div v-else class="role-detail-list">
    <section v-for="role in selectedRoles" :key="role.key" class="section-card">
      <header class="section-card-header">
        <div>
          <div class="section-title">{{ role.title }}</div>
          <div class="section-subtitle">{{ role.sector }} · {{ role.track }}</div>
        </div>
        <div class="pill-row">
          <span class="pill">TSCs {{ role.tscCount }}</span>
          <span class="pill">Unique skills {{ role.uniqueSkillCount }}</span>
          <span class="pill">CWF/KT {{ role.cwfCount }}</span>
        </div>
      </header>

      <p v-if="role.description" class="role-card-description">{{ role.description }}</p>

      <div class="table">
        <div class="table-head">
          <span>Skill</span>
          <span>Proficiency</span>
          <span>Unique skills</span>
        </div>
        <div
          v-for="skill in roleSkills[role.key] || []"
          :key="`${skill.code}-${skill.proficiency}-${skill.title}`"
          class="table-row clickable"
          @click="openDetail(role.key, skill)"
        >
          <div class="table-cell">
            <div class="row-title">
              {{ skill.title || skill.code || 'Unknown skill' }}
            </div>
            <div class="row-subtitle" v-if="skill.category">{{ skill.category }}</div>
            <div class="row-description" v-if="skill.tscDescription">
              {{ skill.tscDescription }}
            </div>
          </div>
          <div class="table-cell">
            <span class="badge">{{ skill.proficiency || 'N/A' }}</span>
            <div class="row-description" v-if="skill.proficiencyDescription">
              {{ skill.proficiencyDescription }}
            </div>
          </div>
          <div class="table-cell">
            <div class="pill-stack" v-if="skill.uniqueSkills?.length">
              <span v-for="u in skill.uniqueSkills" :key="u" class="chip muted">
                {{ u }}
              </span>
            </div>
            <div class="row-description" v-else>No unique skills mapped</div>
          </div>
          <div class="table-spacer" />
          <div class="row-knowledge" v-if="skill.knowledgeItems.length || skill.abilityItems.length">
            <div v-if="skill.knowledgeItems.length">
              <div class="row-subtitle">Knowledge</div>
              <ul class="ka-list">
                <li v-for="item in skill.knowledgeItems" :key="item">{{ item }}</li>
              </ul>
            </div>
            <div v-if="skill.abilityItems.length">
              <div class="row-subtitle">Ability</div>
              <ul class="ka-list">
                <li v-for="item in skill.abilityItems" :key="item">{{ item }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
