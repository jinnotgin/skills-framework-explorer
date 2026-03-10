import { onMounted } from 'vue';

import { useDatasetStore } from '../stores/dataset';
import { useUiStore } from '../stores/ui';

export function useDatasetLoader() {
  const datasetStore = useDatasetStore();
  const uiStore = useUiStore();

  onMounted(async () => {
    const dataset = await datasetStore.preload();
    uiStore.setFileSectionExpanded(!dataset);
  });

  return {
    datasetStore,
  };
}
