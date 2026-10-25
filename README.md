# TJAPlayer3 Web (Chromebook 版) — 曲選択・プレイ以外の画面

TJAPlayer3-Develop-ReWrite の **スタートアップ / タイトル / コンフィグ / 曲読み込み / リザルト / 終了 / スキン切替** を
ブラウザ（HTML5 Canvas）に移植したものです。曲選択・段位選択・プレイ画面・音楽再生は別担当の想定で、
差し込み口（スタブ）だけ用意してあります。

## 起動

ブラウザの制限で `index.html` をダブルクリックしても動きません（画像・音声の読み込みが `file://` で止まるため）。
どれか1つの方法で配信してください。

1. **Linux (Crostini) が使える Chromebook**: ターミナルで `python3 serve.py` → `http://localhost:8000`
2. **Linux なし**: Chrome ウェブストアの「Web Server for Chrome」でこのフォルダを指定
3. どこかの静的ホスティング（GitHub Pages など）にフォルダごと置く

起動したらまず Enter / クリック / タップで開始（ブラウザの自動再生制限を解くための操作です）。

## 操作

| 画面 | キー | タッチ/クリック |
|---|---|---|
| 共通 | Enter / F / J = 決定、Esc = 戻る、D / K = 左右、矢印キー | 各ボタンをタップ |
| タイトル | **P を長押し**でバナパス読み込み（短く押すと失敗演出） | 画面中央を長押し |
| タイトル | ←→ で選択、Enter で決定、**Tab または Shift+F1 で設定**、Esc で終了 | 右下の「設定」ボタン |
| 設定 | ↑↓ 項目、←→ 値の変更（長押しで加速）、Enter 決定、Esc 戻る | 行をタップ（左半分=決定 / 値の左右=増減） |
| リザルト | 1回目で演出スキップ、2回目で次へ | タップ |
| 全体 | F2 = FPS 表示、F12 = スクリーンショット保存 | |

## 実装した画面

- **起動**: スキン画像・サウンド・フォントを並列で読み込み → Readme 画面 → 開始
- **タイトル**: コイン待機（点滅）→ バナパス読み込み（成功/失敗の演出）→ プレイヤー選択（1P/2P・ネームプレート）→ モード選択（バーが展開・スライド、どんちゃん登場）。原作 `CStageタイトル.cs` の式をそのまま移植
- **コンフィグ**: システム / 太鼓 / 表示 / ユーザー / キー設定。値は自動保存（localStorage）
- **ユーザー**: 複数ユーザーの作成・削除、名前・称号・称号の色・段位・段位の色・金枠の編集（日本語入力OK）。金/紫のネームプレートには光の演出。成績（回数・クリア・フルコン・全良・ハイスコア）を保存
- **曲読み込み**: 曲名プレートの演出。`loader` に Promise を渡すと読み込み完了まで待つ。段位用の演出あり
- **リザルト**: ゲージ → 判定数 → スコアの順に原作どおりのタイミングで表示。満タン時は虹ゲージと魂の炎。王冠・どんちゃん・富士山・シャッター演出を追加
- **終了**: 終了演出 → 「タイトルへ戻る」
- **スキン切替**: スキン変更後に読み込み直し

## 別担当の画面との繋ぎ方

`js/stages/stubs.js` が曲選択・段位選択・プレイの仮実装です。本実装を作ったら `js/main.js` の
`register('songselect', ...)` / `register('danselect', ...)` / `register('play', ...)` を差し替えるだけで繋がります。

```js
// 曲選択 → 曲読み込み（loader は曲データの読み込みなど。省略可）
app.go('loading', { song: { title, subtitle, difficulty: 3, dan: false }, loader: () => loadSong(), next: 'play' });
// プレイ → リザルト
app.go('result', { song: { title, difficulty: 3 },
  result: { perfect, great, miss, roll, maxCombo, score, gauge: 0-100, clear: 0失敗/1クリア/2フルコン/3全良 } });
```

ステージは `enter(params)` / `update()` / `draw(r)` / `leave()` を持つクラスです（`js/core/stage.js`）。
`update()` が `{to:'画面名', params}` を返すと遷移します。

## 120FPS について

- 描画は **全画像を ImageBitmap にデコード済み**で、毎フレームは `drawImage` だけ。文字は一度だけ画像化してキャッシュ
- アニメーションはすべて **ミリ秒の経過時間基準**（原作のカウンタと同じ値）なので、60Hz でも 120/144Hz でも速さが変わりません
- ヘッドレス Chromium（ソフトウェア描画）での 1 フレームの実コスト: タイトル ≈1〜2.6ms、コンフィグ ≈1.5ms、曲読み込み ≈2ms、リザルト最大 ≈5ms（1920px 幅）。JS 側の処理は毎フレーム 0.1〜0.3ms
- ただし **ブラウザは画面のリフレッシュレート以上には描画しません**。60Hz の Chromebook では 60FPS が上限で、120FPS 以上は 120Hz 以上のディスプレイが必要です（設定 → システム → 描画FPSの上限、F2 で実測表示）
- 重いときは 設定 → 描画解像度 を下げてください

## ファイル構成

```
index.html / serve.py
js/core      clock(カウンタ) renderer(描画) text(文字キャッシュ) assets input audio settings(設定とユーザー) stage sounds
js/stages    startup title config loading result ending changeskin stubs(別担当の仮画面)
js/ui        nameplate
skins/0.JpnNijiiro  元スキンの画像(可逆WebP変換)とサウンド / manifest.json
tools/prep_assets.py  スキンの PNG → WebP 変換と manifest 生成
```

`Sounds/Dan/` の wav（段位選択・段位プレイ用）は含めていません。Songs フォルダ・DLL などは Web 版では使わないため含めていません。

## ライセンス

元ソフトのライセンスは `licenses/` を参照してください。同梱の `ipag.ttf` は IPA フォントライセンスです。
