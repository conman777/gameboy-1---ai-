import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ButtonMemoryState {
  successCounts: Record<string, number>;
  recordSuccess: (button: string) => void;
  clearMemory: () => void;
}

export const useButtonMemoryStore = create<ButtonMemoryState>()(
  persist(
    (set) => ({
      successCounts: {},
      recordSuccess: (button) =>
        set((state) => ({
          successCounts: {
            ...state.successCounts,
            [button]: (state.successCounts[button] || 0) + 1,
          },
        })),
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
