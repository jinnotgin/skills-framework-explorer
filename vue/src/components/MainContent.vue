<script setup lang="ts">
import { computed } from 'vue';
import { useFrameworkStore } from '../stores/framework';
import { useSelectionStore } from '../stores/selection';
import EmptyState from './EmptyState.vue';
import RoleView from './RoleView.vue';
import CompareView from './CompareView.vue';
import SkillView from './SkillView.vue';
import DetailDrawer from './DetailDrawer.vue';

const frameworkStore = useFrameworkStore();
const selectionStore = useSelectionStore();

const contentTitle = computed(() => {
  if (selectionStore.currentView === 'compare') return 'Compare roles';
  if (selectionStore.currentView === 'skill') return 'Skill explorer';
  return 'Role explorer';
});

const contentSubtitle = computed(() => {
  if (selectionStore.currentView === 'compare')
    return 'Pick two roles to see overlapping skills and gaps.';
  if (selectionStore.currentView === 'skill')
    return 'Browse unique skills and see which roles rely on them.';
  return 'Select roles to view their skills, proficiencies, and CWFs.';
});

const hasData = computed(() => frameworkStore.status === 'ready');
</script>

<template>
  <main class="main-content">
    <div class="content-header">
      <div class="content-heading">
        <div class="content-title">{{ contentTitle }}</div>
        <div class="content-subtitle">{{ contentSubtitle }}</div>
      </div>
      <div class="content-stats">
        <div class="stat-card">
          <div class="stat-icon roles">👥</div>
          <div>
            <div class="stat-value">{{ frameworkStore.roleCount }}</div>
            <div class="stat-label">Roles</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon skills">💡</div>
          <div>
            <div class="stat-value">{{ frameworkStore.uniqueSkillCount }}</div>
            <div class="stat-label">Unique skills</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon roles">✅</div>
          <div>
            <div class="stat-value">{{ selectionStore.selectedCount }}</div>
            <div class="stat-label">Selected</div>
          </div>
        </div>
      </div>
    </div>

    <div class="content-body">
      <EmptyState
        v-if="!hasData"
        :is-loading="frameworkStore.status === 'loading'"
        :has-data="frameworkStore.status === 'ready'"
      />

      <RoleView v-else-if="selectionStore.currentView === 'role'" />
      <CompareView v-else-if="selectionStore.currentView === 'compare'" />
      <SkillView v-else />
    </div>

    <DetailDrawer />
  </main>
</template>
