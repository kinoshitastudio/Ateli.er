-- Atelier — Phase F: 明示的 GRANT（Supabase Data API 継続対応）
-- 期限: 2026-10-30（既存プロジェクトへの要件）
-- Supabase SQL Editor で New query → 全コピペ → Run
--
-- 背景:
--   Supabase が Data API (REST) の権限モデルを厳格化。
--   既存プロジェクトは 2026-10-30 までに anon / authenticated ロールへの
--   明示的 GRANT が必要。対応しないと REST API 経由のクエリが動かなくなる。

-- ──────────────── profiles ────────────────
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- ──────────────── public_blocks ────────────────
GRANT SELECT ON public.public_blocks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.public_blocks TO authenticated;

-- ──────────────── user_state ────────────────
GRANT SELECT, INSERT, UPDATE ON public.user_state TO authenticated;

-- ──────────────── traces ────────────────
GRANT SELECT ON public.traces TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.traces TO authenticated;

-- ──────────────── channel_connections ────────────────
GRANT SELECT ON public.channel_connections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.channel_connections TO authenticated;

-- ──────────────── activity_log ────────────────
GRANT SELECT ON public.activity_log TO authenticated;
GRANT INSERT ON public.activity_log TO authenticated;

-- ──────────────── 確認用クエリ ────────────────
-- SELECT grantee, table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public'
--   AND grantee IN ('anon', 'authenticated')
-- ORDER BY table_name, grantee, privilege_type;
