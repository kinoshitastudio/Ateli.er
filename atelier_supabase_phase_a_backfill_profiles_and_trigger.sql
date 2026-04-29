-- Ateli.er — Phase A-refactor: backfill missing profiles rows + ensure trigger
-- Supabase SQL Editor で New query → 全コピペ → Run
--
-- 背景:
-- DDD アカウントが「avatar を保存しても次回ログイン時に消える」状態だった。
-- SELECT * FROM profiles で確認したところ Taka の 1 行しかなく、DDD / DPRB の
-- 行が存在しなかった。Phase B-3a で auth.users → profiles の自動作成
-- トリガーを設定したが、Supabase Dashboard で auth user を削除→再作成した時
-- に再作動しなかったか、最初から正しく動いていなかった。
--
-- このスクリプト:
--   STEP 1: 既存 auth.users 全員に対し profiles 行を upsert (なければ作る)
--   STEP 2: トリガー関数と AFTER INSERT トリガーを再定義（壊れていた場合の復旧）

-- ──────────────── STEP 1: backfill 既存ユーザー ────────────────
INSERT INTO public.profiles (id, handle, display_name, created_at)
SELECT
  u.id,
  COALESCE(
    (u.raw_user_meta_data ->> 'handle'),
    split_part(u.email, '@', 1),
    'visitor'
  ) AS handle,
  COALESCE(
    (u.raw_user_meta_data ->> 'handle'),
    split_part(u.email, '@', 1),
    'visitor'
  ) AS display_name,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 結果確認 (期待: auth.users と profiles の行数が一致)
SELECT
  (SELECT COUNT(*) FROM auth.users) AS auth_count,
  (SELECT COUNT(*) FROM public.profiles) AS profiles_count;

-- ──────────────── STEP 2: トリガー再定義 ────────────────
-- handle_new_user 関数を作り直し（既存があれば置換）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, handle, display_name, created_at)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data ->> 'handle'),
      split_part(NEW.email, '@', 1),
      'visitor'
    ),
    COALESCE(
      (NEW.raw_user_meta_data ->> 'handle'),
      split_part(NEW.email, '@', 1),
      'visitor'
    ),
    NEW.created_at
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 既存トリガー削除（あれば）→ 作り直し
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ──────────────── STEP 3: 検証 ────────────────
-- DDD / DPRB が backfill されたか確認
SELECT id, handle, avatar_url
FROM public.profiles
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN ('ddd.todo.ddd@gmail.com', 'dprbrecords@gmail.com', '99letters99@gmail.com')
);
