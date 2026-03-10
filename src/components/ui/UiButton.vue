<template>
  <button :class="classes" :type="type">
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
    block?: boolean;
  }>(),
  {
    type: 'button',
    variant: 'secondary',
    size: 'md',
    block: false,
  },
);

const classes = computed(() => [
  'inline-flex items-center justify-center rounded-[8px] border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-50',
  props.size === 'sm' ? 'h-8 px-3' : 'h-10 px-4',
  props.block ? 'w-full' : '',
  props.variant === 'primary' && 'border-[var(--primary)] bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)] hover:border-[var(--primary-strong)]',
  props.variant === 'secondary' && 'border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)]',
  props.variant === 'ghost' && 'border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]',
  props.variant === 'danger' && 'border-[var(--danger)] bg-[var(--danger)] text-white hover:opacity-90',
]);
</script>
