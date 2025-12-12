<script setup lang="ts">
import { computed, ref } from 'vue';
import { useFrameworkStore } from '../stores/framework';
import { useSelectionStore } from '../stores/selection';
import SelectionTray from './SelectionTray.vue';

const frameworkStore = useFrameworkStore();
const selectionStore = useSelectionStore();
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);

const filteredRoles = computed(() => {
  const term = selectionStore.searchTerm.toLowerCase();
  const sectorFilter = selectionStore.sectorFilter;

  return frameworkStore.roles.filter((role) => {
    const matchesSector = sectorFilter === 'all' || role.sector === sectorFilter;
    const matchesSearch =
      !term ||
      role.title.toLowerCase().includes(term) ||
      role.track.toLowerCase().includes(term) ||
      role.sector.toLowerCase().includes(term);
    return matchesSector && matchesSearch;
  });
});

const groupedRoles = computed(() => {
  const map = new Map<string, typeof filteredRoles.value>();
  filteredRoles.value.forEach((role) => {
    if (!map.has(role.sector)) map.set(role.sector, []);
    map.get(role.sector)!.push(role);
  });

  return Array.from(map.entries())
    .map(([sector, roles]) => ({
      sector,
      roles: roles.sort(
        (a, b) => a.track.localeCompare(b.track) || a.title.localeCompare(b.title)
      )
    }))
    .sort((a, b) => a.sector.localeCompare(b.sector));
});

function onSearch(term: string) {
  selectionStore.setSearchTerm(term);
}

function onSectorChange(sector: string) {
  selectionStore.setSectorFilter(sector);
}

function toggleRole(key: string) {
  selectionStore.toggleRole(key);
}

function isSelected(key: string) {
  return selectionStore.selectedLookup.has(key);
}

function triggerFilePicker() {
  fileInputRef.value?.click();
}

function onFilesSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    frameworkStore.loadFiles(target.files);
    target.value = '';
  }
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDragOver.value = false;
  if (e.dataTransfer?.files?.length) {
    frameworkStore.loadFiles(e.dataTransfer.files);
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  isDragOver.value = true;
}

function handleDragLeave() {
  isDragOver.value = false;
}
</script>

<template>
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-file-section">
      <div class="file-section-header">
        <div class="file-section-title">
          <span>Data</span>
        </div>
        <div class="file-section-status-wrapper">
          <div class="file-section-status">
            <span class="mini-dot" :class="{ loaded: frameworkStore.status === 'ready' }" />
            <span class="file-section-label">
              {{ frameworkStore.status === 'ready' ? 'Loaded' : 'Not loaded' }}
            </span>
          </div>
        </div>
      </div>
      <div class="file-section-body">
        <div class="file-upload-zone" @click="frameworkStore.preload()">
          <div class="file-upload-text">
            Load bundled dataset from <code>/data/skills-framework-data.json.zip</code>
          </div>
          <div class="file-upload-hint">Click to reload anytime.</div>
        </div>
        <div
          class="file-upload-zone secondary"
          :class="{ 'drag-over': isDragOver }"
          @click="triggerFilePicker"
          @drop="handleDrop"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
        >
          <div class="file-upload-text">Upload XLSX files</div>
          <div class="file-upload-hint">Drop or pick the 3 Skills Framework spreadsheets.</div>
          <input
            ref="fileInputRef"
            class="file-input"
            type="file"
            accept=".xlsx"
            multiple
            @change="onFilesSelected"
          />
        </div>
      </div>
    </div>

    <div class="sidebar-main">
      <div class="sidebar-search-section">
        <div class="sidebar-title">Job roles</div>
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            class="search-input"
            type="search"
            :value="selectionStore.searchTerm"
            placeholder="Search roles, tracks, sectors"
            @input="onSearch(($event.target as HTMLInputElement).value)"
          />
        </div>
        <select
          class="filter-select"
          :value="selectionStore.sectorFilter"
          @change="onSectorChange(($event.target as HTMLSelectElement).value)"
        >
          <option value="all">All sectors ({{ frameworkStore.roleCount }})</option>
          <option v-for="sector in frameworkStore.sectors" :key="sector" :value="sector">
            {{ sector }}
          </option>
        </select>
      </div>

      <div class="role-list-container">
        <div v-if="frameworkStore.status === 'loading'" class="empty-hint">Loading data…</div>
        <div
          v-else-if="!groupedRoles.length"
          class="empty-hint"
        >
          {{ frameworkStore.status === 'ready' ? 'No roles found.' : 'Load data to begin.' }}
        </div>
        <div v-else v-for="group in groupedRoles" :key="group.sector" class="sector-group expanded">
          <div class="sector-header">
            <span class="chevron">›</span>
            <span class="sector-name">{{ group.sector || 'Unknown sector' }}</span>
            <span class="count">{{ group.roles.length }}</span>
          </div>
          <div class="sector-roles">
            <button
              v-for="role in group.roles"
              :key="role.key"
              class="role-item"
              :class="{ selected: isSelected(role.key) }"
              type="button"
              @click="toggleRole(role.key)"
            >
              <span class="role-checkbox">
                <span class="check">✓</span>
              </span>
              <div class="role-name">
                <div class="role-title">{{ role.title }}</div>
                <div class="role-track">{{ role.track }}</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <SelectionTray />
    </div>
  </aside>
</template>
