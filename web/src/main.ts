import { loadRuntimeConfig } from "./runtime-config";
import { App } from "./app";
import "./styles.css";

const root = document.getElementById("app");
if (!root) throw new Error("missing #app root element");
async function start(): Promise<void> {
  try {
    await loadRuntimeConfig();
    const app = new App(root!);
    app.mount();
  } catch (error) {
    root!.setAttribute("role", "alert");
    root!.textContent = `API 設定を読み込めません。${error instanceof Error ? error.message : String(error)}。Tunnel 起動・Pages 再デプロイ後に再読み込みしてください。`;
  }
}
void start();

// Service Worker registration (production only to avoid dev-server pitfalls).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const base = import.meta.env.BASE_URL || "/chart-pattern-alert/";
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("[cpa] sw registration failed:", err);
      });
  });
}
