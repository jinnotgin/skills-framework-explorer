import { onBeforeUnmount, onMounted } from 'vue';

import { useUiStore } from '../stores/ui';

const MOBILE_BREAKPOINT = 1024;

export function useResponsiveLayout() {
  const uiStore = useUiStore();

  const sync = () => {
    uiStore.setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
  };

  onMounted(() => {
    sync();
    window.addEventListener('resize', sync);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', sync);
  });
}
