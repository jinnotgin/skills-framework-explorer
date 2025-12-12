<script setup lang="ts">
import { computed } from 'vue';
import { useFrameworkStore } from '../stores/framework';
import { useSelectionStore, type ExplorerView } from '../stores/selection';

const frameworkStore = useFrameworkStore();
const selectionStore = useSelectionStore();

const status = computed(() => {
  if (frameworkStore.status === 'loading') {
    return { className: 'status-dot partial', text: 'Loading data…' };
  }
  if (frameworkStore.status === 'ready') {
    return { className: 'status-dot loaded', text: 'Data ready' };
  }
  if (frameworkStore.status === 'error') {
    return { className: 'status-dot', text: 'Load failed' };
  }
  return { className: 'status-dot', text: 'Idle' };
});

function setView(view: ExplorerView) {
  selectionStore.setView(view);
}
</script>

<template>
  <header class="header">
    <div class="header-left">
      <div class="logo">
        <div class="logo-icon">SF</div>
        <div class="logo-text">Skills Framework Explorer</div>
      </div>
      <div class="header-status">
        <span :class="status.className"></span>
        <span class="header-status-text">{{ status.text }}</span>
      </div>
    </div>
    <div class="header-right">
      <div class="view-toggle">
        <button
          class="view-toggle-btn"
          :class="{ active: selectionStore.currentView === 'role' }"
          @click="setView('role')"
        >
          Roles
        </button>
        <button
          class="view-toggle-btn"
          :class="{ active: selectionStore.currentView === 'compare' }"
          @click="setView('compare')"
        >
          Compare
        </button>
        <button
          class="view-toggle-btn"
          :class="{ active: selectionStore.currentView === 'skill' }"
          @click="setView('skill')"
        >
          Skills
        </button>
      </div>
    </div>
  </header>
</template>
