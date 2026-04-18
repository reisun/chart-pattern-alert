import {
  createChart,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  type SeriesMarker,
} from "lightweight-charts";
import type { Candle, DetectedPattern } from "../patterns/types";
import { PATTERN_SHORT_LABELS } from "../patterns/types";

export interface ChartHandle {
  setData(candles: Candle[]): void;
  setMarkers(patterns: DetectedPattern[]): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export function createChartView(container: HTMLElement): ChartHandle {
  const chart: IChartApi = createChart(container, {
    layout: {
      background: { color: "transparent" },
      textColor: "#c7c9d1",
    },
    grid: {
      vertLines: { color: "#1d212c" },
      horzLines: { color: "#1d212c" },
    },
    crosshair: { mode: CrosshairMode.Normal },
    rightPriceScale: { borderColor: "#2a2e3a" },
    timeScale: { borderColor: "#2a2e3a", timeVisible: true, secondsVisible: false },
    autoSize: true,
  });

  const series: ISeriesApi<"Candlestick"> = chart.addCandlestickSeries({
    upColor: "#26a69a",
    downColor: "#ef5350",
    borderVisible: false,
    wickUpColor: "#26a69a",
    wickDownColor: "#ef5350",
  });

  return {
    setData(candles: Candle[]) {
      const data: CandlestickData[] = candles.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      series.setData(data);
    },
    setMarkers(patterns: DetectedPattern[]) {
      const markers: SeriesMarker<Time>[] = patterns.map((p) => ({
        time: p.markerTime as Time,
        position: p.direction === "bullish" ? "belowBar" : "aboveBar",
        color: p.direction === "bullish" ? "#26a69a" : "#ef5350",
        shape: p.direction === "bullish" ? "arrowUp" : "arrowDown",
        text: PATTERN_SHORT_LABELS[p.kind],
      }));
      markers.sort((a, b) => (a.time as number) - (b.time as number));
      series.setMarkers(markers);
    },
    resize(width: number, height: number) {
      chart.resize(width, height);
    },
    dispose() {
      chart.remove();
    },
  };
}
