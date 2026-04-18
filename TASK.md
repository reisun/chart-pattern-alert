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

### B1. 残 7〜8 パターン検出の実装

- **状態**: 設計書はすべて書き下ろし済。実装は MVP の 2 種のみ
- **対象**:
  - 逆三尊 / 三尊 — [`docs/patterns/inverse-head-and-shoulders.md`](./docs/patterns/inverse-head-and-shoulders.md), [`head-and-shoulders.md`](./docs/patterns/head-and-shoulders.md)
  - 上昇 / 下降フラッグ — [`ascending-flag.md`](./docs/patterns/ascending-flag.md), [`descending-flag.md`](./docs/patterns/descending-flag.md)
  - 上昇 / 下降トライアングル — [`ascending-triangle.md`](./docs/patterns/ascending-triangle.md), [`descending-triangle.md`](./docs/patterns/descending-triangle.md)
  - 切り下げ / 切り上げレジサポ転換 — [`resistance-support-flip-up.md`](./docs/patterns/resistance-support-flip-up.md), [`resistance-support-flip-down.md`](./docs/patterns/resistance-support-flip-down.md)
- **実装場所**: `web/src/patterns/` 配下（既存の `doubleBottom.ts` と同じ構成で追加 → `index.ts` の `detectAll` に統合）
- **テスト**: 各パターン用の合成フィクスチャを `web/src/dev/fixtures.ts` に追加し `web/tests/*.spec.ts` で検証
- **マーカー略号**: common.md に既定あり（`iH&S`, `H&S`, `A-Flag`, `D-Flag`, `A-Tri`, `D-Tri`, `Flip↑`, `Flip↓`）

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

### B5. データソース切替（yfinance ↔ Finnhub / Alpha Vantage）

- **状態**: 完了。`DATA_SOURCE` 環境変数で yfinance / finnhub / alphavantage を切替可能。デフォルトは yfinance（Finnhub・Alpha Vantage は無料枠で OHLCV 分足が制限されるため）。キャッシュ TTL を 300秒に延長しレートリミット耐性を向上
- **内容**: 環境変数 `DATA_SOURCE` で切替、Finnhub / Alpha Vantage 実装を追加
- **動機**: yfinance のレート制限耐性向上、将来の有料プラン契約時に即切替可能

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

公開 URL: https://reisun.github.io/chart-pattern-alert/
