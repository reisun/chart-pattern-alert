# Patterns — 共通ルール

個別パターン設計の前提となる共通事項。10 パターンすべてに適用される。

## 1. 波の本数

1 つのパターンは、**左右の山谷を含めて 10〜50 本前後** で見える必要がある。
- それ未満はノイズと区別がつかない
- 数本のヒゲで「形っぽい」だけのものは採用しない

推奨スキャン窓:

| Pattern                         | 推奨ルックバック本数 |
|----------------------------------|---------------------|
| Double Bottom / Top              | 20〜50              |
| Inverse Head & Shoulders / H&S   | 30〜80              |
| Flag (Ascending/Descending)      | 20〜40              |
| Triangle (Ascending/Descending)  | 20〜40              |
| Resistance/Support Flip          | 30〜60              |

## 2. 出来高確認

確定トリガ（ネックライン突破等）で **出来高が増える** と信頼度が上がる。
ブレイク足の出来高が直近 20 本平均の 1.5 倍以上であれば `confidence += 0.10`。
bullish/bearish で完全対称（出来高は方向に依存しない）。

実装: `src/patterns/volume.ts` の `volumeRatio()` + `src/patterns/scoring.ts` の `computeConfidence()`

## 3. 上位足整合

下位足のパターンは、上位足のトレンドと整合すると信頼度が上がる。

### 上位足マッピング

| 下位足 | 上位足 |
|--------|--------|
| 1m | 15m |
| 5m | 1h |
| 15m | 4h |
| 30m | 4h |
| 1h | 1d |
| 4h | 1d |
| 1d | 1wk |
| 1wk | なし |

### トレンド判定

上位足の EMA(20) の傾きから bullish / bearish / neutral を判定。
直近 EMA と 2本前 EMA の差が ATR×0.1 以上で方向確定。

### confidence 調整

| 整合 | 調整 |
|------|------|
| aligned（パターン方向 = トレンド方向） | +0.10 |
| opposed（逆方向） | -0.10 |
| neutral / unavailable | ±0 |

### キャッシュ

上位足データはメモリキャッシュ（TTL = 上位足 1 本の秒数）で保持。

実装: `src/services/higherTimeframe.ts`, `src/services/higherTfCache.ts`

## 4. だまし

三角持ち合いなどは、一瞬抜けて反転することがある。
- 検出時点では **候補（candidate）** として灰色マーカーで表示
- ネックライン突破後に **確定（confirmed）** として方向色マーカーに昇格
- 通知は confirmed のみ発火し、candidate の誤爆通知を抑制

## 5a. 通知レベル 4 段階

| Level | 条件 | 動作 |
|-------|------|------|
| L1 | candidate | 画面表示のみ（灰色マーカー） |
| L2 | confirmed | Feed 表示（通知なし） |
| L3 | confirmed + 上位足一致 + confidence ≥ 0.7 | ブラウザ通知 |
| L4 | confirmed + 上位足一致 + confidence ≥ 0.8 | ⚠ 強通知 |

L3 以上のみブラウザ通知を発火。L4 はタイトルに ⚠ マークを付加。
上位足整合が unavailable（上位足なし or 取得失敗）の場合は L2 に落とす。

実装: `src/services/notifier.ts` の `determineNotifLevel()`

## 5b. 損切り位置（情報提供）

通知本文や AlertFeed に、想定される損切り位置の目安を併記すると親切。
- Bullish: 直近安値
- Bearish: 直近高値

MVP はオプション表示。

## 6. パターン状態管理

パターンは以下の3段階の状態を持つ。

| 状態 | 意味 | 表示 | 通知 |
|------|------|------|------|
| `candidate` | 形状検出済、ネックライン未突破 | 灰色マーカー | しない |
| `confirmed` | ネックライン突破済、ブレイク確定 | 方向色マーカー（緑/赤） | する（条件付き） |
| `invalidated` | 形状崩壊（Phase2 で実装予定） | — | — |

通知条件: `status === "confirmed"` かつ `confidence >= minConfidence (0.6)`
画面表示条件: `confidence >= candidateMinConfidence (0.3)`

## 7. 多要素スコアリング

confidence は以下の加点方式で算出する。bullish/bearish で完全対称。

| 要素 | 条件 | 加点 |
|------|------|------|
| ベース | 常時 | +0.30 |
| 確定ボーナス | ネックライン突破済 | +0.20 |
| ATR 深さ | depth/ATR ≥ 1.0 | +0.10 |
| ATR 深さ（大） | depth/ATR ≥ 2.0 | +0.15 |
| パターンサイズ | 本数が理想範囲の ±50% 以内 | +0.10 |
| ブレイク強度 | breakStrength ≥ 0.5 | +0.10 |
| 対称性 | symmetry ≥ 0.7 | +0.10 |
| 出来高確認 | ブレイク足 volume / 直近20本平均 ≥ 1.5 | +0.10 |

最大: 1.00（クランプ）、最小: 0.30

実装: `src/patterns/scoring.ts` の `computeConfidence()`

## 8. 評価窓（事後追跡）

confirmed パターンのブレイク後の値動きを追跡し、成功/失敗を判定する。

### 追跡条件

- `status === "confirmed"` かつ `atrAtDetection > 0` のパターンのみ追跡
- candidate パターンは追跡しない（outcome: "expired"）

### 成功/失敗条件（方向完全対称）

| 方向 | 成功（+2ATR） | 失敗（-1ATR） | 打ち切り |
|------|---------------|---------------|----------|
| bullish | price ≥ entry + 2×ATR | price ≤ entry - 1×ATR | 窓超過 |
| bearish | price ≤ entry - 2×ATR | price ≥ entry + 1×ATR | 窓超過 |

### 評価窓の本数

`evalWindowBars = min(100, max(20, round(patternBars × 1.5)))`

パターンの形成本数に比例し、大きいパターンには長い評価窓を適用する。

### MFE / MAE 計測

毎 tick で最大含み益（MFE）と最大含み損（MAE）を ATR 倍率で記録する。
これにより「成功パターンでもどこまで逆行したか」「失敗パターンでもどこまで順行したか」が分析可能。

### Feed 表示

| outcome | バッジ | 色 |
|---------|--------|-----|
| tracking | ⏳ | 黄 |
| success | ✅ | 緑 |
| fail | ❌ | 赤 |
| expired | ⏰ | 灰 |

追跡中は進捗（経過本数/窓本数）と MFE/MAE を表示。

実装: `src/services/patternTracker.ts`

## 9. 時間足別チューニング

時間足ごとにパターン検出の閾値をオーバーライドする。`defaultPatternConfig` をベースに、時間足固有の `Partial<PatternConfig>` をマージして使用する。

### オーバーライド対象フィールド

| フィールド | 短足で上げる理由 | 長足で下げる理由 |
|-----------|-----------------|-----------------|
| `minSwingPct` | ノイズが多い | トレンドが明確 |
| `pivotMinATR` | ダマシ抑制 | 小さいスイングも有効 |
| `patternMinBars` / `patternMaxBars` | パターン形成が速い | パターン形成が遅い |
| `cooldownBars` | 重複シグナル抑制 | シグナル頻度維持 |
| `minConfidence` | 短足は厳格に | — |

### 各時間足の方針

| 時間足 | 方針 |
|--------|------|
| 1m / 5m | ノイズ対策重視。minSwingPct/pivotMinATR を上げ、cooldownBars を長く |
| 15m / 30m | バランス型。デフォルトに近い |
| 1h | デフォルトそのまま（基準時間足） |
| 4h / 1d / 1wk | パターンサイズ範囲を縮小、cooldownBars を短く |

実装: `src/patterns/config.ts` の `resolveConfig()` と `INTERVAL_OVERRIDES`

## 検出の共通フロー

```
OHLCV (Candle[])
   │
   ▼
1. 前処理
   - 欠損除去
   - 必要に応じて ATR 等の指標計算（任意）
   │
   ▼
2. 極値検出
   - Zig-Zag 的に高値/安値のピボットを抽出
   - ノイズ閾値: `minSwingPct`（例 0.3%）
   │
   ▼
3. パターン固有ルール
   - 各パターン doc 参照
   │
   ▼
4. 確定判定
   - ネックライン突破等
   │
   ▼
5. 結果
   - DetectedPattern[]
```

## 極値検出（Zig-Zag のシンプル版）

```ts
type Pivot = { idx: number; time: number; price: number; kind: 'high' | 'low' };

function findPivots(candles: Candle[], minSwingPct: number): Pivot[] {
  // 単純実装: 最後の極から minSwingPct 以上反転したら新しい極を確定
  // 交互に high / low が並ぶ
}
```

## マーカー描画条件

- 検出直後の足（`markerTime`）にマーカーを置く
- マーカーは lightweight-charts の `setMarkers` API を使用
- Bullish は下側に `arrowUp`、Bearish は上側に `arrowDown`
- 色は状態で分岐:
  - `candidate`: 灰色（`#9e9e9e`）
  - `confirmed` Bullish: 緑（`#26a69a`）
  - `confirmed` Bearish: 赤（`#ef5350`）
- テキストはパターン名の日本語略号（`Wボトム`, `Mトップ`, `逆三尊`, `三尊`, `上昇F`, `下降F`, `上昇△`, `下降▽`, `転換↑`, `転換↓`）

## 閾値の既定値（MVP、調整可）

| 名称              | 既定    | 説明                                  |
|-------------------|---------|---------------------------------------|
| `minSwingPct`     | 0.3%    | 極値検出のノイズ閾値                  |
| `patternMinBars`  | 10      | パターン最小本数                      |
| `patternMaxBars`  | 60      | パターン最大本数                      |
| `necklineTolPct`  | 0.2%    | ネックライン近辺の許容誤差            |
| `shoulderBalance` | 0.2     | 三尊の肩左右高さ差の許容比率          |
| `flagSlopeMax`    | 30°     | フラッグ調整の傾きの絶対値上限        |
| `minConfidence`   | 0.6     | confirmed の通知・表示閾値            |
| `candidateMinConfidence` | 0.3 | candidate の画面表示閾値           |

すべて `src/patterns/config.ts` に定数化し将来調整可能にする。

## テスト方針（MVP）

- 合成 OHLCV データ（明示的に形を作ったフィクスチャ）で検出器の Unit Test
- 実データ検証は段階拡張
