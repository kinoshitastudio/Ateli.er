# Ateli.er

> a courtyard, not a shelf.

未発表曲のためのデジタル中庭。Spotify のような棚でも YouTube のような激流でもない、静寂とタイポグラフィに包まれた閉じた中庭としての音楽プラットフォーム。

A single-file prototype of a music platform built around the metaphor of a closed courtyard — one that resists algorithmic dilution and preserves the human signature of unreleased works.

---

## 状態

🟢 **MULTI-USER 稼働中 — Phase B-3b + C-1 + C-2 完了**
最終更新: 2026-04-28

| | |
|---|---|
| 段階 | プロトタイプ（vanilla HTML 単一ファイル） + Supabase 多端末同期 + 公開／接続 |
| 本番 | <https://kinoshitastudio.github.io/Ateli.er/>（手動アップロード予定） |
| 開発リポ | この `projects/Ateli.er/` 配下（独立 git） |
| バックエンド | **Supabase 無料枠** — auth + profiles + user_state (JSONB) + public_blocks |
| 招待 | 限定招待制（invite-only）。課金プラン無し |
| Auth 方式 | magic link（パスワード不要、Supabase 実送信） |
| データ | localStorage を一次キャッシュ、`user_state` JSONB 1 行に丸ごと sync（端末横断） |
| 公開 | block 単位で `isPublic` フラグ → `public_blocks` に index → Explore で閲覧可能 |
| 接続 | 他ユーザーの公開 block を自分の channel に snapshot として attach（Connect） |

---

## 思想

> AI による音楽の希釈に対する反抗として、「クローズド・限定・未完成」という制約で音楽の意志を救出する聖域。

**キーワード:** `courtyard` `unreleased` `human signature` `no algorithm` `Are.na-like depth` `Csocsán typography` `weathering` `graffiti` `invitation-based`

**デザイン参照:**
- 思想: [Are.na](https://are.na) — Block × Channel の構造的キュレーション
- 視覚: [Laura Csocsán](https://lauracsocsan.com) — タイポグラフィのミニマリズム、等速マーキー、グレインのある余白

---

## クイックスタート

ローカルで動かすには静的サーバーを立てるだけ：

```bash
cd /path/to/99letters.github.io
python3 -m http.server 8765
# → http://localhost:8765/projects/Ateli.er/
```

または VS Code Live Server / `npx serve` などお好みで。

---

## ファイル構造

```
projects/Ateli.er/
├── index.html      ← 単一 HTML（vanilla JS / Web Audio synth / CSS marquee）
├── README.md       ← このファイル
└── USAGE.md        ← 私用の操作マニュアル
```

---

## 主な機能

### Block × Channel データモデル（Are.na 準拠）
- **Block**: audio / image / text / external url の 4 種
- **Channel**: Block を束ねる場（号やテーマごと）
- **Connect**: 1 Block を複数 Channel に接続可

### コンテンツ管理
- Block の追加・編集・削除（Block 単体 / 一括チェック削除）
- Channel の作成・編集・状態切替（current / future / past）
- Channel 内ブロックの並び替え（edit モード時のみ、save で確定）
- Channel 内検索 / Channel 共有（Web Share API）

### 体験動線
- ホームの 3 本マーキー（catchphrase / title / image）
- 楽曲詳細モーダル（個別アトリエ）
- リアルタイム再生プレイヤー（HTML5 Audio）
- インライン・コメント（block 単位の trace、風化で薄くなる）
- Feed タブ：全 Block の時系列ストリーム
- EN / JP 言語切替

### 永続化 / 同期（Phase B-3b 完了）
- localStorage は一次キャッシュ（操作はローカルで即時反映 → スナピー）
- `Storage.setItem` を monkey-patch して `SYNC_KEYS` への書き込みを 1.5 秒
  debounce で `user_state` に push（生 REST 経由、SDK のハングを回避）
- sign-in / reload 時に DB から pull → localStorage を上書き → 再描画。
  別端末で行った編集が次回起動時に反映される
- `beforeunload` で keepalive fetch flush（タブを閉じても in-flight な
  debounce が落ちない）
- 旧 Sync URL（手動 export / import）は引き続き動作。緊急用バックアップに

### Auth（Phase B-3a 完了）
- Landing ページ → Sign up / Log in モーダル
- invite code は `invites` テーブルで実検証（max_uses / expires_at 確認）
- handle は user_metadata + `profiles` テーブルの双方に保存
- magic link を Supabase が実送信、リンククリック → onAuthStateChange で SIGNED_IN
- Settings モーダルで handle / avatar URL の編集、log out
- 開発用 URL: `?landing=1`（強制表示）/ `?logout=1`（session クリア）

### Public / Explore（Phase C-1 完了）
- block の edit 画面に **`show on Explore`** トグル → `isPublic: true` で
  `public_blocks` index に upsert、false にすると row を削除
- block modal の head に **`公開中 / public`** pill、channel 一覧の各行にも
  小さい `public` マーク
- Explore タブが 2 段構成: `— residents`（profiles 一覧）+
  `— public blocks`（最新 60 件、ts 降順、自分の block は除外）

### Connect 他ユーザーブロック（Phase C-2 完了）
- Explore の public block card をクリック → 読み取り専用プレビューで開く。
  breadcrumb は `@otherHandle / theirChannel / blockTitle`（イタリック）
- 「**+ connect to my channel**」 → overlay でチャンネル選択 →
  block の **snapshot** が `atelier_external_blocks_v1` に保存
- channel 詳細では external block に `— by @otherHandle` 帰属表記、
  クリックで再度 read-only モーダル
- 「**— disconnect**」 で channel から外す（snapshot は破棄、再 connect 可能）
- snapshot 戦略: 上流 owner の編集／削除が下流に伝播しない（Are.na 流）。
  代わりに renderer は常に local データを読むので high-perf + offline 耐性

---

## 技術構成

| 項目 | 採用 |
|---|---|
| ランタイム | vanilla HTML（単一ファイル、ビルド工程なし） |
| 音響再生 | HTML5 Audio（Drive 不可・Dropbox 推奨） |
| プレースホルダ音 | Web Audio API（procedural ambient drone） |
| 視覚 | CSS animation marquee × inline SVG |
| フォント | Noto Sans JP / JetBrains Mono |
| 永続化 | localStorage 一次 + Supabase Postgres `user_state` JSONB（端末横断） |
| Auth | Supabase magic link（`@supabase/supabase-js@2` CDN） |
| Realtime | 実装なし（pull-on-signin / pull-on-reload で十分） |
| デプロイ | GitHub Pages（手動 upload）— launch 時に別アカウントへ移行予定 |

---

## ホスティングルール

| 用途 | 推奨ホスト | 備考 |
|---|---|---|
| **audio (.mp3)** | Dropbox 必須 | Drive は CORP `same-site` で再生不可 |
| **image** | Drive OK / Dropbox / 任意 | Drive は内部で `lh3.googleusercontent.com` に変換 |
| その他 | 任意 | |

詳細は [USAGE.md](./USAGE.md) を参照。

---

## ロードマップ

- [x] vanilla プロトタイプ
- [x] Block × Channel データモデル
- [x] EN / JP 切替
- [x] Sync URL（手動同期）
- [x] Are.na 風 Feed グルーピング表示
- [x] kind icon (♪ ▣ ¶ ↗) + Channel 一覧サムネ表示
- [x] 共有 URL deep link（`#b=` `#ch=` 受信処理）
- [x] paper aesthetic 配色刷新（ink-blue + warm beige）
- [x] **Phase A: Login/Signup UI モック**（2026-04-27）
- [x] **Phase B-3a: Supabase 実認証**（magic link, profiles, invites, RLS）
- [x] **Phase B-3b: 端末横断同期**（user_state JSONB + monkey-patch sync layer）
- [x] **Phase C-1: Explore + 公開 block index**（profiles 一覧 + public_blocks）
- [x] **Phase C-2: 他ユーザー block の Connect**（snapshot, attribution, disconnect）
- [ ] **launch 準備**: 新 GitHub アカウント / 新 Supabase project / Custom SMTP
- [ ] アーティスト別ポートフォリオページ
- [ ] iframe 埋め込み（外部記事を Ateli.er 内で展開）
- [ ] 過去 Issue（−01）に風化された実データを置く
- [ ] iCloud URL 解決ロジック
- [ ] Phase C-3: external block の「refresh from upstream」アフォーダンス

---

## 一行で

> 「音楽家が自分のためのアーカイブとして使っていたら、いつの間にかそれが最高のメディアになっていた」
> — kinoshita studio

---

## ライセンス

Personal project — kinoshita studio / 99letters · 2026
