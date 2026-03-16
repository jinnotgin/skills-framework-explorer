<template>
  <input
    ref="inputElement"
    :value="modelValue"
    :placeholder="placeholder"
    :type="type"
    class="h-10 w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-default)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';

withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    type?: string;
  }>(),
  {
    modelValue: '',
    placeholder: '',
    type: 'text',
  },
);

defineEmits<{
  'update:modelValue': [value: string];
}>();

const inputElement = ref<HTMLInputElement | null>(null);

defineExpose({
  focus() {
    inputElement.value?.focus();
  },
});
</script>
