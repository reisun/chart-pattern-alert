# Head & Shoulders（三尊）

## 概要

通常のヘッド・アンド・ショルダーズ。**左肩 → 頭 → 右肩** で中央の山が一番高い。

```
              ＊ 頭（最高）
             / \
            /   \
 ＊ 左肩 ＊/     \＊ 右肩 ＊
  / \   /         \   / \
 /   \ /           \ /   \
 ───＊ ＊           ＊ ＊───  ← ネックライン
```

## 意味合い

- 上昇の勢いが鈍り、反転しやすい

## 見るポイント

- 右肩が頭ほど高くならない
- 左右肩のバランス（極端に差が無い）
- **ネックラインを下抜け** で売り優勢

## 検出アルゴリズム

1. Pivot 列から `high, low, high, low, high` を抽出
   - `L_shoulder.high < head.high`
   - `R_shoulder.high < head.high`
   - `|L_shoulder.high - R_shoulder.high| / head.high <= shoulderBalance`
2. ネックライン: 2 つの `low` を結ぶ線分
3. 確定: 右肩以降の `close` がネックラインを下抜け

## 閾値

- `shoulderBalance = 0.2`, `patternMinBars = 30`, `patternMaxBars = 80`

## マーカー

- 右肩の足上に `arrowDown`、略号 `H&S`
- 確定時に塗りつぶし、通知発火

## 実装メモ

- Inverse Head & Shoulders と対称。共通ヘルパで方向パラメータ化。
