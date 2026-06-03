-- ============================================================
-- Prode Mundial 2026 — Schema
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

create table if not exists participants (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  code text unique not null,
  created_at timestamptz default now()
);

create table if not exists matches (
  id integer primary key,
  match_date timestamptz not null,
  group_name text not null,
  team_home text not null,
  team_away text not null,
  flag_home text not null default '',
  flag_away text not null default '',
  score_home integer,
  score_away integer,
  status text not null default 'scheduled' check (status in ('scheduled', 'finished'))
);

create table if not exists predictions (
  id uuid default gen_random_uuid() primary key,
  participant_id uuid references participants(id) on delete cascade not null,
  match_id integer references matches(id) not null,
  predicted_home integer not null check (predicted_home >= 0),
  predicted_away integer not null check (predicted_away >= 0),
  points integer not null default 0,
  unique(participant_id, match_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table participants enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;

create policy "public read participants" on participants for select using (true);
create policy "public insert participants" on participants for insert with check (true);

create policy "public read matches" on matches for select using (true);
create policy "service insert matches" on matches for insert with check (true);
create policy "service update matches" on matches for update using (true);

create policy "public read predictions" on predictions for select using (true);
create policy "public insert predictions" on predictions for insert with check (true);
create policy "public update predictions" on predictions for update using (true);

-- ============================================================
-- Función para recalcular puntos de un partido
-- Llamar después de cargar el resultado real de un partido
-- ============================================================

create or replace function recalcular_puntos(p_match_id integer)
returns void as $$
declare
  v_score_home integer;
  v_score_away integer;
  v_real_outcome integer;
  v_pred_outcome integer;
  v_points integer;
  rec record;
begin
  select score_home, score_away into v_score_home, v_score_away
  from matches where id = p_match_id;

  if v_score_home is null or v_score_away is null then
    return;
  end if;

  v_real_outcome := sign(v_score_home - v_score_away);

  for rec in
    select id, predicted_home, predicted_away from predictions where match_id = p_match_id
  loop
    if rec.predicted_home = v_score_home and rec.predicted_away = v_score_away then
      v_points := 3;
    elsif sign(rec.predicted_home - rec.predicted_away) = v_real_outcome then
      v_points := 1;
    else
      v_points := 0;
    end if;

    update predictions set points = v_points where id = rec.id;
  end loop;
end;
$$ language plpgsql security definer;

-- ============================================================
-- Habilitar Realtime en predictions y matches
-- ============================================================
alter publication supabase_realtime add table predictions;
alter publication supabase_realtime add table matches;
