<template>
  <div class="relative w-full">
    <select
      v-bind="attrs"
      :value="modelValue"
      class="h-10 w-full appearance-none rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-default)] py-0 pl-3 pr-10 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <slot />
    </select>
    <ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue';
import { ChevronDown } from 'lucide-vue-next';

defineOptions({
  inheritAttrs: false,
});

const attrs = useAttrs();

withDefaults(
  defineProps<{
    modelValue?: string;
  }>(),
  {
    modelValue: '',
  },
);

defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>
