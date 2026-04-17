import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPermission, notifyPattern, requestPermission } from "../src/services/notifier";
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

function pattern(id: string, markerTime = 1_700_000_000): DetectedPattern {
  return {
    id,
    kind: "double_bottom",
    direction: "bullish",
    confidence: 0.7,
    startTime: markerTime - 3600,
    endTime: markerTime,
    markerTime,
    neckline: 100,
    note: "test",
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
    expect(notifyPattern("AAPL", pattern("p1"))).toBe(false);
    expect(MockNotification.instances).toHaveLength(0);
  });

  it("notifyPattern creates a Notification when granted (no SW controller)", () => {
    MockNotification.permission = "granted";
    const ok = notifyPattern("AAPL", pattern("p1"));
    expect(ok).toBe(true);
    expect(MockNotification.instances).toHaveLength(1);
    expect(MockNotification.instances[0].title).toContain("AAPL");
    expect(MockNotification.instances[0].options.tag).toMatch(/AAPL:double_bottom:/);
  });

  it("two notifications for the same bucket share the same tag (browser coalesces)", () => {
    MockNotification.permission = "granted";
    notifyPattern("AAPL", pattern("p1", 1_700_000_000));
    notifyPattern("AAPL", pattern("p1", 1_700_000_020)); // within same 5m bucket
    expect(MockNotification.instances).toHaveLength(2);
    expect(MockNotification.instances[0].options.tag).toBe(MockNotification.instances[1].options.tag);
  });
});
