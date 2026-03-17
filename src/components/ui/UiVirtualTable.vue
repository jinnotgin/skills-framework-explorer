<template>
  <div ref="container" :class="containerClass" @scroll="onScroll">
    <table :class="tableClass">
      <slot name="colgroup"></slot>

      <thead>
        <slot name="header"></slot>
      </thead>

      <tbody>
        <tr v-if="topSpacer > 0" aria-hidden="true">
          <td :colspan="columnCount" :style="spacerStyle(topSpacer)"></td>
        </tr>

        <slot
          v-for="(item, index) in visibleItems"
          name="row"
          :key="getItemKey(item, startIndex + index)"
          :item="item"
          :index="startIndex + index"
          :row-style="rowStyle"
        ></slot>

        <tr v-if="bottomSpacer > 0" aria-hidden="true">
          <td :colspan="columnCount" :style="spacerStyle(bottomSpacer)"></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    items: any[];
    itemHeight: number;
    columnCount: number;
    tableClass?: string;
    overscan?: number;
    contained?: boolean;
    itemKey?: string | ((item: any, index: number) => string | number);
  }>(),
  {
    tableClass: '',
    overscan: 6,
    contained: true,
    itemKey: undefined,
  },
);

const container = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const viewportHeight = ref(0);
let resizeObserver: ResizeObserver | null = null;
let frameId = 0;

const containerClass = computed(() => (props.contained ? 'overflow-auto' : 'overflow-visible'));

const visibleCount = computed(() => {
  if (viewportHeight.value <= 0) {
    return props.items.length;
  }

  return Math.ceil(viewportHeight.value / props.itemHeight);
});

const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.overscan));
const endIndex = computed(() => Math.min(props.items.length, startIndex.value + visibleCount.value + props.overscan * 2));
const visibleItems = computed(() => props.items.slice(startIndex.value, endIndex.value));
const topSpacer = computed(() => startIndex.value * props.itemHeight);
const bottomSpacer = computed(() => Math.max(0, (props.items.length - endIndex.value) * props.itemHeight));
const rowStyle = computed(() => ({
  height: `${props.itemHeight}px`,
}));

watch(
  () => props.items.length,
  async () => {
    await nextTick();
    syncViewport();

    const element = container.value;
    if (!element) {
      return;
    }

    const maxScrollTop = Math.max(0, props.items.length * props.itemHeight - element.clientHeight);
    if (element.scrollTop > maxScrollTop) {
      element.scrollTop = maxScrollTop;
    }
    scrollTop.value = element.scrollTop;
  },
);

onMounted(() => {
  syncViewport();

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      syncViewport();
    });

    if (container.value) {
      resizeObserver.observe(container.value);
    }
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  if (frameId) {
    window.cancelAnimationFrame(frameId);
  }
});

function onScroll(event: Event) {
  const element = event.target as HTMLElement;

  if (frameId) {
    window.cancelAnimationFrame(frameId);
  }

  frameId = window.requestAnimationFrame(() => {
    scrollTop.value = element.scrollTop;
    frameId = 0;
  });
}

function syncViewport() {
  if (!props.contained) {
    viewportHeight.value = 0;
    return;
  }

  viewportHeight.value = container.value?.clientHeight ?? 0;
}

function spacerStyle(height: number) {
  return {
    height: `${height}px`,
    padding: '0',
    border: '0',
  };
}

function getItemKey(item: any, index: number) {
  if (typeof props.itemKey === 'function') {
    return props.itemKey(item, index);
  }

  if (typeof props.itemKey === 'string' && item && typeof item === 'object' && props.itemKey in item) {
    return (item as Record<string, unknown>)[props.itemKey] as string | number;
  }

  return index;
}
</script>
