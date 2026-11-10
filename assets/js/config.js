// Konfigurasi Examus. Isi dari Supabase > Project Settings > API (lihat README.md).
// Kunci "anon public" memang aman berada di kode publik; yang menjaga data adalah Row Level Security.
export const CONFIG = {
  SUPABASE_URL: "https://okpokhawqjdlqpmstwxl.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_iwKS0K0-f75qd03NnBbPCg_JiB3JmF9",
  // Domain email di balik layar untuk login dengan nama akun. Harus sama dengan
  // fungsi _account_domain() di supabase/schema.sql. Pengguna tidak pernah melihatnya.
  USERNAME_DOMAIN: "examus.local",
  SITE_NAME: "Examus",
  SITE_BY: "by prepod",
};
