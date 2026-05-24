---
name: project-atelier-md-upload
description: Atelier への .md ファイル投稿機能（Obsidian 連携）のアイデア。保留中。
metadata:
  type: project
---

Atelier に `.md` ブロックを投稿できる機能のアイデア。現在キープ中。

**Why:** Obsidian のノートがすべて `.md` なので、Obsidian で書いたメモ・日記・ドキュメントをそのまま Atelier に持ってこれる。Atelier が個人の知識ベース・アーカイブとしても機能する可能性。

**検討していた設計方針:**
- `kind: 'md'` を新設（`kind: 'text'` に `format: 'md'` フラグでもよい）
- サムネイルはコンテンツから自動生成（1行目見出し + 冒頭150字のテキストプレビューカード）
- 入力方式: まず直接入力のみ、Dropbox URL対応は v2
- Feed/レンダリング側は `['audio']` 以外を "document" 系として一括ルーティングしてバグリスク最小化

**How to apply:** 着手する際はバグ対策として既存の kind 分岐を全棚卸しすること。
