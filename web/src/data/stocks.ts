export interface StockEntry {
  ticker: string;
  name: string;
  market: "US" | "JP";
}

export const STOCK_LIST: StockEntry[] = [
  // --- US (S&P 500 major) ---
  { ticker: "AAPL", name: "Apple", market: "US" },
  { ticker: "MSFT", name: "Microsoft", market: "US" },
  { ticker: "GOOGL", name: "Alphabet", market: "US" },
  { ticker: "AMZN", name: "Amazon", market: "US" },
  { ticker: "NVDA", name: "NVIDIA", market: "US" },
  { ticker: "TSLA", name: "Tesla", market: "US" },
  { ticker: "META", name: "Meta Platforms", market: "US" },
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
  { ticker: "DIS", name: "Walt Disney", market: "US" },
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
  { ticker: "8306.T", name: "三菱UFJフィナンシャル・グループ", market: "JP" },
  { ticker: "7974.T", name: "任天堂", market: "JP" },
  { ticker: "9432.T", name: "日本電信電話", market: "JP" },
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
  { ticker: "6594.T", name: "日本電産", market: "JP" },
  { ticker: "4661.T", name: "オリエンタルランド", market: "JP" },
  { ticker: "6981.T", name: "村田製作所", market: "JP" },
  { ticker: "7267.T", name: "本田技研工業", market: "JP" },
  { ticker: "8031.T", name: "三井物産", market: "JP" },
  { ticker: "9434.T", name: "ソフトバンク", market: "JP" },
  { ticker: "3382.T", name: "セブン&アイ・ホールディングス", market: "JP" },
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
  { ticker: "8316.T", name: "三井住友フィナンシャルグループ", market: "JP" },
  { ticker: "9983.T", name: "ファーストリテイリング", market: "JP" },
  { ticker: "2914.T", name: "日本たばこ産業", market: "JP" },
  { ticker: "8411.T", name: "みずほフィナンシャルグループ", market: "JP" },
  { ticker: "6954.T", name: "ファナック", market: "JP" },
];

const MAX_RESULTS = 8;

export function searchStocks(query: string): StockEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return STOCK_LIST.filter(
    (s) =>
      s.ticker.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q),
  ).slice(0, MAX_RESULTS);
}
