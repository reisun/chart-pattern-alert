# Web (Vite + TypeScript + lightweight-charts)

アプリ本体のフロントエンド。L3 (Frontend MVP) で本実装します。

## 概要

- Vite + TypeScript
- チャート: [lightweight-charts](https://github.com/tradingview/lightweight-charts)
- 通知: Notification API + Service Worker（前面通知）
- 状態永続化: localStorage
- デプロイ: GitHub Pages (base path `/chart-pattern-alert/`)

## 起動（L3 以降）

```bash
cd web
npm install
npm run dev
```

## 設計書

- 画面設計: [`docs/frontend/screens/`](../docs/frontend/screens/)
- サービス層: [`docs/frontend/services/`](../docs/frontend/services/)
- パターン検出: [`docs/patterns/`](../docs/patterns/)
