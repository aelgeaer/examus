// Isi Examus: daftar asesmen, butir angket, kelas contoh, dan artikel blog.
import { SOCIO_REASONS, areaOf } from "./socio-data.js";

const I = (inner) => `<svg class="ico" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="14" fill="#e6f2fd"/>${inner}</svg>`;
export const ICONS = {
  get akpd() { return this.kebutuhan; },
  sosiometri: I(`<circle cx="24" cy="24" r="15" fill="none" stroke="#9ccbf3" stroke-width="3"/><path d="M14 31l10-7 9-9M24 24l8 9" stroke="#0c2340" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="24" cy="24" r="4.5" fill="#1565b8"/><circle cx="14" cy="31" r="3.5" fill="#0c2340"/><circle cx="33" cy="15" r="3.5" fill="#0c2340"/><circle cx="32" cy="33" r="3.5" fill="#ffcf8f" stroke="#0c2340" stroke-width="2"/>`),
  "gaya-belajar": I(`<path d="M11 15h11a4 4 0 014 4v15a3 3 0 00-3-3H11z" fill="#1565b8"/><path d="M37 15H26v19a3 3 0 013-3h8z" fill="#9ccbf3"/><circle cx="34" cy="13" r="4" fill="#ffcf8f" stroke="#0c2340" stroke-width="2"/>`),
  "minat-karier": I(`<circle cx="24" cy="24" r="14" fill="none" stroke="#9ccbf3" stroke-width="3"/><path d="M30 18l-3.5 8.5L18 30l3.5-8.5z" fill="#1565b8" stroke="#0c2340" stroke-width="2" stroke-linejoin="round"/><circle cx="24" cy="24" r="2" fill="#ffcf8f"/>`),
  kebutuhan: I(`<rect x="12" y="11" width="24" height="27" rx="5" fill="#fff" stroke="#0c2340" stroke-width="2.5"/><path d="M17 19l2.5 2.5L24 17M17 28l2.5 2.5L24 26" stroke="#1565b8" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 20h5M27 29h5" stroke="#9ccbf3" stroke-width="3" stroke-linecap="round"/>`),
  emosi: I(`<circle cx="24" cy="24" r="14" fill="#9ccbf3"/><circle cx="19" cy="21" r="2" fill="#0c2340"/><circle cx="29" cy="21" r="2" fill="#0c2340"/><path d="M18 28c3 3.5 9 3.5 12 0" stroke="#0c2340" stroke-width="2.5" fill="none" stroke-linecap="round"/>`),
  kekuatan: I(`<path d="M24 10l4 9 9.5 1-7 6.5 2 9.5-8.5-5-8.5 5 2-9.5-7-6.5 9.5-1z" fill="#ffcf8f" stroke="#0c2340" stroke-width="2.5" stroke-linejoin="round"/>`),
  aman: I(`<path d="M24 9l12 4v9c0 8-5 13-12 17-7-4-12-9-12-17v-9z" fill="#1565b8"/><path d="M18 24l4.5 4.5L31 19" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  kepribadian: I(`<rect x="10" y="10" width="13" height="13" rx="4" fill="#1565b8"/><rect x="25" y="10" width="13" height="13" rx="6.5" fill="#9ccbf3"/><rect x="10" y="25" width="13" height="13" rx="6.5" fill="#ffcf8f"/><rect x="25" y="25" width="13" height="13" rx="4" fill="#0c2340"/>`),
};

// about: lima kartu "Tentang" di halaman Mulai. settings: pengaturan tambahan sebelum sesi dimulai.
const A = (h, p, extra = {}) => ({ h, p, ...extra });
export const ASSESSMENTS = [
  { id: "gaya-belajar", name: "Gaya Belajar", ready: true, tone: "", who: "Semua guru",
    short: "Cara tiap murid paling mudah belajar, untuk pembelajaran berdiferensiasi.",
    long: "Kecenderungan cara belajar tiap murid (visual, auditori, kinestetik) sebagai bahan memvariasikan kegiatan di kelas.",
    about: [A("Yang dikerjakan murid", "18 situasi sehari-hari, satu per layar. Murid memilih satu dari tiga jawaban, kira-kira 5 menit di HP."),
      A("Contoh situasi", "Beberapa yang akan dijawab murid:", { ex: ["Untuk menghafal, aku biasanya…", "Kalau harus merakit sesuatu, aku…", "Pelajaran terasa menyenangkan kalau…"] }),
      A("Yang dilihat murid", "Gaya belajarnya, persentase visual, auditori, dan kinestetik, serta saran cara belajar."),
      A("Yang Anda dapat", "Kecenderungan kelas, strategi mengajar, murid per gaya untuk membagi kelompok, dan skor tiap murid."),
      A("Dasarnya", "Model VAK (visual, auditori, kinestetik). Hasilnya preferensi, bukan kemampuan.")] },
  { id: "sosiometri", name: "Sosiometri", ready: true, tone: "c-sky", who: "Guru BK dan wali kelas",
    short: "Peta pertemanan kelas: siapa saling memilih, siapa yang perlu didampingi.",
    long: "Peta hubungan pertemanan di kelas. Terlihat pasangan yang saling memilih, kelompok yang erat, dan murid yang belum dipilih siapa pun." },
  { id: "minat-karier", name: "Minat Karier", ready: true, tone: "c-sun", who: "Guru BK dan psikolog sekolah",
    short: "Minat karier tiap murid (RIASEC), untuk bimbingan memilih mapel, jurusan, dan cita-cita.",
    long: "Pemetaan enam bidang minat (RIASEC) tiap murid, untuk membuka percakapan tentang mapel pilihan, jurusan, dan cita-cita.",
    about: [A("Yang dikerjakan murid", "48 kegiatan, satu per layar. Murid memilih seberapa suka, kira-kira 8 menit di HP.", { chips: ["Sangat suka", "Suka", "Ragu-ragu", "Tidak suka", "Sangat tidak suka"] }),
      A("Contoh kegiatan", "Beberapa yang akan dinilai murid:", { ex: ["Memperbaiki sepeda atau peralatan rumah", "Melakukan percobaan sains", "Menggambar, mendesain, atau membuat video"] }),
      A("Yang dilihat murid", "Kode minatnya (misalnya SAE), contoh mapel pilihan, jurusan, dan pekerjaan."),
      A("Yang Anda dapat", "Profil minat kelas, murid yang perlu diajak bicara, murid per minat, dan skor tiap murid."),
      A("Dasarnya", "Teori minat karier Holland (RIASEC). Untuk SMP dan SMA/SMK, terutama menjelang memilih mapel atau jurusan.")] },
  { id: "kekuatan", name: "Kekuatan & Kesulitan", ready: true, tone: "", who: "Guru BK dan wali kelas", settings: "consent",
    short: "Skrining emosi, perilaku, fokus, pertemanan, dan kepedulian tiap murid, untuk layanan BK.",
    long: "Skrining emosi, perilaku, fokus, pertemanan, dan kepedulian tiap murid, untuk menentukan siapa yang perlu didampingi lebih dulu.",
    consentText: "Tujuan asesmen ini sudah disampaikan, dan hasilnya ditindaklanjuti guru BK atau wali kelas secara rahasia.",
    consentNote: "Jawaban ini menyangkut kesehatan mental anak, yang termasuk data pribadi spesifik dan memerlukan persetujuan orang tua (UU 27/2022 tentang Pelindungan Data Pribadi, Pasal 4 dan 25).",
    about: [A("Yang dikerjakan murid", "25 kalimat tentang diri murid dalam enam bulan terakhir, lalu satu pertanyaan tentang dampaknya. Kira-kira 7 menit di HP.", { chips: ["Tidak benar", "Agak benar", "Benar"] }),
      A("Contoh kalimat", "Beberapa yang akan dijawab murid:", { ex: ["Aku memperhatikan perasaan orang lain", "Aku sulit duduk tenang dalam waktu lama", "Aku sering pusing, sakit perut, atau tidak enak badan", "Kalau sedang marah, aku sulit menahan diri"] }),
      A("Yang dilihat murid", "Kekuatannya dan saran kecil. Tanpa skor, tanpa label."),
      A("Yang Anda dapat", "Gambaran kelas per area, siapa diajak bicara lebih dulu (termasuk yang sering diganggu), kelompok bimbingan, dan skor tiap murid."),
      A("Dasarnya", "SDQ (Strengths and Difficulties Questionnaire) laporan diri, dengan lima area: emosi, perilaku, fokus, pertemanan, dan kepedulian. Untuk usia 11 tahun ke atas.")] },
  { id: "emosi", name: "Suasana Hati", ready: true, tone: "", who: "Psikolog sekolah dan guru BK", settings: "phq",
    short: "Skrining gejala depresi (PHQ-9) dua minggu terakhir, dengan daftar murid yang perlu dihubungi lebih dulu.",
    long: "Skrining gejala depresi dua minggu terakhir dengan PHQ-9, agar murid yang perlu ditemui lebih dulu tidak terlewat.",
    consentText: "Tujuan skrining sudah disampaikan, ada guru BK yang membaca hasilnya hari itu, dan sekolah tahu ke mana merujuk (puskesmas, psikolog).",
    consentNote: "Jawaban ini adalah data kesehatan anak, data pribadi spesifik yang memerlukan persetujuan orang tua (UU 27/2022 tentang Pelindungan Data Pribadi, Pasal 4 dan 25).",
    about: [A("Yang dikerjakan murid", "9 pertanyaan tentang dua minggu terakhir, lalu satu tentang dampaknya. Kira-kira 3 menit di HP.", { chips: ["Tidak pernah", "Beberapa hari", "Lebih dari seminggu", "Hampir setiap hari"] }),
      A("Contoh pertanyaan", "Beberapa yang akan dijawab murid:", { ex: ["merasa kurang tertarik atau kurang senang melakukan apa pun", "merasa sedih, murung, mudah kesal, atau putus asa", "sulit tidur, sering terbangun, atau justru tidur terlalu banyak"] }),
      A("Yang dilihat murid", "Kata-kata yang menguatkan dan tempat meminta bantuan. Tanpa skor dan tanpa kata “depresi”."),
      A("Yang Anda dapat", "Siapa dihubungi hari ini, minggu ini, dan dipantau; sebaran gejala; protokol tindak lanjut."),
      A("Dasarnya", "PHQ-9 (Kroenke, Spitzer & Williams), dengan kalimat versi remaja. Untuk usia 12 tahun ke atas.")] },
  { id: "kepribadian", name: "Tipe Kepribadian", ready: true, tone: "", who: "Guru BK dan psikolog sekolah",
    short: "Empat preferensi tiap murid (16 tipe ala Jung), untuk mengenal diri dan memvariasikan cara mengajar.",
    long: "Empat preferensi tiap murid (16 tipe ala Jung), untuk mengenal diri dan memvariasikan cara mengajar.",
    about: [A("Yang dikerjakan murid", "44 situasi sehari-hari, masing-masing dua pilihan. Murid memilih yang lebih mirip dirinya, kira-kira 7 menit di HP."),
      A("Contoh situasi", "Sesudah hari yang melelahkan, aku paling cepat pulih dengan…", { ex: ["mengobrol atau bermain bersama teman", "menyendiri dan melakukan hal yang kusuka"] }),
      A("Yang dilihat murid", "Empat hurufnya (misalnya INFP), kekuatannya, dan cara belajar yang mungkin cocok."),
      A("Yang Anda dapat", "Tabel 16 tipe kelas, sebaran tiap pasangan, murid per kelompok, saran mengajar, dan tipe tiap murid."),
      A("Dasarnya", "Teori tipe psikologis Jung (E/I, S/N, T/F, J/P), dengan butir yang ditulis untuk Examus; bukan MBTI®.")] },
  { id: "akpd", name: "AKPD", title: "AKPD", ready: true, tone: "", who: "Guru BK", settings: "jenjang",
    short: "Analisis kebutuhan peserta didik di bidang pribadi, sosial, belajar, dan karier, untuk menyusun program BK.",
    long: "Analisis kebutuhan peserta didik di bidang pribadi, sosial, belajar, dan karier, untuk menyusun program BK.",
    about: [A("Yang dikerjakan murid", "60 kebutuhan, satu per layar. Murid memilih seberapa butuh bantuan, kira-kira 10 menit di HP.", { chips: ["Sangat butuh bantuan", "Butuh bantuan", "Sedikit butuh bantuan", "Tidak butuh bantuan"] }),
      A("Contoh kebutuhan", "Beberapa yang akan dinilai murid:", { ex: ["Mengenali kelebihan dan kekurangan diri", "Berkomunikasi dengan baik kepada orang lain", "Menemukan cara belajar yang paling cocok", "Mengenali minat dan bakat diri"] }),
      A("Yang dilihat murid", "Bidang yang paling ingin ia bantu, dan ke mana ia bisa bercerita."),
      A("Yang Anda dapat", "Kebutuhan kelas per bidang, topik bimbingan klasikal dan kelompok, rekap semua butir untuk program BK, dan murid yang perlu diajak bicara lebih dulu."),
      A("Dasarnya", "15 kebutuhan di tiap bidang layanan BK (pribadi, sosial, belajar, karier), dengan butir SD, SMP, dan SMA sendiri.")] },
  { id: "aman", name: "Deteksi Perundungan", ready: true, tone: "c-sky", who: "Guru BK dan kepala sekolah", settings: "consent",
    short: "Siapa terindikasi mengalami, melakukan, atau menyaksikan perundungan, dan seberapa aman sekolah terasa.",
    long: "Siapa terindikasi mengalami, melakukan, atau menyaksikan perundungan, dan seberapa aman sekolah terasa bagi murid.",
    consentText: "Tujuan angket ini sudah disampaikan: mendeteksi perundungan untuk melindungi dan membantu, bukan untuk menghukum. Hasilnya ditindaklanjuti guru BK secara rahasia.",
    consentNote: "Jawaban ini menyangkut kekerasan yang dialami atau dilakukan anak, data yang perlu dijaga dan memerlukan persetujuan orang tua (UU 27/2022 tentang Pelindungan Data Pribadi, Pasal 25).",
    about: [A("Yang dikerjakan murid", "40 kalimat tentang tiga bulan terakhir, satu per layar. Kira-kira 10 menit di HP.", { chips: ["Tidak pernah", "Jarang", "Kadang-kadang", "Sering", "Sangat sering"] }),
      A("Contoh kalimat", "Satu dari tiap aspek:", { ex: ["Ada teman yang mengejek atau menghinaku.", "Aku mengejek atau menghina teman.", "Aku melihat teman diejek atau dihina.", "Aku tahu kepada siapa aku bisa melapor kalau terjadi perundungan."] }),
      A("Yang dilihat murid", "Langkah kecil dan tempat meminta bantuan. Tanpa skor dan tanpa label."),
      A("Yang Anda dapat", "Siapa diajak bicara lebih dulu (ancaman atau kekerasan fisik didahulukan), bentuk perundungan di kelas, usulan layanan, dan panduan wawancara."),
      A("Dasarnya", "Empat aspek masing-masing 10 kalimat: mengalami, melakukan, menyaksikan, dan iklim sekolah (rasa aman dan kepercayaan melapor). Penanganan bersama TPPK (Permendikbudristek 46/2023). Untuk SMP dan SMA/SMK.")] },
  { id: "kebutuhan", name: "Kebutuhan siswa", ready: true, hidden: true, tone: "", who: "Guru BK",
    short: "Angket kebutuhan versi lama.", long: "Angket kebutuhan versi lama (diganti AKPD). Masih ada agar laporan sesi lama tetap bisa dibuka." },
];
export const visibleAssessments = () => ASSESSMENTS.filter((a) => !a.hidden);
export const getAssessment = (id) => ASSESSMENTS.find((a) => a.id === id);

/* ---------- Sosiometri ---------- */
export { SOCIO_VARIANTS } from "./socio-data.js";

/* ---------- Gaya belajar ---------- */
export const VAK = { V: "Visual", A: "Auditori", K: "Kinestetik" };
export const VAK_TIPS = {
  V: "Sediakan bagan, peta konsep, warna, dan contoh yang bisa dilihat.",
  A: "Beri ruang untuk diskusi, tanya jawab, dan penjelasan lisan.",
  K: "Sisipkan praktik, peragaan, dan kegiatan yang membuat murid bergerak.",
};
const g = (text, V, A, K) => ({ text, options: [{ k: "V", t: V }, { k: "A", t: A }, { k: "K", t: K }] });
export const GAYA_ITEMS = [
  g("Saat belajar materi baru, aku paling cepat paham kalau…", "melihat gambar, bagan, atau video", "mendengar penjelasan guru", "langsung mencoba atau mempraktikkannya"),
  g("Untuk menghafal, aku biasanya…", "menulis ulang dan mewarnai catatan", "mengucapkannya berulang-ulang", "menghafal sambil berjalan atau bergerak"),
  g("Kalau harus merakit sesuatu, aku…", "melihat gambar petunjuknya", "minta orang lain menjelaskan langkahnya", "langsung mencoba sampai jadi"),
  g("Yang paling kuingat dari pelajaran kemarin adalah…", "tulisan dan gambar di papan", "apa yang diucapkan guru", "kegiatan yang kami lakukan"),
  g("Saat ada waktu luang di kelas, aku lebih suka…", "membaca atau menggambar", "mengobrol atau mendengarkan musik", "bergerak atau bermain"),
  g("Aku paling mudah terganggu oleh…", "ruangan yang berantakan", "suara berisik", "duduk diam terlalu lama"),
  g("Kalau menjelaskan arah jalan ke teman, aku…", "menggambar petanya", "menjelaskan dengan kata-kata", "menunjuk atau mengantar langsung"),
  g("Saat presentasi kelompok, aku lebih suka…", "membuat slide atau poster", "menjadi pembicara", "memperagakan atau membuat alat peraga"),
  g("Aku lebih mudah mengingat orang dari…", "wajahnya", "nama atau suaranya", "hal yang pernah kami lakukan bersama"),
  g("Saat mengerjakan soal yang sulit, aku…", "membuat coretan atau sketsa", "membaca soalnya dengan suara pelan", "mencoba beberapa cara sampai ketemu"),
  g("Pelajaran terasa menyenangkan kalau…", "ada tayangan atau gambar yang menarik", "ada diskusi dan cerita", "ada praktik atau percobaan"),
  g("Saat belajar untuk ulangan, aku…", "membaca catatan dan ringkasan", "tanya jawab bersama teman", "mengerjakan latihan soal"),
  g("Waktu mengerjakan PR, aku paling nyaman kalau…", "ada catatan atau gambar di depanku", "membaca pelan-pelan dengan suara atau ditemani musik", "boleh berdiri, berjalan, atau memegang sesuatu"),
  g("Untuk mempelajari kata atau istilah baru, aku…", "membuat kartu bergambar", "mengulang bunyinya berkali-kali", "memakainya sambil bergerak atau praktik"),
  g("Kalau diberi tugas, aku lebih suka petunjuk yang…", "tertulis dan ada gambarnya", "dijelaskan secara lisan", "dicontohkan langsung"),
  g("Aku cepat bosan kalau pelajaran hanya…", "berupa tulisan tanpa gambar", "membaca tanpa ada yang dibicarakan", "duduk dan mendengarkan"),
  g("Untuk mengingat urutan langkah, aku…", "membayangkan gambarnya", "menyebutkannya berurutan", "menirukan gerakannya"),
  g("Dalam kerja kelompok, aku sering menjadi yang…", "membuat catatan atau bagan", "memimpin diskusi", "mengerjakan bagian praktiknya"),
];

// Penjelasan untuk murid di halaman hasil gaya belajar.
export const VAK_STUDENT = {
  V: { verb: "melihat", tips: ["Ubah catatan jadi peta pikiran, bagan, atau gambar kecil.", "Pakai warna untuk menandai bagian yang penting."] },
  A: { verb: "mendengar dan berbicara", tips: ["Jelaskan pelajaran dengan suaramu sendiri, atau diskusikan dengan teman.", "Ulangi poin penting dengan lantang."] },
  K: { verb: "bergerak dan mencoba", tips: ["Belajar dengan memperagakan, membuat model, atau percobaan kecil.", "Boleh berdiri atau berjalan sebentar saat menghafal."] },
};

/* ---------- Minat karier (RIASEC) ---------- */
export const RIASEC = {
  R: { name: "Realistis", hint: "Senang bekerja dengan alat, mesin, atau di lapangan." },
  I: { name: "Investigatif", hint: "Senang meneliti, menganalisis, dan memecahkan masalah." },
  A: { name: "Artistik", hint: "Senang berkarya dan mengekspresikan gagasan." },
  S: { name: "Sosial", hint: "Senang membantu, mengajar, dan mendampingi orang lain." },
  E: { name: "Wirausaha", hint: "Senang memimpin, meyakinkan, dan merintis sesuatu." },
  C: { name: "Konvensional", hint: "Senang pekerjaan yang rapi, teratur, dan teliti." },
};
export const MINAT_SCALE = [{ v: 0, t: "Tidak tertarik" }, { v: 1, t: "Biasa saja" }, { v: 2, t: "Tertarik" }];
const m = (k, text) => ({ k, text });
export const MINAT_ITEMS = [
  m("R", "Memperbaiki barang yang rusak"), m("I", "Mencari tahu mengapa sesuatu bisa terjadi"), m("A", "Menggambar, mendesain, atau membuat video"),
  m("S", "Membantu teman memahami pelajaran"), m("E", "Memimpin kelompok atau organisasi"), m("C", "Menyusun jadwal dan daftar agar rapi"),
  m("R", "Merakit atau membuat sesuatu dengan alat"), m("I", "Melakukan percobaan sains"), m("A", "Menulis cerita, puisi, atau lagu"),
  m("S", "Mendengarkan teman yang sedang punya masalah"), m("E", "Meyakinkan orang lain dengan pendapatku"), m("C", "Mencatat dan menghitung keuangan"),
  m("R", "Bekerja di luar ruangan atau dengan mesin"), m("I", "Memecahkan teka-teki atau soal yang menantang"), m("A", "Tampil di panggung: musik, tari, atau drama"),
  m("S", "Ikut kegiatan sosial atau menjadi relawan"), m("E", "Berjualan atau merintis usaha kecil"), m("C", "Mengerjakan tugas yang butuh ketelitian"),
  // Butir 19-48 (sesi lama hanya memakai 18 butir pertama).
  m("R", "Memperbaiki sepeda atau peralatan rumah"), m("I", "Mengamati benda dengan mikroskop atau teropong"), m("A", "Memotret atau menyunting foto"),
  m("S", "Mengajari adik atau teman yang lebih muda"), m("E", "Mengajak teman ikut kegiatan yang kurencanakan"), m("C", "Merapikan dan mengelompokkan berkas atau buku"),
  m("R", "Merawat tanaman atau hewan"), m("I", "Membaca tentang penemuan ilmiah"), m("A", "Bermain alat musik"),
  m("S", "Merawat orang yang sedang sakit"), m("E", "Menjadi ketua kelas atau pengurus OSIS"), m("C", "Mengetik dan merapikan dokumen"),
  m("R", "Memasak atau membuat makanan"), m("I", "Mengerjakan soal matematika yang sulit"), m("A", "Membuat kerajinan tangan"),
  m("S", "Menjadi panitia kegiatan untuk orang lain"), m("E", "Mempromosikan produk atau acara"), m("C", "Memeriksa ulang pekerjaan agar tidak ada yang salah"),
  m("R", "Menggunakan perkakas seperti obeng dan gergaji"), m("I", "Mencari tahu cara kerja komputer atau aplikasi"), m("A", "Merancang pakaian atau dekorasi"),
  m("S", "Menjadi penengah ketika teman berselisih"), m("E", "Bernegosiasi untuk mencapai kesepakatan"), m("C", "Mengikuti prosedur langkah demi langkah"),
  m("R", "Membangun model atau maket"), m("I", "Membandingkan informasi dari berbagai sumber"), m("A", "Berakting atau membacakan puisi"),
  m("S", "Menyambut dan membantu murid baru"), m("E", "Berbicara di depan banyak orang"), m("C", "Membuat tabel atau mengolah data di komputer"),
];

/* ---------- Kebutuhan siswa ---------- */
export const BIDANG = { pribadi: "Pribadi", sosial: "Sosial", belajar: "Belajar", karier: "Karier" };
const n = (k, text) => ({ k, text });
export const KEBUTUHAN_ITEMS = [
  n("pribadi", "Aku sulit mengatur waktu antara belajar, bermain, dan istirahat."),
  n("pribadi", "Aku sering merasa kurang percaya diri."),
  n("pribadi", "Aku mudah cemas ketika menghadapi hal baru."),
  n("pribadi", "Aku belum tahu apa kelebihan dan kekuranganku."),
  n("pribadi", "Aku sulit mengendalikan emosi saat marah atau kecewa."),
  n("sosial", "Aku merasa sulit memulai pertemanan baru."),
  n("sosial", "Aku sering segan menyampaikan pendapat di depan teman."),
  n("sosial", "Aku pernah merasa dijauhi atau diejek teman."),
  n("sosial", "Aku bingung cara menyelesaikan pertengkaran dengan teman."),
  n("sosial", "Aku ingin lebih akrab dengan teman sekelas."),
  n("belajar", "Aku sulit berkonsentrasi saat pelajaran."),
  n("belajar", "Aku belum menemukan cara belajar yang cocok untukku."),
  n("belajar", "Aku sering menunda mengerjakan tugas."),
  n("belajar", "Aku merasa tertinggal di beberapa mata pelajaran."),
  n("belajar", "Aku gugup saat ulangan atau ujian."),
  n("karier", "Aku belum tahu cita-citaku."),
  n("karier", "Aku belum tahu jurusan atau sekolah lanjutan yang cocok untukku."),
  n("karier", "Aku ingin tahu lebih banyak tentang berbagai pekerjaan."),
  n("karier", "Aku belum tahu hubungan antara bakatku dan pilihan karier."),
  n("karier", "Aku ingin belajar cara merencanakan masa depan."),
];

/* ---------- Kelas contoh ---------- */
export const SAMPLE_CLASS = {
  name: "Kelas 8C (contoh)",
  members: [
    ["Arya Wibowo", "L"], ["Bella Kusuma", "P"], ["Cahya Ningrum", "P"], ["Danu Prasetyo", "L"], ["Elok Wulandari", "P"],
    ["Farhan Maulana", "L"], ["Gendis Anjani", "P"], ["Hafiz Ramli", "L"], ["Intan Sekar", "P"], ["Jevan Tanoto", "L"],
    ["Kinanti Larasati", "P"], ["Lintang Aditya", "L"], ["Melati Hapsari", "P"], ["Naufal Hidayat", "L"], ["Okta Paramitha", "P"],
    ["Pandu Wicaksono", "L"], ["Qonita Zahra", "P"], ["Raka Mahendra", "L"], ["Sekar Ayuningtyas", "P"], ["Tegar Santosa", "L"],
  ].map(([name, g], i) => ({ no: i + 1, name, g })),
};
// Jawaban contoh. Nomor 18 sengaja belum mengisi.
export const SAMPLE_SOCIO = {
  belajar: { 1: [4, 7, 6], 2: [7, 3, 5], 3: [2, 7, 5], 4: [1, 6, 7], 5: [7, 2, 3], 6: [4, 1, 8], 7: [2, 5, 13], 8: [6, 1, 7], 9: [11, 13, 7], 10: [12, 14, 16],
    11: [9, 15, 7], 12: [10, 16, 14], 13: [9, 7, 15], 14: [16, 10, 12], 15: [11, 13, 9], 16: [14, 12, 7], 17: [7, 13, 2], 19: [17, 7, 9], 20: [1, 12, 18] },
  sosial: { 1: [6, 4, 8], 2: [3, 5, 7], 3: [2, 5, 17], 4: [1, 8, 6], 5: [2, 3, 7], 6: [1, 4, 10], 7: [5, 2, 13], 8: [4, 1, 6], 9: [13, 11, 15], 10: [14, 12, 6],
    11: [15, 9, 13], 12: [14, 10, 16], 13: [9, 7, 11], 14: [10, 12, 16], 15: [11, 9, 17], 16: [12, 14, 10], 17: [3, 15, 19], 19: [17, 3, 15], 20: [16, 14, 1] },
};
export function sampleSocioResponses(questions) {
  const out = [];
  for (let no = 1; no <= 20; no++) {
    if (!SAMPLE_SOCIO.belajar[no]) continue;
    const answers = { reasons: {} };
    questions.forEach((q, i) => {
      const list = (i % 2 ? SAMPLE_SOCIO.sosial : SAMPLE_SOCIO.belajar)[no];
      answers[q.id] = list;
      const opts = SOCIO_REASONS[areaOf(q)] || [];
      answers.reasons[q.id] = Object.fromEntries(list.map((b, k) => [b, [opts[(no + b + k) % opts.length]]]));
    });
    out.push({ no, answers });
  }
  return out;
}
// Jawaban contoh untuk angket lain, dibuat deterministik dari nomor urut.
export function sampleGeneric(type) {
  const out = [];
  const rnd = (a, b) => ((a * 7919 + b * 104729 + 13) % 97) / 97;
  for (let no = 1; no <= 20; no++) {
    if (no === 18) continue;
    const answers = {};
    if (type === "gaya-belajar") GAYA_ITEMS.forEach((_, i) => { const lean = "VAK"[no % 3]; const r = rnd(no, i); answers[i] = r < 0.5 ? lean : "VAK"[Math.floor(r * 30) % 3]; });
    if (type === "minat-karier") MINAT_ITEMS.forEach((it, i) => { const lean = "RIASEC"[no % 6]; const r = rnd(no, i); answers[i] = it.k === lean ? 2 : r < 0.4 ? 0 : r < 0.75 ? 1 : 2; });
    if (type === "kebutuhan") KEBUTUHAN_ITEMS.forEach((it, i) => { const r = rnd(no, i); const p = { pribadi: 0.35, sosial: 0.3, belajar: 0.55, karier: 0.65 }[it.k]; answers[i] = r < p; });
    out.push({ no, answers });
  }
  return out;
}

/* ---------- Blog ---------- */
export const POSTS = [
  { slug: "apa-itu-sosiometri", icon: "sosiometri", title: "Sosiometri di kelas: apa yang bisa dan tidak bisa dibaca", date: "2026-11-03", minutes: 3,
    excerpt: "Sosiometri memetakan pilihan pertemanan murid. Berguna untuk menyusun kelompok dan menemukan murid yang sendirian, asal dibaca dengan hati-hati.",
    body: `<p>Sosiometri adalah cara sederhana untuk melihat hubungan di dalam kelas. Setiap murid menjawab pertanyaan seperti "dengan siapa kamu ingin satu kelompok?" lalu memilih beberapa nama. Dari pilihan itu tersusun peta: siapa banyak dipilih, siapa saling memilih, dan siapa belum dipilih siapa pun.</p>
<h2>Yang bisa dibaca</h2>
<ul><li>Pasangan dan kelompok yang erat, sebagai bahan menyusun kelompok belajar.</li><li>Murid yang belum dipilih, yang sebaiknya ditemui dan diamati lebih dulu.</li><li>Perubahan dari waktu ke waktu, bila sosiometri diulang tiap semester.</li></ul>
<h2>Yang tidak bisa dibaca</h2>
<p>Hasil sosiometri bukan ukuran nilai seorang anak. Murid yang tidak dipilih belum tentu ditolak; bisa saja ia murid baru, pendiam, atau punya teman dekat di kelas lain. Sosiometri juga hanya memotret satu hari. Gunakan sebagai awal percakapan dan pengamatan, bukan sebagai kesimpulan.</p>
<h2>Jaga kerahasiaannya</h2>
<p>Peta kelas hanya untuk guru yang berwenang. Jangan ditayangkan di depan kelas, dan jangan menyebut siapa memilih siapa kepada murid atau orang tua lain.</p>` },
  { slug: "membaca-sosiogram", icon: "sosiometri", title: "Cara membaca sosiogram lingkaran", date: "2026-11-03", minutes: 3,
    excerpt: "Panduan singkat membaca sosiogram berbentuk sasaran: arti posisi, bentuk simbol, tebal garis, dan pola yang perlu diperhatikan.",
    body: `<p>Sosiogram di Examus berbentuk lingkaran berlapis seperti papan sasaran. Semakin sering seorang murid dipilih, semakin dekat ia ke tengah. Murid yang belum dipilih berada di lingkaran paling luar.</p>
<h2>Simbol dan garis</h2>
<ul><li>Kotak bersudut bulat untuk laki-laki, lingkaran untuk perempuan.</li><li>Garis tebal tanpa panah berarti dua murid saling memilih.</li><li>Garis berpanah menunjukkan arah pilihan. Pilihan pertama digambar lebih tebal.</li><li>Simbol bergaris putus-putus berarti murid itu belum mengisi.</li></ul>
<h2>Pola yang perlu diperhatikan</h2>
<p>Cari tiga hal. Pertama, murid di lingkaran luar yang tidak menerima panah sama sekali. Kedua, kelompok tertutup yang hanya saling memilih di antara mereka sendiri. Ketiga, murid yang memilih banyak teman tetapi tidak dipilih balik. Ketiganya layak ditindaklanjuti dengan pengamatan dan percakapan pribadi.</p>` },
  { slug: "gaya-belajar-bukan-label", icon: "gaya-belajar", title: "Gaya belajar: preferensi, bukan label", date: "2026-11-05", minutes: 2,
    excerpt: "Angket gaya belajar berguna untuk memvariasikan kegiatan kelas. Tetapi jangan mengotak-ngotakkan murid berdasarkan hasilnya.",
    body: `<p>Angket gaya belajar menanyakan cara belajar yang paling disukai murid: melihat, mendengar, atau melakukan. Hasilnya menarik dan mudah dipahami, sehingga populer di sekolah.</p>
<p>Namun penelitian belum menemukan bukti kuat bahwa mengajar sesuai gaya belajar tiap murid membuat hasil belajarnya lebih baik. Karena itu, hasil angket sebaiknya dibaca sebagai preferensi, bukan kemampuan dan bukan label permanen.</p>
<h2>Cara memakainya dengan jujur</h2>
<ul><li>Lihat rekap kelas, lalu pastikan kegiatan Anda bervariasi: ada yang dilihat, didengar, dan dipraktikkan.</li><li>Pakai hasil perorangan untuk membuka obrolan tentang kebiasaan belajar murid.</li><li>Hindari kalimat seperti "kamu anak visual, jadi tidak cocok diskusi".</li></ul>` },
  { slug: "dari-angket-ke-program-bk", icon: "kebutuhan", title: "Dari angket kebutuhan ke program BK", date: "2026-11-08", minutes: 3,
    excerpt: "Setelah rekap kebutuhan siswa jadi, langkah berikutnya adalah memilih prioritas dan membaginya ke layanan klasikal, kelompok, dan individual.",
    body: `<p>Angket kebutuhan siswa menghasilkan persentase untuk setiap pernyataan: berapa persen murid merasa pernyataan itu sesuai dengan dirinya. Angka itu baru berguna setelah diterjemahkan menjadi layanan.</p>
<h2>Tiga langkah sederhana</h2>
<ol><li><strong>Urutkan.</strong> Lihat sepuluh pernyataan dengan persentase tertinggi di kelas atau angkatan.</li><li><strong>Pilah layanannya.</strong> Kebutuhan yang dirasakan sebagian besar murid cocok untuk bimbingan klasikal. Kebutuhan sebagian kecil murid lebih cocok untuk bimbingan kelompok. Kebutuhan yang sangat pribadi ditangani lewat konseling individual.</li><li><strong>Jadwalkan.</strong> Masukkan topik prioritas ke program semester, lalu ulangi angket di akhir tahun untuk melihat perubahannya.</li></ol>
<p>Satu catatan: persentase yang kecil tidak berarti tidak penting. Pernyataan seperti "pernah merasa dijauhi atau diejek teman" perlu ditindaklanjuti walaupun hanya dipilih satu murid.</p>` },
];
export const getPost = (slug) => POSTS.find((p) => p.slug === slug);
