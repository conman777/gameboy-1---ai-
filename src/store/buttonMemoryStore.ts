import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ButtonStats {
  attempts: number;
  successes: number;
}

interface ButtonMemoryState {
  stats: Record<string, ButtonStats>;
  recordResult: (button: string, success: boolean) => void;
}

export const useButtonMemoryStore = create<ButtonMemoryState>()(
  persist(
    (set) => ({
      stats: {},
      recordResult: (button, success) =>
        set((state) => {
          const current = state.stats[button] || { attempts: 0, successes: 0 };
          return {
            stats: {
              ...state.stats,
              [button]: {
                attempts: current.attempts + 1,
                successes: current.successes + (success ? 1 : 0),
              },
            },
          };
        }),
    }),
    { name: 'button-memory-store' }
  )
);

export const summarizeButtonStats = (): string => {
  const { stats } = useButtonMemoryStore.getState();
  const entries = Object.entries(stats);
  if (entries.length === 0) return 'No data yet';
  return entries
    .map(
      ([btn, { successes, attempts }]) => `${btn}: ${successes}/${attempts}`
    )
    .join(', ');
};
