import { create } from 'zustand';
import { getMemory, setMemory, deleteMemory, RomMemory } from '../storage/romMemoryDB';

interface RomMemoryState {
  currentRomId: string | null;
  currentMemory: RomMemory | null;
  isLoading: boolean;
  
  // Actions
  loadRomMemory: (romId: string) => Promise<void>;
  saveRomMemory: (romId: string, memory: RomMemory) => Promise<void>;
  updateSuccessCounts: (successCounts: Record<string, number>) => Promise<void>;
  updateStrategyNotes: (notes: string) => Promise<void>;
  clearRomMemory: (romId: string) => Promise<void>;
  reset: () => void;
}

export const useRomMemoryStore = create<RomMemoryState>((set, get) => ({
  currentRomId: null,
  currentMemory: null,
  isLoading: false,

  loadRomMemory: async (romId: string) => {
    set({ isLoading: true });
    try {
      const memory = await getMemory(romId);
      set({ 
        currentRomId: romId, 
        currentMemory: memory || { successCounts: {} },
        isLoading: false 
      });
    } catch (error) {
      console.error('Error loading ROM memory:', error);
      set({ 
        currentRomId: romId, 
        currentMemory: { successCounts: {} },
        isLoading: false 
      });
    }
  },

  saveRomMemory: async (romId: string, memory: RomMemory) => {
    try {
      await setMemory(romId, memory);
      if (get().currentRomId === romId) {
        set({ currentMemory: memory });
      }
    } catch (error) {
      console.error('Error saving ROM memory:', error);
    }
  },

  updateSuccessCounts: async (successCounts: Record<string, number>) => {
    const { currentRomId, currentMemory } = get();
    if (!currentRomId || !currentMemory) return;

    const updatedMemory = { ...currentMemory, successCounts };
    await get().saveRomMemory(currentRomId, updatedMemory);
  },

  updateStrategyNotes: async (notes: string) => {
    const { currentRomId, currentMemory } = get();
    if (!currentRomId || !currentMemory) return;

    const updatedMemory = { ...currentMemory, strategyNotes: notes };
    await get().saveRomMemory(currentRomId, updatedMemory);
  },

  clearRomMemory: async (romId: string) => {
    try {
      await deleteMemory(romId);
      if (get().currentRomId === romId) {
        set({ currentMemory: { successCounts: {} } });
      }
    } catch (error) {
      console.error('Error clearing ROM memory:', error);
    }
  },

  reset: () => {
    set({ currentRomId: null, currentMemory: null, isLoading: false });
  },
})); 