import { StorageKeys, ensureSchema, getJson, setJson } from "./storage";
import type { PatternKind } from "../patterns/types";
import { ALL_PATTERN_KINDS } from "../patterns/types";

export interface AppState {
  symbols: string[];
  activeSymbol: string | null;
  interval: Interval;
  scale: Scale;
  pollingMs: number;
  notificationEnabled: boolean;
  seenPatternIds: string[];
  enabledPatterns: PatternKind[];
  unreadCounts: Record<string, number>;
}

export type Interval = "5m" | "15m" | "1h" | "1d";
export type Scale = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y";
export const INTERVALS: Interval[] = ["5m", "15m", "1h", "1d"];
export const JP_ONLY_INTERVALS: Interval[] = ["1d"];

export function isJapaneseStock(symbol: string | null): boolean {
  if (!symbol) return false;
  const code = symbol.replace(/\.T$/i, "");
  return /^\d{4,5}$/.test(code);
}

export function availableIntervals(symbol: string | null): Interval[] {
  return isJapaneseStock(symbol) ? JP_ONLY_INTERVALS : INTERVALS;
}
export const SCALES: Scale[] = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y"];
export const POLLING_OPTIONS: { label: string; ms: number }[] = [
  { label: "1min", ms: 60_000 },
  { label: "5min", ms: 300_000 },
  { label: "15min", ms: 900_000 },
  { label: "30min", ms: 1_800_000 },
  { label: "1h", ms: 3_600_000 },
];

export const DEFAULT_STATE: AppState = {
  symbols: [],
  activeSymbol: null,
  interval: "5m",
  scale: "5d",
  pollingMs: 300_000,
  notificationEnabled: false,
  seenPatternIds: [],
  enabledPatterns: [...ALL_PATTERN_KINDS],
  unreadCounts: {},
};

const MAX_SEEN = 500;

export function loadState(): AppState {
  ensureSchema();
  return {
    symbols: getJson<string[]>(StorageKeys.symbols, DEFAULT_STATE.symbols),
    activeSymbol: getJson<string | null>(StorageKeys.activeSymbol, DEFAULT_STATE.activeSymbol),
    interval: getJson<Interval>(StorageKeys.defaultsInterval, DEFAULT_STATE.interval),
    scale: getJson<Scale>(StorageKeys.defaultsScale, DEFAULT_STATE.scale),
    pollingMs: getJson<number>(StorageKeys.defaultsPollingMs, DEFAULT_STATE.pollingMs),
    notificationEnabled: getJson<boolean>(StorageKeys.notificationEnabled, DEFAULT_STATE.notificationEnabled),
    seenPatternIds: getJson<string[]>(StorageKeys.seenPatternIds, DEFAULT_STATE.seenPatternIds),
    enabledPatterns: getJson<PatternKind[]>(StorageKeys.enabledPatterns, DEFAULT_STATE.enabledPatterns),
    unreadCounts: getJson<Record<string, number>>(StorageKeys.unreadCounts, DEFAULT_STATE.unreadCounts),
  };
}

export function saveState(state: AppState): void {
  setJson(StorageKeys.symbols, state.symbols);
  setJson(StorageKeys.activeSymbol, state.activeSymbol);
  setJson(StorageKeys.defaultsInterval, state.interval);
  setJson(StorageKeys.defaultsScale, state.scale);
  setJson(StorageKeys.defaultsPollingMs, state.pollingMs);
  setJson(StorageKeys.notificationEnabled, state.notificationEnabled);
  setJson(StorageKeys.seenPatternIds, state.seenPatternIds.slice(-MAX_SEEN));
  setJson(StorageKeys.enabledPatterns, state.enabledPatterns);
  setJson(StorageKeys.unreadCounts, state.unreadCounts);
}

export function addSeen(state: AppState, ids: string[]): string[] {
  const merged = [...state.seenPatternIds];
  for (const id of ids) if (!merged.includes(id)) merged.push(id);
  return merged.slice(-MAX_SEEN);
}
