import { create } from 'zustand';
import { addAction as dbAddAction, getActionsForRom, clearActionsForRom, type ActionRecord } from '../storage/actionMemoryDB';

interface ActionMemoryState {
  actions: ActionRecord[];
  loadActions: (romId: string) => Promise<void>;
  addAction: (record: ActionRecord) => Promise<void>;
  clearActions: (romId: string) => Promise<void>;
}

export const useActionMemoryStore = create<ActionMemoryState>((set, _get) => ({
  actions: [],
  loadActions: async (romId: string) => {
    const records = await getActionsForRom(romId);
    set({ actions: records });
  },
  addAction: async (record: ActionRecord) => {
    await dbAddAction(record);
    // If the record belongs to the currently viewed ROM, append to state
    set(state => ({ actions: [...state.actions, record] }));
  },
  clearActions: async (romId: string) => {
    await clearActionsForRom(romId);
    set({ actions: [] });
  }
})); 