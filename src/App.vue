<template>
  <div class="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]">
    <div
      v-if="uiStore.dragActive"
      class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[rgba(47,36,25,0.24)] px-4"
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
      class="fixed inset-0 z-30 bg-[rgba(47,36,25,0.24)] lg:hidden"
      @click="uiStore.setSidebarOpen(false)"
    ></div>

    <AppHeader @open-role-selector="uiStore.setSidebarOpen(true)" @open-data-modal="uiStore.setDataModalOpen(true)" />

    <main class="mx-auto max-w-[1600px] px-4 pb-24 pt-4 lg:px-6 lg:pb-6">
      <section
        class="min-w-0 transition-[padding-right] duration-150"
        :class="{
          'lg:pr-[27rem]': explorerStore.detail.open && !uiStore.detailCollapsed,
          'lg:pr-14': explorerStore.detail.open && uiStore.detailCollapsed,
        }"
      >
        <div v-if="datasetStore.hasDataset && !explorerStore.analysisResults" class="page-panel mb-4 px-5 py-4">
          <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div class="text-sm text-[var(--text-secondary)]">
              Open role selection to stage roles for analysis, then use the workspace and inspector to read the results.
            </div>
            <div class="text-sm text-[var(--text-secondary)]">
              {{ datasetStore.roles.length }} roles across {{ datasetStore.sectors.length }} sectors
            </div>
          </div>
        </div>

        <div v-if="explorerStore.analysisResults" class="page-panel mb-4 px-5 py-4">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 class="text-xl font-semibold text-[var(--text-primary)]">{{ pageTitle }}</h1>
              <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ pageSummary }}</p>
            </div>
            <div class="flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--border-default)] pt-3 text-sm text-[var(--text-secondary)] lg:border-t-0 lg:pt-0">
              <div><span class="font-semibold text-[var(--text-primary)]">{{ explorerStore.analysisResults.totalRoles }}</span> roles analysed</div>
              <div><span class="font-semibold text-[var(--text-primary)]">{{ explorerStore.analysisResults.totalUniqueSkills }}</span> unique skills</div>
              <div><span class="font-semibold text-[var(--text-primary)]">{{ explorerStore.analysisResults.totalTscs }}</span> TSC rows</div>
            </div>
          </div>
        </div>

        <div class="workspace-surface">
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
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { RouterView, useRoute } from 'vue-router';

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

const route = useRoute();
const datasetStore = useDatasetStore();
const explorerStore = useExplorerStore();
const uiStore = useUiStore();

useResponsiveLayout();
useDatasetLoader();
useUrlSync();

let dragCounter = 0;

const pageTitle = computed(() => {
  if (route.name === 'skills') {
    return 'Skill index';
  }
  if (route.name === 'compare') {
    return 'Role comparison';
  }
  return 'Role workspace';
});

const pageSummary = computed(() => {
  if (route.name === 'skills') {
    return 'Search across the analysed skills and open one in the inspector.';
  }
  if (route.name === 'compare') {
    return 'Compare two analysed roles and inspect the differences skill by skill.';
  }
  return 'Use the current analysis as a workbench for reading one role at a time.';
});

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
