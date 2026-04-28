-- Ateli.er — Phase B-3b: user_state テーブル
-- Supabase SQL Editor で New query → 全コピペ → Run
--
-- 単一行 / ユーザー で localStorage 全体を JSONB 保持する戦略。
-- 既存の blocks / channels / connections / traces テーブルは Phase C で
-- 「他ユーザーに公開する block」を実装する時に refactor する想定。

create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.user_state enable row level security;

drop policy if exists user_state_owner on public.user_state;
create policy user_state_owner on public.user_state
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- updated_at の自動更新
create or replace function public.user_state_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists user_state_touch_trg on public.user_state;
create trigger user_state_touch_trg
  before update on public.user_state
  for each row execute procedure public.user_state_touch();
