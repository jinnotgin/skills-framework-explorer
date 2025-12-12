<script setup lang="ts">
import { computed } from 'vue';
import { useFrameworkStore, type RoleSummary } from '../stores/framework';
import { useSelectionStore } from '../stores/selection';

const frameworkStore = useFrameworkStore();
const selectionStore = useSelectionStore();

const selectedRoles = computed(() =>
  selectionStore.selectedRoleKeys
    .map((key) => frameworkStore.roleSummaryLookup[key])
    .filter((role): role is RoleSummary => Boolean(role))
);

function toggleChips() {
  selectionStore.setChipsExpanded(!selectionStore.chipsExpanded);
}

function clearSelection() {
  selectionStore.clearSelection();
}

function removeRole(key: string) {
  selectionStore.toggleRole(key);
}
</script>

<template>
  <div class="selection-tray">
    <div class="selection-tray-main">
      <div class="selection-tray-header">
        <div class="selection-count-wrapper">
          <div class="selection-count">{{ selectionStore.selectedCount }} selected</div>
          <button class="selection-expand-btn" type="button" @click="toggleChips">
            {{ selectionStore.chipsExpanded ? 'Hide' : 'Show' }} list
          </button>
        </div>
        <button class="selection-clear" type="button" @click="clearSelection">Clear</button>
      </div>
      <div
        class="selected-roles-expandable"
        :class="{ expanded: selectionStore.chipsExpanded }"
      >
        <div class="selected-roles-chips">
          <span
            v-for="role in selectedRoles"
            :key="role.key"
            class="selected-chip"
          >
            <span class="chip-name">{{ role.title }}</span>
            <span class="chip-track">{{ role.track }}</span>
            <span class="remove" role="button" @click="removeRole(role.key)">×</span>
          </span>
        </div>
      </div>
      <button class="analyze-btn" type="button" :disabled="!selectionStore.selectedCount">
        <span>Analyze selection</span>
      </button>
    </div>
  </div>
</template>
