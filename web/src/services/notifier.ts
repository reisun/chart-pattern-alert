import { PATTERN_LABELS } from "../patterns/types";
import type { DetectedPattern, PatternKind } from "../patterns/types";

export type NotifPermission = "default" | "granted" | "denied" | "unsupported";
export type NotificationLevel = "L1" | "L2" | "L3" | "L4";

export function determineNotifLevel(
  pattern: DetectedPattern,
  higherTfAligned: boolean,
): NotificationLevel {
  if (pattern.status !== "confirmed") return "L1";
  if (pattern.confidence >= 0.8 && higherTfAligned) return "L4";
  if (pattern.confidence >= 0.7 && higherTfAligned) return "L3";
  return "L2";
}

export function getPermission(): NotifPermission {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as NotifPermission;
}

export async function requestPermission(): Promise<NotifPermission> {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    const res = await Notification.requestPermission();
    return res as NotifPermission;
  } catch {
    return "denied";
  }
}

export function notifyPattern(
  symbol: string,
  pattern: DetectedPattern,
  level: NotificationLevel = "L3",
  opts?: { iconUrl?: string },
): boolean {
  if (level !== "L3" && level !== "L4") return false;
  if (pattern.status !== "confirmed") return false;
  if (typeof Notification === "undefined") return false;
  if (Notification.permission !== "granted") return false;

  const prefix = level === "L4" ? "⚠ " : "";
  const title = `${prefix}[${symbol}] ${prettyKind(pattern.kind)}`;
  const dir = pattern.direction === "bullish" ? "↑ 買い" : "↓ 売り";
  const when = new Date(pattern.markerTime * 1000).toLocaleTimeString();
  const body = `${dir} — ${when}${pattern.neckline ? ` / ネックライン ~${pattern.neckline.toFixed(2)}` : ""}`;
  const tag = `${symbol}:${pattern.kind}:${bucket5m(pattern.markerTime)}`;

  const sw = typeof navigator !== "undefined" ? navigator.serviceWorker : undefined;
  if (sw && sw.controller) {
    try {
      sw.controller.postMessage({
        type: "notify",
        title,
        body,
        tag,
        icon: opts?.iconUrl,
      });
      return true;
    } catch {
      // fall through to direct Notification
    }
  }
  try {
    new Notification(title, { body, tag, icon: opts?.iconUrl });
    return true;
  } catch {
    return false;
  }
}

function prettyKind(kind: string): string {
  return PATTERN_LABELS[kind as PatternKind] ?? kind;
}

function bucket5m(t: number): number {
  return Math.floor(t / 300);
}
