import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface ActionRecord {
  romId: string;
  timestamp: number; // Unix ms
  button: string;
  beforeImage: string; // base64 PNG (without data: prefix)
  afterImage: string;
  pixelDiff: number;
  success: boolean;
  observation?: string;
  reasoning?: string;
  fullResponse?: string;
}

interface GameBoyActionDB extends DBSchema {
  actions: {
    key: number; // auto increment
    value: ActionRecord;
    indexes: { 'by-romId': string };
  };
}

let dbInstance: IDBPDatabase<GameBoyActionDB> | null = null;

async function getDB(): Promise<IDBPDatabase<GameBoyActionDB>> {
  if (!dbInstance) {
    dbInstance = await openDB<GameBoyActionDB>('gameboy-actions', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('actions')) {
          const store = db.createObjectStore('actions', {
            autoIncrement: true,
          });
          store.createIndex('by-romId', 'romId');
        }
      },
    });
  }
  return dbInstance;
}

export async function addAction(record: ActionRecord): Promise<void> {
  try {
    const db = await getDB();
    await db.add('actions', record);
  } catch (error) {
    console.error('Error adding action record:', error);
  }
}

export async function getActionsForRom(romId: string): Promise<ActionRecord[]> {
  try {
    const db = await getDB();
    const index = db.transaction('actions').store.index('by-romId');
    return await index.getAll(romId);
  } catch (error) {
    console.error('Error fetching actions for ROM:', error);
    return [];
  }
}

export async function clearActionsForRom(romId: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('actions', 'readwrite');
    const index = tx.store.index('by-romId');
    let cursor = await index.openCursor(romId);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  } catch (error) {
    console.error('Error clearing actions for ROM:', error);
  }
} 