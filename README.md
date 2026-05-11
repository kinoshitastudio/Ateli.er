# Ateli.er

> a courtyard, not a shelf.
> 未発表のための、静かな中庭。

🇬🇧 English version: [README.en.md](./README.en.md)

---

## はじめに

| | |
|---|---|
| 本番サイト | <https://atelistudio.com/> |
| 入場 | **限定招待制（invite-only）** |
| 利用料 | **無料**（広告・課金プランなし） |
| 言語切替 | JA / EN |
| 推奨ブラウザ | Safari / Chrome / Firefox（最新版） |
| バックエンド | Supabase（multi-user 同期、アカウント連携） |

招待コードをお持ちでない方は、運営者にお問い合わせください。

---

## このサービスについて

完成品を売る場でも、SNS のような激流でもありません。
**未完成のまま、そっと置いておく場所** です。
アルゴリズムも、ランキングも、いいね数もありません。

**キーワード**: `courtyard` · `unreleased` · `human signature` · `no algorithm` · `interconnected depth` · `invitation-based`

詳しい思想とコンセプトは [about ページ](https://atelistudio.com/about.html) を参照してください。

---

## 4 つの単位

1. **block** — 最小単位。audio / image / text / url の 4 種類のいずれか
2. **channel** — block を束ねる "枠"。連作、テーマ、研究中のことを置く器
3. **connect** — Explore で見つけた他人の public block を自分の channel に紐付ける（編集者性）
4. **footprint** — block に対する短いひとことコメント。返信スレッドなし、ネストなし

---

## 主な機能

### ブロック・チャンネル管理
- block の追加 / 編集 / 削除（個別 + 一括）
- channel の作成 / 編集 / 状態切替（current / future / past）
- channel 内 block の並び替え（編集モード時）
- channel 内検索 / 共有リンク発行

### 動線
- ホーム: 3 本マーキー（catchphrase / title / image）
- 楽曲詳細モーダル（個別アトリエ）
- インライン再生プレイヤー
- block 単位のコメント（時間とともに薄くなる "trace"）
- Feed: 全 block の時系列ストリーム
- My Channel / Feed / Explore / Comment / Upload の 5 タブ

### 端末横断
- アカウント連携で、どの端末からでも同じ channel と block にアクセス可能
- 操作はその場で反映、バックグラウンドで Supabase に保存

### Public / Explore
- block を **公開（Public）** にすると Explore に表示される
- 他のユーザーの public block を眺めて、気になったものを自分の channel に **Connect**
- Connect は元 block のスナップショット — 元の作者が編集・削除しても、あなたの手元には残る

### Cross-user コメント
- 他ユーザーの block にコメントを残せる
- 自分の block にコメントが付くと、ナビゲーション右上の ● で気付ける

---

## ホスティング推奨

block に音源・画像を貼る場合のホスト推奨:

| 種類 | 推奨ホスト | 備考 |
|---|---|---|
| **音源 (.mp3)** | **Dropbox 必須** | Google Drive は CORS 制限で再生不可 |
| **画像** | Drive / Dropbox / 任意 | Google Drive は内部で `lh3.googleusercontent.com` に変換 |
| **テキスト・リンク** | 任意 | |

詳しい貼り付け手順: [USAGE.md](./USAGE.md)

---

## 関連ドキュメント

- [USAGE.md](./USAGE.md) — 使い方マニュアル（日本語）
- [USAGE.en.md](./USAGE.en.md) — Usage manual (English)
- [about.html](https://atelistudio.com/about.html) — このサービスの思想（4 つの単位・なぜつくったか）
- [howto.html](https://atelistudio.com/howto.html) — 画面の使い方を実画面で解説

---

## SNS / お問い合わせ

- **X**: [@atelistudio](https://x.com/atelistudio)
- **Instagram**: [@atelistudio.er](https://www.instagram.com/atelistudio.er/)
- **メール**: <tkinoshita.studio@gmail.com>

---

## ライセンス

kinoshita studio · 99letters · 2026
