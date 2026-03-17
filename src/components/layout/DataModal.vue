<template>
  <div v-if="uiStore.dataModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-scrim)] px-4 py-6" @click.self="uiStore.setDataModalOpen(false)">
    <div class="w-full max-w-2xl rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-default)] shadow-[var(--shadow-subtle)]">
      <div class="flex items-start justify-between gap-4 border-b border-[var(--border-default)] px-5 py-4">
        <div>
          <div class="text-base font-semibold text-[var(--text-primary)]">Data files</div>
          <div class="mt-1 text-sm text-[var(--text-secondary)]">Use the bundled dataset or upload the latest SkillsFuture workbooks.</div>
        </div>
        <button
          class="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-secondary)]"
          type="button"
          @click="uiStore.setDataModalOpen(false)"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="space-y-4 px-5 py-5">
        <div class="rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-secondary)]">
          <span class="font-medium text-[var(--text-primary)]">Source:</span>
          {{ datasetModeLabel }}
        </div>

        <div
          v-if="datasetStore.importMode === 'preloaded' && datasetStore.preloadStatusMessage"
          class="rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-secondary)]"
        >
          {{ datasetStore.preloadStatusMessage }}
        </div>

        <label
          class="block cursor-pointer rounded-[8px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] px-4 py-6 text-center transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
          @dragover.prevent
          @drop.prevent="handleDrop"
        >
          <Upload class="mx-auto mb-2 h-5 w-5 text-[var(--primary)]" />
          <div class="text-sm font-medium text-[var(--text-primary)]">Drop XLSX files or click to browse</div>
          <div class="mt-1 text-xs text-[var(--text-muted)]">Upload all 3 SkillsFuture workbooks</div>
          <input ref="fileInput" class="hidden" type="file" accept=".xlsx" multiple @change="handleFileInput" />
        </label>

        <div class="grid gap-2 md:grid-cols-3">
          <div
            v-for="status in fileStatuses"
            :key="status.label"
            class="rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-default)] px-3 py-3 text-sm"
          >
            <div class="text-[var(--text-secondary)]">{{ status.label }}</div>
            <div class="mt-2">
              <span class="badge" :class="status.loaded ? 'badge-success' : 'badge-primary'">
                {{ status.loaded ? 'Loaded' : 'Missing' }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="datasetStore.error" class="rounded-[8px] border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {{ datasetStore.error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Upload, X } from 'lucide-vue-next';

import { useDatasetStore } from '../../stores/dataset';
import { useExplorerStore } from '../../stores/explorer';
import { useUiStore } from '../../stores/ui';

const datasetStore = useDatasetStore();
const explorerStore = useExplorerStore();
const uiStore = useUiStore();
const fileInput = ref<HTMLInputElement | null>(null);

const datasetModeLabel = computed(() => {
  if (datasetStore.isPreloading) {
    return 'Bundled dataset';
  }
  if (datasetStore.importMode === 'upload') {
    return 'Uploaded workbooks';
  }
  if (datasetStore.importMode === 'preloaded') {
    return datasetStore.dataSource === 'fallback-memory' ? 'Bundled dataset (fallback memory mode)' : 'Bundled dataset (IndexedDB cache)';
  }
  return 'No dataset loaded';
});

const fileStatuses = computed(() => [
  { label: 'Skills framework dataset', loaded: datasetStore.workbookStatus.framework.loaded },
  { label: 'TSC to unique skills mapping', loaded: datasetStore.workbookStatus.tscMap.loaded },
  { label: 'Unique skills list', loaded: datasetStore.workbookStatus.unique.loaded },
]);

async function processFiles(files: File[]) {
  if (!files.length) {
    return;
  }

  await datasetStore.loadFromFiles(files);
  explorerStore.resetForDatasetChange();
  uiStore.setDataModalOpen(false);
}

async function handleDrop(event: DragEvent) {
  await processFiles(Array.from(event.dataTransfer?.files ?? []));
}

async function handleFileInput(event: Event) {
  const files = Array.from((event.target as HTMLInputElement).files ?? []);
  await processFiles(files);
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}
</script>
