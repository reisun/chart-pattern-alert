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

## 2. 出来高（将来）

確定トリガ（ネックライン突破等）で **出来高が増える** と信頼度が上がる。
MVP はフラグ表示のみ（`hasVolumeConfirm: boolean`）に留め、スコア加点は段階拡張で。

## 3. 上位足整合（将来）

下位足のパターンは、上位足のトレンドと整合すると信頼度が上がる。
- 例: 1h 足で押し目 + 15m でダブルボトム
- MVP は単一足検出。上位足整合は段階拡張。

## 4. だまし

三角持ち合いなどは、一瞬抜けて反転することがある。
- 検出時点では **候補（candidate）** として灰色マーカーで表示
- ネックライン突破後に **確定（confirmed）** として方向色マーカーに昇格
- 通知は confirmed のみ発火し、candidate の誤爆通知を抑制

## 5. 損切り位置（情報提供）

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

最大: 0.95、最小: 0.30

実装: `src/patterns/scoring.ts` の `computeConfidence()`

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
