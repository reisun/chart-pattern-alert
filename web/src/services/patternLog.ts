import type { PatternKind, PatternStatus } from "../patterns/types";

export type PatternOutcome = "tracking" | "success" | "fail" | "expired";

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
  // Phase2: evaluation window fields
  outcome: PatternOutcome;
  mfe: number;           // Maximum Favorable Excursion (ATR multiple)
  mae: number;           // Maximum Adverse Excursion (ATR multiple)
  evalWindowBars: number; // evaluation window bar count
  evalStartPrice: number; // tracking start price
  successTarget: number;  // success threshold price
  failTarget: number;     // failure threshold price
  outcomeAt?: number;     // outcome determination time
  barsElapsed: number;    // bars elapsed since tracking start
}

const DB_NAME = "chart-pattern-alert-log";
const STORE_NAME = "patterns";
const DB_VERSION = 2;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("loggedAt", "loggedAt");
        store.createIndex("symbol", "symbol");
        store.createIndex("kind", "kind");
        store.createIndex("outcome", "outcome");
      }

      if (oldVersion >= 1 && oldVersion < 2) {
        const tx = (event.target as IDBOpenDBRequest).transaction!;
        const store = tx.objectStore(STORE_NAME);
        store.createIndex("outcome", "outcome");

        // Migrate existing records with default values
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor) {
            const record = cursor.value as Record<string, unknown>;
            if (record["outcome"] === undefined) {
              record["outcome"] = "expired";
              record["mfe"] = 0;
              record["mae"] = 0;
              record["evalWindowBars"] = 0;
              record["evalStartPrice"] = 0;
              record["successTarget"] = 0;
              record["failTarget"] = 0;
              record["barsElapsed"] = 0;
              cursor.update(record);
            }
            cursor.continue();
          }
        };
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

export async function getTrackingEntries(): Promise<PatternLogEntry[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const idx = tx.objectStore(STORE_NAME).index("outcome");
    const req = idx.getAll("tracking");

    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        db.close();
        resolve(req.result as PatternLogEntry[]);
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

export async function updateLogEntry(entry: PatternLogEntry): Promise<void> {
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
