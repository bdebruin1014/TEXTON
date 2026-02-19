import { create } from "zustand";

interface UiState {
  rightPanelOpen: boolean;
  sidebarCollapsed: boolean;
  activeModule: string;
  commandPaletteOpen: boolean;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveModule: (module: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  rightPanelOpen: false,
  sidebarCollapsed: false,
  activeModule: "dashboard",
  commandPaletteOpen: false,
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setActiveModule: (activeModule) => set({ activeModule }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
}));
