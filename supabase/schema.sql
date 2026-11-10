-- Skema database Examus untuk Supabase.
-- Cara pakai: Supabase > SQL Editor > tempel seluruh isi file ini > Run.

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  name text,
  role text,
  school text,
  city text,
  is_admin boolean not null default false,
  onboarded boolean not null default false,
  letterhead text,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  members jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  class_id uuid references public.classes on delete set null,
  class_name text not null,
  code text not null unique,
  type text not null,
  config jsonb not null default '{}',
  roster jsonb not null,
  closes_at timestamptz not null,
  closed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions on delete cascade,
  member_no int not null,
  answers jsonb not null,
  created_at timestamptz not null default now(),
  unique (session_id, member_no)
);

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.sessions enable row level security;
alter table public.responses enable row level security;

-- Guru hanya melihat data miliknya sendiri.
drop policy if exists "profil sendiri: baca" on public.profiles;
create policy "profil sendiri: baca" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profil sendiri: ubah" on public.profiles;
create policy "profil sendiri: ubah" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "kelas milik sendiri" on public.classes;
create policy "kelas milik sendiri" on public.classes for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "sesi milik sendiri" on public.sessions;
create policy "sesi milik sendiri" on public.sessions for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "jawaban sesi sendiri: baca" on public.responses;
create policy "jawaban sesi sendiri: baca" on public.responses for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id and s.owner = auth.uid()));

-- Kolom is_admin tidak boleh diubah dari aplikasi; hanya lewat SQL Editor.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, role, school, city, onboarded, letterhead) on public.profiles to authenticated;
revoke all on public.responses from anon, authenticated;
grant select on public.responses to authenticated;
revoke all on public.classes, public.sessions from anon;

-- Profil dibuat otomatis saat akun baru mendaftar.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Yang boleh dilihat murid lewat link: nama kelas, pertanyaan, daftar nama, siapa yang sudah mengisi.
create or replace function public.session_public(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'code', s.code,
    'type', s.type,
    'className', s.class_name,
    'config', s.config,
    'roster', (select coalesce(jsonb_agg(jsonb_build_object('no', m->'no', 'name', m->'name')), '[]'::jsonb) from jsonb_array_elements(s.roster) m),
    'filled', (select coalesce(jsonb_agg(r.member_no), '[]'::jsonb) from responses r where r.session_id = s.id),
    'open', (not s.closed and now() < s.closes_at)
  )
  from sessions s where s.code = p_code;
$$;

-- Murid mengirim jawaban tanpa akun. Satu nama hanya bisa mengisi satu kali.
create or replace function public.submit_response(p_code text, p_no int, p_answers jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare s sessions%rowtype;
begin
  select * into s from sessions where code = p_code;
  if not found then raise exception 'Link tidak ditemukan.'; end if;
  if s.closed or now() >= s.closes_at then raise exception 'Pengisian sudah ditutup.'; end if;
  if not exists (select 1 from jsonb_array_elements(s.roster) m where (m->>'no')::int = p_no) then
    raise exception 'Nama tidak ada di daftar kelas.';
  end if;
  if pg_column_size(p_answers) > 20000 then raise exception 'Jawaban terlalu besar.'; end if;
  begin
    insert into responses (session_id, member_no, answers) values (s.id, p_no, p_answers);
  exception when unique_violation then
    raise exception 'Nama ini sudah mengisi.';
  end;
end $$;

-- Ringkasan untuk dasbor admin.
create or replace function public.admin_overview() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce((select is_admin from profiles where id = auth.uid()), false) then
    raise exception 'Halaman ini hanya untuk admin.';
  end if;
  return json_build_object(
    'totals', json_build_object(
      'users', (select count(*) from profiles),
      'classes', (select count(*) from classes),
      'sessions', (select count(*) from sessions),
      'responses', (select count(*) from responses)),
    'users', (select coalesce(json_agg(u order by u."createdAt" desc), '[]'::json) from (
      select p.email, p.name, p.role, p.school, p.city, p.is_admin as "isAdmin", p.created_at as "createdAt",
             (select count(*) from sessions s where s.owner = p.id) as sessions
      from profiles p) u),
    'sessions', (select coalesce(json_agg(x order by x."createdAt" desc), '[]'::json) from (
      select s.id, s.class_name as "className", s.type, p.email as owner,
             jsonb_array_length(s.roster) as total,
             (select count(*) from responses r where r.session_id = s.id) as filled,
             s.created_at as "createdAt", (not s.closed and now() < s.closes_at) as open
      from sessions s left join profiles p on p.id = s.owner) x)
  );
end $$;

revoke all on function public.session_public(text), public.submit_response(text, int, jsonb), public.admin_overview() from public;
grant execute on function public.session_public(text), public.submit_response(text, int, jsonb) to anon, authenticated;
grant execute on function public.admin_overview() to authenticated;

-- Setelah mendaftar lewat halaman Masuk, jadikan akun Anda admin dengan menjalankan:
--   update public.profiles set is_admin = true where email = 'email-anda@contoh.com';
