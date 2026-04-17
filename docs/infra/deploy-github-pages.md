# Deploy — GitHub Pages

## 方針

- **GitHub Actions** 経由でデプロイ（`actions/deploy-pages`）
- `gh-pages` ブランチは使わず、Actions-sourced の Pages
- トリガ: `main` への push（feature ブランチは build のみ）

## 事前設定（初回のみ・人間確認）

GitHub リポジトリで:
1. Settings → Pages → Build and deployment → Source を **GitHub Actions** にする
2. （任意）Environment: `github-pages` の保護を確認

## Vite 設定

`web/vite.config.ts` で `base: '/chart-pattern-alert/'` を指定する。
相対パスの aset/SW の scope がこれに依存する。

## ワークフロー（イメージ）

`.github/workflows/deploy.yml`

```yaml
name: Deploy GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - run: npm run build
        env:
          VITE_API_BASE_URL: ${{ vars.VITE_API_BASE_URL }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: web/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## 環境変数の注入

- `VITE_API_BASE_URL` は GitHub Repository Variables（Settings → Secrets and variables → Actions → Variables）で設定
- これは秘密情報ではないので Variables 扱いで可

## 公開 URL

- `https://reisun.github.io/chart-pattern-alert/`
- Vite `base` とスラッシュで揃える

## ローカルビルド確認

```bash
cd web
VITE_API_BASE_URL=http://localhost:8000 npm run build
npm run preview
```

## トラブル

- 404: `base` 未設定や `base` と URL の不一致
- SW 登録失敗: `scope` 未指定、または `base` と scope の不一致
- API 到達不可: `VITE_API_BASE_URL` 未設定、CORS 設定漏れ

## 将来

- プレビュー環境: `PR ごとに` ArtifactUpload → コメント追加（時間があれば）
