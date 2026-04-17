# Service Worker & Notification

ブラウザ通知の実装指針。

## スコープ

- `/chart-pattern-alert/` に配置（Vite `base` と揃える）
- 登録は `navigator.serviceWorker.register('sw.js', { scope: '/chart-pattern-alert/' })`
- 初回登録は `main.ts` の先頭で

## 通知の出し方

タブが「可視」か「バックグラウンド（同ブラウザで他タブ）」の両方で通知を出したい。

### パターン A: ページ側から `new Notification(...)`（シンプル）

- ページ内で検出 → `new Notification(title, { body, icon, tag, renotify })`
- 制約: 一部ブラウザでは SW 経由でないと通知が出ない場合あり
- `tag` で同種通知の重複抑制（同 symbol + kind は同 tag）

### パターン B: SW 経由で `registration.showNotification(...)`（推奨）

- ページ → `postMessage(swRegistration.active, { type: 'notify', ... })`
- SW がメッセージを受けて `showNotification`
- `notificationclick` イベントでウィンドウをフォーカス（`clients.matchAll()` → `focus()` or `clients.openWindow('/chart-pattern-alert/?symbol=...')`）

MVP は **パターン B** で実装し、タグ方式で重複抑制する。

## 通知の内容

- `title`: `[{symbol}] {pattern_name}`
- `body`: `方向: buy|sell / 時刻: {HH:mm} / 近値: {close}`
- `tag`: `${symbol}:${kind}:${markerTimeBucket}`（同ろうそく内は 1 通知）
- `icon`: `/chart-pattern-alert/icon-192.png`

## 通知のオンオフ

- 初期状態は OFF（`Notification.permission === 'default'`）
- `Enable` ボタンで `requestPermission()`。Settings で OFF にした場合は発火側でガード

## バックグラウンド Push（スコープ外）

- Web Push には VAPID 鍵・サーバー配信が必要。本プロジェクトでは扱わない
- ドキュメントに「タブを閉じた完全バックグラウンドでの通知は非対応」と明記

## 落とし穴

- GitHub Pages の base path `/chart-pattern-alert/` と SW scope を揃えないと登録に失敗する
- Vite dev 時は `dev-sw` を使うか、MVP は本番ビルド時のみ SW を有効でも可
