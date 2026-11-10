-- Skema database Examus untuk Supabase (multi sekolah, login dengan nama akun).
-- Cara pakai: proyek Supabase BARU > SQL Editor > tempel seluruh isi file ini > Run.
-- Setelah itu jalankan perintah "Membuat admin pertama" di bagian paling bawah.
-- File ini juga aman dijalankan ULANG di proyek yang sudah berjalan: ia meningkatkan skema
-- lama (kelas milik guru) ke versi sekarang tanpa menghapus data.
--
-- Ringkasan rancangan:
--  * Satu database, lima sekolah. Setiap baris data punya school_id dan Row Level Security
--    memastikan akun sebuah sekolah tidak bisa melihat data sekolah lain.
--  * Tidak ada pendaftaran mandiri. Semua akun dibuat admin lewat fungsi admin_*.
--  * Admin dengan school_id kosong = admin pusat (melihat semua sekolah).
--  * Kelas dan daftar murid hanya dibuat admin. Admin menugaskan kelas ke guru (class_teachers);
--    satu guru boleh memegang banyak kelas. Guru hanya melihat kelas yang ditugaskan.
--  * Kata sandi awal dari admin disimpan di tabel credentials (tanpa akses langsung dari
--    aplikasi, hanya dibaca lewat admin_users). Begitu pengguna mengganti sandinya, salinan
--    itu dihapus dan hanya tersisa hash bcrypt di auth.users.

create extension if not exists pgcrypto with schema extensions;

/* ------------------------------------------------------------------ */
/* Tabel                                                               */
/* ------------------------------------------------------------------ */
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete restrict,
  name text not null,
  members jsonb not null default '[]',   -- [{no, name, g}]; "no" tidak boleh berubah
  next_no int not null default 1,        -- nomor berikutnya untuk murid baru; tidak pernah turun
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._-]{3,30}$'),
  kind text not null check (kind in ('admin', 'guru', 'siswa')),
  school_id uuid references public.schools on delete restrict,   -- kosong hanya untuk admin pusat
  name text not null default '',
  title text,            -- peran di sekolah: Guru BK, Wali kelas, dst.
  city text,
  letterhead text,
  class_id uuid references public.classes on delete set null,    -- khusus siswa
  member_no int,                                                 -- khusus siswa: nomor di daftar kelas
  must_change boolean not null default true,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  check (kind = 'admin' or school_id is not null)
);
create unique index if not exists one_account_per_member on public.profiles (class_id, member_no) where kind = 'siswa';

create table if not exists public.credentials (
  user_id uuid primary key references public.profiles on delete cascade,
  password text not null
);

-- Guru memegang kelas yang ditugaskan admin. Satu guru boleh banyak kelas, satu kelas boleh banyak guru.
create table if not exists public.class_teachers (
  class_id uuid not null references public.classes on delete cascade,
  teacher_id uuid not null references public.profiles on delete cascade,
  primary key (class_id, teacher_id)
);

-- Peningkatan dari versi lama (kelas dimiliki guru pembuatnya). Aman dijalankan ulang: hanya bekerja
-- bila kolom classes.owner masih ada. Kelas lama ditugaskan ke pemilik lamanya, lalu kolom dibuang.
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'classes' and column_name = 'owner') then
    alter table public.classes add column if not exists next_no int not null default 1;
    update public.classes set next_no = coalesce((select max((m->>'no')::int) + 1 from jsonb_array_elements(members) m), 1);
    insert into public.class_teachers (class_id, teacher_id)
      select c.id, c.owner from public.classes c join public.profiles p on p.id = c.owner and p.kind = 'guru'
      on conflict do nothing;
    drop policy if exists "kelas: sekolah sendiri" on public.classes;
    alter table public.classes drop column owner;
  end if;
end $$;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  class_id uuid references public.classes on delete set null,
  class_name text not null,
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

/* ------------------------------------------------------------------ */
/* Fungsi bantu (dipakai oleh aturan akses)                            */
/* ------------------------------------------------------------------ */
create or replace function public.my_school() returns uuid
language sql stable security definer set search_path = public as $$
  select school_id from profiles where id = auth.uid() $$;

create or replace function public.my_kind() returns text
language sql stable security definer set search_path = public as $$
  select kind from profiles where id = auth.uid() $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select kind = 'admin' from profiles where id = auth.uid()), false) $$;

create or replace function public.is_super() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select kind = 'admin' and school_id is null from profiles where id = auth.uid()), false) $$;

create or replace function public.can_see_school(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_super() or (s is not null and s = public.my_school()) $$;

-- Admin sekolah mengakses semua kelas di sekolahnya; guru hanya kelas yang ditugaskan kepadanya.
create or replace function public.has_class_access(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from classes k
    where k.id = c
      and ((public.is_admin() and public.can_see_school(k.school_id))
           or exists (select 1 from class_teachers t where t.class_id = k.id and t.teacher_id = auth.uid())))
$$;

alter table public.sessions alter column school_id set default public.my_school();

/* ------------------------------------------------------------------ */
/* Row Level Security                                                  */
/* ------------------------------------------------------------------ */
alter table public.schools enable row level security;
alter table public.classes enable row level security;
alter table public.class_teachers enable row level security;
alter table public.profiles enable row level security;
alter table public.credentials enable row level security;
alter table public.sessions enable row level security;
alter table public.responses enable row level security;

drop policy if exists "sekolah: baca" on public.schools;
create policy "sekolah: baca" on public.schools for select to authenticated using (public.can_see_school(id));
drop policy if exists "sekolah: kelola admin pusat" on public.schools;
create policy "sekolah: kelola admin pusat" on public.schools for all to authenticated using (public.is_super()) with check (public.is_super());

drop policy if exists "profil: baca" on public.profiles;
create policy "profil: baca" on public.profiles for select to authenticated
  using (id = auth.uid() or (public.is_admin() and public.can_see_school(school_id)));
drop policy if exists "profil: ubah sendiri" on public.profiles;
create policy "profil: ubah sendiri" on public.profiles for update to authenticated
  using (id = auth.uid() and public.my_kind() <> 'siswa')
  with check (id = auth.uid());

-- Kelas: hanya dibaca langsung; membuat, mengubah, dan menghapus lewat fungsi admin_*.
-- Guru membaca kelas yang ditugaskan; admin sekolah semua kelas di sekolahnya; admin pusat semua.
drop policy if exists "kelas: sekolah sendiri" on public.classes;
drop policy if exists "kelas: baca" on public.classes;
create policy "kelas: baca" on public.classes for select to authenticated using (public.has_class_access(id));

drop policy if exists "penugasan: baca" on public.class_teachers;
create policy "penugasan: baca" on public.class_teachers for select to authenticated
  using (teacher_id = auth.uid() or (public.is_admin() and public.has_class_access(class_id)));

-- Sesi: dibuat lewat create_session; pemiliknya hanya boleh membuka/menutup dan menghapus.
drop policy if exists "sesi: sekolah sendiri" on public.sessions;
create policy "sesi: sekolah sendiri" on public.sessions for all to authenticated
  using (public.can_see_school(school_id) and (owner = auth.uid() or public.is_admin()))
  with check (school_id = public.my_school() and owner = auth.uid());

drop policy if exists "jawaban: baca" on public.responses;
create policy "jawaban: baca" on public.responses for select to authenticated
  using (exists (select 1 from public.sessions s
                 where s.id = session_id and public.can_see_school(s.school_id) and (s.owner = auth.uid() or public.is_admin())));

-- Hak akses tabel. credentials sama sekali tidak bisa diakses langsung.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.schools to authenticated;
grant insert, update on public.schools to authenticated;
grant select on public.profiles to authenticated;
grant update (name, title, city, letterhead, onboarded) on public.profiles to authenticated;
grant select on public.classes, public.class_teachers, public.responses to authenticated;
grant select, delete on public.sessions to authenticated;
grant update (closed, closes_at) on public.sessions to authenticated;

/* ------------------------------------------------------------------ */
/* Pembuatan akun (internal)                                           */
/* ------------------------------------------------------------------ */
-- Alamat email di balik layar. Pengguna tidak pernah melihatnya.
-- Harus sama dengan USERNAME_DOMAIN di assets/js/config.js.
create or replace function public._account_domain() returns text language sql immutable as $$ select 'examus.local' $$;

create or replace function public._gen_pw() returns text
language plpgsql volatile set search_path = public, extensions as $$
declare abc text := 'abcdefghjkmnpqrstuvwxyz23456789'; res text := ''; b bytea := gen_random_bytes(8); i int;
begin
  for i in 0..7 loop res := res || substr(abc, (get_byte(b, i) % length(abc)) + 1, 1); end loop;
  return res;
end $$;

create or replace function public._create_account(
  p_username text, p_password text, p_name text, p_kind text, p_school uuid,
  p_title text, p_class uuid, p_member int, p_must_change boolean
) returns uuid
language plpgsql security definer set search_path = public, extensions, auth as $$
declare uid uuid := gen_random_uuid(); em text := lower(p_username) || '@' || public._account_domain();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em,
    crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, 'email',
          jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true), now(), now(), now());
  insert into public.profiles (id, username, kind, school_id, name, title, class_id, member_no, must_change, onboarded)
  values (uid, lower(p_username), p_kind, p_school, coalesce(p_name, ''), p_title, p_class, p_member, p_must_change, p_kind <> 'guru');
  if p_must_change then insert into public.credentials (user_id, password) values (uid, p_password); end if;
  return uid;
end $$;

create or replace function public._need_admin() returns public.profiles
language plpgsql stable security definer set search_path = public as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = auth.uid();
  if not found or p.kind <> 'admin' then raise exception 'Fitur ini hanya untuk admin.'; end if;
  return p;
end $$;

create or replace function public._in_scope(a public.profiles, s uuid) returns boolean
language sql immutable as $$ select coalesce(a.school_id is null or s = a.school_id, false) $$;

/* ------------------------------------------------------------------ */
/* Fungsi admin                                                        */
/* ------------------------------------------------------------------ */
create or replace function public.admin_create_user(
  p_username text, p_password text, p_name text, p_kind text,
  p_school uuid default null, p_title text default null, p_class uuid default null, p_member int default null
) returns json
language plpgsql security definer set search_path = public, extensions, auth as $$
declare a public.profiles := public._need_admin(); sch uuid; cl public.classes; u text := lower(trim(p_username)); new_id uuid;
begin
  if p_kind not in ('admin', 'guru', 'siswa') then raise exception 'Jenis akun tidak dikenal.'; end if;
  if u !~ '^[a-z0-9._-]{3,30}$' then raise exception 'Nama akun 3 sampai 30 karakter: huruf kecil, angka, titik, garis bawah, atau strip.'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'Kata sandi minimal 6 karakter.'; end if;
  if trim(coalesce(p_name, '')) = '' then raise exception 'Isi nama pemilik akun.'; end if;

  sch := coalesce(a.school_id, p_school);   -- admin sekolah selalu membuat untuk sekolahnya sendiri
  if p_kind = 'siswa' then
    select * into cl from public.classes where id = p_class;
    if not found or p_member is null then raise exception 'Pilih kelas dan murid untuk akun siswa.'; end if;
    if not public._in_scope(a, cl.school_id) then raise exception 'Kelas ini bukan milik sekolah Anda.'; end if;
    if not exists (select 1 from jsonb_array_elements(cl.members) m where (m->>'no')::int = p_member) then
      raise exception 'Murid tidak ada di daftar kelas.';
    end if;
    sch := cl.school_id;
  elsif sch is null and p_kind = 'guru' then
    raise exception 'Pilih sekolah untuk akun guru.';
  end if;

  begin
    new_id := public._create_account(u, p_password, trim(p_name), p_kind, sch, nullif(trim(coalesce(p_title, '')), ''),
                                 case when p_kind = 'siswa' then p_class end, case when p_kind = 'siswa' then p_member end, true);
  exception when unique_violation then
    raise exception 'Nama akun "%" sudah dipakai, atau murid ini sudah punya akun.', u;
  end;
  return json_build_object('id', new_id, 'username', u, 'password', p_password, 'name', trim(p_name));
end $$;

-- Membuat akun untuk semua murid di satu kelas yang belum punya akun.
create or replace function public.admin_create_students(p_class uuid) returns json
language plpgsql security definer set search_path = public, extensions, auth as $$
declare a public.profiles := public._need_admin(); c public.classes; m jsonb; base text; uname text; pw text; res jsonb := '[]'; tries int;
begin
  select * into c from public.classes where id = p_class;
  if not found then raise exception 'Kelas tidak ditemukan.'; end if;
  if not public._in_scope(a, c.school_id) then raise exception 'Kelas ini bukan milik sekolah Anda.'; end if;
  for m in select * from jsonb_array_elements(c.members) loop
    continue when exists (select 1 from public.profiles where class_id = c.id and member_no = (m->>'no')::int and kind = 'siswa');
    base := left(regexp_replace(lower(split_part(trim(m->>'name'), ' ', 1)), '[^a-z0-9]', '', 'g'), 14);
    if length(base) < 2 then base := 'siswa'; end if;
    tries := 0;
    loop
      tries := tries + 1;
      uname := base || lpad(floor(random() * case when tries < 30 then 1000 else 100000 end)::int::text, 3, '0');
      exit when not exists (select 1 from public.profiles where username = uname);
    end loop;
    pw := public._gen_pw();
    perform public._create_account(uname, pw, m->>'name', 'siswa', c.school_id, null, c.id, (m->>'no')::int, true);
    res := res || jsonb_build_object('no', m->'no', 'name', m->>'name', 'username', uname, 'password', pw);
  end loop;
  return res::json;
end $$;

create or replace function public.admin_users() returns json
language plpgsql stable security definer set search_path = public as $$
declare a public.profiles := public._need_admin();
begin
  return (select coalesce(json_agg(x order by x.kind, x.name), '[]'::json) from (
    select p.id, p.username, p.name, p.kind, p.title, p.school_id as "schoolId", s.name as school,
           p.class_id as "classId", c.name as "className", p.member_no as "memberNo",
           cr.password, p.must_change as "mustChange", p.created_at as "createdAt"
    from public.profiles p
    left join public.schools s on s.id = p.school_id
    left join public.classes c on c.id = p.class_id
    left join public.credentials cr on cr.user_id = p.id
    where a.school_id is null or p.school_id = a.school_id) x);
end $$;

create or replace function public.admin_set_password(p_user uuid, p_password text) returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
declare a public.profiles := public._need_admin(); t public.profiles;
begin
  select * into t from public.profiles where id = p_user;
  if not found or not public._in_scope(a, t.school_id) then raise exception 'Akun tidak ditemukan.'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'Kata sandi minimal 6 karakter.'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = p_user;
  insert into public.credentials (user_id, password) values (p_user, p_password)
    on conflict (user_id) do update set password = excluded.password;
  update public.profiles set must_change = true where id = p_user;
end $$;

create or replace function public.admin_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare a public.profiles := public._need_admin(); t public.profiles;
begin
  select * into t from public.profiles where id = p_user;
  if not found or not public._in_scope(a, t.school_id) then raise exception 'Akun tidak ditemukan.'; end if;
  if p_user = a.id then raise exception 'Anda tidak bisa menghapus akun Anda sendiri.'; end if;
  -- Sesi milik akun yang dihapus dipindahkan ke admin ini, bukan ikut terhapus.
  -- Penugasan kelasnya hilang otomatis; kelas itu sendiri tidak terpengaruh.
  update public.sessions set owner = a.id where owner = p_user;
  delete from auth.users where id = p_user;
end $$;

-- Membuat atau mengubah kelas beserta daftar murid dan guru pengampunya, dalam satu langkah.
-- Nomor murid dikunci di sini: murid lama mempertahankan nomornya, murid baru mendapat nomor
-- berikutnya, dan nomor yang pernah dipakai tidak dipakai ulang (akun siswa menaut ke nomor ini).
-- p_teachers kosong (null) = penugasan guru tidak diubah.
create or replace function public.admin_save_class(p_id uuid, p_school uuid, p_name text, p_members jsonb, p_teachers uuid[] default null) returns json
language plpgsql security definer set search_path = public as $$
declare
  a public.profiles := public._need_admin(); c public.classes; cid uuid; sch uuid; m jsonb;
  old_nos int[] := '{}'; nos int[] := '{}'; res jsonb := '[]'; nxt int := 1; n int; orphan text;
begin
  if trim(coalesce(p_name, '')) = '' then raise exception 'Isi nama kelas.'; end if;
  if p_members is null or jsonb_typeof(p_members) <> 'array' then raise exception 'Daftar murid tidak valid.'; end if;
  if pg_column_size(p_members) > 200000 then raise exception 'Daftar murid terlalu besar.'; end if;

  if p_id is not null then
    select * into c from public.classes where id = p_id;
    if not found or not public._in_scope(a, c.school_id) then raise exception 'Kelas tidak ditemukan.'; end if;
    cid := c.id; sch := c.school_id;
    select coalesce(array_agg((x->>'no')::int), '{}') into old_nos from jsonb_array_elements(c.members) x;
    nxt := greatest(c.next_no, coalesce((select max(v) + 1 from unnest(old_nos) v), 1));
  else
    sch := coalesce(a.school_id, p_school);
    if sch is null or not exists (select 1 from public.schools where id = sch) then raise exception 'Pilih sekolah untuk kelas ini.'; end if;
  end if;

  for m in select * from jsonb_array_elements(p_members) loop
    continue when trim(coalesce(m->>'name', '')) = '';
    if coalesce(m->>'no', '') ~ '^[0-9]+$' and (m->>'no')::int = any(old_nos) and not ((m->>'no')::int = any(nos)) then
      n := (m->>'no')::int;
    else
      n := nxt; nxt := nxt + 1;
    end if;
    nos := nos || n;
    res := res || jsonb_build_object('no', n, 'name', trim(m->>'name'), 'g', case when m->>'g' in ('L', 'P') then m->>'g' else '' end);
  end loop;
  if jsonb_array_length(res) = 0 then raise exception 'Daftar kelas perlu minimal satu murid.'; end if;

  if p_id is not null then
    select string_agg(pr.name, ', ') into orphan from public.profiles pr
      where pr.class_id = cid and pr.kind = 'siswa' and not (pr.member_no = any(nos));
    if orphan is not null then
      raise exception 'Murid berikut sudah punya akun. Hapus akunnya dulu sebelum mengeluarkannya dari kelas: %', orphan;
    end if;
    update public.classes set name = trim(p_name), members = res, next_no = nxt where id = cid;
  else
    insert into public.classes (school_id, name, members, next_no) values (sch, trim(p_name), res, nxt) returning id into cid;
  end if;

  if p_teachers is not null then
    delete from public.class_teachers where class_id = cid;
    insert into public.class_teachers (class_id, teacher_id)
      select cid, pr.id from public.profiles pr where pr.id = any(p_teachers) and pr.kind = 'guru' and pr.school_id = sch;
  end if;
  return json_build_object('id', cid);
end $$;

create or replace function public.admin_delete_class(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a public.profiles := public._need_admin(); c public.classes; n int;
begin
  select * into c from public.classes where id = p_id;
  if not found or not public._in_scope(a, c.school_id) then raise exception 'Kelas tidak ditemukan.'; end if;
  select count(*) into n from public.profiles where class_id = p_id and kind = 'siswa';
  if n > 0 then raise exception 'Kelas ini masih punya % akun siswa. Hapus akun siswanya dulu.', n; end if;
  delete from public.classes where id = p_id;   -- sesi lama tetap ada (daftar murid sudah tersalin di sesi)
end $$;

create or replace function public.admin_overview() returns json
language plpgsql stable security definer set search_path = public as $$
declare a public.profiles := public._need_admin();
begin
  return json_build_object(
    'scope', (select name from public.schools where id = a.school_id),
    'totals', json_build_object(
      'users', (select count(*) from public.profiles p where a.school_id is null or p.school_id = a.school_id),
      'classes', (select count(*) from public.classes c where a.school_id is null or c.school_id = a.school_id),
      'sessions', (select count(*) from public.sessions s where a.school_id is null or s.school_id = a.school_id),
      'responses', (select count(*) from public.responses r join public.sessions s on s.id = r.session_id where a.school_id is null or s.school_id = a.school_id)),
    'sessions', (select coalesce(json_agg(x order by x."createdAt" desc), '[]'::json) from (
      select s.id, s.class_name as "className", s.type, p.name as owner, sc.name as school,
             jsonb_array_length(s.roster) as total,
             (select count(*) from public.responses r where r.session_id = s.id) as filled,
             s.created_at as "createdAt", (not s.closed and now() < s.closes_at) as open
      from public.sessions s
      left join public.profiles p on p.id = s.owner
      left join public.schools sc on sc.id = s.school_id
      where a.school_id is null or s.school_id = a.school_id
      order by s.created_at desc limit 200) x)
  );
end $$;

/* ------------------------------------------------------------------ */
/* Fungsi untuk semua pengguna                                         */
/* ------------------------------------------------------------------ */
create or replace function public.change_my_password(p_old text, p_new text) returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if auth.uid() is null then raise exception 'Sesi masuk berakhir. Masuk lagi.'; end if;
  if length(coalesce(p_new, '')) < 6 then raise exception 'Kata sandi baru minimal 6 karakter.'; end if;
  if p_new = p_old then raise exception 'Kata sandi baru harus berbeda dari yang lama.'; end if;
  if not exists (select 1 from auth.users where id = auth.uid() and encrypted_password = crypt(p_old, encrypted_password)) then
    raise exception 'Kata sandi saat ini tidak cocok.';
  end if;
  update auth.users set encrypted_password = crypt(p_new, gen_salt('bf')), updated_at = now() where id = auth.uid();
  delete from public.credentials where user_id = auth.uid();   -- salinan yang terlihat admin ikut hilang
  update public.profiles set must_change = false where id = auth.uid();
end $$;

drop function if exists public.owner_add_responses(uuid, jsonb);   -- diganti create_sample

/* ------------------------------------------------------------------ */
/* Fungsi untuk guru dan admin sekolah                                 */
/* ------------------------------------------------------------------ */
-- Nama kelas dan daftar murid diambil dari database, bukan dari kiriman aplikasi,
-- dan hanya untuk kelas yang boleh diakses pemanggil.
create or replace function public.create_session(p_class uuid, p_type text, p_config jsonb, p_days int) returns json
language plpgsql security definer set search_path = public as $$
declare p public.profiles; c public.classes; s public.sessions;
begin
  select * into p from public.profiles where id = auth.uid();
  if not found or p.kind not in ('guru', 'admin') then raise exception 'Hanya guru atau admin yang bisa membuat sesi.'; end if;
  if p.school_id is null then raise exception 'Admin pusat tidak membuat sesi. Pakai akun admin sekolah atau guru.'; end if;
  if not public.has_class_access(p_class) then raise exception 'Kelas tidak ditemukan atau belum ditugaskan kepada Anda.'; end if;
  if coalesce(length(p_type), 0) not between 1 and 40 then raise exception 'Jenis asesmen tidak dikenal.'; end if;
  if p_days is null or p_days < 1 or p_days > 90 then raise exception 'Batas pengisian 1 sampai 90 hari.'; end if;
  select * into c from public.classes where id = p_class;
  insert into public.sessions (school_id, owner, class_id, class_name, type, config, roster, closes_at)
  values (c.school_id, auth.uid(), c.id, c.name, p_type, coalesce(p_config, '{}'), c.members, now() + make_interval(days => p_days))
  returning * into s;
  return to_json(s);
end $$;

-- Sesi contoh dengan kelas contoh dan jawaban tiruan, supaya guru bisa melihat bentuk laporan.
-- Kelas contoh ditugaskan hanya kepada pemanggil.
create or replace function public.create_sample(p_type text, p_config jsonb, p_class_name text, p_members jsonb, p_rows jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare p public.profiles; c public.classes; s json; r jsonb; mx int;
begin
  select * into p from public.profiles where id = auth.uid();
  if not found or p.kind not in ('guru', 'admin') or p.school_id is null then raise exception 'Hanya guru atau admin sekolah yang bisa membuat sesi contoh.'; end if;
  if pg_column_size(p_members) + pg_column_size(p_rows) > 300000 then raise exception 'Data contoh terlalu besar.'; end if;
  select k.* into c from public.classes k
    join public.class_teachers t on t.class_id = k.id and t.teacher_id = p.id
    where k.name = p_class_name and k.school_id = p.school_id limit 1;
  if not found then
    select coalesce(max((x->>'no')::int), 0) + 1 into mx from jsonb_array_elements(p_members) x;
    insert into public.classes (school_id, name, members, next_no) values (p.school_id, p_class_name, p_members, mx) returning * into c;
    insert into public.class_teachers (class_id, teacher_id) values (c.id, p.id);
  end if;
  s := public.create_session(c.id, p_type, p_config, 14);
  for r in select * from jsonb_array_elements(p_rows) loop
    insert into public.responses (session_id, member_no, answers) values ((s->>'id')::uuid, (r->>'no')::int, r->'answers')
    on conflict do nothing;
  end loop;
  return s;
end $$;

/* ------------------------------------------------------------------ */
/* Fungsi untuk siswa                                                  */
/* ------------------------------------------------------------------ */
create or replace function public.student_sessions() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x."createdAt" desc), '[]'::json) from (
    select s.id, s.type, s.class_name as "className", s.closes_at as "closesAt", s.created_at as "createdAt",
           (not s.closed and now() < s.closes_at) as open,
           exists (select 1 from public.responses r where r.session_id = s.id and r.member_no = p.member_no) as done
    from public.sessions s join public.profiles p on p.id = auth.uid() and p.kind = 'siswa'
    where s.class_id = p.class_id) x
  where x.open or x.done $$;

create or replace function public.student_session(p_id uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', s.id, 'type', s.type, 'className', s.class_name, 'config', s.config,
    'roster', (select coalesce(jsonb_agg(jsonb_build_object('no', m->'no', 'name', m->'name')), '[]'::jsonb) from jsonb_array_elements(s.roster) m),
    'open', (not s.closed and now() < s.closes_at),
    'done', exists (select 1 from public.responses r where r.session_id = s.id and r.member_no = p.member_no),
    'me', p.member_no)
  from public.sessions s join public.profiles p on p.id = auth.uid() and p.kind = 'siswa'
  where s.id = p_id and s.class_id = p.class_id $$;

create or replace function public.submit_response(p_session uuid, p_answers jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare p public.profiles; s public.sessions;
begin
  select * into p from public.profiles where id = auth.uid();
  if not found or p.kind <> 'siswa' then raise exception 'Hanya akun siswa yang bisa mengisi angket.'; end if;
  select * into s from public.sessions where id = p_session and class_id = p.class_id;
  if not found then raise exception 'Angket tidak ditemukan.'; end if;
  if s.closed or now() >= s.closes_at then raise exception 'Pengisian sudah ditutup.'; end if;
  if pg_column_size(p_answers) > 20000 then raise exception 'Jawaban terlalu besar.'; end if;
  begin
    insert into public.responses (session_id, member_no, answers) values (s.id, p.member_no, p_answers);
  exception when unique_violation then
    raise exception 'Kamu sudah mengisi angket ini.';
  end;
end $$;

/* ------------------------------------------------------------------ */
/* Hak menjalankan fungsi                                              */
/* ------------------------------------------------------------------ */
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.my_school(), public.my_kind(), public.is_admin(), public.is_super(), public.can_see_school(uuid), public.has_class_access(uuid) to authenticated;
grant execute on function
  public.admin_create_user(text, text, text, text, uuid, text, uuid, int),
  public.admin_create_students(uuid), public.admin_users(), public.admin_set_password(uuid, text),
  public.admin_delete_user(uuid), public.admin_overview(),
  public.admin_save_class(uuid, uuid, text, jsonb, uuid[]), public.admin_delete_class(uuid),
  public.create_session(uuid, text, jsonb, int), public.create_sample(text, jsonb, text, jsonb, jsonb),
  public.change_my_password(text, text),
  public.student_sessions(), public.student_session(uuid), public.submit_response(uuid, jsonb)
to authenticated;

/* ------------------------------------------------------------------ */
/* Data awal: lima sekolah (ganti namanya nanti lewat dasbor admin)    */
/* ------------------------------------------------------------------ */
insert into public.schools (name)
select 'Sekolah ' || n from generate_series(1, 5) n where not exists (select 1 from public.schools);

/* ------------------------------------------------------------------ */
/* Membuat admin pertama (admin pusat)                                 */
/* ------------------------------------------------------------------ */
-- Fungsi ini hanya bisa dijalankan dari SQL Editor dan hanya jika belum ada admin.
create or replace function public.bootstrap_admin(p_username text, p_password text, p_name text) returns uuid
language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if exists (select 1 from public.profiles where kind = 'admin') then raise exception 'Admin sudah ada.'; end if;
  if length(p_password) < 8 then raise exception 'Pakai kata sandi minimal 8 karakter.'; end if;
  return public._create_account(lower(p_username), p_password, p_name, 'admin', null, null, null, null, false);
end $$;
revoke execute on function public.bootstrap_admin(text, text, text) from public, anon, authenticated;

-- Jalankan sekali, ganti isinya (jalankan terpisah setelah skema di atas berhasil):
--   select public.bootstrap_admin('admin', 'GANTI-DENGAN-SANDI-KUAT', 'Admin Utama');
