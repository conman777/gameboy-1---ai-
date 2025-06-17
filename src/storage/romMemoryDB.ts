import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface RomMemory {
  successCounts: Record<string, number>;
  strategyNotes?: string;
  lastPlayed?: number;
}

interface GameBoyMemoryDB extends DBSchema {
  roms: {
    key: string; // romId (SHA-256 hash)
    value: RomMemory;
  };
}

let dbInstance: IDBPDatabase<GameBoyMemoryDB> | null = null;

async function getDB(): Promise<IDBPDatabase<GameBoyMemoryDB>> {
  if (!dbInstance) {
    dbInstance = await openDB<GameBoyMemoryDB>('gameboy-memory', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('roms')) {
          db.createObjectStore('roms');
        }
      },
    });
  }
  return dbInstance;
}

export async function getMemory(romId: string): Promise<RomMemory | null> {
  try {
    const db = await getDB();
    return (await db.get('roms', romId)) || null;
  } catch (error) {
    console.error('Error getting ROM memory:', error);
    return null;
  }
}

export async function setMemory(romId: string, memory: RomMemory): Promise<void> {
  try {
    const db = await getDB();
    await db.put('roms', { ...memory, lastPlayed: Date.now() }, romId);
  } catch (error) {
    console.error('Error setting ROM memory:', error);
  }
}

export async function deleteMemory(romId: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('roms', romId);
  } catch (error) {
    console.error('Error deleting ROM memory:', error);
  }
}

export async function getAllRomIds(): Promise<string[]> {
  try {
    const db = await getDB();
    return await db.getAllKeys('roms');
  } catch (error) {
    console.error('Error getting all ROM IDs:', error);
    return [];
  }
} 