-- Esquema proposto para o Supabase (Postgres). NÃO aplicado: nenhum projeto Supabase foi criado.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (char_length(username) between 2 and 24),
  created_at timestamptz not null default now()
);

create table public.games (
  id text primary key,
  title text not null,
  platform text not null,
  genre text,
  description text,
  method text not null check (method in ('local','streaming','experimental','unavailable')),
  requirements text,
  cover_url text,
  published boolean not null default false
);

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  primary key (user_id, game_id)
);

create table public.history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  played_at timestamptz not null default now()
);

create table public.servers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  url text not null check (url like 'wss://%'),
  created_at timestamptz not null default now()
);

alter table public.profiles  enable row level security;
alter table public.games     enable row level security;
alter table public.favorites enable row level security;
alter table public.history   enable row level security;
alter table public.servers   enable row level security;

create policy "perfil: dono lê e edita" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "jogos: todos leem os publicados" on public.games
  for select using (published);

create policy "favoritos: dono" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "histórico: dono" on public.history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "servidores: dono" on public.servers
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Escrita em public.games só pelo painel administrativo, com a chave de serviço no servidor.
-- Nunca coloque a chave de serviço no APK.
