# TASK.md — 残課題

MVP (L1–L4) はデプロイ済（[公開 URL](https://reisun.github.io/chart-pattern-alert/)）。運用立ち上げ（A1–A3）完了、本番 API 到達済。以下は今後の拡張タスク。

---

## A. 運用立ち上げ（ユーザー側アクション）

本番 API 到達のために必要。完了すると公開 URL から実株価データが取得できるようになる。

### A1. 上流プロキシ（HTTPS 終端）の整備

- **状態**: 完了（`reverse-proxy` リポジトリに相乗り、`https://reisun.asuscomm.com/chart-pattern-alert/` で公開）
- **選択肢**: 同一ワークスペースの共用 `reverse-proxy` に相乗り／本プロジェクト専用リバプロ（Traefik / Nginx / Caddy）を単独導入／マネージド LB 等
- **本プロジェクトへの要件**（どの選択肢でも共通）:
  - 共有 Docker ネットワーク `chart-pattern-alert-net` を `external: true` で参照
  - Upstream: `api:8000`、healthcheck path: `/health`
  - 公開パス: `/` 直下にマウント推奨（`/api/` にする場合は後述 A3 の値と整合）
- **参照**: [`docs/infra/upstream-proxy-contract.md`](./docs/infra/upstream-proxy-contract.md)

### A2. GitHub PAT に `actions:write` スコープ追加

- **状態**: 完了（Variables: write + Actions: write 付与済、2026-04-18 の手動デプロイで疎通確認）
- **手順**: GitHub Settings → Developer settings → Personal access tokens → 該当 PAT を編集し `repo` + `actions:write`（Fine-grained なら Actions Variables: Read and write）を付与
- **必要理由**: A3 の Variable 設定のため

### A3. `VITE_API_BASE_URL` を本番値に更新

- **状態**: 完了（`https://reisun.asuscomm.com/chart-pattern-alert` を設定、2026-04-18 に手動デプロイ済。バンドル内で本番 URL が `||` の左辺に埋め込まれ localhost フォールバックには到達しない）
- **前提**: A1 完了で公開 URL 確定、A2 完了で gh CLI 実行可能
- **手順**:
  ```bash
  gh variable set VITE_API_BASE_URL --body "https://<home-domain-or-path>" --repo reisun/chart-pattern-alert
  gh workflow run deploy.yml --repo reisun/chart-pattern-alert
  gh run watch --repo reisun/chart-pattern-alert
  ```
- **確認**:
  ```bash
  curl -sI https://reisun.github.io/chart-pattern-alert/
  # 新しいビルドの JS に本番 URL が焼き込まれているか
  curl -s https://reisun.github.io/chart-pattern-alert/ | grep -oE '/chart-pattern-alert/assets/[^"]+\.js' | head -1
  ```

### A4. API 側 CORS に上流プロキシ公開オリジンを追加（必要時のみ）

- **状態**: 現在 `CORS_ORIGINS=https://reisun.github.io,http://localhost:5173` が既定
- **必要ケース**: 上流プロキシが GitHub Pages とは別オリジンを提示する構成の場合
- **手順**: `.env` の `CORS_ORIGINS` にカンマ区切りで追加 → `docker compose restart api`

---

## B. 段階拡張（実装タスク）

機能拡張。優先度は上から推奨順。各項目は **単独で lead-task 1 本** に相当する粒度。

### B1. 残 8 パターン検出の実装

- **状態**: 完了（[#9](https://github.com/reisun/chart-pattern-alert/pull/9)）。全10パターンの検出・Feed表示・マーカー描画・テスト実装済
- **実装内容**:
  - 逆三尊 / 三尊、上昇 / 下降フラッグ、上昇 / 下降トライアングル、Flip Up / Flip Down の8パターンを追加
  - 線形回帰ユーティリティ (`regression.ts`) を追加
  - `renderFeed` を全10パターン表示対応に修正
  - 合成フィクスチャ10種 + テスト34件（全 pass）

### B2. 上位足整合の簡易表示

- **状態**: 設計書言及あり（[`docs/architecture.md`](./docs/architecture.md), [`docs/patterns/common.md`](./docs/patterns/common.md)）。未実装
- **内容**: たとえば 15m 足で検出されたパターンの信頼度を 1h 足のトレンド方向で加点/減点
- **実装案**: `detectAll` 呼び出し時に上位足 OHLCV を別途取得しトレンド方向を判定、`DetectedPattern.confidence` を補正

### B3. 出来高判定による confidence 加点

- **状態**: 設計書言及あり（[`docs/patterns/common.md`](./docs/patterns/common.md) §2）。未実装
- **内容**: ネックライン突破足の出来高が直近 N 本平均より高ければ `confidence += 0.1` 等
- **前提**: `Candle.volume` は既に取得済（API 側で埋めている）

### B4. 複数銘柄タブ UX 改善

- **状態**: データ構造は複数銘柄対応済。UI は最小限
- **内容**: 通知履歴画面、銘柄別ステータス一覧、タブドラッグ並べ替え、未読バッジ等

### B5. データソース切替（TwelveData / yfinance / Finnhub / Alpha Vantage / J-Quants）

- **状態**: 完了。`DATA_SOURCE` 環境変数で twelvedata / yfinance / finnhub / alphavantage / jquants を切替可能。デフォルトは TwelveData（無料枠 800req/日、米国株の日足・分足対応）。キャッシュ TTL を 300秒に延長
- **内容**: TwelveData（デフォルト）、Finnhub、Alpha Vantage、J-Quants の 4 データソースを追加実装。環境変数で切替可能
- **動機**: yfinance のレートリミット問題を TwelveData で根本解決
- **日本株対応**: J-Quants API（JPX 公式）を実装。`JQUANTS_API_KEY` 設定時、日本株シンボル（4-5桁数字）は自動で J-Quants にルーティング（`AutoRoutingDataSource`）。Free プランは日足のみ・12週遅れデータ（日付範囲を自動調整）
- **J-Quants interval フォールバック**: J-Quants 未対応 interval（5m等）時は default source にフォールバック（[#10](https://github.com/reisun/chart-pattern-alert/pull/10)）

---

## C. 小改善（気づき次第）

- 本番デプロイ後の CDN キャッシュ確認（初回 504/503 のユーザー影響）
- `api/app/__init__.py` のバージョン文字列を `importlib.metadata` 読み取りに
- Dev 時の Vite port 競合回避（現状は `strictPort: false` で自動繰上げだが、固定したいケース用に明示オプション）
- Safari iOS での Notification 挙動確認

---

## 完了済み（参考）

| Lead | 範囲 | PR |
|---|---|---|
| L1 | Bootstrap & Design (scaffold + docs) | [#1](https://github.com/reisun/chart-pattern-alert/pull/1) |
| L2 | Backend API (FastAPI + yfinance) | [#2](https://github.com/reisun/chart-pattern-alert/pull/2) |
| L3 | Frontend MVP + Pattern Detection | [#3](https://github.com/reisun/chart-pattern-alert/pull/3) |
| L4 | Integration & Deploy (Actions + Pages) | [#4](https://github.com/reisun/chart-pattern-alert/pull/4) |
| B1 | 残8パターン検出ロジック・テスト・Feed表示 | [#9](https://github.com/reisun/chart-pattern-alert/pull/9) |
| fix | J-Quants interval フォールバック | [#10](https://github.com/reisun/chart-pattern-alert/pull/10) |
| fix | 日本株 interval 制限（J-Quants制約） | [#11](https://github.com/reisun/chart-pattern-alert/pull/11) |
| feat | パターン ON/OFF フィルタ・日本語ラベル | [#12](https://github.com/reisun/chart-pattern-alert/pull/12) |
| feat | パターン検出精度改善（ATR・クールダウン・厳格化） | [#13](https://github.com/reisun/chart-pattern-alert/pull/13) |
| feat | 主要銘柄の企業名オートコンプリート機能 | [#14](https://github.com/reisun/chart-pattern-alert/pull/14) |

公開 URL: https://reisun.github.io/chart-pattern-alert/
