<template>
  <div class="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]">
    <div
      v-if="uiStore.dragActive"
      class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-scrim)] px-4"
    >
      <div class="w-full max-w-md rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-default)] px-6 py-6 text-center shadow-[var(--shadow-subtle)]">
        <div class="text-base font-semibold text-[var(--text-primary)]">Drop files to update the dataset</div>
        <div class="mt-2 text-sm text-[var(--text-secondary)]">
          Upload the SkillsFuture XLSX workbooks anywhere in the window.
        </div>
      </div>
    </div>

    <div
      v-if="uiStore.isMobile && uiStore.sidebarOpen"
      class="fixed inset-0 z-30 bg-[var(--overlay-scrim)] lg:hidden"
      @click="uiStore.setSidebarOpen(false)"
    ></div>

    <AppHeader @open-role-selector="uiStore.setSidebarOpen(true)" @open-data-modal="uiStore.setDataModalOpen(true)" />

    <main class="mx-auto max-w-[1600px] px-4 pb-24 pt-4 lg:px-6 lg:pb-6">
      <section class="min-w-0 transition-[padding-right] duration-150" :class="{ 'lg:pr-[27rem]': explorerStore.detail.open }">
        <div v-if="datasetStore.isPreloading" class="workspace-surface">
          <div class="empty-results">
            <div
              class="h-10 w-10 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--primary)]"
              aria-hidden="true"
            ></div>
            <h2>Loading data</h2>
            <p>Parsing workbooks and rebuilding the dataset.</p>
          </div>
        </div>
        <div v-else class="workspace-surface">
          <RouterView />
        </div>
      </section>

      <DetailPanel />
    </main>

    <AppSidebar />
    <DataModal />
    <AppBottomNav @open-sidebar="uiStore.setSidebarOpen(true)" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import { RouterView } from 'vue-router';

import AppBottomNav from './components/layout/AppBottomNav.vue';
import DataModal from './components/layout/DataModal.vue';
import AppHeader from './components/layout/AppHeader.vue';
import AppSidebar from './components/layout/AppSidebar.vue';
import DetailPanel from './components/detail/DetailPanel.vue';
import { useDatasetLoader } from './composables/useDatasetLoader';
import { useResponsiveLayout } from './composables/useResponsiveLayout';
import { useUrlSync } from './composables/useUrlSync';
import { useDatasetStore } from './stores/dataset';
import { useExplorerStore } from './stores/explorer';
import { useUiStore } from './stores/ui';

const datasetStore = useDatasetStore();
const explorerStore = useExplorerStore();
const uiStore = useUiStore();

useResponsiveLayout();
useDatasetLoader();
useUrlSync();

let dragCounter = 0;

async function processFiles(files: File[]) {
  if (!files.length) {
    return;
  }

  await datasetStore.loadFromFiles(files);
  explorerStore.resetForDatasetChange();
  uiStore.setFileSectionExpanded(false);
  uiStore.setDragActive(false);
  dragCounter = 0;
}

function onDragEnter(event: DragEvent) {
  if (!event.dataTransfer?.types.includes('Files')) {
    return;
  }
  dragCounter += 1;
  uiStore.setDragActive(true);
}

function onDragLeave() {
  dragCounter -= 1;
  if (dragCounter <= 0) {
    dragCounter = 0;
    uiStore.setDragActive(false);
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  processFiles(Array.from(event.dataTransfer?.files ?? []));
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
}

function onVisibilityChange() {
  if (document.hidden) {
    dragCounter = 0;
    uiStore.setDragActive(false);
  }
}

onMounted(() => {
  window.addEventListener('dragenter', onDragEnter);
  window.addEventListener('dragleave', onDragLeave);
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('drop', onDrop);
  document.addEventListener('visibilitychange', onVisibilityChange);
});

onBeforeUnmount(() => {
  window.removeEventListener('dragenter', onDragEnter);
  window.removeEventListener('dragleave', onDragLeave);
  window.removeEventListener('dragover', onDragOver);
  window.removeEventListener('drop', onDrop);
  document.removeEventListener('visibilitychange', onVisibilityChange);
});
</script>
