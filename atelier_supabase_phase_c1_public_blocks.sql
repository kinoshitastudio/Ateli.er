-- Ateli.er — Phase C-1: public_blocks index
-- Supabase SQL Editor で New query → 全コピペ → Run
--
-- ユーザーが個別に "public" にした block を index する shared table。
-- canonical な block データは引き続き user_state (JSONB) に居続けるので、
-- これは「他ユーザーから見つけられる」ためのフラットな写し。
-- block の create/update/delete に合わせて owner が ここを保守する。

create table if not exists public.public_blocks (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_handle text,
  kind text not null check (kind in ('audio','image','text','url')),
  channel_id text,
  channel_label text,
  payload jsonb not null,
  ts bigint,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.public_blocks enable row level security;

-- 認証済み・匿名どちらからでも公開 block は読める
drop policy if exists public_blocks_select_all on public.public_blocks;
create policy public_blocks_select_all on public.public_blocks
  for select using (true);

-- owner だけ書ける
drop policy if exists public_blocks_owner_insert on public.public_blocks;
create policy public_blocks_owner_insert on public.public_blocks
  for insert with check (owner_id = auth.uid());

drop policy if exists public_blocks_owner_update on public.public_blocks;
create policy public_blocks_owner_update on public.public_blocks
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists public_blocks_owner_delete on public.public_blocks;
create policy public_blocks_owner_delete on public.public_blocks
  for delete using (owner_id = auth.uid());

-- updated_at 自動更新
create or replace function public.public_blocks_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists public_blocks_touch_trg on public.public_blocks;
create trigger public_blocks_touch_trg
  before update on public.public_blocks
  for each row execute procedure public.public_blocks_touch();

-- index
create index if not exists public_blocks_owner_idx on public.public_blocks(owner_id);
create index if not exists public_blocks_kind_idx on public.public_blocks(kind);
create index if not exists public_blocks_ts_idx on public.public_blocks(ts desc);
