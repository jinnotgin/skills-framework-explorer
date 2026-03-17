<template>
  <UiTooltip :text="tooltipText">
    <div class="inline-flex">
      <UiButton
        :disabled="disabled"
        :size="size"
        :variant="variant"
        :aria-label="tooltipText"
        @click="handleClick"
      >
        <Transition name="copy-icon" mode="out-in">
          <Check
            v-if="copyState === 'done'"
            key="done"
            class="h-4 w-4 text-[var(--success)]"
          />
          <Clipboard
            v-else
            key="idle"
            class="h-4 w-4"
          />
        </Transition>
      </UiButton>
    </div>
  </UiTooltip>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { Check, Clipboard } from 'lucide-vue-next';

import UiButton from './UiButton.vue';
import UiTooltip from './UiTooltip.vue';

const props = withDefaults(
  defineProps<{
    text: string;
    disabled?: boolean;
    tooltip?: string;
    successTooltip?: string;
    errorTooltip?: string;
    resetDelay?: number;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
  }>(),
  {
    disabled: false,
    tooltip: 'Copy',
    successTooltip: 'Copied',
    errorTooltip: 'Copy failed',
    resetDelay: 1800,
    variant: 'secondary',
    size: 'md',
  },
);

const emit = defineEmits<{
  copied: [text: string];
  error: [error: unknown];
}>();

const copyState = ref<'idle' | 'done' | 'error'>('idle');
let resetTimer: number | undefined;

const tooltipText = computed(() => {
  if (copyState.value === 'done') {
    return props.successTooltip;
  }
  if (copyState.value === 'error') {
    return props.errorTooltip;
  }
  return props.tooltip;
});

onBeforeUnmount(() => {
  window.clearTimeout(resetTimer);
});

async function handleClick() {
  if (props.disabled || !props.text) {
    return;
  }

  window.clearTimeout(resetTimer);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(props.text);
    } else {
      fallbackCopy(props.text);
    }
    copyState.value = 'done';
    emit('copied', props.text);
  } catch (error) {
    try {
      fallbackCopy(props.text);
      copyState.value = 'done';
      emit('copied', props.text);
    } catch {
      copyState.value = 'error';
      emit('error', error);
    }
  }

  resetTimer = window.setTimeout(() => {
    copyState.value = 'idle';
  }, props.resetDelay);
}

function fallbackCopy(text: string) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}
</script>

<style scoped>
.copy-icon-enter-active,
.copy-icon-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
}

.copy-icon-enter-from,
.copy-icon-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
