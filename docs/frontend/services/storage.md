# localStorage Schema

設定永続化のキー設計。

## 名前空間

すべて `cpa:` プレフィックスで区切る（chart-pattern-alert）。

## キー

| Key                        | 型          | 例                                      | 説明                      |
|----------------------------|-------------|-----------------------------------------|---------------------------|
| `cpa:symbols`              | `string[]`  | `["AAPL","7203.T"]`                     | 登録銘柄の順序付き配列     |
| `cpa:activeSymbol`         | `string`    | `"AAPL"`                                | 最後にアクティブだった銘柄 |
| `cpa:defaults.interval`    | `string`    | `"5m"`                                  | 既定時間足                |
| `cpa:defaults.scale`       | `string`    | `"Auto"`                                | 既定表示範囲              |
| `cpa:defaults.pollingMs`   | `number`    | `300000`                                | 既定ポーリング間隔(ms)    |
| `cpa:notificationEnabled`  | `boolean`   | `true`                                  | 通知 ON/OFF               |
| `cpa:apiBaseUrl`           | `string`    | `"http://localhost:8000"`               | API URL 上書き(任意)      |
| `cpa:seenPatternIds`       | `string[]`  | `["...hash..."]`                        | 既通知 ID（重複抑制、上限 500）|
| `cpa:schema`               | `number`    | `1`                                     | スキーマバージョン        |

## 値の取り扱い

- JSON.stringify / parse を共通ラッパで提供（`src/state/storage.ts`）
- 読み取り失敗は既定値にフォールバック
- 書き込みは debounce（300ms）でまとめる

## マイグレーション

- `cpa:schema` 不一致時に読み取りで変換。MVP は v1 固定。
- 将来キー名変更時は `cpa:schema` をインクリメント + マイグレーションロジック

## 個人情報

- 保存するのは銘柄シンボルと UI 設定のみ。個人情報・認証トークンは扱わない。

## 容量

- すべて合計で数 KB 程度を見込む。localStorage 上限（数 MB）に十分収まる。
