# Examus by prepod

Platform asesmen psikologi untuk sekolah. Guru BK dan psikolog sekolah membuat sesi, murid mengisi dari HP lewat akunnya, dan laporan tersusun otomatis.

Asesmen yang sudah berjalan: sosiometri (dengan sosiogram interaktif), gaya belajar, minat karier (RIASEC), dan kebutuhan siswa.

## Cara kerja akun

- **Tidak ada pendaftaran mandiri.** Semua akun (admin, guru, murid) dibuat oleh admin.
- **Masuk dengan nama akun dan kata sandi**, tanpa email.
- Admin membagikan nama akun dan kata sandi awal. Saat masuk pertama kali, pengguna **wajib menggantinya**.
- Admin bisa **melihat kata sandi awal** selama pemilik belum menggantinya, dan bisa **mengatur ulang** bila lupa. Setelah pemilik mengganti sandi, salinan yang terlihat admin dihapus dan hanya tersisa hash yang tidak bisa dibaca siapa pun.
- Guru dan murid bisa **mengganti kata sandi sendiri** di halaman Akun.
- Admin bisa **menambah admin baru**.
- **Lima sekolah dalam satu database, datanya terpisah.** Setiap data punya `school_id` dan Row Level Security mencegah akun satu sekolah membaca data sekolah lain.
  - *Admin sekolah* mengelola akun dan melihat data sekolahnya saja.
  - *Admin pusat* (dibuat tanpa sekolah) melihat semua sekolah, mengganti nama sekolah, dan membuat admin sekolah.

Alur murid: admin membuat akun murid untuk satu kelas (satu klik, dari daftar kelas yang dibuat guru), membagikan daftar nama akun dan kata sandinya (bisa diunduh sebagai CSV), lalu murid login dan angket kelasnya muncul otomatis. Link publik untuk murid sudah tidak ada.

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
6. Di Authentication > Providers > Email, boleh matikan "Allow new users to sign up" agar tidak ada yang bisa mendaftar lewat API Supabase langsung.

Kunci `anon public` aman diletakkan di kode publik. Yang menjaga data adalah Row Level Security di `schema.sql`.

## Deploy ke Vercel

1. Di Vercel, pilih Add New > Project, lalu impor repo GitHub `aelgeaer/examus`.
2. Framework Preset: **Other**. Kosongkan Build Command dan Output Directory (situs statis, root repo).
3. Deploy. Setiap `git push` ke `main` akan deploy ulang otomatis.

## Pertama kali dipakai

1. Masuk sebagai admin pusat (nama akun dan sandi dari langkah 3 di atas).
2. Di Dasbor admin > Sekolah, ganti nama kelima sekolah.
3. Buat akun **admin sekolah** untuk tiap sekolah (Tambah satu akun > Admin, pilih sekolahnya) dan akun **guru**.
4. Guru masuk, mengganti sandi, lalu membuat daftar kelas dengan menempel nama murid.
5. Admin membuka **Buat akun untuk satu kelas sekaligus**, memilih kelas, mengunduh CSV, dan membagikannya ke murid.

## Catatan penting

- **Nomor murid tidak berubah.** Akun murid menaut ke nomor murid di daftar kelas, jadi mengedit daftar kelas tidak mengacak nomor. Menghapus murid dari daftar kelas membuat akunnya yatim; hapus akunnya dari dasbor admin.
- **Menghapus akun guru** memindahkan kelas dan sesinya ke admin yang menghapus, bukan ikut terhapus.
- **Admin pusat tidak membuat kelas atau sesi** karena tidak punya sekolah. Gunakan akun admin sekolah atau guru untuk itu.
- Fungsi pembuatan akun menulis langsung ke tabel `auth` Supabase. Skema `auth` bisa berubah antarversi Supabase; uji satu alur lengkap (buat akun, login, ganti sandi) sebelum dipakai sungguhan. Kode ini belum diuji terhadap proyek Supabase sungguhan.

## Sebelum dipakai dengan murid sungguhan

- Baca dan sesuaikan halaman Syarat penggunaan dan Kebijakan privasi dengan aturan sekolah.
- Butir angket ditulis khusus untuk Examus dan belum divalidasi secara psikometrik. Mintalah psikolog meninjaunya sebelum hasilnya dipakai untuk keputusan penting.
