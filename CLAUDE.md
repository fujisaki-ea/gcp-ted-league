# GCP TED League

## 作業ルール

- コード変更後、適切なタイミングでコミット・pushするか確認する
- 依頼内容に関係するファイルだけ読む（TOKEN節約）
- 連動が必要な場合のみ追加で読む

## セクション別ファイルマップ

依頼内容からセクションを判断し、必要なファイルのみ読む。

| 依頼内容 | 主に読むファイル | 連動で読むファイル |
|---|---|---|
| スコア・試合結果 | `js/scores.js` | 順位に影響 → `js/standings.js` |
| 日程・スケジュール | `js/schedule.js` | — |
| 順位表・成績 | `js/standings.js` | スコア計算が必要 → `js/scores.js` |
| 画面表示・見た目 | `js/ui.js`, `css/style.css` | 表示データによって各js |
| データ保存・読込 | `js/firebase.js` | 対象データのセクションjs |
| ログイン・権限 | `js/auth.js` | — |
| 画面構造・HTML | `index.html` | `css/style.css` |

### js/配下 詳細

| ファイル | 役割 |
|---|---|
| js/auth.js | 認証・ログイン（doLogin, quickLogin, doLogout, セッション管理） |
| js/firebase.js | Firebase初期化・接続（Realtime Database, App Check, 匿名認証, パスワードハッシュ管理） |
| js/schedule.js | 日程管理（スケジュール表示・追加） |
| js/scores.js | スコア入力（試合結果の送信・承認フロー） |
| js/standings.js | ロビン表・成績（順位表・対戦成績の表示） |
| js/ui.js | UI共通（データ管理, 画面遷移, チーム管理, 試合履歴, 通知） |
