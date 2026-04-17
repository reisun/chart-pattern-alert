import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_STATE, addSeen, loadState, saveState } from "../src/state/appState";

describe("appState persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults on empty storage", () => {
    const state = loadState();
    expect(state.symbols).toEqual(DEFAULT_STATE.symbols);
    expect(state.interval).toBe(DEFAULT_STATE.interval);
    expect(state.pollingMs).toBe(DEFAULT_STATE.pollingMs);
  });

  it("round-trips through saveState/loadState", () => {
    saveState({
      ...DEFAULT_STATE,
      symbols: ["AAPL", "7203.T"],
      activeSymbol: "7203.T",
      interval: "1h",
      scale: "1mo",
      pollingMs: 900_000,
      notificationEnabled: true,
      seenPatternIds: ["a", "b", "c"],
    });
    const loaded = loadState();
    expect(loaded.symbols).toEqual(["AAPL", "7203.T"]);
    expect(loaded.activeSymbol).toBe("7203.T");
    expect(loaded.interval).toBe("1h");
    expect(loaded.scale).toBe("1mo");
    expect(loaded.pollingMs).toBe(900_000);
    expect(loaded.notificationEnabled).toBe(true);
    expect(loaded.seenPatternIds).toEqual(["a", "b", "c"]);
  });

  it("trims seenPatternIds to 500 entries", () => {
    const ids: string[] = [];
    for (let i = 0; i < 700; i++) ids.push(`id-${i}`);
    saveState({ ...DEFAULT_STATE, seenPatternIds: ids });
    const loaded = loadState();
    expect(loaded.seenPatternIds.length).toBe(500);
    // the most recent ones are kept
    expect(loaded.seenPatternIds[loaded.seenPatternIds.length - 1]).toBe("id-699");
  });

  it("addSeen appends without duplicates and preserves order", () => {
    const base = { ...DEFAULT_STATE, seenPatternIds: ["a", "b"] };
    const next = addSeen(base, ["b", "c", "d"]);
    expect(next).toEqual(["a", "b", "c", "d"]);
  });

  it("ignores malformed JSON and falls back to defaults", () => {
    localStorage.setItem("cpa:symbols", "not-json");
    const loaded = loadState();
    expect(loaded.symbols).toEqual([]);
  });
});
