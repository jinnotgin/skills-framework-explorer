<script setup lang="ts">
import { computed } from 'vue';
import { useFrameworkStore, type RoleSkillEntry } from '../stores/framework';
import { useSelectionStore } from '../stores/selection';

const frameworkStore = useFrameworkStore();
const selectionStore = useSelectionStore();

const detail = computed(() => selectionStore.activeDetail);

const role = computed(() => {
  const key = detail.value?.roleKey;
  return key ? frameworkStore.roleSummaryLookup[key] : null;
});

const skill = computed<RoleSkillEntry | null>(() => {
  if (!detail.value) return null;
  const list = frameworkStore.roleSkillsByRoleKey[detail.value.roleKey] ?? [];
  return (
    list.find(
      (s) =>
        s.code === detail.value?.code &&
        (detail.value?.proficiency || '') === (s.proficiency || '')
    ) || null
  );
});

const cwfEntries = computed(() => {
  if (!detail.value) return [];
  return frameworkStore.cwfByRoleKey[detail.value.roleKey] ?? [];
});

function close() {
  selectionStore.setActiveDetail(null);
}
</script>

<template>
  <div v-if="detail && role && skill" class="detail-overlay" @click.self="close">
    <aside class="detail-panel">
      <header class="detail-header">
        <div>
          <div class="detail-pill">Proficiency {{ skill.proficiency || 'N/A' }}</div>
          <div class="detail-title">{{ skill.title || skill.code || 'Skill detail' }}</div>
          <div class="detail-subtitle">{{ role.title }} · {{ role.track }} · {{ role.sector }}</div>
        </div>
        <button class="detail-close" type="button" @click="close">×</button>
      </header>

      <section v-if="skill.category || skill.tscDescription" class="detail-section">
        <div class="section-heading">Description</div>
        <div class="detail-category" v-if="skill.category">{{ skill.category }}</div>
        <p class="detail-text" v-if="skill.tscDescription">{{ skill.tscDescription }}</p>
      </section>

      <section v-if="skill.proficiencyDescription" class="detail-section">
        <div class="section-heading">Proficiency</div>
        <p class="detail-text">{{ skill.proficiencyDescription }}</p>
      </section>

      <section v-if="skill.knowledgeItems.length || skill.abilityItems.length" class="detail-section">
        <div class="section-heading">Knowledge & Ability</div>
        <div class="ka-columns">
          <div v-if="skill.knowledgeItems.length">
            <div class="ka-title">Knowledge</div>
            <ul class="ka-list">
              <li v-for="item in skill.knowledgeItems" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div v-if="skill.abilityItems.length">
            <div class="ka-title">Ability</div>
            <ul class="ka-list">
              <li v-for="item in skill.abilityItems" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="detail-section">
        <div class="section-heading">Unique skills</div>
        <div v-if="skill.uniqueSkills?.length" class="pill-stack">
          <span v-for="u in skill.uniqueSkills" :key="u" class="chip">{{ u }}</span>
        </div>
        <div v-else class="detail-text">No unique skills mapped.</div>
      </section>

      <section v-if="cwfEntries.length" class="detail-section">
        <div class="section-heading">Critical Work Functions & Key Tasks</div>
        <ul class="cwf-list">
          <li v-for="(entry, idx) in cwfEntries" :key="idx">
            <div class="row-title">{{ entry.cwf }}</div>
            <div class="row-description">{{ entry.keyTask }}</div>
          </li>
        </ul>
      </section>
    </aside>
  </div>
</template>
