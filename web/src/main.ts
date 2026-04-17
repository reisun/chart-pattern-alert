import { App } from "./app";
import "./styles.css";

const root = document.getElementById("app");
if (!root) throw new Error("missing #app root element");
const app = new App(root);
app.mount();

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
