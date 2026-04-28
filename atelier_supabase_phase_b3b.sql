-- Ateli.er — Phase B-3b 段階1: profiles に avatar_url を追加
-- Supabase SQL Editor で New query → 全コピペ → Run

alter table public.profiles
  add column if not exists avatar_url text;

-- Comment: avatar_url は他ユーザーから見える前提（profiles_select_all ポリシーが既に存在）
