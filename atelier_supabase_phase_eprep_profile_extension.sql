-- Ateli.er — Phase E-prep: profiles に bio + sns_url を追加
-- Supabase SQL Editor で New query → 全コピペ → Run
--
-- 既存 profiles テーブル (id, handle, display_name, avatar_url, created_at) に
-- 2 列追加:
--   bio       — ユーザーの自己紹介テキスト (任意、表示されるとき multi-line)
--   sns_url   — SNS / 個人サイト URL (任意、portfolio で clickable link 化)
--
-- RLS: 既存の profiles_select_all (誰でも read) + owner-only update が
-- そのまま適用されるので追加ポリシー不要。

alter table public.profiles
  add column if not exists bio text,
  add column if not exists sns_url text;
