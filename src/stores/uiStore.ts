import { create } from "zustand";

interface RecordTab {
  id: string;
  label: string;
  path: string;
  module: string;
}

interface UiState {
  rightPanelOpen: boolean;
  sidebarCollapsed: boolean;
  sidebarOpen: boolean;
  activeModule: string;
  commandPaletteOpen: boolean;
  recordTabs: RecordTab[];
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveModule: (module: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  openRecordTab: (tab: RecordTab) => void;
  closeRecordTab: (id: string) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  rightPanelOpen: false,
  sidebarCollapsed: false,
  sidebarOpen: false,
  activeModule: "dashboard",
  commandPaletteOpen: false,
  recordTabs: [],
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setActiveModule: (activeModule) => set({ activeModule }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  openRecordTab: (tab) =>
    set((s) => {
      if (s.recordTabs.some((t) => t.id === tab.id)) return s;
      return { recordTabs: [...s.recordTabs, tab] };
    }),
  closeRecordTab: (id) => set((s) => ({ recordTabs: s.recordTabs.filter((t) => t.id !== id) })),
}));
