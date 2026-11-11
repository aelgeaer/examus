// Isi asesmen berbasis skala: butir, pilihan jawaban, pengantar untuk murid, dan hasil yang dilihat murid.
// Jawaban disimpan sebagai answers[i] = nilai pilihan untuk butir ke-i, ditambah kunci khusus (misalnya "impact").
// Semua butir ditulis untuk Examus, kecuali Suasana Hati yang memakai isi PHQ-9 (bebas dipakai tanpa izin)
// dalam bahasa remaja. Tidak ada yang sudah divalidasi secara psikometrik untuk versi bahasa Indonesia ini.
import { esc } from "./util.js";
import { RIASEC, MINAT_ITEMS, GAYA_ITEMS, VAK } from "./data.js";
import { radar } from "./charts.js";
import { gayaProfile, donut, VAK_COLOR } from "./gaya.js";

const HELP = `<div class="gb-tips"><h2>Kalau butuh teman bicara</h2><ul><li>Ceritakan kepada guru BK, wali kelas, atau orang dewasa yang kamu percaya.</li><li>Kalau kamu atau temanmu dalam bahaya, segera minta tolong orang dewasa terdekat atau telepon 112.</li></ul></div>`;
const thanks = (name, body = "") => `<p class="gb-eyebrow">Terima kasih, ${esc(name)}</p><h1>Jawabanmu sudah tersimpan.</h1><p class="lead" style="margin-top:.5rem">Hanya gurumu yang bisa melihat jawabanmu.</p>${body}`;

/* ---------------- Minat karier (RIASEC) ---------------- */
export const RIASEC_EX = {
  R: { mapel: "Prakarya, Fisika, PJOK", jurusan: "Teknik Mesin, Teknik Sipil, Agroteknologi", kerja: "teknisi, montir, petani modern, pilot" },
  I: { mapel: "Matematika, Biologi, Kimia", jurusan: "Kedokteran, Farmasi, Ilmu Komputer", kerja: "peneliti, dokter, programmer, apoteker" },
  A: { mapel: "Seni Budaya, Bahasa Indonesia, Bahasa Inggris", jurusan: "Desain Komunikasi Visual, Sastra, Seni Musik", kerja: "desainer, penulis, fotografer, animator" },
  S: { mapel: "Sosiologi, PPKn, Bahasa", jurusan: "Pendidikan, Psikologi, Keperawatan", kerja: "guru, perawat, konselor, pekerja sosial" },
  E: { mapel: "Ekonomi, Bahasa Inggris, Prakarya dan Kewirausahaan", jurusan: "Manajemen, Ilmu Komunikasi, Hukum", kerja: "pengusaha, manajer, tenaga pemasaran, pengacara" },
  C: { mapel: "Matematika, Informatika, Ekonomi", jurusan: "Akuntansi, Administrasi, Statistika", kerja: "akuntan, staf administrasi, analis data, pustakawan" },
};
const MINAT5 = [{ v: 4, t: "Sangat suka" }, { v: 3, t: "Suka" }, { v: 2, t: "Ragu-ragu" }, { v: 1, t: "Tidak suka" }, { v: 0, t: "Sangat tidak suka" }];
export const RIASEC_KEYS = ["R", "I", "A", "S", "E", "C"];
export const RIASEC_LABEL = { R: "Realistik", I: "Investigatif", A: "Artistik", S: "Sosial", E: "Wirausaha", C: "Konvensional" };
// Penilaian ala Holland: skor mentah tiap tipe = jumlah nilai kegiatan tipe itu (8 kegiatan x 0-4 = 0-32).
// Kode = tiga tipe dengan skor tertinggi. Diferensiasi = skor tertinggi dikurangi terendah; bila kurang
// dari 25% rentang (8 poin), minat "belum terbedakan". Bila skor tertinggi di bawah 50% (16 poin, rata-rata
// "ragu-ragu"), minat "rendah". Keduanya tidak diberi kode. Selisih 4 poin atau kurang di antara dua tipe
// masih dalam batas kesalahan ukur, jadi urutannya dianggap setara. Sesi lama memakai skala 0-2.
export function minatProfile(answers, cfg = {}) {
  const max = cfg.scale === 5 ? 4 : 2, raw = {}, n = {};
  RIASEC_KEYS.forEach((k) => { raw[k] = 0; n[k] = 0; });
  MINAT_ITEMS.forEach((it, i) => { if (answers?.[i] === undefined || answers[i] === null) return; raw[it.k] += Number(answers[i]) || 0; n[it.k]++; });
  const range = Object.fromEntries(RIASEC_KEYS.map((k) => [k, max * n[k]]));
  const pct = Object.fromEntries(RIASEC_KEYS.map((k) => [k, range[k] ? Math.round((raw[k] / range[k]) * 100) : 0]));
  const order = [...RIASEC_KEYS].sort((a, b) => pct[b] - pct[a] || RIASEC_KEYS.indexOf(a) - RIASEC_KEYS.indexOf(b));
  const diff = pct[order[0]] - pct[order[5]];
  const flat = diff < 25, low = pct[order[0]] < 50;
  const vals = answers ? MINAT_ITEMS.map((_, i) => answers[i]).filter((v) => v !== undefined) : [];
  const same = vals.length > 10 && vals.every((v) => v === vals[0]);
  const code = flat || low ? "" : order.slice(0, 3).join("");
  const tied = !code ? [] : [0, 1, 2].filter((i) => pct[order[i]] - pct[order[i + 1]] <= 12.5).map((i) => order[i] + order[i + 1]);
  const note = same ? "jawaban semuanya sama" : low ? "minat rendah" : flat ? "minat belum terbedakan" : "";
  return { raw, pct, order, code, top: code ? order[0] : null, flat, low, same, diff, tied, note, max: range };
}

/* ---------------- Kekuatan & kesulitan ---------------- */
export const KK_AREAS = { emosi: "Emosi", perilaku: "Perilaku", fokus: "Fokus", teman: "Pertemanan", peduli: "Kepedulian" };
const kk = (k, text) => ({ k, text });
export const KK_ITEMS = [
  kk("peduli", "Aku memperhatikan perasaan orang lain."), kk("fokus", "Aku sulit duduk tenang dalam waktu lama."), kk("emosi", "Aku sering pusing, sakit perut, atau tidak enak badan."),
  kk("peduli", "Aku senang berbagi makanan, mainan, atau alat tulis dengan teman."), kk("perilaku", "Kalau sedang marah, aku sulit menahan diri."), kk("teman", "Aku lebih sering sendirian daripada bersama teman."),
  kk("perilaku", "Aku sering membantah orang dewasa."), kk("emosi", "Aku sering merasa khawatir."), kk("peduli", "Aku menolong kalau ada yang terluka, sedih, atau sakit."),
  kk("fokus", "Tangan atau kakiku sering bergerak terus."), kk("teman", "Aku merasa sulit punya teman dekat."), kk("perilaku", "Aku sering bertengkar dengan teman."),
  kk("emosi", "Aku sering merasa sedih atau ingin menangis."), kk("teman", "Teman-teman sering mengejek atau mengganggu aku."), kk("fokus", "Aku mudah teralih saat belajar."),
  kk("emosi", "Aku mudah gugup di situasi baru."), kk("peduli", "Aku bersikap baik kepada adik atau teman yang lebih muda."), kk("perilaku", "Aku kadang berbohong agar tidak dimarahi."),
  kk("teman", "Aku lebih akrab dengan orang dewasa daripada teman sebaya."), kk("peduli", "Aku sering menawarkan bantuan tanpa diminta."), kk("fokus", "Aku sering bertindak sebelum berpikir."),
  kk("perilaku", "Aku pernah mengambil barang yang bukan milikku."), kk("teman", "Aku merasa tidak diterima di kelompok mana pun."), kk("emosi", "Aku punya banyak hal yang kutakuti."),
  kk("fokus", "Aku sering tidak menyelesaikan tugas sampai tuntas."),
];
export const KK_BULLIED = KK_ITEMS.findIndex((it) => it.text.startsWith("Teman-teman sering mengejek"));
export function kkProfile(a) {
  const s = Object.fromEntries(Object.keys(KK_AREAS).map((k) => [k, 0]));
  KK_ITEMS.forEach((it, i) => (s[it.k] += Number(a?.[i]) || 0));
  return { s, total: s.emosi + s.perilaku + s.fokus + s.teman, impact: Number(a?.impact) || 0, bullied: Number(a?.[KK_BULLIED]) >= 1 };
}
// Empat pita mengikuti cara pembagian SDQ versi laporan diri usia 11-17 (sekitar 80% wajar, 10% sedikit
// meningkat, 5% tinggi, 5% sangat tinggi pada sampel normatif Inggris). Butir Examus bukan butir SDQ,
// jadi batas ini hanya patokan sementara sampai ada norma lokal. Tiap area 0-10, total kesulitan 0-40.
const KK_CUT = { emosi: [5, 6, 7], perilaku: [4, 5, 6], fokus: [6, 7, 8], teman: [3, 4, 5] };
export const KK_LEVELS = ["Wajar", "Sedikit meningkat", "Tinggi", "Sangat tinggi"];
export const kkLevel = (score, area) => {
  if (area === "peduli") return score >= 6 ? 0 : score === 5 ? 1 : score === 4 ? 2 : 3;
  const c = KK_CUT[area]; return score >= c[2] ? 3 : score >= c[1] ? 2 : score >= c[0] ? 1 : 0;
};
export const kkTotalLevel = (t) => (t >= 20 ? 3 : t >= 18 ? 2 : t >= 15 ? 1 : 0);
export const kkLevelName = (lvl, area) => (area === "peduli" ? ["Wajar", "Sedikit rendah", "Rendah", "Sangat rendah"][lvl] : KK_LEVELS[lvl]);
const KK_TIPS = {
  emosi: "Kalau rasa khawatir atau sedih datang, coba tarik napas pelan-pelan dan ceritakan kepada orang yang kamu percaya.",
  perilaku: "Saat mulai marah, coba diam dan hitung sampai sepuluh sebelum bicara atau bertindak.",
  fokus: "Bagi tugas besar menjadi bagian kecil, dan istirahat sebentar setelah tiap bagian selesai.",
  teman: "Coba ajak satu teman mengobrol tentang hal yang kalian sukai bersama.",
  peduli: "Sapa satu teman yang jarang diajak bicara. Hal kecil seperti itu berarti banyak.",
};
const KK_STRENGTH = {
  emosi: "Kamu cukup tenang menghadapi hal-hal yang terjadi di sekitarmu.",
  perilaku: "Kamu bisa menjaga sikap dan menghormati aturan.",
  fokus: "Kamu bisa menjaga perhatian dan menyelesaikan pekerjaanmu.",
  teman: "Kamu punya teman dan merasa diterima di sekitarmu.",
  peduli: "Kamu peduli dan suka menolong orang lain.",
};

/* ---------------- Suasana hati (PHQ-9) ---------------- */
export const PHQ_ITEMS = [
  "merasa kurang tertarik atau kurang senang melakukan apa pun",
  "merasa sedih, murung, mudah kesal, atau putus asa",
  "sulit tidur, sering terbangun, atau justru tidur terlalu banyak",
  "merasa lelah atau kurang bertenaga",
  "tidak nafsu makan, atau justru makan berlebihan",
  "merasa buruk tentang dirimu, merasa gagal, atau merasa mengecewakan dirimu atau keluargamu",
  "sulit berkonsentrasi, misalnya saat membaca, belajar, atau menonton",
  "bergerak atau berbicara sangat lambat sampai orang lain memperhatikan, atau justru sangat gelisah sampai sulit diam",
  "berpikir lebih baik mati, atau ingin menyakiti dirimu sendiri",
];
export const PHQ_OPTS = [{ v: 0, t: "Tidak pernah" }, { v: 1, t: "Beberapa hari" }, { v: 2, t: "Lebih dari separuh hari" }, { v: 3, t: "Hampir setiap hari" }];
export const PHQ_IMPACT = [{ v: 0, t: "Tidak sulit sama sekali" }, { v: 1, t: "Agak sulit" }, { v: 2, t: "Sangat sulit" }, { v: 3, t: "Amat sangat sulit" }];
export const phqItems = (cfg) => (cfg.variant === "phq8" ? PHQ_ITEMS.slice(0, 8) : PHQ_ITEMS);
export function phqProfile(a, cfg) {
  const n = phqItems(cfg).length;
  let total = 0; for (let i = 0; i < n; i++) total += Number(a?.[i]) || 0;
  const item9 = n === 9 ? Number(a?.[8]) || 0 : 0;
  // Pita keparahan standar PHQ-9 (Kroenke dkk., 2001): 0-4, 5-9, 10-14, 15-19, 20-27. Skor 10 ke atas = perlu evaluasi lanjut.
  const band = total >= 20 ? "Berat" : total >= 15 ? "Sedang-berat" : total >= 10 ? "Sedang" : total >= 5 ? "Ringan" : "Minimal";
  const priority = item9 >= 1 || total >= 20 ? "hari ini" : total >= 15 ? "minggu ini" : total >= 10 ? "pantau" : "";
  return { total, item9, band, priority, impact: Number(a?.impact) || 0 };
}

/* ---------------- Tipe kepribadian ---------------- */
export const TK_DIMS = { EI: ["E", "I"], SN: ["S", "N"], TF: ["T", "F"], JP: ["J", "P"] };
export const TK_LETTER = {
  E: { name: "Ekstrovert", str: "mendapat energi dari bertemu orang dan berani menyampaikan ide", learn: "diskusi, kerja kelompok, dan menjelaskan kepada teman" },
  I: { name: "Introvert", str: "mampu berpikir mendalam dan mendengarkan dengan baik", learn: "waktu untuk berpikir sendiri sebelum diminta menjawab" },
  S: { name: "Sensing", str: "teliti, realistis, dan memperhatikan detail", learn: "contoh nyata, langkah yang jelas, dan praktik" },
  N: { name: "Intuition", str: "kreatif dan mudah melihat gambaran besar", learn: "konsep besar dulu, lalu mencari cara sendiri" },
  T: { name: "Thinking", str: "adil dan mengambil keputusan dengan alasan yang jelas", learn: "tujuan dan alasan yang logis di balik materi" },
  F: { name: "Feeling", str: "pengertian dan menjaga perasaan orang lain", learn: "suasana kelas yang hangat dan kaitan materi dengan kehidupan" },
  J: { name: "Judging", str: "teratur, terencana, dan tuntas", learn: "jadwal, target, dan tenggat yang jelas" },
  P: { name: "Perceiving", str: "luwes dan cepat menyesuaikan diri", learn: "pilihan tugas dan ruang untuk mencoba" },
};
const tk = (d, text, a, b) => ({ d, text, a, b });
const TK_RAW = [
  tk("EI", "Sesudah hari yang melelahkan, aku paling cepat pulih dengan…", "mengobrol atau bermain bersama teman", "menyendiri dan melakukan hal yang kusuka"),
  tk("SN", "Aku lebih tertarik pada…", "hal yang nyata dan bisa dilihat", "ide dan kemungkinan baru"),
  tk("TF", "Saat teman berbuat salah, aku lebih dulu…", "menunjukkan apa yang keliru", "memikirkan perasaannya"),
  tk("JP", "Untuk tugas dengan tenggat, aku biasanya…", "mengerjakannya jauh sebelum tenggat", "mengerjakannya mendekati tenggat"),
  tk("EI", "Di kelas baru, aku biasanya…", "cepat berkenalan dengan banyak orang", "menunggu sampai ada yang mengajak bicara"),
  tk("SN", "Saat belajar hal baru, aku suka…", "contoh dan langkah yang jelas", "gambaran besar dan konsepnya"),
  tk("TF", "Saat memilih sesuatu, aku lebih mengandalkan…", "alasan yang masuk akal", "apa yang terasa baik bagi semua orang"),
  tk("JP", "Aku lebih nyaman kalau…", "ada jadwal yang jelas", "bisa berubah sesuai keadaan"),
  tk("EI", "Kalau sedang memikirkan masalah, aku lebih suka…", "membicarakannya dengan orang lain", "memikirkannya sendiri dulu"),
  tk("SN", "Saat bercerita, aku cenderung…", "menceritakan detail apa adanya", "langsung ke makna atau kesimpulannya"),
  tk("TF", "Aku lebih senang dipuji karena…", "pintar dan adil", "baik hati dan pengertian"),
  tk("JP", "Meja atau tas sekolahku biasanya…", "rapi dan teratur", "agak berantakan, tapi aku tahu isinya"),
  tk("EI", "Di acara yang ramai, aku…", "merasa bersemangat", "cepat merasa lelah"),
  tk("SN", "Aku lebih senang pelajaran yang…", "praktis dan langsung terpakai", "membuatku membayangkan hal baru"),
  tk("TF", "Saat teman bercerita tentang masalahnya, aku cenderung…", "membantu mencari jalan keluar", "mendengarkan dan menghiburnya"),
  tk("JP", "Saat liburan, aku lebih suka…", "membuat rencana dulu", "melihat nanti saja"),
  tk("EI", "Teman-temanku menggambarkan aku sebagai orang yang…", "ramai dan mudah bergaul", "tenang dan pendengar yang baik"),
  tk("SN", "Saat mengerjakan tugas, aku…", "mengikuti petunjuk yang ada", "mencoba cara sendiri yang berbeda"),
  tk("TF", "Dalam diskusi, aku lebih mementingkan…", "pendapat yang paling benar", "suasana yang tetap rukun"),
  tk("JP", "Kalau rencana mendadak berubah, aku…", "merasa terganggu", "santai saja"),
  tk("EI", "Saat kerja kelompok, aku lebih suka…", "berbicara dan menyampaikan ide", "mendengarkan lalu menuliskan ide"),
  tk("SN", "Aku lebih percaya pada…", "pengalaman yang sudah terbukti", "firasat dan inspirasi"),
  tk("TF", "Kalau ada aturan yang tidak adil, aku…", "membahasnya dengan alasan yang jelas", "memikirkan siapa yang dirugikan"),
  tk("JP", "Aku merasa lega ketika…", "keputusan sudah diambil", "pilihan masih terbuka"),
  tk("EI", "Akhir pekan yang menyenangkan adalah…", "pergi bersama banyak teman", "di rumah bersama satu atau dua orang dekat"),
  tk("SN", "Saat membaca cerita, aku lebih memperhatikan…", "kejadian dan detailnya", "pesan di balik ceritanya"),
  tk("TF", "Aku lebih mudah tersentuh oleh…", "ide yang cerdas", "cerita yang mengharukan"),
  tk("JP", "Saat punya beberapa tugas, aku…", "menyelesaikannya satu per satu", "berpindah-pindah sesuai suasana hati"),
  tk("EI", "Kalau ditanya guru secara mendadak, aku…", "langsung menjawab sambil berpikir", "butuh waktu sebentar untuk berpikir"),
  tk("SN", "Aku lebih suka disebut…", "teliti dan realistis", "kreatif dan penuh imajinasi"),
  tk("TF", "Saat menilai karya teman, aku…", "jujur apa adanya", "memilih kata yang tidak menyakitkan"),
  tk("JP", "Aku lebih suka permainan yang…", "aturannya jelas", "bisa dimainkan dengan bebas"),
];
// Urutan pilihan dibalik di butir genap supaya murid tidak menjawab satu sisi terus.
export const TK_ITEMS = TK_RAW.map((it, i) => {
  const [L, R] = TK_DIMS[it.d], opts = [{ v: L, t: it.a }, { v: R, t: it.b }];
  return { ...it, options: i % 2 ? opts.reverse() : opts };
});
export function tkProfile(a) {
  const c = {}; TK_ITEMS.forEach((it, i) => { const v = a?.[i]; if (v) c[v] = (c[v] || 0) + 1; });
  const pick = ([L, R]) => ((c[L] || 0) > (c[R] || 0) ? L : R);
  const close = Object.values(TK_DIMS).filter(([L, R]) => Math.abs((c[L] || 0) - (c[R] || 0)) <= 2).map(([L, R]) => L + "/" + R);
  return { c, type: Object.values(TK_DIMS).map(pick).join(""), close };
}

/* ---------------- AKPD ---------------- */
export const AKPD_BIDANG = { pribadi: "Pribadi", sosial: "Sosial", belajar: "Belajar", karier: "Karier" };
const ak = (k, smp, sma) => ({ k, smp, sma: sma || smp });
const AKPD_RAW = [
  ak("pribadi", "Mengenali kelebihan dan kekurangan diri"), ak("sosial", "Berkomunikasi dengan baik kepada orang lain"), ak("belajar", "Menemukan cara belajar yang paling cocok"), ak("karier", "Mengenali minat dan bakat diri"),
  ak("pribadi", "Menumbuhkan rasa percaya diri"), ak("sosial", "Memulai pertemanan baru"), ak("belajar", "Berkonsentrasi saat pelajaran"), ak("karier", "Mengetahui berbagai macam pekerjaan"),
  ak("pribadi", "Mengelola rasa marah dan kecewa"), ak("sosial", "Menyampaikan pendapat dengan sopan"), ak("belajar", "Mengatur jadwal belajar di rumah"), ak("karier", "Menentukan cita-cita"),
  ak("pribadi", "Mengatasi rasa cemas atau khawatir"), ak("sosial", "Menyelesaikan pertengkaran dengan teman"), ak("belajar", "Mencatat pelajaran dengan baik"), ak("karier", "Mengetahui hubungan pelajaran sekolah dengan pekerjaan"),
  ak("pribadi", "Mengatur waktu belajar, bermain, dan istirahat"), ak("sosial", "Bekerja sama dalam kelompok"), ak("belajar", "Menyiapkan diri menghadapi ulangan"), ak("karier", "Merencanakan masa depan"),
  ak("pribadi", "Menjaga kesehatan tubuh dan pola tidur"), ak("sosial", "Menolak ajakan yang tidak baik"), ak("belajar", "Mengatasi rasa malas belajar"), ak("karier", "Mengembangkan keterampilan di luar pelajaran"),
  ak("pribadi", "Bersikap jujur dan bertanggung jawab"), ak("sosial", "Menghargai teman yang berbeda"), ak("belajar", "Berani bertanya kepada guru saat belum paham"), ak("karier", "Memilih SMA, SMK, atau MA yang sesuai", "Memilih jurusan kuliah yang sesuai"),
  ak("pribadi", "Mengambil keputusan untuk diri sendiri"), ak("sosial", "Menghadapi ejekan atau perundungan"), ak("belajar", "Mengejar pelajaran yang tertinggal"), ak("karier", "Mengetahui perbedaan SMA, SMK, dan MA", "Mengetahui jalur masuk perguruan tinggi"),
  ak("pribadi", "Memahami perubahan diri di masa remaja", "Memahami diri menjelang dewasa"), ak("sosial", "Menjaga hubungan baik dengan orang tua"), ak("belajar", "Mengerjakan tugas tepat waktu"), ak("karier", "Mengenal pekerjaan orang-orang di sekitarku", "Mempersiapkan diri untuk bekerja atau berwirausaha"),
  ak("pribadi", "Menggunakan HP dan media sosial dengan bijak"), ak("sosial", "Bergaul secara sehat dengan lawan jenis"), ak("belajar", "Memilih kegiatan ekstrakurikuler yang cocok", "Memilih mata pelajaran pilihan yang cocok"), ak("karier", "Mengetahui sekolah lanjutan di daerahku", "Mencari informasi beasiswa"),
];
export const akpdItems = (cfg) => AKPD_RAW.map((it) => ({ k: it.k, text: cfg.jenjang === "sma" ? it.sma : it.smp }));
export const AKPD_OPTS = [{ v: 3, t: "Sangat butuh bantuan" }, { v: 2, t: "Butuh bantuan" }, { v: 1, t: "Sedikit butuh bantuan" }, { v: 0, t: "Tidak butuh bantuan" }];
export function akpdProfile(a, cfg) {
  const items = akpdItems(cfg), s = {}, n = {};
  items.forEach((it, i) => { s[it.k] = (s[it.k] || 0) + (Number(a?.[i]) || 0); n[it.k] = (n[it.k] || 0) + 1; });
  const pct = Object.fromEntries(Object.keys(AKPD_BIDANG).map((k) => [k, Math.round((s[k] / (3 * n[k])) * 100)]));
  const order = Object.keys(AKPD_BIDANG).sort((x, y) => pct[y] - pct[x]);
  const total = Object.values(s).reduce((x, y) => x + y, 0);
  return { pct, order, total, max: items.length * 3 };
}

/* ---------------- Deteksi perundungan ---------------- */
export const PR_ASPEK = { korban: "Mengalami", pelaku: "Melakukan", saksi: "Menyaksikan", iklim: "Rasa aman" };
const pr = (k, text, extra = {}) => ({ k, text, ...extra });
export const PR_ITEMS = [
  pr("korban", "Aku diejek atau dihina oleh teman.", { form: "Ejekan" }), pr("pelaku", "Aku mengejek atau menghina teman."), pr("saksi", "Aku melihat teman diejek atau dihina."), pr("iklim", "Aku merasa aman di sekolah.", { pos: true }),
  pr("korban", "Aku dipanggil dengan julukan yang tidak kusukai.", { form: "Julukan" }), pr("pelaku", "Aku memanggil teman dengan julukan yang tidak ia sukai."), pr("saksi", "Aku melihat teman sengaja dijauhi oleh kelompoknya."), pr("iklim", "Aku merasa aman di kelas.", { pos: true }),
  pr("korban", "Aku sengaja dijauhi atau tidak diajak bergabung.", { form: "Dikucilkan" }), pr("pelaku", "Aku mengajak teman lain menjauhi seseorang."), pr("saksi", "Aku melihat teman didorong atau dipukul."), pr("iklim", "Aku merasa aman di toilet, kantin, dan halaman sekolah.", { pos: true }),
  pr("korban", "Barang-barangku diambil, disembunyikan, atau dirusak.", { form: "Barang diambil atau dirusak" }), pr("pelaku", "Aku mengambil atau menyembunyikan barang teman untuk iseng."), pr("saksi", "Aku ikut tertawa ketika seseorang sedang dihina."), pr("iklim", "Guru menghentikan perundungan ketika melihatnya.", { pos: true }),
  pr("korban", "Aku didorong, dipukul, atau ditendang dengan sengaja.", { form: "Kekerasan fisik", serious: true }), pr("pelaku", "Aku mendorong atau memukul teman dengan sengaja.", { serious: true }), pr("saksi", "Aku diam saja ketika melihat perundungan."), pr("iklim", "Aku tahu kepada siapa harus melapor kalau mengalami perundungan.", { pos: true }),
  pr("korban", "Aku diancam atau dipaksa melakukan sesuatu.", { form: "Ancaman atau paksaan", serious: true }), pr("pelaku", "Aku mempermalukan teman di depan orang lain."), pr("saksi", "Aku membela teman yang sedang diganggu.", { pos: true }), pr("iklim", "Aku percaya laporanku akan ditindaklanjuti.", { pos: true }),
  pr("korban", "Aku diejek atau dipermalukan lewat pesan atau media sosial.", { form: "Perundungan daring" }), pr("pelaku", "Aku mengirim pesan atau komentar yang menyakitkan di media sosial."), pr("saksi", "Aku melaporkan perundungan kepada guru.", { pos: true }), pr("iklim", "Teman-teman di kelasku saling menghargai.", { pos: true }),
  pr("korban", "Gosip buruk tentang aku disebarkan.", { form: "Gosip" }), pr("pelaku", "Aku menyebarkan gosip tentang teman."), pr("saksi", "Aku menghibur teman yang baru saja diganggu.", { pos: true }), pr("iklim", "Aku merasa diterima di sekolah ini.", { pos: true }),
];
export const PR_OPTS = [{ v: 0, t: "Tidak pernah" }, { v: 1, t: "Jarang" }, { v: 2, t: "Kadang-kadang" }, { v: 3, t: "Sering" }, { v: 4, t: "Sangat sering" }];
// Klasifikasi mengikuti batas Solberg & Olweus (2003): murid dianggap mengalami atau melakukan perundungan
// bila setidaknya satu bentuk terjadi "kadang-kadang" atau lebih (setara 2-3 kali sebulan). "Jarang" = pantau.
// Kekerasan fisik atau ancaman pada tingkat itu didahulukan.
export function prProfile(a) {
  const val = (i) => Number(a?.[i]) || 0;
  const idx = (k, f = () => true) => PR_ITEMS.map((it, i) => [it, i]).filter(([it]) => it.k === k && f(it)).map(([, i]) => i);
  const mean = (ids) => ids.reduce((t, i) => t + val(i), 0) / ids.length;
  const maxOf = (ids) => Math.max(0, ...ids.map(val));
  const V = idx("korban"), D = idx("pelaku");
  const seriousV = idx("korban", (it) => it.serious).some((i) => val(i) >= 2);
  const forms = V.filter((i) => val(i) >= 2).map((i) => PR_ITEMS[i].form);
  const lvl = (ids, serious) => (serious ? "didahulukan" : maxOf(ids) >= 2 ? "perlu" : maxOf(ids) >= 1 ? "pantau" : "");
  const victim = lvl(V, seriousV), doer = lvl(D, idx("pelaku", (it) => it.serious).some((i) => val(i) >= 2));
  return {
    korban: mean(V), pelaku: mean(D), safe: mean(idx("iklim")), forms,
    victim, doer: doer === "didahulukan" ? "perlu" : doer,
    both: ["didahulukan", "perlu"].includes(victim) && maxOf(D) >= 2,
    defender: mean(idx("saksi", (it) => it.pos)) >= 2,
    seriousV,
  };
}

/* ---------------- Definisi untuk alur murid ---------------- */
export const INSTR = {
  "gaya-belajar": {
    heading: "Kenali cara belajarmu",
    letters: true,
    intro: () => [["Kamu paling mudah belajar lewat apa?", `Ada ${GAYA_ITEMS.length} situasi sehari-hari. Pilih satu jawaban yang paling mirip denganmu.`], ["Tidak ada jawaban yang salah", "Jawab seperti kamu biasanya. Cuma sekitar 5 menit."], ["Hasilnya langsung untukmu", "Di akhir, kamu melihat cara belajar yang paling cocok untukmu."]],
    items: () => GAYA_ITEMS.map((it, i) => ({ text: it.text, options: it.options.map((_, j, arr) => arr[(j + i) % 3]).map((o) => ({ v: o.k, t: o.t })) })),
    ask: "Pilih yang paling mirip denganmu.",
    result(a) {
      const r = gayaProfile(a);
      return `<p class="gb-eyebrow">Hasil gaya belajarmu</p>${donut(r.c, "Perbandingan gaya belajarmu")}
        <h1>${esc(r.title)}</h1><p class="lead">${esc(r.desc)}</p>
        <div class="gb-stack" aria-hidden="true">${r.order.filter((k) => r.c[k] > 0).map((k) => `<i style="flex:${r.c[k]};background:${VAK_COLOR[k]}"></i>`).join("")}</div>
        <div class="gb-legend">${["V", "A", "K"].map((k) => `<span><span class="dot" style="background:${VAK_COLOR[k]}"></span>${VAK[k]} <b>${r.pct[k]}%</b></span>`).join("")}</div>
        <div class="gb-tips"><h2>Coba cara ini saat belajar</h2><ul>${r.tips.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
    },
  },
  "minat-karier": {
    heading: "Kenali minat kariermu",
    intro: () => [["Kegiatan apa yang kamu suka?", `Ada ${MINAT_ITEMS.length} kegiatan. Untuk tiap kegiatan, pilih seberapa suka kamu melakukannya.`], ["Bukan soal bisa atau tidak", "Pilih karena kamu suka, bukan karena kamu sudah pandai. Tidak ada jawaban yang salah."], ["Hasilnya langsung untukmu", "Di akhir, kamu melihat kode minatmu beserta contoh mapel, jurusan, dan pekerjaan."]],
    items: () => MINAT_ITEMS.map((it) => ({ text: it.text })),
    stem: "Seberapa suka kamu…",
    options: () => MINAT5,
    result(a, cfg, name) {
      const p = minatProfile(a, cfg);
      const vals = Object.fromEntries(RIASEC_KEYS.map((k) => [k, p.pct[k] / 100]));
      const think = `<div class="gb-tips"><h2>Coba pikirkan</h2><ul><li>Dari semua kegiatan tadi, mana yang paling ingin kamu coba sungguhan?</li><li>Siapa orang di sekitarmu yang pekerjaannya cocok dengan minatmu? Coba tanyakan pengalamannya.</li><li>Mapel pilihan atau jurusan apa yang ingin kamu cari tahu lebih jauh?</li></ul></div>`;
      const head = p.code
        ? `<h1 class="center">${p.code}</h1><p class="lead center">Minat terkuatmu: ${p.order.slice(0, 3).map((k) => RIASEC_LABEL[k].toLowerCase()).join(", ")}.</p>
           ${p.order.slice(0, 3).map((k) => `<div class="gb-tips"><h2>${RIASEC_LABEL[k]} (${k})</h2><p class="muted" style="margin-top:.3rem">${esc(RIASEC[k].hint)}</p><ul><li>Mapel: ${RIASEC_EX[k].mapel}</li><li>Jurusan: ${RIASEC_EX[k].jurusan}</li><li>Pekerjaan: ${RIASEC_EX[k].kerja}</li></ul></div>`).join("")}`
        : p.low
          ? `<h1 class="center">Minatmu belum terlihat jelas</h1><p class="lead center">Belum banyak kegiatan yang kamu sukai di daftar tadi. Itu wajar, mungkin kamu belum sempat mencobanya. Cobalah kegiatan baru di sekolah atau di rumah, nanti minatmu akan lebih terlihat.</p>`
          : `<h1 class="center">Minatmu luas</h1><p class="lead center">Kamu menyukai banyak jenis kegiatan hampir sama besarnya, jadi belum ada satu yang paling menonjol. Itu wajar di usiamu. Cobalah banyak hal, nanti minat yang paling kuat akan terlihat.</p>`;
      return `<p class="gb-eyebrow">Hasil minat kariermu</p>
        <div class="radar-wrap">${radar(vals, RIASEC_KEYS, RIASEC_LABEL, { bold: p.code ? p.order.slice(0, 3) : [] })}</div>
        ${head}${think}
        <div class="caveat" style="margin-top:1rem">Ini gambaran minatmu saat ini, bukan ukuran kemampuan dan bukan keputusan akhir. Minat bisa berubah seiring pengalaman, dan semua pekerjaan bisa dijalani laki-laki maupun perempuan. Ceritakan hasil ini kepada orang tua dan gurumu, lalu coba kegiatan yang berkaitan, ${esc(name)}!</div>`;
    },
  },
  kekuatan: {
    heading: "Tentang dirimu",
    intro: () => [["Bagaimana kabarmu akhir-akhir ini?", `Ada ${KK_ITEMS.length} kalimat tentang dirimu dalam enam bulan terakhir. Pilih seberapa benar kalimat itu untukmu.`], ["Jawab dengan jujur", "Tidak ada jawaban yang benar atau salah. Jawabanmu membantu gurumu memahami dan mendukungmu."], ["Rahasia, hanya gurumu yang melihat", "Teman-temanmu tidak bisa melihat jawabanmu."]],
    items: () => KK_ITEMS.map((it) => ({ text: it.text })),
    ask: "Seberapa benar kalimat ini untukmu?",
    options: () => [{ v: 0, t: "Tidak benar" }, { v: 1, t: "Agak benar" }, { v: 2, t: "Benar" }],
    extra: () => [{ key: "impact", text: "Secara keseluruhan, apakah hal-hal tadi membuatmu kesulitan di rumah, di sekolah, atau dengan teman?", options: [{ v: 0, t: "Tidak" }, { v: 1, t: "Sedikit" }, { v: 2, t: "Cukup banyak" }, { v: 3, t: "Sangat banyak" }] }],
    result(a, cfg, name) {
      const p = kkProfile(a);
      const diff = ["emosi", "perilaku", "fokus", "teman"];
      const strengths = [...(p.s.peduli >= 6 ? ["peduli"] : []), ...diff.filter((k) => p.s[k] <= 2)].slice(0, 2);
      const tipArea = [...diff].sort((x, y) => p.s[y] - p.s[x])[0];
      return thanks(name, `<div class="gb-tips"><h2>Kekuatanmu</h2><ul>${(strengths.length ? strengths : ["peduli"]).map((k) => `<li>${KK_STRENGTH[k]}</li>`).join("")}<li>Kamu mau jujur tentang dirimu, dan itu butuh keberanian.</li></ul></div>
        <div class="gb-tips"><h2>Coba hal kecil ini</h2><ul><li>${KK_TIPS[p.s[tipArea] >= 4 ? tipArea : "peduli"]}</li></ul></div>${HELP}`);
    },
  },
  emosi: {
    heading: "Bagaimana perasaanmu?",
    intro: (cfg) => [["Dua minggu terakhir", `Ada ${phqItems(cfg).length} pertanyaan tentang perasaanmu selama dua minggu terakhir. Pilih seberapa sering kamu mengalaminya.`], ["Tidak ada jawaban yang salah", "Semua orang pernah merasa tidak baik. Jawab sesuai yang benar-benar kamu rasakan."], ["Rahasia, hanya gurumu yang melihat", "Gurumu membaca jawabanmu untuk memastikan kamu baik-baik saja."]],
    items: (cfg) => phqItems(cfg).map((t) => ({ text: t })),
    stem: "Selama dua minggu terakhir, seberapa sering kamu…",
    options: () => PHQ_OPTS,
    extra: () => [{ key: "impact", text: "Kalau kamu mengalami hal-hal tadi, seberapa sulit hal itu membuatmu belajar, mengurus urusan di rumah, atau bergaul dengan teman?", options: PHQ_IMPACT }],
    result(a, cfg, name) {
      const p = phqProfile(a, cfg);
      const urgent = p.priority === "hari ini" || p.priority === "minggu ini";
      return thanks(name, urgent
        ? `<div class="gb-tips"><h2>Kamu tidak sendirian</h2><ul><li>Terima kasih sudah jujur. Perasaan berat seperti ini bisa membaik dengan bantuan.</li><li>Gurumu akan mengajakmu bicara. Kamu juga boleh langsung menemui guru BK hari ini.</li><li>Kalau kamu sedang ingin menyakiti dirimu, segera beri tahu orang dewasa di dekatmu atau telepon 112.</li></ul></div>`
        : `<div class="gb-tips"><h2>Untukmu</h2><ul><li>Perasaanmu penting. Tidur cukup, bergerak, dan mengobrol dengan orang yang kamu sayangi bisa membantu.</li><li>Kalau suatu saat terasa berat, kamu tidak harus menanggungnya sendiri.</li></ul></div>${HELP}`);
    },
  },
  kepribadian: {
    heading: "Kenali dirimu",
    intro: () => [["Kamu lebih mirip yang mana?", `Ada ${TK_ITEMS.length} situasi sehari-hari, masing-masing dengan dua pilihan. Pilih yang lebih mirip dirimu.`], ["Tidak ada yang lebih baik", "Kedua pilihan sama baiknya. Pilih yang paling sering terjadi padamu, bukan yang kamu inginkan."], ["Hasilnya langsung untukmu", "Di akhir, kamu melihat empat huruf tipemu, kekuatanmu, dan cara belajar yang mungkin cocok."]],
    items: () => TK_ITEMS.map((it) => ({ text: it.text, options: it.options })),
    ask: "Pilih yang lebih mirip dirimu.",
    result(a, cfg, name) {
      const p = tkProfile(a);
      return `<p class="gb-eyebrow">Hasil tipe kepribadianmu</p><h1>${p.type}</h1><p class="lead">${p.type.split("").map((l) => TK_LETTER[l].name).join(" · ")}</p>
        <div class="gb-tips"><h2>Kekuatanmu</h2><ul>${p.type.split("").map((l) => `<li>Kamu ${TK_LETTER[l].str}.</li>`).join("")}</ul></div>
        <div class="gb-tips"><h2>Cara belajar yang mungkin cocok</h2><ul>${p.type.split("").slice(0, 2).map((l) => `<li>${TK_LETTER[l].learn[0].toUpperCase() + TK_LETTER[l].learn.slice(1)}.</li>`).join("")}</ul></div>
        <p class="muted" style="margin-top:1rem">${p.close.length ? `Pada pasangan ${p.close.join(", ")}, pilihanmu hampir seimbang. ` : ""}Tipe ini menggambarkan kecenderungan, bukan batas kemampuanmu, ${esc(name)}.</p>`;
    },
  },
  akpd: {
    heading: "Apa yang kamu butuhkan?",
    intro: (cfg) => [["Bantuan apa yang kamu perlukan?", `Ada ${akpdItems(cfg).length} hal tentang diri, pertemanan, belajar, dan masa depan. Pilih seberapa kamu butuh bantuan untuk tiap hal.`], ["Jawab dengan jujur", "Hasilnya dipakai gurumu untuk menyusun kegiatan bimbingan yang benar-benar kamu butuhkan."], ["Rahasia, hanya gurumu yang melihat", "Teman-temanmu tidak bisa melihat jawabanmu."]],
    items: (cfg) => akpdItems(cfg),
    ask: "Seberapa kamu butuh bantuan untuk hal ini?",
    options: () => AKPD_OPTS,
    result(a, cfg, name) {
      const p = akpdProfile(a, cfg), k = p.order[0];
      return thanks(name, `<div class="gb-tips"><h2>Bidang yang paling ingin kamu bantu</h2><p style="margin-top:.4rem"><b style="font-weight:600">${AKPD_BIDANG[k]}</b>. Gurumu akan menyiapkan kegiatan yang sesuai.</p></div>
        <div class="gb-tips"><h2>Ke mana bisa bercerita</h2><ul><li>Guru BK di ruang BK, saat istirahat atau pulang sekolah.</li><li>Wali kelas atau guru yang kamu percaya.</li><li>Orang tua atau keluarga di rumah.</li></ul></div>`);
    },
  },
  aman: {
    heading: "Rasa aman di sekolah",
    intro: () => [["Tiga bulan terakhir", `Ada ${PR_ITEMS.length} kalimat tentang hal yang kamu alami, lakukan, atau lihat di sekolah selama tiga bulan terakhir.`], ["Tujuannya melindungi", "Angket ini membantu sekolah melindungi semua murid, bukan untuk menghukum. Jawab dengan jujur."], ["Rahasia, hanya gurumu yang melihat", "Teman-temanmu tidak bisa melihat jawabanmu."]],
    items: () => PR_ITEMS.map((it) => ({ text: it.text })),
    ask: "Seberapa sering ini terjadi selama tiga bulan terakhir?",
    options: () => PR_OPTS,
    result(a, cfg, name) {
      const p = prProfile(a);
      return thanks(name, `${p.victim ? `<div class="gb-tips"><h2>Kamu tidak sendirian</h2><ul><li>Apa yang kamu alami bukan salahmu.</li><li>Ceritakan kepada guru BK atau wali kelas. Mereka akan membantumu dengan menjaga kerahasiaan.</li><li>Simpan bukti bila ada, misalnya tangkapan layar pesan.</li></ul></div>` : ""}
        <div class="gb-tips"><h2>Langkah kecil yang bisa kamu lakukan</h2><ul><li>Kalau melihat teman diganggu, temani dia dan ajak menjauh dari situasi itu.</li><li>Laporkan kepada guru. Melapor bukan mengadu, tetapi melindungi.</li><li>Pikirkan dulu sebelum mengirim komentar atau pesan tentang orang lain.</li></ul></div>${HELP}`);
    },
  },
};

// Jawaban contoh untuk "Buat sesi contoh" di dasbor.
export function sampleInstr(type, cfg, members) {
  const def = INSTR[type], items = def.items(cfg);
  const rnd = (a, b) => { const x = Math.sin(a * 97.13 + b * 13.7 + type.length * 7.1) * 10000; return x - Math.floor(x); };
  return members.filter((m) => m.no !== 18).map((m) => {
    const answers = {};
    items.forEach((it, i) => {
      const opts = it.options || def.options(cfg);
      const r = rnd(m.no, i);
      const skew = type === "emosi" || type === "aman" || type === "kekuatan" ? r * r * (m.no % 5 === 0 ? 1.8 : 1) : r;
      answers[i] = (type === "emosi" || type === "aman" || type === "kekuatan" ? [...opts].sort((x, y) => x.v - y.v) : opts)[Math.min(opts.length - 1, Math.floor(skew * opts.length))].v;
    });
    (def.extra ? def.extra(cfg) : []).forEach((x) => (answers[x.key] = x.options[Math.floor(rnd(m.no, 99) * 2)].v));
    return { no: m.no, answers };
  });
}
