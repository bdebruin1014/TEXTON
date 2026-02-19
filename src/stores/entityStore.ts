import { create } from "zustand";
import { persist } from "zustand/middleware";

interface EntityState {
  activeEntityId: string | null;
  setActiveEntity: (id: string) => void;
  clearActiveEntity: () => void;
}

export const useEntityStore = create<EntityState>()(
  persist(
    (set) => ({
      activeEntityId: null,
      setActiveEntity: (id) => set({ activeEntityId: id }),
      clearActiveEntity: () => set({ activeEntityId: null }),
    }),
    { name: "tekton-entity" },
  ),
);
