<template>
  <header class="sticky top-0 z-40 border-b border-[var(--border-default)] bg-[var(--surface-overlay)] backdrop-blur-md">
    <div class="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4 lg:px-6">
      <div class="flex min-w-0 flex-1 items-center gap-3 lg:basis-[24rem]">
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-secondary)] lg:hidden"
          type="button"
          @click="$emit('openRoleSelector')"
        >
          <Menu class="h-4 w-4" />
        </button>

        <div class="min-w-0">
          <div class="truncate whitespace-nowrap text-[0.95rem] font-semibold text-[var(--text-primary)] sm:text-lg">Skills Framework Explorer</div>
        </div>
      </div>

      <nav class="hidden flex-none items-center gap-1 md:flex">
        <RouterLink
          v-for="view in views"
          :key="view.to"
          :to="view.to"
          class="rounded-[8px] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
          :class="{ 'bg-[var(--primary-soft)] text-[var(--primary-strong)]': route.path === view.to }"
        >
          {{ view.label }}
        </RouterLink>
      </nav>

      <div class="hidden items-center justify-end gap-2 sm:flex sm:flex-1 lg:basis-[24rem]">
        <button
          class="hidden rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-default)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] sm:inline-flex"
          type="button"
          @click="$emit('openRoleSelector')"
        >
          {{ roleSelectorLabel }}
        </button>

        <button
          class="hidden items-center gap-2 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-default)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] sm:inline-flex"
          type="button"
          @click="$emit('openDataModal')"
        >
          <span class="h-2 w-2 rounded-full" :class="statusDotClass"></span>
          <span>{{ statusText }}</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { Menu } from 'lucide-vue-next';

import { useDatasetStore } from '../../stores/dataset';
import { useExplorerStore } from '../../stores/explorer';

defineEmits<{
  openRoleSelector: [];
  openDataModal: [];
}>();

const datasetStore = useDatasetStore();
const explorerStore = useExplorerStore();
const route = useRoute();

const views = [
  { to: '/roles', label: 'Roles' },
  { to: '/compare', label: 'Compare' },
  { to: '/skills', label: 'Skills' },
];

const roleSelectorLabel = computed(() => {
  const count = explorerStore.selectedRoleKeys.length;
  return count > 0 ? `Filter roles (${count})` : 'Filter roles';
});

const statusText = computed(() => {
  if (datasetStore.isPreloading) {
    return 'Syncing';
  }
  if (datasetStore.importMode === 'preloaded') {
    return datasetStore.dataSource === 'fallback-memory' ? 'Ready (legacy)' : 'Ready';
  }
  if (datasetStore.loadedCount === 0) {
    return 'No files loaded';
  }
  if (datasetStore.loadedCount < 3) {
    return `${datasetStore.loadedCount}/3 files loaded`;
  }
  return 'All files loaded';
});

const statusDotClass = computed(() => {
  if (datasetStore.isPreloading) {
    return 'bg-[var(--warning)] animate-pulse';
  }
  if (datasetStore.importMode === 'preloaded') {
    return datasetStore.dataSource === 'fallback-memory' ? 'bg-[var(--warning)]' : 'bg-[var(--success)]';
  }
  if (datasetStore.loadedCount < 3) {
    return 'bg-[var(--warning)]';
  }
  if (datasetStore.loadedCount === 3) {
    return 'bg-[var(--success)]';
  }
  return 'bg-[var(--text-muted)]';
});
</script>
