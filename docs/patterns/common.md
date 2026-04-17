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
- 検出時点では **仮検出**
- 数本経過後に方向が維持されているか確認して **確定** とする実装余地あり
- MVP は検出時点で通知（誤爆をある程度許容）

## 5. 損切り位置（情報提供）

通知本文や AlertFeed に、想定される損切り位置の目安を併記すると親切。
- Bullish: 直近安値
- Bearish: 直近高値

MVP はオプション表示。

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
- テキストはパターン名の略号（`DB`, `DT`, `iH&S`, `H&S`, `A-Flag`, `D-Flag`, `A-Tri`, `D-Tri`, `Flip↑`, `Flip↓`）

## 閾値の既定値（MVP、調整可）

| 名称              | 既定    | 説明                                  |
|-------------------|---------|---------------------------------------|
| `minSwingPct`     | 0.3%    | 極値検出のノイズ閾値                  |
| `patternMinBars`  | 10      | パターン最小本数                      |
| `patternMaxBars`  | 60      | パターン最大本数                      |
| `necklineTolPct`  | 0.2%    | ネックライン近辺の許容誤差            |
| `shoulderBalance` | 0.2     | 三尊の肩左右高さ差の許容比率          |
| `flagSlopeMax`    | 30°     | フラッグ調整の傾きの絶対値上限        |

すべて `src/patterns/config.ts` に定数化し将来調整可能にする。

## テスト方針（MVP）

- 合成 OHLCV データ（明示的に形を作ったフィクスチャ）で検出器の Unit Test
- 実データ検証は段階拡張
