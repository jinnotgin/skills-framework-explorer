<template>
  <div
    ref="triggerRef"
    class="inline-flex max-w-full"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
    @focusin="showTooltip"
    @focusout="handleFocusOut"
  >
    <slot />
  </div>
  <Teleport to="body">
    <div
      v-if="isVisible && text"
      ref="tooltipRef"
      class="pointer-events-none fixed z-[80] max-w-[16rem] whitespace-nowrap rounded-[6px] bg-[var(--text-primary)] px-2 py-1 text-xs font-medium text-white shadow-[var(--shadow-subtle)]"
      :style="tooltipStyle"
      role="tooltip"
    >
      {{ text }}
      <span
        class="absolute h-2 w-2 rotate-45 bg-[var(--text-primary)]"
        :style="arrowStyle"
        aria-hidden="true"
      ></span>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    text?: string;
    position?: 'top' | 'bottom' | 'auto';
  }>(),
  {
    text: '',
    position: 'auto',
  },
);

const VIEWPORT_MARGIN = 8;
const OFFSET = 10;

const triggerRef = ref<HTMLElement | null>(null);
const tooltipRef = ref<HTMLElement | null>(null);
const isVisible = ref(false);
const placement = ref<'top' | 'bottom'>('top');
const coordinates = ref({ left: 0, top: 0 });
const arrowOffset = ref(0);

const tooltipStyle = computed(() => ({
  left: `${coordinates.value.left}px`,
  top: `${coordinates.value.top}px`,
}));

const arrowStyle = computed(() => {
  const left = Math.max(8, arrowOffset.value);

  if (placement.value === 'top') {
    return {
      left: `${left}px`,
      top: '100%',
      marginTop: '-4px',
    };
  }

  return {
    left: `${left}px`,
    bottom: '100%',
    marginBottom: '-4px',
  };
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updatePosition);
  window.removeEventListener('scroll', updatePosition, true);
});

async function showTooltip() {
  if (!props.text) {
    return;
  }

  isVisible.value = true;
  await nextTick();
  updatePosition();
  window.addEventListener('resize', updatePosition);
  window.addEventListener('scroll', updatePosition, true);
}

function hideTooltip() {
  isVisible.value = false;
  window.removeEventListener('resize', updatePosition);
  window.removeEventListener('scroll', updatePosition, true);
}

function handleFocusOut(event: FocusEvent) {
  const nextTarget = event.relatedTarget;
  if (nextTarget instanceof Node && triggerRef.value?.contains(nextTarget)) {
    return;
  }
  hideTooltip();
}

function updatePosition() {
  if (!isVisible.value || !triggerRef.value || !tooltipRef.value) {
    return;
  }

  const triggerRect = triggerRef.value.getBoundingClientRect();
  const tooltipRect = tooltipRef.value.getBoundingClientRect();
  const preferredPlacement = resolvePlacement(triggerRect, tooltipRect);
  placement.value = preferredPlacement;

  const unclampedLeft = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
  const maxLeft = window.innerWidth - tooltipRect.width - VIEWPORT_MARGIN;
  const left = Math.min(Math.max(VIEWPORT_MARGIN, unclampedLeft), Math.max(VIEWPORT_MARGIN, maxLeft));
  const top =
    preferredPlacement === 'top'
      ? triggerRect.top - tooltipRect.height - OFFSET
      : triggerRect.bottom + OFFSET;

  coordinates.value = {
    left,
    top: Math.max(VIEWPORT_MARGIN, top),
  };

  arrowOffset.value = triggerRect.left + triggerRect.width / 2 - left - 4;
}

function resolvePlacement(triggerRect: DOMRect, tooltipRect: DOMRect) {
  if (props.position === 'top' || props.position === 'bottom') {
    return props.position;
  }

  const spaceAbove = triggerRect.top;
  const spaceBelow = window.innerHeight - triggerRect.bottom;
  const tooltipHeight = tooltipRect.height + OFFSET;

  if (spaceAbove >= tooltipHeight || spaceAbove >= spaceBelow) {
    return 'top';
  }

  return 'bottom';
}
</script>
