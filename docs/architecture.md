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
|  - localStorage/IndexedDB |           |  - /health             |
+--------------------------+           |  - /ohlcv (yfinance)   |
                                       |  - in-memory cache     |
                                       +------------------------+
```

## コンポーネント責務

### Frontend (`web/`)
- 銘柄・時間足・スケール・ポーリング間隔の UI と設定永続化（localStorage）
- 検出ログ永続化（IndexedDB）
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

### Upstream Reverse Proxy（本リポジトリの責務外）
- 公開ドメイン / TLS 終端 / ルーティングを担当
- 具体実装（共用リバプロ相乗り／専用リバプロ単独導入／マネージド LB など）は利用者の選択
- 本プロジェクトは docker ネットワーク内で `api:8000` として HTTP 可用であればよい
- 契約仕様: [infra/upstream-proxy-contract.md](./infra/upstream-proxy-contract.md)

## データフロー（MVP）

1. ブラウザでアプリを開く → localStorage から設定を復元
2. ユーザーが銘柄・時間足を確定 → API `/ohlcv` を呼ぶ
3. lightweight-charts で描画 → パターン検出器に OHLCV を渡す
4. 検出結果をマーカーとして描画（candidate は灰色、confirmed は方向色）
5. 新規 confirmed パターンなら通知を発火、全パターンを IndexedDB にログ保存
6. confirmed パターンの事後追跡（ATR 連動の成功/失敗判定、MFE/MAE 計測）
7. ポーリング間隔ごとに 2〜6 を繰り返す

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

type PatternStatus = 'candidate' | 'confirmed' | 'invalidated';

type DetectedPattern = {
  id: string;                  // stable hash
  kind: PatternKind;           // 'double_bottom' | 'double_top' | ...
  direction: 'bullish' | 'bearish';
  confidence: number;          // 0..1（多要素スコアリングで算出）
  status: PatternStatus;       // パターンの確定状態
  startTime: number; endTime: number;
  markerTime: number;          // マーカーをチャートに打つ位置
  neckline?: number;           // 該当パターンなら
  note?: string;
  detectedAt: number;          // 検出時刻（UTC epoch 秒）
  confirmedAt?: number;        // 確定時刻
  entryPrice?: number;         // ブレイク確定時の終値
  atrAtDetection: number;      // 検出時の ATR 値
};
```

## 検出ログ（IndexedDB）

パターン検出結果をブラウザの IndexedDB に保存し、将来の分析・評価に活用する。

- DB 名: `chart-pattern-alert-log`
- ストア名: `patterns`
- キー: `id`（symbol + pattern ID の組合せ）
- インデックス: `loggedAt`, `symbol`, `kind`

### PatternLogEntry スキーマ

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | 一意識別子（symbol:patternId） |
| symbol | string | 銘柄コード |
| timeframe | string | 時間足 |
| kind | PatternKind | パターン種別 |
| direction | string | bullish / bearish |
| status | PatternStatus | candidate / confirmed / invalidated |
| confidence | number | スコア |
| detectedAt | number | 検出時刻 |
| confirmedAt | number? | 確定時刻 |
| entryPrice | number? | エントリー価格 |
| atrAtDetection | number | 検出時 ATR |
| loggedAt | number | ログ保存時刻 |
| outcome | PatternOutcome | tracking / success / fail / expired |
| mfe | number | Maximum Favorable Excursion（ATR 倍率） |
| mae | number | Maximum Adverse Excursion（ATR 倍率） |
| evalWindowBars | number | 評価窓の本数 |
| evalStartPrice | number | 追跡開始価格 |
| successTarget | number | 成功判定ライン |
| failTarget | number | 失敗判定ライン |
| outcomeAt | number? | 結果確定時刻 |
| barsElapsed | number | 経過本数 |

DB バージョン: 2（v1 → v2 でマイグレーション対応済み）

実装: `src/services/patternLog.ts`

## 評価窓（事後追跡）

confirmed パターンに対して、ブレイク後の値動きを追跡し成否を判定する。

### 成功/失敗条件（方向対称）

| 方向 | 成功 | 失敗 | 打ち切り |
|------|------|------|----------|
| bullish | +2ATR 到達 | -1ATR 逆行 | 窓超過 |
| bearish | -2ATR 到達 | +1ATR 逆行 | 窓超過 |

### 評価窓の本数

パターン形成本数の 1.5 倍（最小 20 本、最大 100 本）

### MFE / MAE

- MFE（Maximum Favorable Excursion）: 追跡期間中の最大含み益（ATR 倍率）
- MAE（Maximum Adverse Excursion）: 追跡期間中の最大含み損（ATR 倍率）

実装: `src/services/patternTracker.ts`

## 制約・非目標

- バックグラウンド Push（Web Push）は **非対応**（サーバー鍵管理が必要。MVP スコープ外）
- 自動売買は **非対応**（本アプリは通知と可視化のみ）
- 短い時間足（1m）は yfinance の制約でデータ範囲が短く、MVP では 5m 以上を主軸
