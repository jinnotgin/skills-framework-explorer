<script setup lang="ts">
interface Props {
  isLoading?: boolean;
  hasData?: boolean;
}

withDefaults(defineProps<Props>(), {
  isLoading: false,
  hasData: false
});
</script>

<template>
  <div class="empty-state" :class="{ 'is-loading': isLoading }">
    <div class="empty-state-icon">📂</div>
    <div class="empty-state-title">
      {{ isLoading ? 'Loading data…' : 'Ready to explore skills?' }}
    </div>
    <div class="empty-state-text">
      <template v-if="isLoading">
        Fetching preloaded data. This only takes a moment.
      </template>
      <template v-else-if="hasData">
        Select job roles in the sidebar to see their skill mix.
      </template>
      <template v-else>
        Load your Skills Framework files or start with the bundled dataset.
      </template>
    </div>
    <div class="empty-state-steps">
      <div class="step">
        <div class="step-number">1</div>
        <div class="step-text">Load data</div>
      </div>
      <div class="step">
        <div class="step-number">2</div>
        <div class="step-text">Pick roles</div>
      </div>
      <div class="step">
        <div class="step-number">3</div>
        <div class="step-text">Analyze</div>
      </div>
    </div>
  </div>
</template>
