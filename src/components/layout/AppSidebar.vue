<template>
  <div
    v-if="uiStore.sidebarOpen"
    class="fixed inset-0 z-50 bg-[var(--overlay-scrim)] lg:flex lg:items-center lg:justify-center lg:px-4 lg:py-6"
    @click.self="uiStore.setSidebarOpen(false)"
  >
    <div
      class="flex h-[100dvh] w-full flex-col bg-[var(--surface-default)] shadow-[var(--shadow-subtle)] lg:h-[min(80vh,52rem)] lg:max-w-5xl lg:rounded-[10px] lg:border lg:border-[var(--border-default)]"
    >
      <template v-if="uiStore.isMobile">
        <div class="flex items-start justify-between gap-4 border-b border-[var(--border-default)] px-5 pb-4 pt-5">
          <div>
            <div class="text-lg font-semibold text-[var(--text-primary)]">Role selection</div>
            <div class="mt-1 text-sm leading-6 text-[var(--text-secondary)]">Search, filter, and stage roles for the next analysis.</div>
          </div>
          <button
            class="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-secondary)]"
            type="button"
            @click="uiStore.setSidebarOpen(false)"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto">
          <div class="sticky top-0 z-10 border-b border-[var(--border-default)] bg-[var(--surface-default)] px-5 py-4 shadow-[0_1px_0_rgba(215,226,240,0.8)]">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-sm font-semibold text-[var(--text-primary)]">{{ draftSelectedRoleKeys.length }} selected</div>
                <div class="text-xs leading-5 text-[var(--text-muted)]">{{ visibleRoleCount }} visible roles</div>
              </div>
              <button
                v-if="draftSelectedRoleKeys.length"
                class="text-sm font-medium text-[var(--primary-strong)]"
                type="button"
                @click="showSelectedRoles = !showSelectedRoles"
              >
                {{ showSelectedRoles ? 'Hide selected' : 'Review selected' }}
              </button>
            </div>

            <div class="mt-3 space-y-3">
              <UiInput ref="searchInput" v-model="searchQuery" placeholder="Search roles, sectors, or tracks" />
              <UiSelect v-model="sectorFilter">
                <option value="">All sectors</option>
                <option v-for="sector in datasetStore.sectors" :key="sector" :value="sector">{{ sector }}</option>
              </UiSelect>
            </div>

            <div class="mt-3 flex items-center justify-between gap-3">
              <div class="text-xs leading-5 text-[var(--text-muted)]">{{ analysisMessage }}</div>
              <UiButton size="sm" variant="ghost" :disabled="!visibleRoleCount" @click="toggleAllVisible">
                {{ allVisibleSelected ? 'Clear visible' : 'Select visible' }}
              </UiButton>
            </div>

            <div v-if="showSelectedRoles && selectedRoleSummaries.length" class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="role in selectedRoleSummaries"
                :key="role.key"
                class="inline-flex max-w-full items-center gap-2 rounded-[999px] border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-primary)]"
                type="button"
                @click="toggleRole(role.key)"
              >
                <span class="truncate">{{ role.role }}</span>
                <X class="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
              </button>
            </div>
          </div>

          <div class="px-5 py-4 pb-32">
            <div v-if="!datasetStore.roles.length" class="rounded-[10px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] px-4 py-8 text-center">
              <Files class="mx-auto h-5 w-5 text-[var(--text-muted)]" />
              <div class="mt-3 text-sm font-semibold text-[var(--text-primary)]">No roles loaded</div>
              <div class="mt-1 text-sm text-[var(--text-secondary)]">
                Load the bundled data or upload the latest SkillsFuture workbooks from the data files dialog.
              </div>
            </div>

            <div v-else class="space-y-5">
              <section v-for="group in filteredGroups" :key="group.sector" class="space-y-2">
                <button class="flex w-full items-center gap-2 text-left" type="button" @click="toggleSector(group.sector)">
                  <ChevronRight class="h-4 w-4 shrink-0 text-[var(--text-muted)] transition" :class="{ 'rotate-90': expandedSectors.has(group.sector) }" />
                  <div class="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{{ group.sector }}</div>
                  <span class="text-xs text-[var(--text-muted)]">{{ group.visibleRoles.length }}</span>
                </button>

                <div v-show="expandedSectors.has(group.sector)" class="grid gap-2">
                  <button
                    v-for="role in group.visibleRoles"
                    :key="role.key"
                    class="flex w-full items-start gap-3 rounded-[12px] border px-4 py-3 text-left transition-colors"
                    :class="
                      isSelected(role.key)
                        ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                        : 'border-[var(--border-default)] bg-[var(--surface-default)]'
                    "
                    type="button"
                    @click="toggleRole(role.key)"
                  >
                    <span
                      class="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border text-xs font-semibold"
                      :class="
                        isSelected(role.key)
                          ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                          : 'border-[var(--border-strong)] bg-[var(--surface-default)] text-transparent'
                      "
                    >
                      ✓
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block text-sm font-semibold leading-5 text-[var(--text-primary)]">{{ role.role }}</span>
                      <span class="mt-1 block text-sm leading-5 text-[var(--text-secondary)]">{{ role.track || 'General track' }}</span>
                    </span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>

        <div class="border-t border-[var(--border-default)] bg-[var(--surface-default)] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_24px_rgba(32,33,36,0.06)]">
          <div class="flex items-center justify-between gap-3">
            <UiButton size="sm" variant="ghost" :disabled="!draftSelectedRoleKeys.length" @click="clearDraftSelection">Clear</UiButton>
            <UiButton variant="primary" :disabled="!canApplySelection" @click="analyze">
              {{ mobileAnalyzeLabel }}
            </UiButton>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="flex items-start justify-between gap-4 border-b border-[var(--border-default)] px-5 py-4">
          <div>
            <div class="text-base font-semibold text-[var(--text-primary)]">Role selection</div>
            <div class="mt-1 text-sm text-[var(--text-secondary)]">Search, filter, and stage the roles you want in the current analysis.</div>
          </div>
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-secondary)]"
            type="button"
            @click="uiStore.setSidebarOpen(false)"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section class="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] border-b border-[var(--border-default)] lg:border-b-0 lg:border-r">
            <div class="border-b border-[var(--border-default)] px-5 py-4">
              <div class="flex items-center justify-between gap-3">
                <div class="text-sm text-[var(--text-secondary)]">{{ visibleRoleCount }} visible roles</div>
                <UiButton size="sm" variant="ghost" :disabled="!visibleRoleCount" @click="toggleAllVisible">
                  {{ allVisibleSelected ? 'Clear visible' : 'Select visible' }}
                </UiButton>
              </div>

              <div class="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
                <UiInput ref="searchInput" v-model="searchQuery" placeholder="Search roles, sectors, or tracks" />
                <UiSelect v-model="sectorFilter">
                  <option value="">All sectors</option>
                  <option v-for="sector in datasetStore.sectors" :key="sector" :value="sector">{{ sector }}</option>
                </UiSelect>
              </div>
            </div>

            <div class="min-h-0 overflow-y-auto px-5 py-4">
              <div v-if="!datasetStore.roles.length" class="rounded-[8px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] px-4 py-6 text-center">
                <Files class="mx-auto h-5 w-5 text-[var(--text-muted)]" />
                <div class="mt-3 text-sm font-semibold text-[var(--text-primary)]">No roles loaded</div>
                <div class="mt-1 text-sm text-[var(--text-secondary)]">
                  Load the bundled data or upload the latest SkillsFuture workbooks from the data files dialog.
                </div>
              </div>

              <div v-else class="space-y-4">
                <section
                  v-for="group in filteredGroups"
                  :key="group.sector"
                  class="border-b border-[var(--border-default)] pb-3 last:border-b-0"
                >
                  <button class="flex w-full items-center gap-2 text-left" type="button" @click="toggleSector(group.sector)">
                    <ChevronRight class="h-4 w-4 shrink-0 text-[var(--text-muted)] transition" :class="{ 'rotate-90': expandedSectors.has(group.sector) }" />
                    <div class="min-w-0 flex-1">
                      <div class="truncate text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{{ group.sector }}</div>
                    </div>
                    <span class="text-xs text-[var(--text-muted)]">{{ group.visibleRoles.length }}</span>
                  </button>

                  <div v-show="expandedSectors.has(group.sector)" class="mt-2 grid gap-1.5">
                    <button
                      v-for="role in group.visibleRoles"
                      :key="role.key"
                      class="flex w-full items-start gap-3 rounded-[8px] border border-transparent px-2 py-2 text-left transition-colors hover:bg-[var(--surface-muted)]"
                      :class="{ 'border-[var(--border-strong)] bg-[var(--surface-muted)]': isSelected(role.key) }"
                      type="button"
                      @click="toggleRole(role.key)"
                    >
                      <span
                        class="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border text-[10px] font-semibold"
                        :class="
                          isSelected(role.key)
                            ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                            : 'border-[var(--border-strong)] bg-[var(--surface-default)] text-transparent'
                        "
                      >
                        ✓
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block text-[13px] font-medium leading-5 text-[var(--text-primary)]">{{ role.role }}</span>
                        <span class="mt-0.5 block text-xs leading-4 text-[var(--text-muted)]">{{ role.track || 'General track' }}</span>
                      </span>
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </section>

          <section class="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
            <div class="border-b border-[var(--border-default)] px-4 py-4">
              <div class="text-sm font-semibold text-[var(--text-primary)]">{{ draftSelectedRoleKeys.length }} selected</div>
              <div class="mt-1 text-xs leading-5 text-[var(--text-muted)]">{{ analysisMessage }}</div>
            </div>

            <div class="min-h-0 overflow-y-auto px-4 py-4">
              <ul v-if="selectedRoleSummaries.length" class="space-y-2">
                <li
                  v-for="role in selectedRoleSummaries"
                  :key="role.key"
                  class="flex items-center justify-between gap-3 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 py-2 text-sm"
                >
                  <span class="min-w-0 truncate text-[var(--text-secondary)]">{{ role.role }}</span>
                  <button
                    class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-default)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
                    type="button"
                    :aria-label="`Remove ${role.role}`"
                    :title="`Remove ${role.role}`"
                    @click="toggleRole(role.key)"
                  >
                    <X class="h-3.5 w-3.5" />
                  </button>
                </li>
              </ul>
              <div v-else class="rounded-[8px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
                No roles selected yet.
              </div>
            </div>

            <div class="border-t border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-4">
              <div class="flex items-center justify-between gap-3">
                <UiButton size="sm" variant="ghost" :disabled="!draftSelectedRoleKeys.length" @click="clearDraftSelection">Clear</UiButton>
                <UiButton variant="primary" :disabled="!canApplySelection" @click="analyze">
                  {{ analyzeLabel }}
                </UiButton>
              </div>
            </div>
          </section>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { ChevronRight, Files, X } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

import UiButton from '../ui/UiButton.vue';
import UiInput from '../ui/UiInput.vue';
import UiSelect from '../ui/UiSelect.vue';
import { useDatasetStore } from '../../stores/dataset';
import { useExplorerStore } from '../../stores/explorer';
import { useUiStore } from '../../stores/ui';

const datasetStore = useDatasetStore();
const explorerStore = useExplorerStore();
const uiStore = useUiStore();
const router = useRouter();

const expandedSectors = reactive(new Set<string>());
const searchInput = ref<InstanceType<typeof UiInput> | null>(null);
const draftSelectedRoleKeys = ref<string[]>([]);
const showSelectedRoles = ref(false);

const searchQuery = computed({
  get: () => explorerStore.roleSearchQuery,
  set: (value: string) => explorerStore.setRoleSearchQuery(value),
});

const sectorFilter = computed({
  get: () => explorerStore.sectorFilter,
  set: (value: string) => explorerStore.setSectorFilter(value),
});

const filteredGroups = computed(() => {
  const query = explorerStore.roleSearchQuery.trim().toLowerCase();
  const sector = explorerStore.sectorFilter;
  const groups = new Map<string, typeof datasetStore.roles>();

  for (const role of datasetStore.roles) {
    if (sector && role.sector !== sector) {
      continue;
    }

    const matchesQuery =
      !query ||
      role.role.toLowerCase().includes(query) ||
      role.sector.toLowerCase().includes(query) ||
      role.track.toLowerCase().includes(query);

    if (!matchesQuery) {
      continue;
    }

    if (!groups.has(role.sector)) {
      groups.set(role.sector, []);
    }

    groups.get(role.sector)!.push(role);
  }

  return Array.from(groups.entries()).map(([sectorName, roles]) => ({
    sector: sectorName,
    visibleRoles: roles,
  }));
});

const visibleRoles = computed(() => filteredGroups.value.flatMap((group) => group.visibleRoles));
const visibleRoleCount = computed(() => visibleRoles.value.length);
const allVisibleSelected = computed(() => visibleRoles.value.length > 0 && visibleRoles.value.every((role) => draftSelectedRoleKeys.value.includes(role.key)));

const selectedRoleSummaries = computed(() =>
  draftSelectedRoleKeys.value
    .map((key) => datasetStore.roleByKey[key] ?? null)
    .filter((role): role is NonNullable<typeof role> => Boolean(role)),
);

const analysisDirty = computed(() => {
  const selected = [...draftSelectedRoleKeys.value].sort();
  const analyzed = [...explorerStore.analyzedRoleKeys].sort();
  return JSON.stringify(selected) !== JSON.stringify(analyzed);
});

const analysisMessage = computed(() => {
  if (!draftSelectedRoleKeys.value.length) {
    return explorerStore.analysisResults ? 'Update analysis to clear the current results.' : 'Choose roles for the next analysis.';
  }
  if (!explorerStore.analysisResults) {
    return 'Run analysis to open the workbench.';
  }
  if (analysisDirty.value) {
    return `Current results still reflect ${explorerStore.analyzedRoleKeys.length} analysed roles.`;
  }
  return 'Selection matches the current analysis.';
});

const canApplySelection = computed(
  () => !explorerStore.isAnalysisLoading && (draftSelectedRoleKeys.value.length > 0 || Boolean(explorerStore.analysisResults)),
);

const analyzeLabel = computed(() => {
  if (explorerStore.isAnalysisLoading) {
    return 'Loading...';
  }
  if (!explorerStore.analysisResults) {
    return 'Run analysis';
  }
  if (analysisDirty.value) {
    return 'Update analysis';
  }
  return 'Refresh analysis';
});

const mobileAnalyzeLabel = computed(() => {
  if (explorerStore.isAnalysisLoading) {
    return 'Loading...';
  }
  if (draftSelectedRoleKeys.value.length > 0) {
    const count = draftSelectedRoleKeys.value.length;
    return `${analysisDirty.value ? 'Update' : 'Analyze'} ${count} role${count === 1 ? '' : 's'}`;
  }
  return analyzeLabel.value;
});

watch(
  filteredGroups,
  (groups) => {
    if (!expandedSectors.size || explorerStore.roleSearchQuery) {
      groups.forEach((group) => expandedSectors.add(group.sector));
    }
  },
  { immediate: true },
);

watch(
  () => uiStore.sidebarOpen,
  async (isOpen) => {
    if (!isOpen) {
      return;
    }

    draftSelectedRoleKeys.value = [...explorerStore.selectedRoleKeys];
    showSelectedRoles.value = false;
    await nextTick();
    searchInput.value?.focus();
  },
);

function toggleSector(sector: string) {
  if (expandedSectors.has(sector)) {
    expandedSectors.delete(sector);
  } else {
    expandedSectors.add(sector);
  }
}

function isSelected(key: string) {
  return draftSelectedRoleKeys.value.includes(key);
}

function toggleRole(key: string) {
  if (draftSelectedRoleKeys.value.includes(key)) {
    draftSelectedRoleKeys.value = draftSelectedRoleKeys.value.filter((roleKey) => roleKey !== key);
    return;
  }

  draftSelectedRoleKeys.value = [...draftSelectedRoleKeys.value, key];
}

function toggleAllVisible() {
  if (!visibleRoles.value.length) {
    return;
  }

  if (allVisibleSelected.value) {
    const visibleKeys = new Set(visibleRoles.value.map((role) => role.key));
    draftSelectedRoleKeys.value = draftSelectedRoleKeys.value.filter((key) => !visibleKeys.has(key));
    return;
  }

  const nextKeys = new Set(draftSelectedRoleKeys.value);
  visibleRoles.value.forEach((role) => nextKeys.add(role.key));
  draftSelectedRoleKeys.value = Array.from(nextKeys);
}

function clearDraftSelection() {
  draftSelectedRoleKeys.value = [];
}

async function analyze() {
  explorerStore.setSelection(draftSelectedRoleKeys.value);
  await explorerStore.runAnalysis(datasetStore.dataset, draftSelectedRoleKeys.value);
  uiStore.setSidebarOpen(false);
  router.push('/roles');
}
</script>
