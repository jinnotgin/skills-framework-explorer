<script setup lang="ts">
import { computed } from 'vue';
import { useFrameworkStore, type RoleSkillEntry, type RoleSummary } from '../stores/framework';
import { useSelectionStore } from '../stores/selection';

const frameworkStore = useFrameworkStore();
const selectionStore = useSelectionStore();

const roleA = computed<RoleSummary | null>(() => {
  const key = selectionStore.selectedRoleKeys[0];
  return frameworkStore.roleSummaryLookup[key] ?? null;
});

const roleB = computed<RoleSummary | null>(() => {
  const key = selectionStore.selectedRoleKeys[1];
  return frameworkStore.roleSummaryLookup[key] ?? null;
});

function buildSkillMap(role: RoleSummary | null) {
  if (!role) return new Map<string, RoleSkillEntry>();
  const map = new Map<string, RoleSkillEntry>();
  (frameworkStore.roleSkillsByRoleKey[role.key] || []).forEach((skill) => {
    const key = `${skill.code}::${skill.proficiency || ''}`;
    map.set(key, skill);
  });
  return map;
}

const comparison = computed(() => {
  const mapA = buildSkillMap(roleA.value);
  const mapB = buildSkillMap(roleB.value);

  const shared: RoleSkillEntry[] = [];
  const uniqueA: RoleSkillEntry[] = [];
  const uniqueB: RoleSkillEntry[] = [];

  mapA.forEach((value, key) => {
    if (mapB.has(key)) {
      shared.push(value);
    } else {
      uniqueA.push(value);
    }
  });
  mapB.forEach((value, key) => {
    if (!mapA.has(key)) uniqueB.push(value);
  });

  shared.sort((a, b) => a.title.localeCompare(b.title));
  uniqueA.sort((a, b) => a.title.localeCompare(b.title));
  uniqueB.sort((a, b) => a.title.localeCompare(b.title));

  return { shared, uniqueA, uniqueB };
});
</script>

<template>
  <div v-if="selectionStore.selectedCount < 2" class="empty-hint">
    Pick two roles to compare their shared and distinct skills.
  </div>
  <div v-else class="compare-grid">
    <div class="compare-card" v-if="roleA">
      <div class="compare-title">{{ roleA.title }}</div>
      <div class="compare-meta">{{ roleA.sector }} · {{ roleA.track }}</div>
      <div class="pill-row">
        <span class="pill">TSCs {{ roleA.tscCount }}</span>
        <span class="pill">Unique skills {{ roleA.uniqueSkillCount }}</span>
      </div>
      <div class="compare-list">
        <div class="compare-list-title">Unique to {{ roleA.title }}</div>
        <div class="pill-stack" v-if="comparison.uniqueA.length">
          <span v-for="skill in comparison.uniqueA" :key="skill.title" class="chip">
            {{ skill.title }} ({{ skill.proficiency || 'N/A' }})
          </span>
        </div>
        <div v-else class="row-description">No unique skills.</div>
      </div>
    </div>

    <div class="compare-card shared">
      <div class="compare-title">Shared skills</div>
      <div class="compare-meta">Skills both roles expect</div>
      <div class="compare-list">
        <div v-if="!comparison.shared.length" class="row-description">
          No overlap yet. Try different roles.
        </div>
        <div class="compare-table" v-else>
          <div class="table-head">
            <span>Skill</span>
            <span>{{ roleA?.title || 'Role A' }}</span>
            <span>{{ roleB?.title || 'Role B' }}</span>
          </div>
          <div v-for="skill in comparison.shared" :key="skill.title" class="table-row">
            <div class="table-cell">
              <div class="row-title">{{ skill.title }}</div>
              <div class="row-subtitle">{{ skill.category }}</div>
            </div>
            <div class="table-cell">
              <span class="badge">{{ skill.proficiency }}</span>
            </div>
            <div class="table-cell">
              <span class="badge">{{ buildSkillMap(roleB).get(`${skill.code}::${skill.proficiency || ''}`)?.proficiency || skill.proficiency }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="compare-card" v-if="roleB">
      <div class="compare-title">{{ roleB.title }}</div>
      <div class="compare-meta">{{ roleB.sector }} · {{ roleB.track }}</div>
      <div class="pill-row">
        <span class="pill">TSCs {{ roleB.tscCount }}</span>
        <span class="pill">Unique skills {{ roleB.uniqueSkillCount }}</span>
      </div>
      <div class="compare-list">
        <div class="compare-list-title">Unique to {{ roleB.title }}</div>
        <div class="pill-stack" v-if="comparison.uniqueB.length">
          <span v-for="skill in comparison.uniqueB" :key="skill.title" class="chip">
            {{ skill.title }} ({{ skill.proficiency || 'N/A' }})
          </span>
        </div>
        <div v-else class="row-description">No unique skills.</div>
      </div>
    </div>
  </div>
</template>
