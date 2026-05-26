-- Atelier — Phase G: public_blocks に sort_order カラム追加
-- 目的: オーナー表示 (localStorage) と Explore 表示 (Supabase) の順序ズレを根絶
--       profiles.block_order の二重管理を廃止し、public_blocks 単一ソースにする
-- 実行: Supabase SQL Editor → New query → 全コピペ → Run
--
-- 安全性:
--   - nullable 追加なので既存 INSERT/UPDATE に影響なし
--   - バックフィルで既存行に sort_order を付与 → 即日 Explore が正しくなる
--   - コード側は sort_order.asc.nullslast,ts.asc でクエリするのでNULL行もフォールバック安全

-- ─────────────────────────────────────────────
-- 1. カラム追加
-- ─────────────────────────────────────────────
ALTER TABLE public.public_blocks
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- ─────────────────────────────────────────────
-- 2. 既存行バックフィル
--    owner_id + channel_id ごとに ts ASC で順位付け (× 1000 で間隔確保)
-- ─────────────────────────────────────────────
WITH ranked AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (
      PARTITION BY owner_id, channel_id
      ORDER BY ts ASC NULLS LAST
    ) * 1000) AS rn
  FROM public.public_blocks
  WHERE sort_order IS NULL
)
UPDATE public.public_blocks
SET sort_order = ranked.rn
FROM ranked
WHERE public.public_blocks.id = ranked.id;

-- ─────────────────────────────────────────────
-- 3. インデックス (Explore クエリ高速化)
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_public_blocks_sort
  ON public.public_blocks (owner_id, channel_id, sort_order ASC NULLS LAST);

-- ─────────────────────────────────────────────
-- 4. 確認用
-- ─────────────────────────────────────────────
-- SELECT owner_id, channel_id, id, sort_order, ts
-- FROM public.public_blocks
-- ORDER BY owner_id, channel_id, sort_order ASC NULLS LAST
-- LIMIT 40;
