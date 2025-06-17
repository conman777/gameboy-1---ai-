import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useRomMemoryStore } from './romMemoryStore';

export interface ButtonMemoryState {
  successCounts: Record<string, number>;
  recordSuccess: (button: string) => void;
  loadFromRomMemory: (successCounts: Record<string, number>) => void;
  clearMemory: () => void;
}

export const useButtonMemoryStore = create<ButtonMemoryState>()(
  persist(
    (set, get) => ({
      successCounts: {},
      recordSuccess: (button) => {
        set((state) => ({
          successCounts: {
            ...state.successCounts,
            [button]: (state.successCounts[button] || 0) + 1,
          },
        }));
        
        // Sync with ROM memory
        const newCounts = get().successCounts;
        useRomMemoryStore.getState().updateSuccessCounts(newCounts);
      },
      loadFromRomMemory: (successCounts) => {
        set({ successCounts });
      },
      clearMemory: () => set({ successCounts: {} }),
    }),
    { name: 'gameboy-button-memory' }
  )
);

export const summarizeButtonStats = (): string => {
  const { successCounts } = useButtonMemoryStore.getState();
  const entries = Object.entries(successCounts);
  if (entries.length === 0) return 'No data yet';
  return entries.map(([btn, count]) => `${btn}: ${count}`).join(', ');
};
