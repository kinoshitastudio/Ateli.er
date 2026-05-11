-- Ateli.er — Phase A-refactor cleanup: 汚染された user_state row を削除
-- Supabase SQL Editor で New query → 全コピペ → Run
--
-- 背景:
-- Phase 1 fix 投入前のバグで、新規ユーザー (DDD, DPRB 等) が初回 sign-in した際、
-- ブラウザに残っていた前ユーザー (Taka) の localStorage が誤って
-- 新規ユーザーの user_state row として保存されてしまった。
--
-- Phase 1 fix (854bb13) は「未来の sign-in での leak」を防ぐが、
-- すでに DB に書かれた汚染 row はそのまま残るので、該当ユーザーは
-- existing-rows path で汚染 state を pull し続ける。
--
-- このスクリプトは Taka 以下に列挙した「保持したい正規ユーザー」以外の
-- user_state を全削除する。削除されたユーザーは次の sign-in で no-rows path
-- に入り、Phase 1 fix が clean に動作して genuinely empty start を実現する。
--
-- 削除前に確認:
--   SELECT user_id, jsonb_object_keys(state) FROM user_state;

-- ──────────────── STEP 1: 運営者の user_id を確認 ────────────────
-- 運営者の email から user_id を取得 (placeholder を実 email に置き換えて実行)
-- 結果をメモして STEP 2 で使う。公開リポジトリに実メールを含めないため placeholder にしている。
SELECT id, email FROM auth.users WHERE email = 'OWNER_EMAIL@example.com';

-- ──────────────── STEP 2: Taka 以外の user_state を削除 ────────────────
-- 上で確認した Taka の user_id を <TAKA_USER_ID> に置き換えて実行
-- 例:  WHERE user_id != 'abcd1234-...' ;
--
-- DELETE FROM user_state
--   WHERE user_id != '<TAKA_USER_ID>';

-- ──────────────── (代替) STEP 2b: 全削除して全員 reset ────────────────
-- Taka も含めて全 user_state を消したい場合（テスト初期化用）。
-- Taka は次の sign-in で no-rows path に入るが、ブラウザ localStorage
-- にデータが残っていれば再 push されるので localStorage は維持される。
-- 危険性低いがデータ保持したいなら STEP 2 を推奨。
--
-- DELETE FROM user_state;

-- ──────────────── STEP 3: 削除確認 ────────────────
-- SELECT user_id FROM user_state;
-- ↑ Taka の row だけ残ってればOK
