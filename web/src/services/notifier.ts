import type { DetectedPattern } from "../patterns/types";

export type NotifPermission = "default" | "granted" | "denied" | "unsupported";

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
  opts?: { iconUrl?: string },
): boolean {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission !== "granted") return false;

  const title = `[${symbol}] ${prettyKind(pattern.kind)}`;
  const dir = pattern.direction === "bullish" ? "↑ buy" : "↓ sell";
  const when = new Date(pattern.markerTime * 1000).toLocaleTimeString();
  const body = `${dir} — ${when}${pattern.neckline ? ` / neckline ~${pattern.neckline.toFixed(2)}` : ""}`;
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
  switch (kind) {
    case "double_bottom": return "Double Bottom";
    case "double_top": return "Double Top";
    default: return kind;
  }
}

function bucket5m(t: number): number {
  return Math.floor(t / 300);
}
