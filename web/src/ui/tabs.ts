import { searchStocks, STOCK_LIST, type StockEntry } from "../data/stocks";

export interface TabsHandlers {
  onSelect: (symbol: string) => void;
  onAdd: (symbol: string) => void;
  onRemove: (symbol: string) => void;
}

function findStockName(symbol: string): string | undefined {
  const s = symbol.toUpperCase();
  const entry = STOCK_LIST.find((e) => {
    const t = e.ticker.toUpperCase();
    return t === s || t === `${s}.T` || t.replace(/\.T$/, "") === s;
  });
  return entry?.name;
}

export function renderTabs(
  container: HTMLElement,
  symbols: string[],
  active: string | null,
  unreadCounts: Record<string, number>,
  handlers: TabsHandlers,
): void {
  document.querySelectorAll(".autocomplete-dropdown").forEach((el) => el.remove());
  container.innerHTML = "";

  for (const s of symbols) {
    const tab = document.createElement("button");
    tab.className = "tab" + (s === active ? " active" : "");
    tab.type = "button";
    const stockName = findStockName(s);
    if (stockName) tab.title = stockName;
    const count = unreadCounts[s] ?? 0;
    const badge = count > 0 ? `<span class="unread-badge">${count}</span>` : "";
    tab.innerHTML = `${escapeHtml(s)}${badge}<span class="close" title="Remove">✕</span>`;
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
  input.placeholder = "銘柄名 or コード (例: Apple, 7203.T)";
  input.setAttribute("autocomplete", "off");

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Add";

  const dropdown = document.createElement("div");
  dropdown.className = "autocomplete-dropdown hidden";

  let selectedIndex = -1;
  let currentResults: StockEntry[] = [];

  const positionDropdown = () => {
    const rect = input.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${rect.left}px`;
  };

  const closeDropdown = () => {
    dropdown.classList.add("hidden");
    dropdown.innerHTML = "";
    selectedIndex = -1;
    currentResults = [];
  };

  const selectEntry = (entry: StockEntry) => {
    handlers.onAdd(entry.ticker);
    input.value = "";
    closeDropdown();
  };

  const submit = () => {
    if (selectedIndex >= 0 && currentResults[selectedIndex]) {
      selectEntry(currentResults[selectedIndex]);
      return;
    }
    const v = input.value.trim();
    if (v) {
      handlers.onAdd(v);
      input.value = "";
      closeDropdown();
    }
  };

  const renderDropdown = (results: StockEntry[]) => {
    currentResults = results;
    selectedIndex = -1;
    if (results.length === 0) {
      closeDropdown();
      return;
    }
    dropdown.innerHTML = "";
    dropdown.classList.remove("hidden");
    positionDropdown();
    for (let i = 0; i < results.length; i++) {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      item.innerHTML = `<span class="ticker">${escapeHtml(results[i].ticker)}</span><span class="name">${escapeHtml(results[i].name)}</span>`;
      item.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        selectEntry(results[i]);
      });
      dropdown.appendChild(item);
    }
  };

  const updateHighlight = () => {
    const items = dropdown.querySelectorAll(".autocomplete-item");
    items.forEach((el, i) => {
      el.classList.toggle("selected", i === selectedIndex);
    });
  };

  input.addEventListener("input", () => {
    const q = input.value.trim();
    if (!q) {
      closeDropdown();
      return;
    }
    renderDropdown(searchStocks(q));
  });

  input.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      if (currentResults.length > 0) {
        selectedIndex = Math.min(selectedIndex + 1, currentResults.length - 1);
        updateHighlight();
      }
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      if (currentResults.length > 0) {
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateHighlight();
      }
    } else if (ev.key === "Enter") {
      submit();
    } else if (ev.key === "Escape") {
      closeDropdown();
    }
  });

  input.addEventListener("blur", () => {
    closeDropdown();
  });

  btn.addEventListener("click", submit);

  adder.appendChild(input);
  adder.appendChild(btn);
  container.appendChild(adder);
  document.body.appendChild(dropdown);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  } as Record<string, string>)[ch]);
}
