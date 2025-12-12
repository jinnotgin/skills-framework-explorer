<script setup lang="ts">
import { computed, ref } from 'vue';
import { useFrameworkStore } from '../stores/framework';

const frameworkStore = useFrameworkStore();
const expanded = ref<Record<string, boolean>>({});

const skills = computed(() =>
  frameworkStore.uniqueSkills.map((title) => {
    const usage = frameworkStore.uniqueSkillUsage[title] ?? [];
    const details = frameworkStore.uniqueSkillDetails.get(title);
    return { title, usage, details };
  })
);

function toggle(title: string) {
  expanded.value[title] = !expanded.value[title];
}
</script>

<template>
  <div v-if="!skills.length" class="empty-hint">
    Load data to explore unique skills across roles.
  </div>
  <div class="skill-list">
    <article v-for="skill in skills" :key="skill.title" class="skill-card">
      <header class="skill-header" @click="toggle(skill.title)">
        <div>
          <div class="skill-title">{{ skill.title }}</div>
          <div class="skill-subtitle">
            {{ skill.details?.category || 'Unique skill' }}
          </div>
        </div>
        <div class="pill-row">
          <span class="pill">{{ skill.usage.length }} roles</span>
          <span class="pill" v-if="skill.details?.sector">{{ skill.details.sector }}</span>
        </div>
        <div class="skill-chevron">
          {{ expanded[skill.title] ? '▾' : '▸' }}
        </div>
      </header>
      <div v-if="expanded[skill.title]" class="skill-body">
        <p v-if="skill.details?.description" class="row-description">
          {{ skill.details.description }}
        </p>
        <div v-if="!skill.usage.length" class="row-description">No role mappings.</div>
        <ul v-else class="usage-list">
          <li v-for="use in skill.usage" :key="use.roleKey + use.tscCode">
            <div class="usage-role">
              <div class="row-title">{{ use.roleTitle }}</div>
              <div class="row-subtitle">{{ use.sector }} · {{ use.track }}</div>
            </div>
            <div class="usage-tsc">
              <div class="row-title">{{ use.tscTitle }}</div>
              <div class="row-subtitle">Proficiency {{ use.proficiency || 'N/A' }}</div>
            </div>
          </li>
        </ul>
      </div>
    </article>
  </div>
</template>
