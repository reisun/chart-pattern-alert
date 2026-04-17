export interface TabsHandlers {
  onSelect: (symbol: string) => void;
  onAdd: (symbol: string) => void;
  onRemove: (symbol: string) => void;
}

export function renderTabs(
  container: HTMLElement,
  symbols: string[],
  active: string | null,
  handlers: TabsHandlers,
): void {
  container.innerHTML = "";

  for (const s of symbols) {
    const tab = document.createElement("button");
    tab.className = "tab" + (s === active ? " active" : "");
    tab.type = "button";
    tab.innerHTML = `${escapeHtml(s)}<span class="close" title="Remove">✕</span>`;
    tab.addEventListener("click", (ev) => {
      const target = ev.target as HTMLElement;
      if (target.classList.contains("close")) {
        ev.stopPropagation();
        handlers.onRemove(s);
      } else {
        handlers.onSelect(s);
      }
    });
    container.appendChild(tab);
  }

  const adder = document.createElement("div");
  adder.className = "tab-add";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Add symbol (e.g., AAPL, 7203.T)";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Add";
  const submit = () => {
    const v = input.value.trim();
    if (v) {
      handlers.onAdd(v);
      input.value = "";
    }
  };
  btn.addEventListener("click", submit);
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") submit();
  });
  adder.appendChild(input);
  adder.appendChild(btn);
  container.appendChild(adder);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  } as Record<string, string>)[ch]);
}
