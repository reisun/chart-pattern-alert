export interface StockEntry {
  ticker: string;
  name: string;
  market: "US" | "JP";
  aliases?: string[];
}

export const STOCK_LIST: StockEntry[] = [
  // --- US (S&P 500 major) ---
  { ticker: "AAPL", name: "Apple", market: "US" },
  { ticker: "MSFT", name: "Microsoft", market: "US" },
  { ticker: "GOOGL", name: "Alphabet", market: "US", aliases: ["Google"] },
  { ticker: "AMZN", name: "Amazon", market: "US" },
  { ticker: "NVDA", name: "NVIDIA", market: "US" },
  { ticker: "TSLA", name: "Tesla", market: "US" },
  {
    ticker: "META",
    name: "Meta Platforms",
    market: "US",
    aliases: ["Facebook"],
  },
  { ticker: "BRK.B", name: "Berkshire Hathaway", market: "US" },
  { ticker: "JPM", name: "JPMorgan Chase", market: "US" },
  { ticker: "V", name: "Visa", market: "US" },
  { ticker: "JNJ", name: "Johnson & Johnson", market: "US" },
  { ticker: "UNH", name: "UnitedHealth", market: "US" },
  { ticker: "XOM", name: "Exxon Mobil", market: "US" },
  { ticker: "PG", name: "Procter & Gamble", market: "US" },
  { ticker: "MA", name: "Mastercard", market: "US" },
  { ticker: "HD", name: "Home Depot", market: "US" },
  { ticker: "CVX", name: "Chevron", market: "US" },
  { ticker: "ABBV", name: "AbbVie", market: "US" },
  { ticker: "MRK", name: "Merck", market: "US" },
  { ticker: "KO", name: "Coca-Cola", market: "US" },
  { ticker: "PEP", name: "PepsiCo", market: "US" },
  { ticker: "AVGO", name: "Broadcom", market: "US" },
  { ticker: "COST", name: "Costco", market: "US" },
  { ticker: "LLY", name: "Eli Lilly", market: "US" },
  { ticker: "WMT", name: "Walmart", market: "US" },
  { ticker: "MCD", name: "McDonald's", market: "US" },
  { ticker: "CSCO", name: "Cisco", market: "US" },
  { ticker: "CRM", name: "Salesforce", market: "US" },
  { ticker: "AMD", name: "AMD", market: "US" },
  { ticker: "INTC", name: "Intel", market: "US" },
  { ticker: "NFLX", name: "Netflix", market: "US" },
  { ticker: "ADBE", name: "Adobe", market: "US" },
  {
    ticker: "DIS",
    name: "Walt Disney",
    market: "US",
    aliases: ["ディズニー"],
  },
  { ticker: "NKE", name: "Nike", market: "US" },
  { ticker: "BA", name: "Boeing", market: "US" },
  { ticker: "GS", name: "Goldman Sachs", market: "US" },
  { ticker: "CAT", name: "Caterpillar", market: "US" },
  { ticker: "IBM", name: "IBM", market: "US" },
  { ticker: "ORCL", name: "Oracle", market: "US" },
  { ticker: "QCOM", name: "Qualcomm", market: "US" },
  // --- JP (Nikkei 225 major) ---
  { ticker: "7203.T", name: "トヨタ自動車", market: "JP" },
  { ticker: "6758.T", name: "ソニーグループ", market: "JP" },
  { ticker: "9984.T", name: "ソフトバンクグループ", market: "JP" },
  { ticker: "6861.T", name: "キーエンス", market: "JP" },
  {
    ticker: "8306.T",
    name: "三菱UFJフィナンシャル・グループ",
    market: "JP",
    aliases: ["MUFG", "三菱UFJ"],
  },
  { ticker: "7974.T", name: "任天堂", market: "JP" },
  {
    ticker: "9432.T",
    name: "日本電信電話",
    market: "JP",
    aliases: ["NTT"],
  },
  { ticker: "6501.T", name: "日立製作所", market: "JP" },
  { ticker: "8035.T", name: "東京エレクトロン", market: "JP" },
  { ticker: "6902.T", name: "デンソー", market: "JP" },
  { ticker: "4063.T", name: "信越化学工業", market: "JP" },
  { ticker: "6098.T", name: "リクルートホールディングス", market: "JP" },
  { ticker: "9433.T", name: "KDDI", market: "JP" },
  { ticker: "6367.T", name: "ダイキン工業", market: "JP" },
  { ticker: "4519.T", name: "中外製薬", market: "JP" },
  { ticker: "7741.T", name: "HOYA", market: "JP" },
  { ticker: "8058.T", name: "三菱商事", market: "JP" },
  { ticker: "8001.T", name: "伊藤忠商事", market: "JP" },
  {
    ticker: "6594.T",
    name: "日本電産",
    market: "JP",
    aliases: ["日電産", "ニデック"],
  },
  { ticker: "4661.T", name: "オリエンタルランド", market: "JP" },
  { ticker: "6981.T", name: "村田製作所", market: "JP" },
  {
    ticker: "7267.T",
    name: "本田技研工業",
    market: "JP",
    aliases: ["ホンダ"],
  },
  { ticker: "8031.T", name: "三井物産", market: "JP" },
  { ticker: "9434.T", name: "ソフトバンク", market: "JP" },
  {
    ticker: "3382.T",
    name: "セブン&アイ・ホールディングス",
    market: "JP",
    aliases: ["セブンアイ"],
  },
  { ticker: "4568.T", name: "第一三共", market: "JP" },
  { ticker: "6273.T", name: "SMC", market: "JP" },
  { ticker: "6723.T", name: "ルネサスエレクトロニクス", market: "JP" },
  { ticker: "4503.T", name: "アステラス製薬", market: "JP" },
  { ticker: "6857.T", name: "アドバンテスト", market: "JP" },
  { ticker: "8766.T", name: "東京海上ホールディングス", market: "JP" },
  { ticker: "6762.T", name: "TDK", market: "JP" },
  { ticker: "7751.T", name: "キヤノン", market: "JP" },
  { ticker: "4502.T", name: "武田薬品工業", market: "JP" },
  { ticker: "6301.T", name: "コマツ", market: "JP" },
  {
    ticker: "8316.T",
    name: "三井住友フィナンシャルグループ",
    market: "JP",
    aliases: ["SMFG"],
  },
  {
    ticker: "9983.T",
    name: "ファーストリテイリング",
    market: "JP",
    aliases: ["ユニクロ"],
  },
  {
    ticker: "2914.T",
    name: "日本たばこ産業",
    market: "JP",
    aliases: ["JT"],
  },
  { ticker: "8411.T", name: "みずほフィナンシャルグループ", market: "JP" },
  { ticker: "6954.T", name: "ファナック", market: "JP" },
];

const MAX_RESULTS = 8;

/**
 * Convert fullwidth alphanumeric characters to halfwidth.
 * e.g. "７２０３" -> "7203", "ＡＰＰＬ" -> "APPL"
 */
function toHalfWidth(str: string): string {
  return str.replace(/[\uff01-\uff5e]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  );
}

/**
 * Remove punctuation/separators for fuzzy matching:
 * middle-dot (・), ampersand (&), spaces, hyphens, dots
 */
function stripSeparators(str: string): string {
  return str.replace(/[\s・&\-\.・\u30FB\uFF65]/g, "");
}

/**
 * Normalize a string for matching:
 * 1. fullwidth -> halfwidth
 * 2. lowercase
 * 3. strip separators
 */
function normalize(str: string): string {
  return stripSeparators(toHalfWidth(str).toLowerCase());
}

export function searchStocks(query: string): StockEntry[] {
  const raw = query.trim();
  if (!raw) return [];

  const q = normalize(raw);

  return STOCK_LIST.filter((s) => {
    // Match against ticker (normalized)
    const tickerNorm = normalize(s.ticker);
    if (tickerNorm.includes(q)) return true;

    // Match against ticker without .T suffix for JP stocks
    if (s.market === "JP") {
      const tickerBase = tickerNorm.replace(".t", "");
      if (tickerBase.includes(q)) return true;
    }

    // Match against name (normalized)
    const nameNorm = normalize(s.name);
    if (nameNorm.includes(q)) return true;

    // Match against aliases (normalized)
    if (s.aliases) {
      for (const alias of s.aliases) {
        if (normalize(alias).includes(q)) return true;
      }
    }

    // Also check if query (without .t) matches ticker base for convenience
    // e.g. user types "7203" and we match "7203.t"
    if (s.market === "JP" && !q.includes(".")) {
      const tickerBase = normalize(s.ticker).replace(".t", "");
      if (tickerBase === q || tickerBase.startsWith(q)) return true;
    }

    return false;
  }).slice(0, MAX_RESULTS);
}
