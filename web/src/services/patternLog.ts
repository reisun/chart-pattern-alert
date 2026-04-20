import type { PatternKind, PatternStatus } from "../patterns/types";

export interface PatternLogEntry {
  id: string;
  symbol: string;
  timeframe: string;
  kind: PatternKind;
  direction: "bullish" | "bearish";
  status: PatternStatus;
  confidence: number;
  detectedAt: number;
  confirmedAt?: number;
  entryPrice?: number;
  atrAtDetection: number;
  loggedAt: number;
}

const DB_NAME = "chart-pattern-alert-log";
const STORE_NAME = "patterns";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("loggedAt", "loggedAt");
        store.createIndex("symbol", "symbol");
        store.createIndex("kind", "kind");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function logPattern(entry: PatternLogEntry): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB unavailable — silently ignore
  }
}

export async function getRecentLogs(limit = 100): Promise<PatternLogEntry[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const idx = tx.objectStore(STORE_NAME).index("loggedAt");
    const req = idx.openCursor(null, "prev");
    const results: PatternLogEntry[] = [];

    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value as PatternLogEntry);
          cursor.continue();
        } else {
          db.close();
          resolve(results);
        }
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return [];
  }
}
