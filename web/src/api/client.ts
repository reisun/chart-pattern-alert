import type { Candle } from "../patterns/types";

export interface OhlcvResponse {
  symbol: string;
  interval: string;
  range: string;
  timezone: string | null;
  candles: Candle[];
  fetched_at: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  uptime_seconds: number;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function baseUrl(): string {
  const override = localStorage.getItem("cpa:apiBaseUrl");
  if (override && override.trim()) return override.trim().replace(/\/$/, "");
  const env = (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? "";
  return env.replace(/\/$/, "") || "http://localhost:8000";
}

async function request<T>(path: string): Promise<T> {
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    let code = "http_error";
    let message = res.statusText || `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error?.code) {
        code = body.error.code;
        message = body.error.message ?? message;
      }
    } catch {
      // ignore body parse errors
    }
    throw new ApiError(code, message, res.status);
  }
  return (await res.json()) as T;
}

export function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export function fetchOhlcv(
  symbol: string,
  interval: string,
  range: string,
): Promise<OhlcvResponse> {
  const q = new URLSearchParams({ symbol, interval, range });
  return request<OhlcvResponse>(`/ohlcv?${q.toString()}`);
}
