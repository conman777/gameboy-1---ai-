import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SaveState {
  id: string;
  name: string;
  romId: string;
  timestamp: Date;
  data: Uint8Array;
  screenshot?: string; // base64 encoded screenshot
}

export interface SaveStateStore {
  saveStates: SaveState[];
  addSaveState: (romId: string, name: string, data: Uint8Array, screenshot?: string) => void;
  loadSaveState: (id: string) => SaveState | null;
  deleteSaveState: (id: string) => void;
  getSaveStatesForRom: (romId: string) => SaveState[];
  renameSaveState: (id: string, newName: string) => void;
  clearAllSaveStates: () => void;
}

// Helper function to serialize/deserialize Uint8Array for persistence
const serializeSaveStates = (saveStates: SaveState[]) => {
  return saveStates.map(state => ({
    ...state,
    data: Array.from(state.data), // Convert Uint8Array to regular array
    timestamp: state.timestamp.toISOString() // Convert Date to string
  }));
};

const deserializeSaveStates = (serializedStates: any[]): SaveState[] => {
  return serializedStates.map(state => ({
    ...state,
    data: new Uint8Array(state.data), // Convert array back to Uint8Array
    timestamp: new Date(state.timestamp) // Convert string back to Date
  }));
};

export const useSaveStateStore = create<SaveStateStore>()(
  persist(
    (set, get) => ({
      saveStates: [],
      
      addSaveState: (romId: string, name: string, data: Uint8Array, screenshot?: string) => {
        const newSaveState: SaveState = {
          id: `${romId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name,
          romId,
          timestamp: new Date(),
          data,
          screenshot
        };
        
        set(state => ({
          saveStates: [...state.saveStates, newSaveState]
        }));
      },
      
      loadSaveState: (id: string) => {
        const state = get().saveStates.find(s => s.id === id);
        return state || null;
      },
      
      deleteSaveState: (id: string) => {
        set(state => ({
          saveStates: state.saveStates.filter(s => s.id !== id)
        }));
      },
      
      getSaveStatesForRom: (romId: string) => {
        return get().saveStates
          .filter(state => state.romId === romId)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Newest first
      },
      
      renameSaveState: (id: string, newName: string) => {
        set(state => ({
          saveStates: state.saveStates.map(s => 
            s.id === id ? { ...s, name: newName } : s
          )
        }));
      },
      
      clearAllSaveStates: () => {
        set({ saveStates: [] });
      }
    }),
    {
      name: 'gameboy-ai-save-states',
      storage: {
        getItem: (name) => {
          const item = localStorage.getItem(name);
          if (!item) return null;
          
          try {
            const parsed = JSON.parse(item);
            return {
              ...parsed,
              state: {
                ...parsed.state,
                saveStates: deserializeSaveStates(parsed.state.saveStates || [])
              }
            };
          } catch (error) {
            console.error('Failed to deserialize save states:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            const serialized = {
              ...value,
              state: {
                ...value.state,
                saveStates: serializeSaveStates(value.state.saveStates || [])
              }
            };
            localStorage.setItem(name, JSON.stringify(serialized));
          } catch (error) {
            console.error('Failed to serialize save states:', error);
          }
        },
        removeItem: (name) => localStorage.removeItem(name)
      }
    }
  )
);