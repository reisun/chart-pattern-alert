import { INTERVALS, POLLING_OPTIONS, SCALES, type Interval, type Scale } from "../state/appState";
import { getPermission, type NotifPermission } from "../services/notifier";

export interface ControlsHandlers {
  onIntervalChange: (v: Interval) => void;
  onScaleChange: (v: Scale) => void;
  onPollingChange: (ms: number) => void;
  onToggleNotification: () => void;
  onRefresh: () => void;
}

export interface ControlsState {
  interval: Interval;
  scale: Scale;
  pollingMs: number;
  notificationEnabled: boolean;
}

export function renderControls(
  container: HTMLElement,
  state: ControlsState,
  handlers: ControlsHandlers,
): void {
  container.innerHTML = "";

  container.appendChild(makeSelect(
    "Interval",
    INTERVALS.map((v) => ({ label: v, value: v })),
    state.interval,
    (v) => handlers.onIntervalChange(v as Interval),
  ));

  container.appendChild(makeSelect(
    "Scale",
    SCALES.map((v) => ({ label: v, value: v })),
    state.scale,
    (v) => handlers.onScaleChange(v as Scale),
  ));

  container.appendChild(makeSelect(
    "Poll",
    POLLING_OPTIONS.map((p) => ({ label: p.label, value: String(p.ms) })),
    String(state.pollingMs),
    (v) => handlers.onPollingChange(parseInt(v, 10)),
  ));

  const notifLabel = document.createElement("label");
  const notifBtn = document.createElement("button");
  const perm: NotifPermission = getPermission();
  notifBtn.textContent = notifButtonLabel(perm, state.notificationEnabled);
  notifBtn.className = state.notificationEnabled && perm === "granted" ? "primary" : "";
  notifBtn.disabled = perm === "unsupported" || perm === "denied";
  notifBtn.addEventListener("click", handlers.onToggleNotification);
  notifLabel.appendChild(document.createTextNode("Notify"));
  notifLabel.appendChild(notifBtn);
  container.appendChild(notifLabel);

  const refreshBtn = document.createElement("button");
  refreshBtn.textContent = "↻ Refresh";
  refreshBtn.addEventListener("click", handlers.onRefresh);
  container.appendChild(refreshBtn);
}

function makeSelect(
  labelText: string,
  options: { label: string; value: string }[],
  current: string,
  onChange: (v: string) => void,
): HTMLElement {
  const label = document.createElement("label");
  label.textContent = labelText;
  const select = document.createElement("select");
  for (const o of options) {
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.label;
    if (o.value === current) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener("change", () => onChange(select.value));
  label.appendChild(select);
  return label;
}

function notifButtonLabel(perm: NotifPermission, enabled: boolean): string {
  if (perm === "unsupported") return "Unsupported";
  if (perm === "denied") return "Denied";
  if (perm === "default") return "Enable";
  return enabled ? "On" : "Off";
}
