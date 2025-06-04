import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ButtonMemoryState {
  successCounts: Record<string, number>;
}

type ButtonMemoryStore = ButtonMemoryState & {
  recordSuccess: (button: string) => void;
  clearMemory: () => void;
};

export const useButtonMemoryStore = create<ButtonMemoryStore>()(
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
