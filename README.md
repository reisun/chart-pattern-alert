# chart-pattern-alert

指定した株の買い時・売り時パターンをブラウザ通知する Web アプリ。

- **フロント**: Vite + TypeScript + lightweight-charts → GitHub Pages
- **API**: FastAPI + yfinance → 自宅 Docker ネットワーク内公開
- **パターン**: ダブルボトム／ダブルトップ他、計 10 種（MVP は 2 種）

詳細設計は [`docs/`](./docs/) 配下を参照してください。

## ステータス

Bootstrap 中（feature/bootstrap）。詳細な起動手順は L1 完了後の PR で追記されます。
