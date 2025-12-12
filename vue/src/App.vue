<script setup lang="ts">
import { onMounted } from 'vue';
import HeaderBar from './components/HeaderBar.vue';
import SidebarPanel from './components/SidebarPanel.vue';
import MainContent from './components/MainContent.vue';
import { useFrameworkStore } from './stores/framework';
import { useSelectionStore } from './stores/selection';

const frameworkStore = useFrameworkStore();
const selectionStore = useSelectionStore();

onMounted(() => {
  selectionStore.restorePersisted();
  frameworkStore.preload();
});
</script>

<template>
  <div class="app-shell">
    <HeaderBar />
    <div class="app-layout">
      <SidebarPanel />
      <MainContent />
    </div>
  </div>
</template>
