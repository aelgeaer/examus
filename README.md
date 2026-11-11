# Examus by prepod

Platform asesmen psikologi untuk sekolah. Guru BK dan psikolog sekolah membuat sesi, membagikan link ke murid, murid mengisi dari HP tanpa akun, dan laporan tersusun otomatis.

Asesmen yang sudah berjalan: gaya belajar, sosiometri (dengan sosiogram interaktif dan angket buatan guru), minat karier (RIASEC), kekuatan & kesulitan, suasana hati (PHQ-9), tipe kepribadian, AKPD (SMP dan SMA), dan deteksi perundungan. Semua butir ditulis untuk Examus kecuali PHQ-9 (bebas dipakai), dan belum ada yang divalidasi secara psikometrik untuk versi ini.

## Cara kerja akun

- **Guru mendaftar sendiri** di halaman Daftar: nama lengkap, pilih sekolah (salah satu dari lima), nama akun, dan kata sandi. Admin juga bisa **membuatkan akun guru** bila perlu; akun buatan admin wajib mengganti sandi saat masuk pertama.
- **Masuk dengan nama akun dan kata sandi**, tanpa email.
- **Guru membuat kelasnya sendiri** dengan menempel daftar nama dari Excel atau WhatsApp. Admin sekolah melihat semua kelas di sekolahnya dan boleh menambahkan guru lain sebagai pemegang kelas.
- **Angket sosiometri bisa dibuat sendiri.** Selain angket siap pakai (Lengkap 8 pertanyaan, Simpel 4 pertanyaan), guru bisa menyusun angket dari bank pertanyaan per bidang BK atau menulis pertanyaannya sendiri, mengatur jumlah teman yang dipilih (1 sampai 5), dan memilih apakah murid ditanya alasannya. Angket disimpan di tabel `questionnaires` dan hanya terlihat oleh pembuatnya.
- **Murid tidak punya akun.** Guru membagikan link sesi (WhatsApp, salin link, atau kode QR). Murid membuka link, memilih namanya, lalu mengisi. Satu nama hanya bisa mengisi sekali.
- Admin bisa **melihat kata sandi awal** akun yang ia buat selama pemilik belum menggantinya, dan bisa **mengatur ulang** bila lupa. Admin bisa **menambah admin baru**.
- **Lima sekolah dalam satu database, datanya terpisah.** Setiap data punya `school_id` dan Row Level Security mencegah akun satu sekolah membaca data sekolah lain.
  - *Admin sekolah* mengelola akun dan melihat data sekolahnya saja.
  - *Admin pusat* (dibuat tanpa sekolah) melihat semua sekolah, mengganti nama sekolah, dan membuat admin sekolah.

## Struktur

```
index.html              kerangka aplikasi (SPA, rute memakai #/...)
assets/app.css          seluruh gaya, responsif dan siap cetak
assets/js/main.js       router dan penjaga halaman (per jenis akun)
assets/js/store.js      lapisan data Supabase
assets/js/data.js       butir angket, kelas contoh, artikel blog
assets/js/sociogram.js  perhitungan indeks dan gambar sosiogram
assets/js/pages-*.js    halaman publik, guru/admin, dan murid
assets/js/reports.js    laporan tiap asesmen
assets/js/config.js     alamat dan kunci Supabase
supabase/schema.sql     tabel, aturan akses, dan fungsi database
```

Tidak ada proses build. Semua file statis.

## Pasang database (Supabase)

1. Buat proyek **baru** di https://supabase.com.
2. Buka SQL Editor, tempel seluruh isi `supabase/schema.sql`, lalu Run. Ini membuat tabel, aturan akses, dan lima sekolah awal ("Sekolah 1" sampai "Sekolah 5").
3. Di SQL Editor, jalankan sekali untuk membuat **admin pusat** pertama (ganti isinya):

   ```sql
   select public.bootstrap_admin('admin', 'GANTI-DENGAN-SANDI-KUAT', 'Admin Utama');
   ```

   Fungsi ini hanya bisa dijalankan dari SQL Editor dan menolak bila admin sudah ada.
4. Buka Project Settings > API. Salin **Project URL** dan kunci **anon public**, lalu isi di `assets/js/config.js`.
5. Pastikan `USERNAME_DOMAIN` di `config.js` sama dengan `_account_domain()` di `schema.sql` (bawaan: `examus.local`). Ini hanya email di balik layar; pengguna tidak pernah melihatnya.
6. Di Authentication > Providers > Email, matikan "Allow new users to sign up". Pendaftaran guru tetap berjalan lewat fungsi database, bukan lewat pendaftaran Supabase.

Kunci `anon public` aman diletakkan di kode publik. Yang menjaga data adalah Row Level Security di `schema.sql`.

## Deploy ke Vercel

1. Di Vercel, pilih Add New > Project, lalu impor repo GitHub `aelgeaer/examus`.
2. Framework Preset: **Other**. Kosongkan Build Command dan Output Directory (situs statis, root repo).
3. Deploy. Setiap `git push` ke `main` akan deploy ulang otomatis.

## Pertama kali dipakai

1. Masuk sebagai admin pusat (nama akun dan sandi dari langkah 3 di atas).
2. Di Dasbor admin > Sekolah, ganti nama kelima sekolah. Nama inilah yang dipilih guru saat mendaftar.
3. Bila perlu, buat akun **admin sekolah** untuk tiap sekolah (Tambah satu akun > Admin, pilih sekolahnya).
4. Guru membuka situs, klik **Daftar**, mengisi nama dan sekolah, lalu membuat kelas dan memulai asesmen.
5. Di halaman sesi, guru mengirim link ke grup WhatsApp kelas dan memantau jumlah murid yang sudah mengisi.

## Catatan penting

- **Pendaftaran guru lewat fungsi `register_teacher`**, bukan lewat pendaftaran Supabase, jadi pengaturan "Allow new users to sign up" boleh tetap mati. Siapa pun yang membuka situs bisa mendaftar sebagai guru di salah satu sekolah; admin sekolah bisa menghapus akun yang tidak dikenal.
- **Link murid** memuat kode acak 10 karakter. Siapa pun yang memegang link bisa melihat nama kelas dan daftar nama murid, dan bisa mengisi atas nama murid yang belum mengisi. Bagikan hanya ke grup kelas, dan tutup sesi bila sudah selesai.
- **Nomor murid dikunci di server.** Murid lama mempertahankan nomornya saat daftar kelas diubah, murid baru mendapat nomor berikutnya, dan nomor lama tidak dipakai ulang, supaya jawaban di sesi lama tidak tertukar.
- **Sesi dibuat di server** (`create_session`): nama kelas dan daftar murid diambil dari database, hanya untuk kelas yang boleh diakses pembuatnya.
- **Admin pusat tidak membuat sesi** karena tidak punya sekolah. Gunakan akun admin sekolah atau guru.
- **Memperbarui proyek yang sudah berjalan:** tempel ulang seluruh `supabase/schema.sql` di SQL Editor dan Run. Data lama tetap ada; sesi lama otomatis mendapat link. Akun murid dari versi sebelumnya tidak bisa dipakai masuk lagi dan bisa dihapus admin dari tabel Akun.
- Fungsi pembuatan akun menulis langsung ke tabel `auth` Supabase. Skema `auth` bisa berubah antarversi Supabase; uji satu alur lengkap (daftar, login, ganti sandi) sebelum dipakai sungguhan.

## Sebelum dipakai dengan murid sungguhan

- Baca dan sesuaikan halaman Syarat penggunaan dan Kebijakan privasi dengan aturan sekolah.
- Butir angket ditulis khusus untuk Examus dan belum divalidasi secara psikometrik. Mintalah psikolog meninjaunya sebelum hasilnya dipakai untuk keputusan penting.
