<template>
  <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-default)] bg-[var(--surface-default)] px-2 py-2 lg:hidden">
    <div class="grid grid-cols-4 gap-2">
      <button class="bottom-nav-btn" type="button" @click="$emit('openSidebar')">
        <PanelLeft class="h-4 w-4" />
        <span>Select</span>
      </button>
      <RouterLink class="bottom-nav-btn" :class="{ active: route.name === 'roles' }" to="/roles" @mouseenter="prefetchView('/roles')" @focus="prefetchView('/roles')">
        <LayoutPanelTop class="h-4 w-4" />
        <span>Analysis</span>
      </RouterLink>
      <RouterLink
        class="bottom-nav-btn"
        :class="{ active: route.name === 'compare' }"
        to="/compare"
        @mouseenter="prefetchView('/compare')"
        @focus="prefetchView('/compare')"
      >
        <Scale class="h-4 w-4" />
        <span>Compare</span>
      </RouterLink>
      <RouterLink class="bottom-nav-btn" :class="{ active: route.name === 'skills' }" to="/skills" @mouseenter="prefetchView('/skills')" @focus="prefetchView('/skills')">
        <Sparkles class="h-4 w-4" />
        <span>Skills</span>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { LayoutPanelTop, PanelLeft, Scale, Sparkles } from 'lucide-vue-next';
import { RouterLink, useRoute } from 'vue-router';

import { prefetchRouteComponents } from '../../router';

defineEmits<{
  openSidebar: [];
}>();

const route = useRoute();

function prefetchView(to: string) {
  void prefetchRouteComponents(to);
}
</script>
