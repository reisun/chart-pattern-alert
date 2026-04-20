import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPermission, notifyPattern, requestPermission, determineNotifLevel } from "../src/services/notifier";
import type { DetectedPattern } from "../src/patterns/types";

class MockNotification {
  static permission: "default" | "granted" | "denied" = "default";
  static requestPermission = vi.fn(async () => MockNotification.permission);
  title: string;
  options: NotificationOptions;
  constructor(title: string, options: NotificationOptions = {}) {
    this.title = title;
    this.options = options;
    MockNotification.instances.push(this);
  }
  static instances: MockNotification[] = [];
  static reset() {
    MockNotification.permission = "default";
    MockNotification.requestPermission = vi.fn(async () => MockNotification.permission);
    MockNotification.instances = [];
  }
}

function pattern(id: string, markerTime = 1_700_000_000, overrides?: Partial<DetectedPattern>): DetectedPattern {
  return {
    id,
    kind: "double_bottom",
    direction: "bullish",
    confidence: 0.7,
    status: "confirmed",
    startTime: markerTime - 3600,
    endTime: markerTime,
    markerTime,
    neckline: 100,
    note: "test",
    detectedAt: markerTime,
    confirmedAt: markerTime,
    entryPrice: 101,
    atrAtDetection: 2.5,
    ...overrides,
  };
}

describe("notifier", () => {
  beforeEach(() => {
    MockNotification.reset();
    vi.stubGlobal("Notification", MockNotification as unknown as typeof Notification);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getPermission reflects current Notification.permission", () => {
    MockNotification.permission = "granted";
    expect(getPermission()).toBe("granted");
    MockNotification.permission = "denied";
    expect(getPermission()).toBe("denied");
  });

  it("requestPermission delegates to Notification.requestPermission", async () => {
    MockNotification.permission = "granted";
    MockNotification.requestPermission = vi.fn(async () => "granted" as NotificationPermission);
    const res = await requestPermission();
    expect(res).toBe("granted");
    expect(MockNotification.requestPermission).toHaveBeenCalledTimes(1);
  });

  it("notifyPattern returns false when permission is not granted", () => {
    MockNotification.permission = "default";
    expect(notifyPattern("AAPL", pattern("p1"), "L3")).toBe(false);
    expect(MockNotification.instances).toHaveLength(0);
  });

  it("notifyPattern creates a Notification when granted with L3 (no SW controller)", () => {
    MockNotification.permission = "granted";
    const ok = notifyPattern("AAPL", pattern("p1"), "L3");
    expect(ok).toBe(true);
    expect(MockNotification.instances).toHaveLength(1);
    expect(MockNotification.instances[0].title).toContain("AAPL");
    expect(MockNotification.instances[0].title).not.toContain("⚠");
    expect(MockNotification.instances[0].options.tag).toMatch(/AAPL:double_bottom:/);
  });

  it("notifyPattern adds ⚠ prefix for L4", () => {
    MockNotification.permission = "granted";
    const ok = notifyPattern("AAPL", pattern("p1"), "L4");
    expect(ok).toBe(true);
    expect(MockNotification.instances[0].title).toMatch(/^⚠ /);
  });

  it("two notifications for the same bucket share the same tag (browser coalesces)", () => {
    MockNotification.permission = "granted";
    notifyPattern("AAPL", pattern("p1", 1_700_000_000), "L3");
    notifyPattern("AAPL", pattern("p1", 1_700_000_020), "L3");
    expect(MockNotification.instances).toHaveLength(2);
    expect(MockNotification.instances[0].options.tag).toBe(MockNotification.instances[1].options.tag);
  });

  it("notifyPattern returns false for candidate patterns", () => {
    MockNotification.permission = "granted";
    const p = pattern("p1", undefined, { status: "candidate" });
    expect(notifyPattern("AAPL", p, "L3")).toBe(false);
    expect(MockNotification.instances).toHaveLength(0);
  });

  it("notifyPattern returns false for L1 and L2 levels", () => {
    MockNotification.permission = "granted";
    expect(notifyPattern("AAPL", pattern("p1"), "L1")).toBe(false);
    expect(notifyPattern("AAPL", pattern("p2"), "L2")).toBe(false);
    expect(MockNotification.instances).toHaveLength(0);
  });
});

describe("determineNotifLevel", () => {
  it("returns L1 for candidate patterns", () => {
    const p = pattern("p1", undefined, { status: "candidate", confidence: 0.9 });
    expect(determineNotifLevel(p, true)).toBe("L1");
  });

  it("returns L2 for confirmed, low confidence, not aligned", () => {
    const p = pattern("p1", undefined, { confidence: 0.5 });
    expect(determineNotifLevel(p, false)).toBe("L2");
  });

  it("returns L2 for confirmed, high confidence, not aligned", () => {
    const p = pattern("p1", undefined, { confidence: 0.8 });
    expect(determineNotifLevel(p, false)).toBe("L2");
  });

  it("returns L3 for confirmed, confidence 0.7, aligned", () => {
    const p = pattern("p1", undefined, { confidence: 0.7 });
    expect(determineNotifLevel(p, true)).toBe("L3");
  });

  it("returns L4 for confirmed, confidence 0.8, aligned", () => {
    const p = pattern("p1", undefined, { confidence: 0.8 });
    expect(determineNotifLevel(p, true)).toBe("L4");
  });

  it("returns L3 for confirmed, confidence 0.75, aligned (between L3 and L4)", () => {
    const p = pattern("p1", undefined, { confidence: 0.75 });
    expect(determineNotifLevel(p, true)).toBe("L3");
  });

  it("returns L2 for confirmed, confidence 0.65, aligned (below L3 threshold)", () => {
    const p = pattern("p1", undefined, { confidence: 0.65 });
    expect(determineNotifLevel(p, true)).toBe("L2");
  });
});
