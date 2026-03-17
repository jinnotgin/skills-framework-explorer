<template>
  <div class="flex min-h-screen flex-col bg-[var(--bg-app)] text-[var(--text-primary)]">
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

    <main class="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-24 pt-4 lg:px-6 lg:pb-6">
      <section class="min-w-0 transition-[padding-right] duration-150" :class="{ 'lg:pr-[27rem]': explorerStore.detail.open }">
        <div v-if="datasetStore.isPreloading" class="workspace-surface">
          <div class="empty-results">
            <div
              class="h-10 w-10 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--primary)]"
              aria-hidden="true"
            ></div>
            <h2>Loading data</h2>
            <p>{{ datasetStore.preloadStatusMessage || 'Preparing the bundled dataset.' }}</p>
          </div>
        </div>
        <div v-else class="workspace-surface">
          <RouterView />
        </div>
      </section>

      <DetailPanel />
    </main>

    <footer class="border-t border-[var(--border-default)] bg-[var(--surface-overlay)]">
      <div class="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-4 text-sm text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div class="flex flex-wrap items-center gap-2">
          <div>
            Built by
            <a
              :href="APP_AUTHOR_URL"
              class="font-medium text-[var(--primary-strong)] underline decoration-[color:var(--border-strong)] underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              {{ APP_AUTHOR_NAME }}
            </a>
          </div>
          <div aria-hidden="true">|</div>
          <div>© {{ copyrightYearLabel }}</div>
        </div>
        <div v-if="APP_VERSION" class="font-medium text-[var(--text-primary)] sm:text-right">Version {{ APP_VERSION }}</div>
      </div>
    </footer>

    <AppSidebar />
    <DataModal />
    <AppBottomNav @open-sidebar="uiStore.setSidebarOpen(true)" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue';
import { RouterView } from 'vue-router';
import { useRoute } from 'vue-router';

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
import { APP_AUTHOR_NAME, APP_AUTHOR_URL, APP_COPYRIGHT_START_YEAR, APP_VERSION } from './lib/appMeta';

const datasetStore = useDatasetStore();
const explorerStore = useExplorerStore();
const uiStore = useUiStore();
const route = useRoute();
const currentYear = new Date().getFullYear();
const copyrightYearLabel =
  currentYear === APP_COPYRIGHT_START_YEAR ? `${APP_COPYRIGHT_START_YEAR}` : `${APP_COPYRIGHT_START_YEAR} - ${currentYear}`;

useResponsiveLayout();
useDatasetLoader();
useUrlSync();

watch(
  () => route.name,
  (nextRoute, previousRoute) => {
    if (previousRoute && nextRoute !== previousRoute && explorerStore.detail.open) {
      explorerStore.closeDetail();
    }
  },
);

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
