import { defineStore } from 'pinia';

interface UiState {
  isMobile: boolean;
  sidebarOpen: boolean;
  dataModalOpen: boolean;
  detailOverlayOpen: boolean;
  fileSectionExpanded: boolean;
  dragActive: boolean;
}

export const useUiStore = defineStore('ui', {
  state: (): UiState => ({
    isMobile: false,
    sidebarOpen: false,
    dataModalOpen: false,
    detailOverlayOpen: false,
    fileSectionExpanded: false,
    dragActive: false,
  }),
  actions: {
    setIsMobile(value: boolean) {
      this.isMobile = value;
      if (!value) {
        this.sidebarOpen = false;
        this.detailOverlayOpen = false;
      }
    },
    setSidebarOpen(value: boolean) {
      this.sidebarOpen = value;
    },
    setDataModalOpen(value: boolean) {
      this.dataModalOpen = value;
    },
    setDetailOverlayOpen(value: boolean) {
      this.detailOverlayOpen = value;
    },
    setFileSectionExpanded(value: boolean) {
      this.fileSectionExpanded = value;
    },
    setDragActive(value: boolean) {
      this.dragActive = value;
    },
  },
});
