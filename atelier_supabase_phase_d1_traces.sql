-- Ateli.er — Phase D-1: cross-user traces (comments)
-- Supabase SQL Editor で New query → 全コピペ → Run
--
-- 旧 traces テーブル(Phase B-2 で作ったが未使用) は drop して新規作成。
-- 既存 row があれば失われるが、現時点で空のはずなので問題なし。

drop table if exists public.traces cascade;

create table public.traces (
  id text primary key,
  block_id text not null,
  author_id uuid references auth.users(id) on delete cascade,
  author_handle text,
  text text not null,
  ts bigint not null,
  -- block_owner_id は denorm: "自分の block への trace 数" を高速にカウント
  -- するためのキー。block データが user_state JSONB に居るので外部キー制約は
  -- 張れず、client が正しく埋める前提。
  block_owner_id uuid,
  created_at timestamptz default now()
);

alter table public.traces enable row level security;

-- 誰でも読める (block を見れる人 = trace も見れる)
drop policy if exists traces_select_all on public.traces;
create policy traces_select_all on public.traces
  for select using (true);

-- 認証済みユーザーは自分の row を insert
drop policy if exists traces_author_insert on public.traces;
create policy traces_author_insert on public.traces
  for insert with check (author_id = auth.uid());

-- author だけ自分の trace を edit / delete できる
drop policy if exists traces_author_update on public.traces;
create policy traces_author_update on public.traces
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists traces_author_delete on public.traces;
create policy traces_author_delete on public.traces
  for delete using (author_id = auth.uid());

-- index
create index if not exists traces_block_idx on public.traces(block_id);
create index if not exists traces_owner_idx on public.traces(block_owner_id);
create index if not exists traces_ts_idx on public.traces(ts desc);
