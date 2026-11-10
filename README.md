# Examus by prepod

Platform asesmen psikologi untuk sekolah. Guru BK dan psikolog sekolah membuat sesi, murid mengisi dari HP tanpa akun, dan laporan tersusun otomatis.

Asesmen yang sudah berjalan: sosiometri (dengan sosiogram interaktif), gaya belajar, minat karier (RIASEC), dan kebutuhan siswa.

## Struktur

```
index.html              kerangka aplikasi (SPA, rute memakai #/...)
assets/app.css          seluruh gaya, responsif dan siap cetak
assets/js/main.js       router dan penjaga halaman
assets/js/store.js      lapisan data: mode lokal dan Supabase
assets/js/data.js       butir angket, kelas contoh, artikel blog
assets/js/sociogram.js  perhitungan indeks dan gambar sosiogram
assets/js/pages-*.js    halaman publik, halaman guru, halaman murid
assets/js/reports.js    laporan tiap asesmen
assets/js/config.js     alamat dan kunci Supabase
supabase/schema.sql     tabel, aturan akses, dan fungsi database
```

Tidak ada proses build. Semua file statis, jadi bisa langsung ditayangkan di GitHub Pages.

## Menjalankan di komputer

```
python3 -m http.server 8000
```

Lalu buka http://localhost:8000.

## Menayangkan di GitHub Pages

1. Buka repo di GitHub, lalu Settings > Pages.
2. Pada "Build and deployment", pilih Source: Deploy from a branch.
3. Pilih branch `main` dan folder `/ (root)`, lalu Save.
4. Tunggu satu sampai dua menit. Alamat situs muncul di halaman yang sama.

## Dua mode penyimpanan

**Mode percobaan (bawaan).** Selama `config.js` kosong, semua data disimpan di browser pengunjung (localStorage). Cocok untuk mencoba dan demo. Batasannya: link murid hanya bisa dibuka di perangkat yang sama, dan login hanya gerbang di sisi browser, bukan pengamanan sungguhan.

**Mode Supabase.** Untuk dipakai di kelas sungguhan, hubungkan database gratis dari Supabase:

1. Buat proyek di https://supabase.com.
2. Buka SQL Editor, tempel seluruh isi `supabase/schema.sql`, lalu Run.
3. Buka Project Settings > API. Salin Project URL dan kunci `anon public`.
4. Isi keduanya di `assets/js/config.js`, lalu commit dan push.
5. Di Authentication > URL Configuration, isi Site URL dengan alamat GitHub Pages Anda.
6. Daftar lewat halaman Masuk di situs, lalu jadikan akun itu admin di SQL Editor:

```sql
update public.profiles set is_admin = true where email = 'email-anda@contoh.com';
```

Kunci `anon public` memang aman diletakkan di kode publik. Yang menjaga data adalah aturan Row Level Security di `schema.sql`: guru hanya bisa membaca kelas, sesi, dan jawaban miliknya sendiri, sedangkan murid hanya bisa mengirim jawaban lewat fungsi `submit_response`.

Catatan: adaptor Supabase ditulis mengikuti skema di atas tetapi belum diuji terhadap proyek Supabase sungguhan. Uji dulu satu alur lengkap (daftar, buat kelas, isi dari HP lain, buka laporan) sebelum dipakai di kelas.

## Akun admin

- Mode percobaan: akun `admin@examus.local` dibuat otomatis di tiap browser. Kata sandinya diberikan terpisah oleh pembuat situs.
- Mode Supabase: admin adalah akun dengan `is_admin = true` (langkah 6 di atas).

## Sebelum dipakai dengan murid sungguhan

- Baca dan sesuaikan halaman Syarat penggunaan dan Kebijakan privasi dengan aturan sekolah.
- Butir angket ditulis khusus untuk Examus dan belum divalidasi secara psikometrik. Mintalah psikolog meninjaunya sebelum hasilnya dipakai untuk keputusan penting.
