# TASK.md — 残課題

MVP (L1–L4) はデプロイ済（[公開 URL](https://reisun.github.io/chart-pattern-alert/)）。運用立ち上げ（A1–A3）完了、本番 API 到達済。以下は今後の拡張タスク。

---

## B. 段階拡張（実装タスク）

機能拡張。優先度は上から推奨順。各項目は **単独で lead-task 1 本** に相当する粒度。

### ~~B6. 評価窓（Phase2）~~ → 完了

- **状態**: 実装済み
- **内容**: 検出後の事後追跡。ATR 評価窓（+2ATR 成功 / -1ATR 失敗）、パターンサイズ連動窓、MFE/MAE 計測
- **実装**: `src/services/patternTracker.ts`（新規）、`src/services/patternLog.ts`（DB v2 マイグレーション）、`src/app.ts`（tick 統合・Feed 表示）

### ~~B7. 時間足別チューニング（Phase2）~~ → 完了

- **状態**: 実装済み
- **内容**: 時間足ごとに異なる検出閾値・評価窓・通知条件・重複抑制幅を持つ config 分離
- **実装**: `src/patterns/config.ts` に `resolveConfig()` + `INTERVAL_OVERRIDES`（Partial マージ）、`src/app.ts` で interval に応じた config を使用

### ~~B8. 通知レベル 4 段階（Phase2）~~ → 完了

- **状態**: 実装済み
- **内容**: L1 候補表示のみ → L2 確定（Feed表示）→ L3 確定+上位足一致+conf≥0.7（通知）→ L4 確定+上位足一致+conf≥0.8（⚠強通知）
- **実装**: `src/services/notifier.ts`（determineNotifLevel + level付き通知）、`src/app.ts`（統合）

### ~~B2. 上位足整合の簡易表示~~ → 完了

- **状態**: 実装済み
- **内容**: 上位足 EMA(20) のトレンドとパターン方向の整合で confidence ±0.10
- **実装**: `src/services/higherTimeframe.ts`（トレンド判定）、`src/services/higherTfCache.ts`（TTL キャッシュ）、`src/app.ts`（tick 統合・Feed バッジ）

### ~~B3. 出来高判定による confidence 加点~~ → 完了

- **状態**: 実装済み
- **内容**: ブレイク足の出来高が直近 20 本平均の 1.5 倍以上で confidence +0.10
- **実装**: `src/patterns/volume.ts`（新規）、`src/patterns/scoring.ts`（加点追加）、10パターン検出関数に volumeRatio 統合

### ~~B4. 複数銘柄タブ UX 改善~~ → 完了（MVP）

- **状態**: MVP 実装済み（未読バッジ + 通知履歴画面）
- **内容**: 非アクティブタブの未読バッジ（ラウンドロビンバックグラウンドフェッチ）、検出履歴パネル（IndexedDB ログ閲覧）
- **実装**: `src/app.ts`（backgroundFetchOne + 履歴パネル）、`src/ui/tabs.ts`（バッジ描画）、`src/state/appState.ts`（unreadCounts 永続化）
- **残**: タブドラッグ並べ替え、銘柄別ステータス一覧

### A4. API 側 CORS に上流プロキシ公開オリジンを追加（必要時のみ）

- **状態**: 現在 `CORS_ORIGINS=https://reisun.github.io,http://localhost:5173` が既定
- **必要ケース**: 上流プロキシが GitHub Pages とは別オリジンを提示する構成の場合
- **手順**: `.env` の `CORS_ORIGINS` にカンマ区切りで追加 → `docker compose restart api`

---

## C. 小改善（気づき次第）

- 本番デプロイ後の CDN キャッシュ確認（初回 504/503 のユーザー影響）
- `api/app/__init__.py` のバージョン文字列を `importlib.metadata` 読み取りに
- Dev 時の Vite port 競合回避（現状は `strictPort: false` で自動繰上げだが、固定したいケース用に明示オプション）
- Safari iOS での Notification 挙動確認

---

---

## Z. ユーザー要望

~~1. 現在企業のコードを入力しなければならないので、日本株、米国株ともに主要なものは企業名で選択できるようにして欲しいです。~~ → 完了（[#14](https://github.com/reisun/chart-pattern-alert/pull/14)）
~~2. 入力中の企業コードや企業名に基づいて、クレンジングなども考慮した入力補完を表示して欲しいです。~~ → 完了（[#15](https://github.com/reisun/chart-pattern-alert/pull/15)）
~~3. タブに表示される企業コードのツールチップとして、企業名を出してください。~~ → 完了
~~4. 通知の改善。パターン名を日本語表示にしてください。また、通知をONにするとONにする前に追加されたものが一斉に通知されているので、ONの後に追加される検出について通知するようにしてください。~~ → 完了

---

## 完了済み（参考）

| Lead | 範囲 | PR |
|---|---|---|
| L1 | Bootstrap & Design (scaffold + docs) | [#1](https://github.com/reisun/chart-pattern-alert/pull/1) |
| L2 | Backend API (FastAPI + yfinance) | [#2](https://github.com/reisun/chart-pattern-alert/pull/2) |
| L3 | Frontend MVP + Pattern Detection | [#3](https://github.com/reisun/chart-pattern-alert/pull/3) |
| L4 | Integration & Deploy (Actions + Pages) | [#4](https://github.com/reisun/chart-pattern-alert/pull/4) |
| B1 | 残8パターン検出ロジック・テスト・Feed表示 | [#9](https://github.com/reisun/chart-pattern-alert/pull/9) |
| B5 | データソース切替（TwelveData / yfinance / Finnhub / Alpha Vantage / J-Quants） | — |
| fix | J-Quants interval フォールバック | [#10](https://github.com/reisun/chart-pattern-alert/pull/10) |
| fix | 日本株 interval 制限（J-Quants制約） | [#11](https://github.com/reisun/chart-pattern-alert/pull/11) |
| feat | パターン ON/OFF フィルタ・日本語ラベル | [#12](https://github.com/reisun/chart-pattern-alert/pull/12) |
| feat | パターン検出精度改善（ATR・クールダウン・厳格化） | [#13](https://github.com/reisun/chart-pattern-alert/pull/13) |
| feat | 主要銘柄の企業名オートコンプリート機能 | [#14](https://github.com/reisun/chart-pattern-alert/pull/14) |
| feat | クレンジング考慮の入力補完 (Z-2) | [#15](https://github.com/reisun/chart-pattern-alert/pull/15) |
| feat | Z-3 タブツールチップ企業名表示 & Z-4 通知改善 | [#16](https://github.com/reisun/chart-pattern-alert/pull/16) |
| B-review | パターン状態3段階化・多要素スコアリング・通知品質向上・検出ログ基盤 | [#17](https://github.com/reisun/chart-pattern-alert/pull/17) |

公開 URL: https://reisun.github.io/chart-pattern-alert/
