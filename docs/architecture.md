# Architecture — chart-pattern-alert

## 全体像

```
+--------------------------+           +------------------------+
|  Browser (User PC)       |           |  Home Docker (LAN)     |
|                          |           |                        |
|  GitHub Pages served     |  HTTPS    |  [Reverse Proxy]       |
|  Vite+TS SPA             +---------->|  (別プロジェクト)       |
|  - lightweight-charts    |           |         |              |
|  - Notification/SW       |           |         v              |
|  - Pattern Detection     |           |  [FastAPI (this repo)] |
|  - localStorage          |           |  - /health             |
+--------------------------+           |  - /ohlcv (yfinance)   |
                                       |  - in-memory cache     |
                                       +------------------------+
```

## コンポーネント責務

### Frontend (`web/`)
- 銘柄・時間足・スケール・ポーリング間隔の UI と設定永続化（localStorage）
- API クライアント: `VITE_API_BASE_URL` 経由で OHLCV 取得
- チャート描画: lightweight-charts（ローソク足、出来高、マーカー）
- パターン検出（TypeScript 内実装）: OHLCV 配列 → 検出結果（パターン種別 + 位置）
- 通知: Service Worker 登録、前面通知（Notification API）
- ポーリング: タイマー駆動、離席時も動作させたい場合は SW から発火可能

### API (`api/`)
- FastAPI によるシンプルな読み取り API
- `/health` — liveness
- `/ohlcv` — 引数: `symbol`, `interval`, `range`。yfinance から取得し OHLCV+volume を返す
- インメモリ TTL キャッシュ（`CACHE_TTL_SECONDS`）
- CORS は `CORS_ORIGINS`（カンマ区切り env）で制御

### Reverse Proxy（別プロジェクト・スコープ外）
- 自宅ドメイン/TLS/ルーティングを担当
- 本プロジェクトは docker ネットワーク内で `api:8000` として可用であればよい

## データフロー（MVP）

1. ブラウザでアプリを開く → localStorage から設定を復元
2. ユーザーが銘柄・時間足を確定 → API `/ohlcv` を呼ぶ
3. lightweight-charts で描画 → パターン検出器に OHLCV を渡す
4. 検出結果をマーカーとして描画、かつ新規検出なら通知を発火
5. ポーリング間隔ごとに 2〜4 を繰り返す

## パターン検出の配置方針

**フロントエンド（TypeScript）で実装**。理由は以下。

- API の責務を OHLCV 取得に閉じる → 再利用性・テスト性
- 時間足・銘柄切替時のリアルタイム再計算が容易
- 描画と検出の状態を近接させることで結合度を下げる
- 将来的に重い検出（バックテスト/ML）が必要になったら `POST /detect` としてバックエンド分離可能（型境界を `(Candle[]) => DetectedPattern[]` で定義）

## 主要データ型（概念）

```ts
type Candle = {
  time: number; // epoch seconds (UTC)
  open: number; high: number; low: number; close: number;
  volume: number;
};

type DetectedPattern = {
  id: string;                  // stable hash
  kind: PatternKind;           // 'double_bottom' | 'double_top' | ...
  direction: 'bullish' | 'bearish';
  confidence: number;          // 0..1（MVP は 0.5 等の固定でも可）
  startTime: number; endTime: number;
  markerTime: number;          // マーカーをチャートに打つ位置
  neckline?: number;           // 該当パターンなら
  note?: string;
};
```

## 制約・非目標

- バックグラウンド Push（Web Push）は **非対応**（サーバー鍵管理が必要。MVP スコープ外）
- 自動売買は **非対応**（本アプリは通知と可視化のみ）
- 短い時間足（1m）は yfinance の制約でデータ範囲が短く、MVP では 5m 以上を主軸
