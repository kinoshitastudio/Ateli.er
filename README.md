# Ateli.er

> a courtyard, not a shelf.

未発表曲のためのデジタル中庭。Spotify のような棚でも YouTube のような激流でもない、静寂とタイポグラフィに包まれた閉じた中庭としての音楽プラットフォーム。

A single-file prototype of a music platform built around the metaphor of a closed courtyard — one that resists algorithmic dilution and preserves the human signature of unreleased works.

---

## 状態

🟡 **PROTOTYPE — multi-user フェーズ A（UI モック）完了**
最終更新: 2026-04-27

| | |
|---|---|
| 段階 | プロトタイプ（vanilla HTML 単一ファイル） + Login/Signup UI モック |
| 本番 | <https://kinoshitastudio.github.io/Ateli.er/>（手動アップロード予定） |
| 開発リポ | この `projects/Ateli.er/` 配下 |
| バックエンド | **Supabase（無料枠）に決定** — Phase B で接続予定。現在は localStorage のみ |
| 招待 | 限定招待制（invite-only）。課金プラン無し |
| Auth 方式 | magic link（パスワード不要） |

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

### 永続化 / 同期
- 全データを localStorage に保存
- 端末間 Sync URL 機能（手動 export / import）

### Auth（Phase A — UI モック）
- Landing ページ → Sign up / Log in モーダル
- invite code 必須（Phase A は任意文字列で通る）
- handle は英数 / 日本語可
- magic link 方式（Phase A は実送信せずに即 session 作成）
- 開発用 URL: `?landing=1`（強制表示）/ `?logout=1`（セッションクリア）

---

## 技術構成

| 項目 | 採用 |
|---|---|
| ランタイム | vanilla HTML（単一ファイル） |
| 音響再生 | HTML5 Audio（Drive 不可・Dropbox 推奨） |
| プレースホルダ音 | Web Audio API（procedural ambient drone） |
| 視覚 | CSS animation marquee × inline SVG |
| フォント | Noto Sans JP / JetBrains Mono |
| 永続化 | localStorage（足跡・ブロック・チャンネル等） |
| デプロイ | GitHub Pages（手動 upload） |

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
- [x] **Phase A: Login/Signup UI モック**（2026-04-27 完了）
- [ ] **Phase B: Supabase 接続**（auth, profiles, channels, blocks, invites スキーマ + 実認証）
- [ ] **Phase C: 全ユーザー共有 view**（Explore タブ的、public block 横断）
- [ ] アーティスト別ポートフォリオページ
- [ ] iframe 埋め込み（外部記事を Ateli.er 内で展開）
- [ ] 過去 Issue（−01）に風化された実データを置く
- [ ] iCloud URL 解決ロジック

---

## 一行で

> 「音楽家が自分のためのアーカイブとして使っていたら、いつの間にかそれが最高のメディアになっていた」
> — kinoshita studio

---

## ライセンス

Personal project — kinoshita studio / 99letters · 2026
