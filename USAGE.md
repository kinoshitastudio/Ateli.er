# Ateli.er 使い方マニュアル（日本語版）

> 最終更新: 2026-04-28 / multi-user 稼働中（Phase B-3b + C-1 + C-2 + D-1 完了）
> English version: [USAGE.en.md](./USAGE.en.md)

---

## 0. 設計思想

- **アプリは何もホストしない**。音源・画像はすべて自分の Google Drive / Dropbox / iCloud / 任意のホスティング先に置き、URL だけを Ateli.er に貼る。
- 保存されるのは **目録（テキスト・URL・参照）だけ**。
- データ層は localStorage を一次キャッシュ、**Supabase Postgres に `user_state` JSONB 一行で丸ごと sync**。端末横断で同じデータが見える。
- 構造は **Are.na 的な Block × Channel**。Block は 4 種類（audio / image / text / url）、Channel は号や主題ごとの束。
- **配色:** paper `#DCDBD5` (warm beige) + ink `#1600A2` (deep ink-blue)。スタジオ全体のモノクロームとは独立した、Ateli.er 固有のキーカラー。

---

## 0a. Login / Signup（Phase B-3a — Supabase 実認証）

初回アクセスすると **landing 画面** が表示される。

### Sign up（新規登録）
1. 右上の `Sign up` ボタンクリック
2. 3項目入力:
   - **invite code**（招待コード）: `invites` テーブルで実検証。`max_uses` と `expires_at` をチェック
   - **email**: マジックリンク受信用
   - **handle**: 表示名（英数 / 日本語可）。`profiles` と user_metadata 双方に保存
3. `— request access` クリック → Supabase が magic link を送信 → 受信箱のリンクをクリック → 戻ってきて入室

### Log in（再ログイン）
1. 右上の `Log in` ボタン
2. **email** のみ入力
3. `— send magic link` → メール受信 → クリック → session 復帰

### Settings（右下の `@handle ⚙` をクリック）
- **avatar URL**: 画像直 URL（Drive / Dropbox 共有 URL OK。★Google Photos の URL は不可★ — 後述 4-B 参照）
- **handle** の編集
- **email** は read-only 表示
- **log out**（赤色、確認ダイアログ → リロード）

### 開発用 URL helper
- `?landing=1` を付けて開く → session 有でも landing 強制表示
- `?logout=1` を付けて開く → session クリア + landing 表示
- 通常は Supabase session が localStorage にある間は landing スキップ → 直接 Ateli.er

### email rate limit に当たったら
- Supabase 無料枠は ~3-4 通/時間。テストで叩きすぎると `email rate limit exceeded`
- 1 時間待つ、あるいは Supabase Studio → Authentication → Users → Add user で手動作成
- launch 時は Custom SMTP（Resend / Mailgun / SendGrid 等）に切り替えて制限回避

---

## 0b. 端末横断同期（Phase B-3b）

- 操作は全て localStorage に即時反映（snappy UX）
- `Storage.setItem` を monkey-patch し、`SYNC_KEYS` への書き込みを 1.5 秒
  debounce で `user_state` JSONB blob に push
- sign-in / reload 時に DB から pull → localStorage を上書き → 再描画
- `beforeunload` で keepalive fetch flush（タブを閉じても直前の変更が落ちない）
- 旧 Sync URL 機能（手動 export / import）は引き続き動作。緊急用バックアップ

実装上の注意: Supabase JS SDK の query builder がこの環境でハングするため、
`profiles.update` と `public_blocks` 系・`user_state` 系は全て **生 fetch + REST**
で書いてある。10 秒タイムアウト付き。

---

## 0c. Public / Explore（Phase C-1）

### block を公開する
1. 自作 block を edit で開く
2. 一番下の **`visibility — show on Explore`** にチェック → save
3. block modal の head に `公開中 / public` の濃紺 pill が出る
4. channel 詳細の item list でも小さい `public` マーク表示

### 内部で起きていること
- `isPublic` フラグが block に付く
- save の度に `atelierPublic.sync(block)` が走る
  - true → `public_blocks` テーブルに upsert
  - false → row を delete
- 削除も同期（`deleteBlock` で `public_blocks.remove` が呼ばれる）

### Explore タブ（モーダル上部）
- `— residents`: 全 profiles 一覧（@handle + avatar + joined ago）
- `— public blocks`: 全ユーザーの公開 block を ts 降順で 60 件
  - 自分の block は filter out（自分のものを自分の channel に connect する意味がない）
  - 各 card に **`— by @handle · age`** の帰属表記

---

## 0d. 他ユーザーの block を Connect（Phase C-2）

### 流れ
1. Explore → `— public blocks` の任意 card をクリック
2. block modal が開く（read-only モード、breadcrumb がイタリックで `@otherHandle / theirChannel / blockTitle`）
3. action 部分に **`+ connect to my channel`**
4. クリック → 中央 overlay に自分の channel 一覧
5. channel を選ぶ → toast `connect しました → [channel name]` → action が `— disconnect` に flip
6. その channel に行くと、外部 block が **`— by @otherHandle`** 帰属付きで item list に並ぶ
7. クリックで再度 read-only modal、`— disconnect` で外せる

### snapshot 戦略（重要）
- connect した瞬間に block の payload を **コピー** して `atelier_external_blocks_v1` に保存
- 上流 owner が edit / unpublish / delete しても、connect 済みの snapshot は変わらない
- 利点: render が速い、network 不要、上流が消えても見える
- 欠点: 上流の編集が反映されない（Phase C-3 で「refresh from upstream」追加予定）

---

## 0e. Cross-user コメント + 通知（Phase D-1）

### コメント書く側
- block を開いて下部のコメント欄に入力 → 確認 → submit
- ローカルにキャッシュ + Supabase の `traces` テーブルに insert
  - external block へのコメントは `block_owner_id` を上流 owner に向ける
  - 自分の block へのコメントは `block_owner_id` = 自分

### 通知を受ける側 (block の owner)
- 自分の block に他ユーザーが新規コメント → 3 箇所に **● 濃紺 pulse**:
  1. **topbar の `@taka` の隣** (全体気付き)
  2. **モーダル上部の Comment タブ** (タブ単位の気付き、block modal 内 tab strip にも)
  3. **Comment タブを開いた時の `— incoming` セクション**で、未読の各行の左に小さい ●
- ● を **pill (一番上)** でクリック → toast `既読にしました` → 全部消える
- 既読の watermark は localStorage の `atelier_traces_watermark_v1` に保存
  (per-device。`user_state` には sync しない、各端末で独立した既読状態)

### `— incoming` セクション
- 自分の block への他ユーザーコメントが新しい順に並ぶ
- 各行: `@handle  コメント本文  ↗ block_id  X分前`
- 行クリック → 該当 block を開く

### 既読 timing 仕様
- 既読 watermark は markAllRead 時に `max(server max(ts), Date.now()) + 1` に。
  client/server の clock 差分を吸収する設計

---

## 1. 用語・データ構造

| 用語 | 意味 |
|---|---|
| **Block** | 最小単位。種類は audio / image / text / url の 4 つ |
| **Channel** | Block を束ねる場。例：`Issue 00`, `森と音楽`, `Tape Letters` |
| **state** | Channel の状態。`current`（稼働中）/ `future`（未公開ドラフト）/ `past`（アーカイブ＝読み取り専用） |
| **connectedTo** | Block が複数の Channel に属する仕組み（Are.na の Connect） |
| **trace（足跡 / コメント）** | 短いテキストコメント。曲に紐付くか untethered |

---

## 2. 画面の開き方

| 操作 | やり方 |
|---|---|
| Manifesto を開く | 左上 `— manifesto` |
| **ホームに戻る** | 左上の **`Ateli.er` ロゴ** をクリック → 全モーダルを閉じてトップに戻る |
| 自分のチャンネル（4 タブ） | 右上 `— traces (n)` |
| **Feed**（全 Block の時系列ストリーム） | モーダル上部の **Feed** タブ |
| アトリエ（管理画面） | 右上 `— atelier` ← **Block 追加・編集・削除はここ** |
| 楽曲詳細（個別 Block 表示） | マーキー上の歌詞・タイトル・画像をクリック |
| 言語切替 | 右上の `EN / JP` トグル |

### 戻り方

- 各モーダル右上の **`← back`** または `— close`
- ブラウザの戻るボタン（**1回押しで 1段階戻る**）
- ロゴクリックで一気にホームへ
- Feed 経由で Block を開いた時は **`← back to feed`** ボタンも表示

---

## 3. Channel の操作

### 3-1. Channel を新規作成

`— atelier` → アップロードフォーム上部の **`channel`** セレクター → **`+ create new channel…`** を選択。

| 項目 | 中身 |
|---|---|
| label | チャンネル名（例: `森と音楽`） |
| main phrase | チャンネルのメインフレーズ（任意） |
| meta | 副題（例: `now playing`, `winter 2026 · drafts`） |
| lang | `mixed` / `ja` / `en` |

新規作成された Channel は **デフォルトで `state: current`**、すぐにブロックを置ける。

### 3-2. Channel を編集

1. `— traces (n)` → **My Channel** タブ
2. 編集したい Channel カードをクリック → drill-in
3. 右上 **`— edit`** をクリック → 編集モード開始
4. フォームで以下を編集できる：
   - **label**（チャンネル名）
   - **main phrase**
   - **meta**
   - **lang**
   - **state**
5. 編集モード内では **ブロックの並び順** も変更可能（次項参照）
6. **`— save`** → 確認ポップアップで OK

### 3-3. ブロックの並び替え

- Channel 編集モードに入ると、フォーム下部に「— ブロックの並び順」セクションが表示される
- 各ブロック行に `↑` `↓` ボタン
- ↑↓ クリックは **pending 状態**（即時保存しない）
- **`— save`** で並び順を確定
- **`— cancel`** で破棄

### 3-4. Channel の `state`（重要）

| state | 意味 | Upload セレクターに出る？ |
|---|---|---|
| **current** | 稼働中。新規ブロックを受け入れる | ✓ |
| **future** | ドラフト。新規ブロックを受け入れる（未公開号として表示） | ✓ |
| **past** | アーカイブ。読み取り専用。風化していく号 | ✗（読み取り専用なので除外） |

> ⚠️ 新しく作ったチャンネルが Upload の channel セレクターに出てこない場合 → そのチャンネルの **state が `past`** になっている可能性が高い。My Channel から該当チャンネルを編集 → state を `current` に変更すれば復帰する。

### 3-5. Channel を削除

drill-in 画面右上 **`— all delete`** → 確認ポップアップ。

カスケード削除：
- そのチャンネルを primary とするブロックも一緒に削除
- 他のブロックの `connectedTo` 参照からも除去
- placeholder（seed）の TRACKS も削除

### 3-6. Channel の検索 / 共有

- 🔍 **検索アイコン**: チャンネル内のブロックをタイトル/キャプション/本文で絞り込み
- ↑ **シェアアイコン**: チャンネル URL を Web Share / クリップボードコピー（`#ch=ID` 形式）

### 3-7. シードチャンネル（最初から入っているもの）

| ID | label（初期値） | state |
|---|---|---|
| `-01` | Archive −01 | past |
| `00`  | Archive 00 | current |
| `01`  | Archive 01 | future |
| `ch-yoake`  | 夜更けの中庭 | current |
| `ch-studio` | Studio Notes | current |
| `ch-tape`   | Tape Letters | current |

これらは renaming で実質「自分のチャンネル」として再利用できる。例：Archive −01 を「森と音楽」にリネームしたら、state も `past` のまま継承するので、新規ブロックが置けない状態になる。state も忘れずに変える。

---

## 4. Block の追加（4 種類）

`— atelier` → 上部の 4 つのタブから種類を選んでフォームを書く → **`↳ place in channel`**。

### ⚡ ホスティング決定早見表（迷ったらここ）

| やりたいこと | 推奨ホスト | 使えるか |
|---|---|---|
| **音源（mp3 等）** をアップ | **Dropbox** ★ 一択 | Drive ❌（CORP で再生不可、仕様レベルの制約） |
| | iCloud | △ 未検証、再生失敗多い |
| | 自前サーバー | ✓（CORS が許可されてれば） |
| **画像（jpg/png）** をアップ | **Drive 共有リンク** ✓ または **Dropbox** ✓ | どちらも自動変換あり、安定 |
| | **Google Photos の共有リンク** ❌ | viewer ページの URL で画像直接取得不可、`<img>` 不可 |
| | 任意の直リンク | ✓（CORS 制約あり） |
| **テキスト** | （ホスト不要、本文を直接入力） | — |
| **外部 URL** | （任意のサイト URL を貼るだけ） | — |
| **avatar URL**（Settings） | **Drive** または **Dropbox** | Google Photos ❌ |

#### 共通の落とし穴
- ❌ **Google Photos の `https://photos.app.goo.gl/...` は使えない**（viewer ページで画像直 URL でない、CORS / hotlink 防止）
- ❌ **Google Drive で audio** は再生不可（`Cross-Origin-Resource-Policy: same-site` ヘッダにより外部からの再生がブロックされる仕様）
- 困ったら → **Dropbox に置く** が安全。画像は Drive でも OK。

→ 詳細は各セクション（A/B/C/D）+ セクション 11（URL 変換ロジック早見表）。

---

### A. Audio Link（音源）

最も中核。曲を Drive 等にアップロードしてから来る。

| 項目 | 中身 |
|---|---|
| **channel** | どの Channel に置くか選択（state が past 以外） |
| title | 曲のタイトル |
| artist | alias |
| **audio url** | 共有 URL（自動で直リンクに変換される） |
| catchphrase | 漂わせたいキャッチコピー（≤40字） |
| tags | タグ（カンマ区切り） |
| image url | 任意。質感画像の URL |
| support | PayPal / Buy Me a Coffee の URL |

#### audio url の取り方と自動変換

> ⚠️ **重要：Google Drive は audio で使えない。**
> Drive のレスポンスには `Cross-Origin-Resource-Policy: same-site` ヘッダが付いており、別オリジンの Web ページからの埋め込み再生がブラウザレベルでブロックされる（hotlink 防止のため Google が意図的に設定）。
> CORS は許可されていても CORP が阻むので回避不可能。**Dropbox を使うこと**。

##### Dropbox（推奨）

1. ファイルアップ → 右クリック → **コピーリンク**
   `https://www.dropbox.com/scl/fi/.../song.mp3?rlkey=...&dl=0`
2. そのまま貼る → 内部で `dl.dropboxusercontent.com/...?raw=1` に変換

##### iCloud
- iCloud Drive のファイル → 共有メニュー → **リンクをコピー**
- 変換ロジック未実装。ストリーミング可否は要検証
- 失敗するなら Dropbox 推奨

##### 直リンク（自分のサーバーに置いている場合）
- そのまま貼る。変換不要

---

### B. Image Link（画像）

映画のキャプチャ、テクスチャ画像、外部のフォト記事の画像など。曲とは独立した Block として漂わせられる。

| 項目 | 中身 |
|---|---|
| **image url** | 画像の直 URL（Drive / Dropbox 共有 URL も可） |
| caption | 「berlin, march · wet pavement」のような短い説明 |
| source | 「photo by ___」「from ___ article」など |

#### image url の自動変換

##### Google Drive
- 入力: `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`
- 内部変換: `https://lh3.googleusercontent.com/d/FILE_ID=w2000`
- 理由: 旧来の `uc?id=...` は `<img>` で安定して表示されない（リダイレクト・CORS 制限）。`lh3.googleusercontent.com` は Drive サムネイラ経由で安定

##### Dropbox
- 入力: `https://www.dropbox.com/s/xxx/img.jpg?dl=0`
- 内部変換: `https://dl.dropboxusercontent.com/s/xxx/img.jpg?raw=1`

##### Google Photos（★使用不可★）
- 入力: `https://photos.app.goo.gl/...` のような共有リンク
- ❌ **使えない**。理由:
  - 共有リンクは画像本体ではなく viewer ページの URL
  - 直接の画像 URL を取得する公的な手段が無い
  - CORS / hotlink 防止により `<img src>` での読み込み不可
- **回避策**: 画像を Drive にアップロードし直して、Drive の共有リンクを使う

→ メイン画面の画像レーンに流れる。クリックで全画面プレビュー。

---

### C. Text（テキスト）

曲ではない、純粋なテキストブロック。歌詞の断片、メモ、引用など。

| 項目 | 中身 |
|---|---|
| text | 〜240字 |
| style | **lyric**（歌詞レーンを漂う）／ **prose**（チャンネル内のみ表示） |

- `lyric` 選択時 → メイン画面の Phrase レーンに italic で漂う
- `prose` 選択時 → 漂わない、Channel ビューでのみ閲覧

→ クリックで text modal で全文表示。

---

### D. External URL（外部リンク）

note の記事、Wikipedia、film capture page、自分の他サイトなど。

| 項目 | 中身 |
|---|---|
| url | 開きたい外部 URL |
| title | 「on staying unreleased」のように、courtyard で読みたい形 |
| source | `note.com` / 個人ブログ / etc. |

→ メイン画面の Phrase レーンに「title  source ↗」の形で漂う。クリックで **新規タブで外部に飛ぶ**。

---

## 5. Block の編集・削除

### 5-1. 個別 Block の編集

1. マーキー / Feed / Channel 詳細から該当ブロックをクリック → Block Modal
2. 右上 **`— edit`** → インラインで編集フォーム
3. **`— save`** → 確認ポップアップで OK

audio・image・text・url いずれも全フィールドを編集できる。URL を貼り直したら再変換される。

audio block の「process」フィールドは **自由記述（textarea）** で、制作のプロセス（録音環境・空気・判断の経緯など）を書く。

### 5-2. 個別 Block の削除

1. Block Modal 右上 **`— delete`**
2. 確認ポップアップ → OK
3. その Block が消え、関連する trace（足跡）の楽曲紐付けは untethered に降格

### 5-3. 一括削除（Channel drill-in 内）

複数のブロックをまとめて消したい時：

1. `— traces (n)` → My Channel → 該当チャンネルをクリック
2. 各ブロック左上の **チェックボックス** にチェック
3. 上部の **`— delete selected (N)`** をクリック
4. 確認ポップアップで OK

### 5-4. チャンネル全消し

drill-in 画面の **`— all delete`** はチャンネル自体とその全ブロックを消す。「一部削除」と紛らわしいので名称を分けてある。

---

## 6. リスナー操作（公開後に体験する側）

### 6-1. 再生

- マーキーで気になった歌詞 / タイトル / 画像をクリック → **Block Modal** が開いて再生開始
- 下部のプレイヤーは **音源が再生されている時だけ表示**
  - audioUrl のないブロック（外部リンクや画像）はプレイヤー非表示
- プレイヤーのコントロール: ⏮ play/pause ⏭ ⏹（SVG アイコン）

### 6-2. コメント（trace）を残す

**A. インライン（推奨）**:
- Block Modal 下部の `— comments on this block` セクション直下にインライン入力欄
- 入力 → `↳ leave` または Enter で即時投稿
- audio / image / text 全種で対応

**B. 左下スリット（PC のみ）**:
- 再生中の曲があればその曲に紐付く
- モバイルでは非表示（インライン入力に統一）

### 6-3. 自分のチャンネル（4 タブ）

右上 `— traces (n)` をクリック：
- **My Channel**: 自分が作ったチャンネルのグリッド表示
- **Feed**: 全チャンネル横断の Block 時系列ストリーム
- **Comment**: 自分が残した trace の一覧（曲別にグループ化）
- **Upload**: 新規ブロックの追加フォーム + Sync 機能

---

## 7. データの場所

すべて `localStorage` に保存。Chrome の DevTools で確認できる。

| キー | 中身 |
|---|---|
| `atelier_blocks_v1` | 自分が追加した Block の配列 |
| `atelier_footprints_v2` | 自分のコメント（trace） |
| `atelier_user_channels_v1` | 自分が作成した Channel |
| `atelier_channel_edits_v1` | seed Channel への編集差分 |
| `atelier_track_edits_v1` | seed TRACK（placeholder 楽曲）への編集差分 |
| `atelier_track_connections_v1` | placeholder TRACK の Channel 接続 |
| `atelier_channel_order_v1` | チャンネル内ブロックの並び順 |
| `atelier_lang_v1` | 言語設定（en / ja） |
| `atelier_seeded_v2` | seed 適用済みフラグ |

### バックアップ
- DevTools → Application → Local Storage → 該当キーをコピー → JSON でローカル保存
- 別ブラウザに移行する時は Sync 機能（後述）を使う

### 全消し
```js
// DevTools コンソール
['atelier_blocks_v1','atelier_footprints_v2','atelier_user_channels_v1',
 'atelier_channel_edits_v1','atelier_track_edits_v1','atelier_track_connections_v1',
 'atelier_channel_order_v1','atelier_lang_v1','atelier_seeded_v2']
  .forEach(k => localStorage.removeItem(k));
location.reload();
```

---

## 8. 端末間同期（Sync URL）

PC ↔ モバイル間でデータをコピーする手段。バックエンド未実装の代わり。

### 使い方

**PC 側で：**
1. `— atelier`（Upload タブ）→ 上部の **`— sync to another device`** セクション
2. **`→ generate sync url`** をクリック → 長い URL が表示
3. **`↳ copy`** または **`↳ share`** で URL を取得
4. AirDrop / メール / LINE 等で別端末に送る

**別端末で：**
1. URL を Safari で開く
2. 自動で確認ダイアログ → OK
3. 現在のデータが上書きされ、自動リロード
4. 同じチャンネル・ブロックが見えるようになる

### 注意

- **「最後に sync した側で完全上書き」**。両端末を独立に編集すると片方の変更が消える
- 1台が master の運用なら問題なし
- 将来的に Firebase / Supabase で自動同期予定

### URL 直貼りインポート

`↳ paste sync url` ボタンから手動で URL を貼り付けてインポートも可能。

---

## 9. 既知の制約 / トラブル時

| 症状 | 原因 / 対処 |
|---|---|
| Drive の audio URL を貼っても再生されない | Drive の CORP 仕様で外部から再生不可。**Dropbox 推奨**（仕様レベルの制約、回避不可） |
| Drive の image URL を貼っても表示されない | 旧 `uc?id=` 形式は不安定。最新版では自動で `lh3.googleusercontent.com` 形式に変換 |
| Google Photos の共有 URL を貼っても表示されない | Photos の共有リンクは viewer ページで、画像直 URL ではない。`<img>` での読み込み不可。**Drive にアップロードし直して Drive の共有リンク使う**のが回避策 |
| iCloud URL が再生されない | Drive / Dropbox 経由に変更 |
| マーキーが止まる（リロード後） | iOS Safari の battery saver。スクロール / タップで自動再開 |
| iPhone でスリットを叩くとズーム | 修正済み（input font-size 16px 強制 + viewport `user-scalable=no`） |
| アップロードが失敗 | localStorage 容量上限。Your blocks から不要 Block を削除 |
| 画像が表示されない | URL 直叩きでブラウザに表示されるか確認。CORS 制約のあるホストもある |
| 新しく作ったチャンネルが Upload に出ない | state が `past` になっている。My Channel → 編集 → state を `current` に |
| 戻るボタンを 2 回押さないと戻らない | 修正済み |
| 編集ボタンが反応しない | 修正済み（event delegation 化） |
| ネイティブ confirm が iOS で出ない | カスタム confirm モーダルに置換済み |

---

## 10. 公開前のチェックリスト

- [ ] Audio URL は実際に再生できるか（Dropbox 共有レベル確認）
- [ ] Image URL は表示できるか（変換後の URL を新規タブで叩いて確認）
- [ ] catchphrase は ≤40字 で意味が通るか
- [ ] tags は意味のあるラベルか
- [ ] process 文は誰の目に触れても恥ずかしくないか
- [ ] Support URL は正しいか（誤クリックすると恥ずかしい）
- [ ] 該当 Channel の state が `current` または `future` か
- [ ] 招待した人にリンクを送る前に、自分のブラウザでテスト

---

## 11. URL 変換ロジック早見表

| 入力 | 自動変換後 | 再生/表示 |
|---|---|---|
| `https://drive.google.com/file/d/ID/view?usp=sharing`（**audio**） | `https://drive.google.com/uc?export=download&id=ID` | ✗ **不可**（CORP ブロック）|
| `https://drive.google.com/file/d/ID/view?usp=sharing`（**image**） | `https://lh3.googleusercontent.com/d/ID=w2000` | ✓ |
| `https://www.dropbox.com/s/xxx/file?dl=0` | `https://dl.dropboxusercontent.com/s/xxx/file?raw=1` | ✓ |
| `https://www.dropbox.com/scl/fi/.../file?rlkey=...&dl=0` | `https://dl.dropboxusercontent.com/scl/fi/.../file?rlkey=...&raw=1` | ✓ |
| `https://photos.app.goo.gl/...`（**Google Photos**） | 変換ロジック無し | ✗ **不可**（viewer ページの URL で画像直接取得不可、CORS/hotlink） |
| iCloud share | 変換なし（そのまま） | △ 未検証 |
| 直リンク（mp3 / jpg / png） | 変換なし（そのまま） | ✓（CORP/CORS が許可していれば） |

---

## 12. 操作チートシート

```
[ロゴクリック] → ホーム
[— atelier]   → ブロック追加
[— traces]    → My Channel / Feed / Comment / Upload
[— feed]      → Feed タブを直接開く
[戻る/← back] → 1段階戻る（ブラウザ戻るボタンも同様）

[ブロック追加]
  channel: 配置先（state=current/future のみ）
  title / artist / catchphrase / tags / image / support / url ...
  ↳ place in channel

[ブロック編集] Block Modal → — edit → — save（確認ポップアップ）
[ブロック削除] Block Modal → — delete（確認ポップアップ）
[ブロック共有] Block Modal → ↑ share（Web Share API / clipboard）
[一括削除]    Channel drill-in → チェックボックス → — delete selected (N)
[チャンネル削除] Channel drill-in → — all delete

[チャンネル編集] My Channel → カードクリック → — edit
  label / main phrase / meta / lang / state
  + ブロックの並び順（↑↓ 編集モードのみ、save で確定）

[端末間同期] — atelier (Upload) → — sync to another device
  → generate sync url → copy → 別端末で開く
```

---

## 13. ロードマップ（メモ）

- [x] Phase A: Login/Signup UI モック（2026-04-27 完了）
- [x] **Phase B-3a: Supabase 認証**（magic link, auth.users → profiles トリガー）（2026-04-28 完了）
- [x] **Phase B-3b: 端末横断同期**（user_state JSONB、設定保存）（2026-04-28 完了）
- [x] **Phase C-1: Explore + 公開 block index**（2026-04-28 完了）
- [x] **Phase C-2: cross-user Connect**（他ユーザー block を自 channel に取り込み）（2026-04-28 完了）
- [x] **Phase D-1: cross-user コメント (traces)**（2026-04-28 完了）
- [x] **Phase E-prep: 新規 user empty start**（seed 無効化）（2026-04-29 完了）
- [x] **Phase A-refactor: multi-user data isolation + visitor view 構造分離**（2026-04-29 完了）
  - in-memory CHANNELS/TRACKS リセット + 防御的 wipe
  - DB 汚染 user_state row 削除、profiles 行 backfill + トリガー再定義
  - visitor view の navigation leak fix (breadcrumb / Feed / TOP marquee / tag modal)
  - visitor channel detail の owner と整合 (mainPhrase / created date)
  - audio / image thumb の picsum random 画像を placeholder に
  - italic 全削除、Draft/Public pill を block modal head に明示
  - TOP marquee の isPublic フィルタ（Row 1/2/4 で draft 漏れ防止）
  - 必須フィールドに赤 * 表示 + bottom save button 修正
- [ ] アーティスト別ポートフォリオページ（visitor portfolio は実装済 Phase C-2、専用ページ化は別途）
- [ ] iCloud の URL 解決ロジック実装
- [ ] iframe 埋め込み（外部記事を Ateli.er 内で展開）
- [ ] Phase E-1 (TBD): admin tool 内製（in-app moderation UI）
- [ ] Phase E-2 (TBD): 通報機能（reports table）
- [ ] Phase E-3 (TBD): 自動フィルター（NG ワード / rate limit）
- [ ] Phase D-2 (TBD): trace の email push 通知
- [ ] public_channels テーブル追加（user-created channel の mainPhrase / meta を visitor から見えるように）

---

## 14. このセッション（2026-04-27）の主な改善

UI/UX バグ修正・データ整合性改善を多数実施。詳細は Obsidian ログ参照。

**主なものだけ列挙:**
- 全タグ（#berlin など）クリックでモーダルが空白だったバグ修正
- Channel mainPhrase クリックで該当 channel に直接ドリルイン
- 同曲再生中の click で「最初から再生し直し」になるバグ修正
- 非再生可能トラック（audioUrl 無し）クリックで再生中音楽が止まるバグ修正
- AUDIO ページ遷移で勝手に自動再生していた問題を修正
- EDIT で削除したタグが SAVE 後に復活するバグ修正
- 共有 URL（`#b=` `#ch=`）の deep link を実装、受信側で自動オープン
- SHARE ボタンの「コピーしました」toast 追加
- Feed → ブロック → 戻ると Feed の TOP に戻る問題を修正
- Feed を Are.na 風グルーピング（同日同 channel を集約）
- kind icon（♪ ▣ ¶ ↗）と画像サムネを Channel 一覧に追加
- BACK ボタンを左側上部に独立配置
- オーディオプレイヤーを ink 背景 + paper テキストに反転
- タグサジェスト UX 改善（横並び化、× の押しやすさ、lowercase 正規化、4行スクロール）
- CONNECT picker に `+ new channel` 常時追加、past channel 除外、× 押しやすく
- 配色を paper aesthetic（#DCDBD5 + #1600A2）に刷新
- Phase A Login/Signup UI モック実装

---

> 「音楽家が自分のためのアーカイブとして使っていたら、いつの間にかそれが最高のメディアになっていた」
> — kinoshita studio
