# TASK.md

公開 URL: https://reisun.github.io/chart-pattern-alert/

---

## 次にやるべきこと: 検出精度の検証と改善

レビュー対応（Phase1〜2）で**検出後の評価・通知・ログ基盤**は整ったが、10 パターンの**検出ロジック自体は未改善**。

現状は「検出精度を検証・改善するための基盤が整った」段階であり、精度が上がったとは言えない。

### 検証手順（`.human/.review` §10 に準拠）
a
1. **ログを溜める** — 評価窓（B6）が稼働中。confirmed パターンの成功/失敗/MFE/MAE が IndexedDB に蓄積される
2. **成績を比較** — 上昇/下落別、時間足別、パターン別に成功率を集計
3. **偏りの原因を分解** — 検出件数・確定率・到達速度のどこに問題があるか特定
4. **閾値を調整** — 根拠を持って `INTERVAL_OVERRIDES` や検出関数のパラメータを修正

### 現時点で分かっていること

- 時間足別 config（B7）のオーバーライド値は**初期仮説**のまま。実データ検証なし
- 検出関数の形状認識ロジック（ピボット検出→パターンマッチ→確定判定）は Phase1 以前から変更なし
- `invalidated` 状態（形状崩壊検知）は型定義のみで、実装は未着手

### 必要なタスク

| # | タスク | 前提 |
|---|--------|------|
| D1 | ログ集計ダッシュボード（パターン別・時間足別・方向別の成績一覧） | ログが十分に溜まること |
| D2 | 時間足別 config の実データ調整 | D1 の集計結果 |
| D3 | 検出ロジック改善（パターン個別の形状認識見直し） | D1 + D2 の知見 |
| D4 | `invalidated` 状態の実装（形状崩壊検知） | 独立して実装可能 |

---

## 残タスク

### UX 改善

- タブドラッグ並べ替え
- 銘柄別ステータス一覧（最終検出時刻・パターン数）

### 運用・検証

- Safari iOS での Notification 挙動確認
- 本番 CDN キャッシュの初回挙動確認
- API CORS 追加（上流プロキシ構成変更時のみ。`.env` の `CORS_ORIGINS` に追加）

### 開発環境

- Vite port 固定オプション（現状 `strictPort: false` で自動繰上げ）
- GitHub Actions Node.js 20 → 24 移行（期限: 2026-06）

---

## 完了済み

| PR | 範囲 |
|----|------|
| [#1](https://github.com/reisun/chart-pattern-alert/pull/1) | Bootstrap & Design |
| [#2](https://github.com/reisun/chart-pattern-alert/pull/2) | Backend API (FastAPI + yfinance) |
| [#3](https://github.com/reisun/chart-pattern-alert/pull/3) | Frontend MVP + Pattern Detection |
| [#4](https://github.com/reisun/chart-pattern-alert/pull/4) | Integration & Deploy |
| [#9](https://github.com/reisun/chart-pattern-alert/pull/9) | 残8パターン検出ロジック |
| [#10](https://github.com/reisun/chart-pattern-alert/pull/10) | J-Quants interval フォールバック |
| [#11](https://github.com/reisun/chart-pattern-alert/pull/11) | 日本株 interval 制限 |
| [#12](https://github.com/reisun/chart-pattern-alert/pull/12) | パターン ON/OFF フィルタ・日本語ラベル |
| [#13](https://github.com/reisun/chart-pattern-alert/pull/13) | パターン検出精度改善（ATR・クールダウン・厳格化） |
| [#14](https://github.com/reisun/chart-pattern-alert/pull/14) | 企業名オートコンプリート |
| [#15](https://github.com/reisun/chart-pattern-alert/pull/15) | クレンジング入力補完 |
| [#16](https://github.com/reisun/chart-pattern-alert/pull/16) | タブツールチップ・通知改善 |
| [#17](https://github.com/reisun/chart-pattern-alert/pull/17) | パターン状態3段階化・多要素スコアリング・検出ログ基盤 |
| [#18](https://github.com/reisun/chart-pattern-alert/pull/18) | 評価窓（ATR成否判定・MFE/MAE計測） |
| [#19](https://github.com/reisun/chart-pattern-alert/pull/19) | 時間足別パターン検出チューニング |
| [#20](https://github.com/reisun/chart-pattern-alert/pull/20) [#21](https://github.com/reisun/chart-pattern-alert/pull/21) | 出来高判定による confidence 加点 |
| [#22](https://github.com/reisun/chart-pattern-alert/pull/22) | 上位足トレンド整合 |
| [#23](https://github.com/reisun/chart-pattern-alert/pull/23) | 通知レベル4段階化 |
| [#24](https://github.com/reisun/chart-pattern-alert/pull/24) | 未読バッジ + 検出履歴パネル |
| [#25](https://github.com/reisun/chart-pattern-alert/pull/25) | API バージョン文字列改善 |
