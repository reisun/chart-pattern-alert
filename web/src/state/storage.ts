const PREFIX = "cpa:";
const SCHEMA_VERSION = 1;

function key(k: string): string {
  return `${PREFIX}${k}`;
}

export function getRaw(k: string): string | null {
  try {
    return localStorage.getItem(key(k));
  } catch {
    return null;
  }
}

export function setRaw(k: string, v: string | null): void {
  try {
    if (v === null) localStorage.removeItem(key(k));
    else localStorage.setItem(key(k), v);
  } catch {
    // storage full or disabled; swallow
  }
}

export function getJson<T>(k: string, fallback: T): T {
  const raw = getRaw(k);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJson<T>(k: string, v: T): void {
  setRaw(k, JSON.stringify(v));
}

export function ensureSchema(): void {
  const current = getJson<number | null>("schema", null);
  if (current !== SCHEMA_VERSION) {
    setJson("schema", SCHEMA_VERSION);
  }
}

export const StorageKeys = {
  symbols: "symbols",
  activeSymbol: "activeSymbol",
  defaultsInterval: "defaults.interval",
  defaultsScale: "defaults.scale",
  defaultsPollingMs: "defaults.pollingMs",
  notificationEnabled: "notificationEnabled",
  apiBaseUrl: "apiBaseUrl",
  seenPatternIds: "seenPatternIds",
  enabledPatterns: "enabledPatterns",
  schema: "schema",
} as const;
