import { afterEach, describe, expect, it, vi } from "vitest";

async function load() {
  vi.resetModules();
  return import("../src/runtime-config");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("runtime API configuration", () => {
  it("loads a fresh Pages config before providing the API base", async () => {
    vi.stubEnv("DEV", false);
    const fetchConfig = vi.fn().mockResolvedValue(new Response(JSON.stringify({ apiBaseUrl: "https://example.trycloudflare.com/" })));
    vi.stubGlobal("fetch", fetchConfig);
    const config = await load();
    expect(() => config.getApiBaseUrl()).toThrow();
    await config.loadRuntimeConfig();
    expect(fetchConfig).toHaveBeenCalledWith("/chart-pattern-alert/config.json", { cache: "no-store" });
    expect(config.getApiBaseUrl()).toBe("https://example.trycloudflare.com");
  });

  it.each(["", "http://localhost:8000", "https://example.trycloudflare.com/?old=1"])("rejects invalid production API base %s", async (apiBaseUrl) => {
    vi.stubEnv("DEV", false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ apiBaseUrl }))));
    const config = await load();
    await expect(config.loadRuntimeConfig()).rejects.toThrow();
    expect(() => config.getApiBaseUrl()).toThrow();
  });

  it("does not fall back when Pages config is missing", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_API_BASE_URL", "https://old-proxy.example.com");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));
    const config = await load();
    await expect(config.loadRuntimeConfig()).rejects.toThrow("404");
    expect(() => config.getApiBaseUrl()).toThrow();
  });

  it("uses the configured local development API without fetching Pages", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000/");
    const fetchConfig = vi.fn();
    vi.stubGlobal("fetch", fetchConfig);
    const config = await load();
    await config.loadRuntimeConfig();
    expect(config.getApiBaseUrl()).toBe("http://localhost:8000");
    expect(fetchConfig).not.toHaveBeenCalled();
  });
});
