import { ApiError, fetchOhlcv } from "./api/client";
import { detectAll, defaultPatternConfig } from "./patterns";
import type { Candle, DetectedPattern } from "./patterns/types";
import { PATTERN_LABELS } from "./patterns/types";
import { notifyPattern, requestPermission, getPermission } from "./services/notifier";
import { logPattern, type PatternLogEntry } from "./services/patternLog";
import { startPolling, type PollingHandle } from "./services/polling";
import { DEFAULT_STATE, addSeen, loadState, saveState, availableIntervals, type AppState, type Interval, type Scale } from "./state/appState";
import { createChartView, type ChartHandle } from "./ui/chart";
import { renderControls } from "./ui/controls";
import { renderTabs } from "./ui/tabs";
import { syntheticWShape } from "./dev/fixtures";

export class App {
  private state: AppState;
  private chart: ChartHandle | null = null;
  private polling: PollingHandle | null = null;

  private notifySuppress = false;

  private rootEl: HTMLElement;
  private tabsEl!: HTMLElement;
  private controlsEl!: HTMLElement;
  private chartEl!: HTMLElement;
  private feedEl!: HTMLElement;
  private statusEl!: HTMLElement;
  private errorEl!: HTMLElement;

  constructor(root: HTMLElement) {
    this.rootEl = root;
    this.state = loadState();
    if (this.state.symbols.length === 0) {
      this.state = { ...this.state, symbols: ["7974"], activeSymbol: "7974" };
      saveState(this.state);
    }
    if (!this.state.activeSymbol && this.state.symbols[0]) {
      this.state = { ...this.state, activeSymbol: this.state.symbols[0] };
      saveState(this.state);
    }
  }

  mount(): void {
    this.rootEl.innerHTML = `
      <header class="header">
        <h1>chart-pattern-alert</h1>
        <div class="status"><span class="status-dot" id="status-dot"></span><span id="status-text">idle</span></div>
      </header>
      <div class="tabs" id="tabs"></div>
      <div class="controls" id="controls"></div>
      <div class="error hidden" id="error"></div>
      <div class="chart-wrap"><div id="chart"></div></div>
      <section class="feed">
        <h2>Recent alerts</h2>
        <div id="feed"></div>
      </section>
    `;
    this.tabsEl = this.rootEl.querySelector<HTMLElement>("#tabs")!;
    this.controlsEl = this.rootEl.querySelector<HTMLElement>("#controls")!;
    this.chartEl = this.rootEl.querySelector<HTMLElement>("#chart")!;
    this.feedEl = this.rootEl.querySelector<HTMLElement>("#feed")!;
    this.statusEl = this.rootEl.querySelector<HTMLElement>("#status-text")!;
    this.errorEl = this.rootEl.querySelector<HTMLElement>("#error")!;

    this.chart = createChartView(this.chartEl);
    this.renderAll();
    this.restartPolling();
  }

  private renderAll(): void {
    renderTabs(this.tabsEl, this.state.symbols, this.state.activeSymbol, {
      onSelect: (s) => this.setActive(s),
      onAdd: (s) => this.addSymbol(s),
      onRemove: (s) => this.removeSymbol(s),
    });
    renderControls(
      this.controlsEl,
      {
        interval: this.state.interval,
        scale: this.state.scale,
        pollingMs: this.state.pollingMs,
        notificationEnabled: this.state.notificationEnabled,
        activeSymbol: this.state.activeSymbol,
        enabledPatterns: this.state.enabledPatterns,
      },
      {
        onIntervalChange: (v: Interval) => {
          this.state = { ...this.state, interval: v };
          saveState(this.state);
          this.restartPolling();
        },
        onScaleChange: (v: Scale) => {
          this.state = { ...this.state, scale: v };
          saveState(this.state);
          this.restartPolling();
        },
        onPollingChange: (ms) => {
          this.state = { ...this.state, pollingMs: ms };
          saveState(this.state);
          this.restartPolling();
        },
        onToggleNotification: () => this.toggleNotification(),
        onRefresh: () => this.polling?.tickNow(),
        onPatternToggle: (kind, enabled) => {
          const ep = enabled
            ? [...this.state.enabledPatterns, kind]
            : this.state.enabledPatterns.filter((k) => k !== kind);
          this.state = { ...this.state, enabledPatterns: ep };
          saveState(this.state);
          this.renderAll();
          this.polling?.tickNow();
        },
      },
    );
  }

  private setActive(symbol: string): void {
    const allowed = availableIntervals(symbol);
    const interval = allowed.includes(this.state.interval) ? this.state.interval : allowed[0];
    this.state = { ...this.state, activeSymbol: symbol, interval };
    saveState(this.state);
    this.renderAll();
    this.polling?.tickNow();
  }

  private addSymbol(symbol: string): void {
    if (this.state.symbols.includes(symbol)) return;
    const next: AppState = {
      ...this.state,
      symbols: [...this.state.symbols, symbol],
      activeSymbol: this.state.activeSymbol ?? symbol,
    };
    this.state = next;
    saveState(this.state);
    this.renderAll();
    this.polling?.tickNow();
  }

  private removeSymbol(symbol: string): void {
    const remaining = this.state.symbols.filter((s) => s !== symbol);
    const active = this.state.activeSymbol === symbol ? (remaining[0] ?? null) : this.state.activeSymbol;
    this.state = { ...this.state, symbols: remaining, activeSymbol: active };
    saveState(this.state);
    this.renderAll();
    this.polling?.tickNow();
  }

  private async toggleNotification(): Promise<void> {
    const perm = getPermission();
    if (perm === "default") {
      const res = await requestPermission();
      const enabled = res === "granted";
      if (enabled) this.notifySuppress = true;
      this.state = { ...this.state, notificationEnabled: enabled };
      saveState(this.state);
    } else if (perm === "granted") {
      const next = !this.state.notificationEnabled;
      if (next) this.notifySuppress = true;
      this.state = { ...this.state, notificationEnabled: next };
      saveState(this.state);
    }
    this.renderAll();
  }

  private restartPolling(): void {
    this.polling?.stop();
    this.polling = startPolling(this.state.pollingMs, () => this.tick());
  }

  private async tick(): Promise<void> {
    const sym = this.state.activeSymbol;
    if (!sym) {
      this.setStatus("idle", "warn");
      this.chart?.setData([]);
      this.chart?.setMarkers([]);
      return;
    }

    this.setStatus("fetching…", "warn");
    try {
      const res = await fetchOhlcv(sym, this.state.interval, this.state.scale);
      const candles: Candle[] = res.candles;
      this.clearError();
      this.chart?.setData(candles);
      const allPatterns = detectAll(candles, defaultPatternConfig);
      const patterns = allPatterns.filter((p) => this.state.enabledPatterns.includes(p.kind));
      this.chart?.setMarkers(patterns);
      this.handlePatterns(sym, patterns);
      this.setStatus(`ok · ${candles.length} bars`, "ok");
    } catch (err) {
      const msg = err instanceof ApiError
        ? `API ${err.status} · ${err.code} · ${err.message}`
        : (err instanceof Error ? err.message : String(err));
      const candles = syntheticWShape();
      this.chart?.setData(candles);
      const patterns = detectAll(candles, defaultPatternConfig);
      this.chart?.setMarkers(patterns);
      this.showError(`${msg} (showing synthetic data)`);
      this.setStatus("API error (fallback)", "err");
    }
  }

  private handlePatterns(symbol: string, patterns: DetectedPattern[]): void {
    const newOnes = patterns.filter((p) => !this.state.seenPatternIds.includes(p.id));
    this.renderFeed(patterns);

    for (const p of newOnes) {
      const entry: PatternLogEntry = {
        id: `${symbol}:${p.id}`,
        symbol,
        timeframe: this.state.interval,
        kind: p.kind,
        direction: p.direction,
        status: p.status,
        confidence: p.confidence,
        detectedAt: p.detectedAt,
        confirmedAt: p.confirmedAt,
        entryPrice: p.entryPrice,
        atrAtDetection: p.atrAtDetection,
        loggedAt: Date.now(),
      };
      logPattern(entry);
    }

    const suppress = this.notifySuppress;
    this.notifySuppress = false;
    if (newOnes.length === 0) return;

    if (this.state.notificationEnabled && getPermission() === "granted" && !suppress) {
      for (const p of newOnes) {
        if (p.status === "confirmed") {
          notifyPattern(symbol, p);
        }
      }
    }

    this.state = { ...this.state, seenPatternIds: addSeen(this.state, newOnes.map((p) => p.id)) };
    saveState(this.state);
  }

  private renderFeed(patterns: DetectedPattern[]): void {
    const sorted = [...patterns].sort((a, b) => b.markerTime - a.markerTime).slice(0, 20);
    this.feedEl.innerHTML = sorted.length === 0
      ? `<div class="muted">No patterns detected in current window.</div>`
      : sorted.map((p) => {
          const t = new Date(p.markerTime * 1000).toLocaleString();
          const dirClass = p.direction === "bullish" ? "bull" : "bear";
          const arrow = p.direction === "bullish" ? "▲" : "▼";
          const kind = PATTERN_LABELS[p.kind];
          const neck = p.neckline ? ` · neckline ${p.neckline.toFixed(2)}` : "";
          const statusBadge = p.status === "confirmed" ? "✓" : "?";
          return `<div class="feed-item"><span class="time">${t}</span><span class="${dirClass}">${arrow} ${kind} ${statusBadge}</span>${neck} <span class="muted">conf ${p.confidence.toFixed(2)} · ${p.note ?? ""}</span></div>`;
        }).join("");
  }

  private setStatus(text: string, level: "ok" | "warn" | "err"): void {
    this.statusEl.textContent = text;
    const dot = this.rootEl.querySelector<HTMLElement>("#status-dot")!;
    dot.className = `status-dot ${level}`;
  }

  private showError(message: string): void {
    this.errorEl.textContent = message;
    this.errorEl.classList.remove("hidden");
  }

  private clearError(): void {
    this.errorEl.textContent = "";
    this.errorEl.classList.add("hidden");
  }

  static defaultState(): AppState { return { ...DEFAULT_STATE }; }
}
