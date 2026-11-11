// Isi asesmen berbasis skala: butir, pilihan jawaban, pengantar untuk murid, dan hasil yang dilihat murid.
// Jawaban disimpan sebagai answers[i] = nilai pilihan untuk butir ke-i, ditambah kunci khusus (misalnya "impact").
// Semua butir ditulis untuk Examus, kecuali Suasana Hati yang memakai isi PHQ-9 (bebas dipakai tanpa izin)
// dalam bahasa remaja. Tidak ada yang sudah divalidasi secara psikometrik untuk versi bahasa Indonesia ini.
import { esc } from "./util.js";
import { RIASEC, MINAT_ITEMS, GAYA_ITEMS, VAK } from "./data.js";
import { radar } from "./charts.js";
import { gayaProfile, donut, VAK_COLOR } from "./gaya.js";

import { talk } from "./help.js";
import { PR_ITEMS as PR40, amanResult } from "./aman.js";
const TALK = talk();
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
// Kode = tiga tipe dengan skor tertinggi, selalu dilaporkan seperti praktik Holland baku. Bila profil datar
// (selisih tertinggi-terendah kurang dari 25% rentang) atau rendah (skor tertinggi di bawah 50% rentang),
// kode ditandai "sementara" dan perlu dikonfirmasi lewat wawancara; batas 25% dan 50% adalah patokan Examus,
// bukan norma baku. Jawaban yang semuanya sama tidak diberi kode. Selisih 12,5% rentang (4 poin) atau
// kurang di antara dua tipe masih dalam batas kesalahan ukur, jadi urutannya dianggap setara. Sesi lama memakai skala 0-2.
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
  const code = same ? "" : order.slice(0, 3).join("");
  const provisional = !!code && (flat || low);
  const tied = !code ? [] : [0, 1, 2].filter((i) => pct[order[i]] - pct[order[i + 1]] <= 12.5).map((i) => order[i] + order[i + 1]);
  const note = same ? "jawaban semuanya sama" : low ? "minat rendah" : flat ? "profil datar (belum terbedakan)" : "";
  return { raw, pct, order, code, provisional, top: code && !provisional ? order[0] : null, flat, low, same, diff, tied, note, max: range };
}

/* ---------------- Kekuatan & kesulitan ---------------- */
export const KK_AREAS = { emosi: "Emosi", perilaku: "Perilaku", fokus: "Fokus", teman: "Pertemanan", peduli: "Kepedulian" };
// 25 butir SDQ (Strengths and Difficulties Questionnaire, Robert Goodman) versi laporan diri, kalimat bahasa
// Indonesia sesuai contoh yang diberikan pengguna. Urutan tampil mengikuti contoh; lima area SDQ: emosi,
// perilaku (masalah perilaku), fokus (hiperaktivitas/kurang perhatian), teman (masalah teman sebaya),
// peduli (perilaku prososial). rev = butir berkode terbalik (skor 2 - jawaban). Hak cipta SDQ ada pada
// Robert Goodman; bebas dipakai non-komersial tanpa diubah. Cocokkan dengan versi resmi di sdqinfo.org.
const kk = (k, text, rev = false) => ({ k, text, rev });
export const KK_ITEMS = [
  kk("peduli", "Aku memperhatikan perasaan orang lain"), kk("fokus", "Aku sulit duduk tenang dalam waktu lama"), kk("emosi", "Aku sering pusing, sakit perut, atau tidak enak badan"),
  kk("perilaku", "Kalau sedang marah, aku sulit menahan diri"), kk("teman", "Aku lebih sering sendirian daripada bersama teman seusiaku"), kk("peduli", "Aku mau berbagi makanan, alat tulis, atau barang lain dengan teman"),
  kk("fokus", "Tangan atau kakiku sering bergerak-gerak tanpa kusadari"), kk("emosi", "Banyak hal membuatku khawatir"), kk("perilaku", "Aku biasanya mengikuti aturan dan arahan guru atau orang tua", true),
  kk("teman", "Aku punya setidaknya satu sahabat", true), kk("peduli", "Kalau ada yang terluka atau sedih, aku berusaha menolongnya"), kk("fokus", "Perhatianku mudah teralih ke hal lain"),
  kk("emosi", "Aku sering merasa sedih atau ingin menangis"), kk("perilaku", "Aku sering bertengkar atau berkelahi dengan orang lain"), kk("teman", "Teman-teman seusiaku umumnya suka berteman denganku", true),
  kk("peduli", "Aku bersikap baik kepada anak-anak yang lebih muda"), kk("fokus", "Aku berpikir dulu sebelum melakukan sesuatu", true), kk("emosi", "Di tempat atau keadaan baru, aku mudah gugup dan tidak percaya diri"),
  kk("perilaku", "Aku cukup sering berbohong atau berbuat curang"), kk("teman", "Aku sering diejek, diganggu, atau dijahili anak lain"), kk("peduli", "Aku menawarkan bantuan kepada orang lain tanpa diminta"),
  kk("fokus", "Aku bisa menyelesaikan tugas sampai tuntas", true), kk("emosi", "Aku mudah merasa takut"), kk("perilaku", "Aku pernah mengambil barang yang bukan milikku tanpa izin"),
  kk("teman", "Aku lebih mudah akrab dengan orang dewasa daripada dengan teman seusiaku"),
];
export const KK_BULLIED = KK_ITEMS.findIndex((it) => it.text.startsWith("Aku sering diejek"));
// Pertanyaan dampak (pintu masuk suplemen dampak SDQ): hanya pertanyaan pertama; pertanyaan lanjutan
// (lama, rasa terganggu, hambatan di rumah/sekolah) belum ditanyakan, jadi skor dampak SDQ penuh belum ada.
export const KK_IMPACT = { text: "Secara keseluruhan, apakah kamu merasa sedang punya kesulitan dengan perasaan, konsentrasi, perilaku, atau pertemanan?", options: [{ v: 0, t: "Tidak" }, { v: 1, t: "Ya, sedikit kesulitan" }, { v: 2, t: "Ya, kesulitan yang jelas" }, { v: 3, t: "Ya, kesulitan yang berat" }] };
export function kkProfile(a) {
  const s = Object.fromEntries(Object.keys(KK_AREAS).map((k) => [k, 0]));
  KK_ITEMS.forEach((it, i) => { const v = Number(a?.[i]); if (Number.isNaN(v) || a?.[i] === undefined) return; s[it.k] += it.rev ? 2 - v : v; });
  return { s, total: s.emosi + s.perilaku + s.fokus + s.teman, impact: Number(a?.impact) || 0, bullied: Number(a?.[KK_BULLIED]) >= 1 };
}
// Empat pita mengikuti tabel SDQ laporan diri usia 11-17 (sdqinfo.org, sampel normatif Inggris):
//   total 0-15 / 16-19 / 20-25 / 26-40;  emosi 0-5 / 6 / 7 / 8-10;  perilaku 0-3 / 4 / 5 / 6-10;
//   fokus 0-5 / 6 / 7 / 8-10;  teman 0-2 / 3 / 4 / 5-10;  kepedulian 6-10 / 5 / 4 / 0-3.
// Pita = wajar, sedikit meningkat, tinggi, sangat tinggi. Norma Inggris belum tentu berlaku di Indonesia;
// pakai sebagai patokan sementara sampai ada norma lokal.
const KK_CUT = { emosi: [6, 7, 8], perilaku: [4, 5, 6], fokus: [6, 7, 8], teman: [3, 4, 5] };
export const KK_LEVELS = ["Wajar", "Sedikit meningkat", "Tinggi", "Sangat tinggi"];
export const kkLevel = (score, area) => {
  if (area === "peduli") return score >= 6 ? 0 : score === 5 ? 1 : score === 4 ? 2 : 3;
  const c = KK_CUT[area]; return score >= c[2] ? 3 : score >= c[1] ? 2 : score >= c[0] ? 1 : 0;
};
export const kkTotalLevel = (t) => (t >= 26 ? 3 : t >= 20 ? 2 : t >= 16 ? 1 : 0);
export const kkLevelName = (lvl, area) => (area === "peduli" ? ["Wajar", "Sedikit rendah", "Rendah", "Sangat rendah"][lvl] : KK_LEVELS[lvl]);
/* ---------------- Suasana hati (PHQ-9) ---------------- */
// PHQ-9 (Kroenke, Spitzer & Williams, 2001) dengan kalimat untuk remaja sesuai contoh pengguna. Pilihan jawaban:
// tidak pernah 0, beberapa hari 1, lebih dari seminggu 2, hampir setiap hari 3. Pada rentang dua minggu,
// "lebih dari seminggu" setara dengan "lebih dari separuh hari" pada PHQ-9 asli.
export const PHQ_ITEMS = [
  "merasa kurang tertarik atau kurang senang melakukan apa pun",
  "merasa sedih, murung, mudah kesal, atau putus asa",
  "sulit tidur, sering terbangun, atau justru tidur terlalu banyak",
  "merasa lelah atau kurang bertenaga",
  "tidak nafsu makan, berat badan turun, atau justru makan berlebihan",
  "merasa dirimu buruk, merasa gagal, atau merasa mengecewakan keluarga",
  "sulit berkonsentrasi, misalnya saat belajar, membaca, atau menonton",
  "bergerak atau berbicara sangat lambat sampai orang lain memperhatikannya, atau justru sangat gelisah sampai tidak bisa diam",
  "berpikir lebih baik mati saja, atau ingin menyakiti dirimu sendiri dengan cara apa pun",
];
export const PHQ_OPTS = [{ v: 0, t: "Tidak pernah" }, { v: 1, t: "Beberapa hari" }, { v: 2, t: "Lebih dari seminggu" }, { v: 3, t: "Hampir setiap hari" }];
export const PHQ_IMPACT = [{ v: 0, t: "Tidak sulit sama sekali" }, { v: 1, t: "Agak sulit" }, { v: 2, t: "Sangat sulit" }, { v: 3, t: "Amat sangat sulit" }];
export const phqItems = (cfg) => (cfg.variant === "phq8" ? PHQ_ITEMS.slice(0, 8) : PHQ_ITEMS);
// Penilaian mengikuti panduan PHQ-9 (Kroenke, Spitzer & Williams, 2001) dan PHQ-8 (Kroenke dkk., 2009):
//  - skor total: PHQ-9 0-27, PHQ-8 0-24 (butir nomor 9 tidak ada di PHQ-8);
//  - pita keparahan sama untuk keduanya: 0-4 minimal, 5-9 ringan, 10-14 sedang, 15-19 sedang-berat, 20 ke atas berat;
//  - skor 10 ke atas = skrining positif, perlu evaluasi lanjut (pada remaja 13-17, Richardson dkk. 2010
//    menemukan titik potong 11 paling seimbang antara sensitivitas dan spesifisitas);
//  - nomor 9 dijawab selain "tidak pernah" = tanya risiko bunuh diri langsung pada hari yang sama, berapa pun skor total;
//  - algoritma diagnostik PHQ-9: pola depresi mayor bila 5 gejala atau lebih ada "lebih dari separuh hari" (nomor 9
//    dihitung bila ada sama sekali) dan salah satunya nomor 1 atau 2; pola lain bila 2-4 gejala termasuk nomor 1 atau 2.
//    Ini hanya indikasi, bukan diagnosis;
//  - dampak ("agak sulit" atau lebih berat) memperkuat dugaan. Pengaruh dampak pada prioritas di sini adalah
//    kebijakan Examus (naik satu tingkat bila "sangat sulit" atau lebih), bukan bagian baku PHQ-9.
export function phqProfile(a, cfg) {
  const n = phqItems(cfg).length, v = (i) => Number(a?.[i]) || 0;
  let total = 0; for (let i = 0; i < n; i++) total += v(i);
  const item9 = n === 9 ? v(8) : 0;
  const band = total >= 20 ? "Berat" : total >= 15 ? "Sedang-berat" : total >= 10 ? "Sedang" : total >= 5 ? "Ringan" : "Minimal";
  const impact = Number(a?.impact) || 0;
  let count = 0; for (let i = 0; i < 8; i++) if (v(i) >= 2) count++;
  if (item9 >= 1) count++;
  const core = v(0) >= 2 || v(1) >= 2;
  const pattern = core && count >= 5 ? "mayor" : core && count >= 2 ? "lain" : "";
  let level = item9 >= 1 || total >= 20 ? 3 : total >= 15 ? 2 : total >= 10 ? 1 : 0;
  const reasons = [];
  if (item9 >= 1) reasons.push("menjawab nomor 9");
  if (total >= 10) reasons.push(`skor ${total} (${band.toLowerCase()})`);
  if (impact >= 2 && total >= 5 && level < 3) { level = Math.max(level, total >= 10 ? 2 : 1); reasons.push("fungsi sangat terganggu"); }
  else if (pattern === "mayor" && level === 0) { level = 1; reasons.push("pola gejala mayor"); }
  const priority = ["", "pantau", "minggu ini", "hari ini"][level];
  return { total, max: n * 3, item9, band, priority, level, impact, count, core, pattern, reasons, positive: total >= 10 };
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
  tk("EI", "Kalau ada waktu kosong di sekolah, aku lebih sering…", "mencari teman untuk diajak bercerita", "membaca, menggambar, atau melamun sendiri"),
  tk("SN", "Kalau diminta membuat karangan, aku lebih mudah menulis tentang…", "pengalaman yang benar-benar kualami", "dunia khayalan atau kemungkinan yang kubayangkan"),
  tk("TF", "Saat menilai lomba teman-teman, aku menilai terutama dari…", "kriteria yang sudah ditentukan", "usaha dan kesungguhan peserta"),
  tk("JP", "Kalau ada ulangan minggu depan, aku…", "membagi bahan belajar ke beberapa hari", "belajar paling banyak saat hari ujian sudah dekat"),
  tk("EI", "Dalam kelompok baru, orang lain biasanya melihatku sebagai…", "yang paling banyak bicara di awal", "yang lebih banyak menyimak dulu"),
  tk("SN", "Saat membaca petunjuk soal, aku…", "mengikuti persis apa yang tertulis", "mencari tahu maksud di balik petunjuknya"),
  tk("TF", "Kalau ada teman yang ditegur guru, aku…", "menilai apakah teguran itu masuk akal", "ikut merasa kasihan padanya"),
  tk("JP", "Barang yang mau kubawa ke sekolah besok…", "sudah kusiapkan sejak malam", "baru kusiapkan pagi harinya"),
  tk("EI", "Kalau berulang tahun, aku lebih suka…", "merayakannya bersama banyak orang", "merayakannya sederhana bersama orang terdekat"),
  tk("SN", "Aku lebih sering mengingat…", "kejadian dan detailnya, seperti hari dan tempatnya", "kesan dan makna dari kejadiannya"),
  tk("TF", "Orang menganggapku lebih…", "tegas dan langsung ke inti", "lembut dan penuh pengertian"),
  tk("JP", "Aku lebih nyaman dengan pekerjaan yang…", "punya urutan dan batas waktu jelas", "boleh dikerjakan dengan cara dan waktu yang fleksibel"),
];
// Urutan pilihan dibalik di butir genap supaya murid tidak menjawab satu sisi terus.
export const TK_ITEMS = TK_RAW.map((it, i) => {
  const [L, R] = TK_DIMS[it.d], opts = [{ v: L, t: it.a }, { v: R, t: it.b }];
  return { ...it, options: i % 2 ? opts.reverse() : opts };
});
// Tiap pasangan dinilai dari 11 butir. Kekuatan preferensi mengikuti jumlah pilihan terbanyak:
// 6-7 dari 11 = tipis, 8-9 = sedang, 10-11 = jelas. Ganjil, jadi tidak pernah seri. Bila tiga pasangan atau lebih
// "tipis", hasil dibaca sebagai "luwes": huruf tipe tetap dihitung tetapi kurang bermakna. Ini patokan Examus, bukan norma baku.
export const TK_AXIS = {
  EI: { title: "Sumber energi", L: "Bersama orang", R: "Waktu sendiri" },
  SN: { title: "Cara menangkap informasi", L: "Fakta nyata", R: "Ide dan kemungkinan" },
  TF: { title: "Cara mengambil keputusan", L: "Logika", R: "Nilai dan perasaan" },
  JP: { title: "Cara menata kegiatan", L: "Terencana", R: "Fleksibel" },
};
export const TK_TYPES = {
  ISTJ: ["Si Teliti yang Dapat Diandalkan", "rajin, teratur, dan menepati janji"], ISFJ: ["Si Penjaga yang Hangat", "setia, peduli, dan memperhatikan kebutuhan orang di sekitarnya"],
  INFJ: ["Si Pemikir yang Peduli", "tenang, punya pandangan jauh, dan ingin berarti bagi orang lain"], INTJ: ["Si Perencana Mandiri", "suka menyusun strategi dan bekerja dengan caranya sendiri"],
  ISTP: ["Si Pengutak-atik", "tenang, praktis, dan suka memahami cara kerja sesuatu"], ISFP: ["Si Seniman yang Tenang", "lembut, peka pada keindahan, dan setia pada nilai yang dipegangnya"],
  INFP: ["Si Pemimpi yang Tulus", "penuh imajinasi dan berpegang pada hal yang ia anggap bermakna"], INTP: ["Si Penyelidik", "suka menganalisis dan mencari tahu mengapa sesuatu terjadi"],
  ESTP: ["Si Pencoba yang Gesit", "berani mencoba dan pandai menyesuaikan diri saat itu juga"], ESFP: ["Si Penghibur", "ceria, spontan, dan membuat suasana hidup"],
  ENFP: ["Si Pencetus Ide", "antusias, kreatif, dan mudah menularkan semangat"], ENTP: ["Si Penantang Gagasan", "suka berdebat ide dan menemukan cara baru"],
  ESTJ: ["Si Pengatur", "tegas, terorganisir, dan senang menuntaskan pekerjaan"], ESFJ: ["Si Penyatu", "ramah, suka membantu, dan menjaga kebersamaan"],
  ENFJ: ["Si Penyemangat", "pandai memotivasi dan membantu teman berkembang"], ENTJ: ["Si Pemimpin yang Terarah", "suka memimpin, menetapkan tujuan, dan mengambil keputusan"],
};
export const TK_GRID = ["ISTP", "ISFP", "INFP", "INTP", "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ", "ISTJ", "ISFJ", "INFJ", "INTJ"];
export const TK_TIP = {
  E: "Belajar sambil berdiskusi atau menjelaskan kepada teman.", I: "Beri dirimu waktu tenang untuk berpikir sebelum menjawab atau berdiskusi.",
  S: "Cari contoh nyata dan latihan langkah demi langkah.", N: "Mulai dari gambaran besar, lalu turun ke detail.",
  T: "Pahami alasan dan logika di balik tiap materi.", F: "Hubungkan materi dengan hal yang kamu pedulikan, dan belajar bersama teman yang suportif.",
  J: "Buat jadwal belajar dan tandai yang sudah selesai.", P: "Pasang tenggat kecil untuk dirimu sendiri supaya tugas tidak menumpuk di akhir.",
};
export function tkProfile(a) {
  const c = {}; TK_ITEMS.forEach((it, i) => { const v = a?.[i]; if (v) c[v] = (c[v] || 0) + 1; });
  const axes = Object.entries(TK_DIMS).map(([d, [L, R]]) => {
    const nL = c[L] || 0, nR = c[R] || 0, win = nL > nR ? L : R, n = Math.max(nL, nR), total = nL + nR;
    const strength = n >= 10 ? "jelas" : n >= 8 ? "sedang" : "tipis";
    return { d, L, R, nL, nR, win, n, total, strength };
  });
  const type = axes.map((x) => x.win).join("");
  const thin = axes.filter((x) => x.strength === "tipis");
  const flexible = thin.length >= 3;
  const close = thin.map((x) => x.L + "/" + x.R);
  return { c, axes, type, close, thin: thin.length, flexible };
}

/* ---------------- AKPD ---------------- */
export const AKPD_BIDANG = { pribadi: "Pribadi", sosial: "Sosial", belajar: "Belajar", karier: "Karier" };
const ak = (k, smp, sma) => ({ k, smp, sma: sma || smp });
// 60 butir (15 per bidang). Sesi lama tanpa cfg.n hanya memakai 40 butir pertama.
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
  ak("pribadi", "Mengenali dan menamai perasaan yang sedang kurasakan"), ak("sosial", "Meminta maaf dan memaafkan teman"), ak("belajar", "Memahami bacaan atau soal yang panjang"), ak("karier", "Mengetahui kekuatanku yang berkaitan dengan pekerjaan"),
  ak("pribadi", "Bangkit kembali setelah gagal atau kecewa"), ak("sosial", "Mendengarkan teman dengan sungguh-sungguh"), ak("belajar", "Membuat ringkasan dan catatan yang berguna"), ak("karier", "Mencari tahu program keahlian di SMK", "Mencari tahu program studi dan jurusan di perguruan tinggi"),
  ak("pribadi", "Menjaga kesehatan fisik, makan, dan olahraga"), ak("sosial", "Berbicara dengan guru tentang kesulitanku"), ak("belajar", "Mengurangi rasa cemas saat ulangan"), ak("karier", "Mempersiapkan diri untuk tes masuk sekolah lanjutan", "Mempersiapkan diri untuk tes masuk perguruan tinggi"),
  ak("pribadi", "Menghargai diri sendiri tanpa selalu membandingkan dengan orang lain"), ak("sosial", "Menjaga etika dan keamanan saat memakai media sosial"), ak("belajar", "Memakai internet dan kecerdasan buatan (AI) dengan jujur untuk belajar"), ak("karier", "Mengenal sikap kerja yang dihargai di dunia kerja"),
  ak("pribadi", "Memahami nilai dan prinsip yang kupegang", "Merumuskan nilai dan prinsip hidup yang kupegang"), ak("sosial", "Membicarakan masalah dengan orang tua atau keluarga"), ak("belajar", "Belajar kelompok bersama teman dengan efektif"), ak("karier", "Membicarakan rencana masa depan dengan orang tua"),
];
export const akpdItems = (cfg) => AKPD_RAW.slice(0, cfg.n || 40).map((it) => ({ k: it.k, text: cfg.jenjang === "sma" ? it.sma : it.smp }));
export const AKPD_DESC = {
  pribadi: "dirimu sendiri, seperti mengenal diri, mengelola perasaan, dan percaya diri",
  sosial: "hubungan dengan orang lain, seperti pertemanan, bekerja sama, dan menghadapi konflik",
  belajar: "belajar dan sekolah, seperti cara belajar, konsentrasi, dan menghadapi ulangan",
  karier: "masa depanmu, seperti minat, pilihan jurusan, kuliah, kerja, dan beasiswa",
};
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
export const PR_OLD_ITEMS = [
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
export function prProfileOld(a) {
  const val = (i) => Number(a?.[i]) || 0;
  const idx = (k, f = () => true) => PR_OLD_ITEMS.map((it, i) => [it, i]).filter(([it]) => it.k === k && f(it)).map(([, i]) => i);
  const mean = (ids) => ids.reduce((t, i) => t + val(i), 0) / ids.length;
  const maxOf = (ids) => Math.max(0, ...ids.map(val));
  const V = idx("korban"), D = idx("pelaku");
  const seriousV = idx("korban", (it) => it.serious).some((i) => val(i) >= 2);
  const forms = V.filter((i) => val(i) >= 2).map((i) => PR_OLD_ITEMS[i].form);
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
      const tipsFor = (ks) => ks.map((k) => `<div class="gb-tips"><h2>${RIASEC_LABEL[k]} (${k})</h2><p class="muted" style="margin-top:.3rem">${esc(RIASEC[k].hint)}</p><ul><li>Mapel: ${RIASEC_EX[k].mapel}</li><li>Jurusan: ${RIASEC_EX[k].jurusan}</li><li>Pekerjaan: ${RIASEC_EX[k].kerja}</li></ul></div>`).join("");
      const head = p.code && !p.provisional
        ? `<h1 class="center">${p.code}</h1><p class="lead center">Minat terkuatmu: ${p.order.slice(0, 3).map((k) => RIASEC_LABEL[k].toLowerCase()).join(", ")}.</p>${tipsFor(p.order.slice(0, 3))}`
        : p.low
          ? `<h1 class="center">Minatmu belum terlihat jelas</h1><p class="lead center">Belum banyak kegiatan yang kamu sukai di daftar tadi. Itu wajar, mungkin kamu belum sempat mencobanya. Cobalah kegiatan baru di sekolah atau di rumah, nanti minatmu akan lebih terlihat.</p>`
          : `<h1 class="center">Minatmu luas</h1><p class="lead center">Kamu menyukai banyak jenis kegiatan hampir sama besarnya, jadi belum ada satu yang paling menonjol. Itu wajar di usiamu. Cobalah banyak hal, nanti minat yang paling kuat akan terlihat.</p>
            ${p.code ? `<div class="gb-tips"><h2>Sedikit lebih tinggi</h2><p style="margin-top:.4rem">Bidang yang skornya sedikit lebih tinggi: <b style="font-weight:600">${p.order.slice(0, 3).map((k) => RIASEC_LABEL[k].toLowerCase()).join(", ")}</b>. Ini kode sementara (${p.code}), karena skor semua bidangmu hampir sama. Gunakan sebagai awal mencoba, bukan kesimpulan.</p></div>${tipsFor(p.order.slice(0, 3))}` : ""}`;
      return `<p class="gb-eyebrow">Hasil minat kariermu</p>
        <div class="radar-wrap">${radar(vals, RIASEC_KEYS, RIASEC_LABEL, { bold: p.code && !p.low ? p.order.slice(0, 3) : [] })}</div>
        ${head}${think}
        <div class="caveat" style="margin-top:1rem">Ini gambaran minatmu saat ini, bukan ukuran kemampuan dan bukan keputusan akhir. Minat bisa berubah seiring pengalaman, dan semua pekerjaan bisa dijalani laki-laki maupun perempuan. Ceritakan hasil ini kepada orang tua dan gurumu, lalu coba kegiatan yang berkaitan, ${esc(name)}!</div>`;
    },
  },
  kekuatan: {
    heading: "Bagaimana kabarmu belakangan ini?",
    intro: () => [["Bagaimana kabarmu belakangan ini?", `Ada ${KK_ITEMS.length} kalimat tentang dirimu dalam enam bulan terakhir. Sekitar 7 menit.`], ["Pilih seberapa benar", "Tidak ada jawaban yang salah. Kalau ragu, pilih yang paling mendekati.", ["Tidak benar", "Agak benar", "Benar"]], ["Hanya gurumu yang membaca", "Guru BK atau wali kelasmu membacanya supaya bisa membantu. Teman-temanmu tidak bisa melihatnya."]],
    items: () => KK_ITEMS.map((it) => ({ text: it.text })),
    stem: "Seberapa benar tentang dirimu?",
    options: () => [{ v: 0, t: "Tidak benar" }, { v: 1, t: "Agak benar" }, { v: 2, t: "Benar" }],
    extra: () => [{ key: "impact", text: KK_IMPACT.text, options: KK_IMPACT.options }],
    result(a, cfg, name) {
      const p = kkProfile(a), lv = (k) => kkLevel(p.s[k], k);
      const CARDS = {
        emosi: ["Perasaan", "Kamu bilang belakangan ini hatimu sering terasa berat, khawatir, atau takut. Perasaan seperti itu wajar dan bisa membaik, apalagi kalau tidak dipendam sendiri.", "Tarik napas pelan-pelan beberapa kali, lalu ceritakan perasaanmu kepada orang yang kamu percaya."],
        perilaku: ["Marah dan aturan", "Kamu bilang belakangan ini sulit menahan marah atau sulit mengikuti aturan. Itu bisa dilatih, dan kamu tidak perlu menjalaninya sendirian.", "Saat mulai marah, berhenti sebentar dan hitung sampai sepuluh sebelum bicara atau bertindak."],
        fokus: ["Tenang dan fokus", "Kamu bilang belakangan ini sulit duduk tenang atau menjaga perhatian. Banyak anak mengalaminya, dan ada cara yang membantu.", "Bagi tugas besar menjadi bagian kecil, lalu istirahat sebentar setelah tiap bagian selesai."],
        teman: ["Teman dan pertemanan", p.bullied ? "Kamu bilang belakangan ini berteman tidak selalu mudah. Kamu layak punya teman yang baik, dan kalau ada yang mengganggumu, itu bukan salahmu." : "Kamu bilang belakangan ini berteman tidak selalu mudah. Kamu layak punya teman yang baik.", "Ajak satu teman mengobrol atau bekerja bersama minggu ini. Kalau ada yang mengejek atau mengganggu, ceritakan ke guru BK atau wali kelas."],
      };
      const shown = ["emosi", "perilaku", "fokus", "teman"].filter((k) => lv(k) >= 1 || (k === "teman" && p.bullied));
      const strengths = [...(lv("peduli") === 0 ? ["Kamu peduli kepada orang lain dan suka menolong."] : []), ...(["emosi", "perilaku", "fokus", "teman"].filter((k) => lv(k) === 0).length >= 3 ? ["Di banyak hal, kamu merasa baik-baik saja belakangan ini."] : []), "Kamu mau jujur tentang dirimu, dan itu butuh keberanian."];
      const concern = shown.length > 0 || kkTotalLevel(p.total) >= 1 || p.impact >= 2;
      return `<p class="gb-eyebrow">Hasilmu</p><h1>Terima kasih sudah jujur, ${esc(name)}.</h1>
        <p class="lead" style="margin-top:.6rem">Setiap orang punya kekuatan dan hal yang sedang terasa berat. Ini gambaran dari jawabanmu, bukan penilaian tentang dirimu.</p>
        <div class="gb-tips"><h2>Kekuatanmu</h2><ul>${strengths.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        ${shown.map((k) => `<div class="gb-tips"><h2>${CARDS[k][0]}</h2><p style="margin-top:.4rem">${CARDS[k][1]}</p><p style="margin-top:.5rem"><b style="font-weight:600">Coba:</b> ${CARDS[k][2]}</p></div>`).join("")}
        ${TALK}
        ${concern ? `<p class="muted" style="margin-top:1rem">Gurumu mungkin akan mengajakmu mengobrol. Itu bukan karena kamu salah, tapi karena ia peduli. Jawaban ini tidak memengaruhi nilaimu.</p>` : ""}`;
    },
  },
  emosi: {
    heading: "Bagaimana kabarmu dua minggu ini?",
    intro: (cfg) => [["Bagaimana kamu dua minggu ini?", `Ada ${phqItems(cfg).length + 1} pertanyaan singkat tentang perasaan, tidur, dan tenagamu. Sekitar 3 menit.`], ["Pilih seberapa sering", "Kalau ragu, pilih yang paling mendekati.", ["Tidak pernah", "Beberapa hari", "Lebih dari seminggu", "Hampir setiap hari"]], ["Hanya guru BK-mu yang membaca", "Supaya ia tahu siapa yang mungkin butuh teman bicara. Teman-temanmu tidak bisa melihatnya, dan nilaimu tidak terpengaruh."]],
    items: (cfg) => phqItems(cfg).map((t) => ({ text: t })),
    stem: "Dalam 2 minggu terakhir, seberapa sering kamu…",
    options: () => PHQ_OPTS,
    extra: () => [{ key: "impact", text: "Kalau kamu mengalami satu atau lebih hal tadi, seberapa sulit hal itu membuatmu belajar, mengerjakan urusan di rumah, atau bergaul dengan teman?", options: PHQ_IMPACT }],
    result(a, cfg, name) {
      const p = phqProfile(a, cfg);
      const helps = `<div class="gb-tips"><h2>Yang sering membantu</h2><ul><li>Tidur dan bangun di jam yang sama, dan simpan HP sebelum tidur.</li><li>Gerakkan badan setiap hari, walau hanya jalan kaki 15 menit.</li><li>Makan teratur, walau sedikit.</li><li>Lakukan satu hal kecil yang biasanya kamu suka.</li><li>Ceritakan perasaanmu ke satu orang yang kamu percaya.</li></ul></div>`;
      const urgent = p.item9 >= 1 || p.total >= 15;
      const head = urgent
        ? `<h1>Terima kasih sudah jujur. Kamu tidak sendirian.</h1><p class="lead" style="margin-top:.6rem">Belakangan ini terasa cukup berat buatmu. Itu bukan salahmu, dan kamu layak dibantu. Gurumu akan mengajakmu bicara, dan kamu juga boleh langsung menemui guru BK hari ini.</p>`
        : p.total >= 5
          ? `<h1>Ada beberapa hari yang terasa berat, ya.</h1><p class="lead" style="margin-top:.6rem">Itu wajar dialami siapa pun. Hal-hal kecil di bawah ini sering membantu.</p>`
          : `<h1>Terima kasih sudah menjawab.</h1><p class="lead" style="margin-top:.6rem">Dari jawabanmu, belakangan ini kamu cukup baik-baik saja. Tetap jaga dirimu, dan ingat kamu boleh bercerita kapan saja.</p>`;
      const safety = p.item9 >= 1 ? `<div class="gb-tips"><h2>Kalau pikiran itu muncul lagi</h2><ul><li>Segera beri tahu orang dewasa yang kamu percaya, sekarang juga, atau hubungi Healing119 (telepon 119, tekan 8).</li><li>Kalau kamu merasa dalam bahaya saat ini, pergi ke IGD atau puskesmas terdekat dan jangan sendirian.</li></ul></div>` : "";
      return `<p class="gb-eyebrow">Terima kasih, ${esc(name)}</p>${head}${safety}${helps}${talk(true)}`;
    },
  },
  kepribadian: {
    heading: "Kenali tipe kepribadianmu",
    letters: true,
    intro: () => [["Kamu orang yang seperti apa?", `Ada ${TK_ITEMS.length} situasi, masing-masing dengan dua pilihan. Pilih yang lebih mirip denganmu, walau keduanya terasa cocok.`], ["Jadilah dirimu sendiri", "Jawab seperti kamu biasanya, bukan seperti yang diharapkan guru atau orang tua. Tidak ada tipe yang lebih baik."], ["Hasilnya langsung untukmu", "Sekitar 7 menit. Di akhir, kamu melihat tipemu dan artinya."]],
    items: () => TK_ITEMS.map((it) => ({ text: it.text, options: it.options })),
    stem: "Mana yang lebih mirip kamu?",
    result(a, cfg, name) {
      const p = tkProfile(a), [tname, tdesc] = TK_TYPES[p.type];
      const bars = `<div class="gb-tips tkb"><h2>Empat pasangan preferensimu</h2>${p.axes.map((x) => {
        const ax = TK_AXIS[x.d], leftWin = x.win === x.L, w = (Math.abs(x.nL - x.nR) / x.total) * 50;
        return `<div class="tkrow"><p class="tkt">${ax.title}</p><div class="tkline"><span class="l${leftWin ? " on" : ""}"><b>${x.L}</b> ${ax.L}</span><span class="tr"><i class="mid"></i><i class="fill" style="${leftWin ? "right" : "left"}:50%;width:${w}%"></i></span><span class="r${leftWin ? "" : " on"}">${ax.R} <b>${x.R}</b></span></div><p class="tkn">${x.n} dari ${x.total} pilihan · ${x.strength}</p></div>`;
      }).join("")}<p class="muted small" style="margin-top:.6rem">Makin panjang batangnya, makin jelas kecenderunganmu. Batang pendek berarti kamu hampir seimbang di kedua sisi.</p></div>`;
      const strong = [...p.axes].sort((x, y) => y.n - x.n).slice(0, 2);
      const tips = `<div class="gb-tips"><h2>Cara belajar yang mungkin cocok</h2><ul>${strong.map((x) => `<li>${TK_TIP[x.win]}</li>`).join("")}</ul></div>`;
      const grid = `<div class="gb-tips"><h2>Enam belas tipe</h2><div class="tk16">${TK_GRID.map((g) => `<span class="${g === p.type ? "me" : ""}">${g}</span>`).join("")}</div></div>`;
      const think = `<div class="gb-tips"><h2>Coba pikirkan</h2><ul><li>Dalam situasi apa kamu justru bersikap sebaliknya dari hasil ini?</li><li>Bagian mana dari hasil ini yang paling terasa "aku banget"? Bagian mana yang tidak?</li><li>Teman yang tipenya berbeda denganmu punya kelebihan apa yang bisa kamu pelajari?</li></ul></div>`;
      const head = p.flexible
        ? `<h1 class="center">Kamu luwes di banyak hal</h1><p class="lead center">Di sebagian besar pasangan, pilihanmu hampir seimbang di kedua sisi. Hasil terdekatnya ${p.type}, tetapi itu belum banyak berarti: bisa jadi kamu menyesuaikan diri dengan keadaan, atau masih mengenali dirimu. Baca keempat pasangan di bawah satu per satu.</p>`
        : `<h1 class="center">${p.type}</h1><p class="lead center"><b style="font-weight:600">${tname}</b>: ${tdesc}.</p>${p.thin ? `<p class="muted center" style="margin-top:.5rem">Pada ${p.thin} pasangan pilihanmu masih tipis, jadi bisa jadi kamu memakai kedua sisinya.</p>` : ""}`;
      return `<p class="gb-eyebrow">Hasil tipe kepribadianmu</p>${head}${bars}${tips}${grid}${think}
        <div class="caveat" style="margin-top:1rem">Ini gambaran apa yang terasa paling nyaman bagimu saat ini, bukan ukuran kemampuan dan bukan kotak yang mengurungmu. Semua orang memakai kedua sisi setiap pasangan, dan hasilmu bisa berubah seiring waktu. Ceritakan hasil ini kepada orang tua dan gurumu, ${esc(name)}!</div>`;
    },
  },
  akpd: {
    heading: "Apa yang ingin kamu bantu?",
    intro: (cfg) => [["Kamu ingin dibantu dalam hal apa?", `Ada ${akpdItems(cfg).length} hal yang sering dihadapi siswa seusiamu. Sekitar ${Math.round(akpdItems(cfg).length / 6)} menit.`], ["Pilih seberapa butuh", "Jawab sesuai keadaanmu sekarang.", ["Sangat butuh bantuan", "Butuh bantuan", "Sedikit butuh bantuan", "Tidak butuh bantuan"]], ["Untuk menyusun bantuan untukmu", "Guru BK membacanya untuk merencanakan layanan. Teman-temanmu tidak bisa melihatnya."]],
    items: (cfg) => akpdItems(cfg),
    stem: "Seberapa kamu butuh bantuan untuk…",
    options: () => AKPD_OPTS,
    result(a, cfg, name) {
      const p = akpdProfile(a, cfg), items = akpdItems(cfg), top = p.order[0], any = p.pct[top] > 0;
      const wants = items.map((it, i) => ({ text: it.text, v: Number(a?.[i]) || 0, i })).filter((x) => x.v >= 1).sort((x, y) => y.v - x.v || x.i - y.i).slice(0, 5);
      const lead = any ? `Kamu paling ingin dibantu di bidang <b style="font-weight:600">${AKPD_BIDANG[top].toLowerCase()}</b>, yaitu ${AKPD_DESC[top]}.` : "Belakangan ini kamu belum merasa butuh banyak bantuan di bidang mana pun. Kalau nanti ada yang ingin kamu tanyakan, gurumu siap mendengar.";
      const minTop = p.order[p.order.length - 1];
      return `<p class="gb-eyebrow">Hasilmu</p><h1>Terima kasih sudah jujur, ${esc(name)}.</h1>
        <p class="lead" style="margin-top:.6rem">${lead}</p>
        <div class="gb-tips akb">${p.order.slice().sort((x, y) => ["pribadi", "sosial", "belajar", "karier"].indexOf(x) - ["pribadi", "sosial", "belajar", "karier"].indexOf(y)).map((k) => `<div class="b"><span class="nm">${AKPD_BIDANG[k]}</span><span class="track"><i class="${k === top && any ? "top" : ""}" style="width:${Math.max(3, p.pct[k])}%"></i></span></div>`).join("")}
          <p class="muted small" style="margin-top:.5rem">Makin panjang batangnya, makin besar bantuan yang kamu rasa perlukan.</p></div>
        ${wants.length ? `<div class="gb-tips"><h2>Yang paling ingin kamu bantu</h2><ul>${wants.map((x) => `<li>${esc(x.text)}</li>`).join("")}</ul></div>` : ""}
        <div class="caveat" style="margin-top:1rem">Gurumu memakai jawaban seluruh kelas untuk menyusun layanan BK, jadi topik yang kamu butuhkan bisa dibahas bersama. Kalau ada yang ingin kamu ceritakan sekarang, temui guru BK kapan saja. Kamu tidak sendirian.</div>
        ${talk(true)}`;
    },
  },
  aman: {
    heading: "Bagaimana suasana di sekolahmu?",
    intro: (cfg) => cfg.n === 40 ? [["Kamu aman di sekolah?", "Ada 40 kalimat tentang 3 bulan terakhir. Sekitar 10 menit."], ["Pilih seberapa sering", "Tidak ada jawaban yang salah. Jawab sejujurnya.", ["Tidak pernah", "Jarang", "Kadang-kadang", "Sering", "Sangat sering"]], ["Hanya gurumu yang membaca", "Bukan teman-temanmu. Dan bukan untuk menghukum siapa pun."], ["Kalau ada yang membahayakanmu", "Gurumu akan bertindak untuk melindungimu. Kamu tidak sendirian."]] : [["Tiga bulan terakhir", `Ada ${PR_OLD_ITEMS.length} kalimat tentang hal yang kamu alami, lakukan, atau lihat di sekolah selama tiga bulan terakhir.`], ["Tujuannya melindungi", "Angket ini membantu sekolah melindungi semua murid, bukan untuk menghukum. Jawab dengan jujur."], ["Rahasia, hanya gurumu yang melihat", "Teman-temanmu tidak bisa melihat jawabanmu."]],
    items: (cfg) => (cfg.n === 40 ? PR40.map((x) => ({ text: x.text, options: x.options, ask: x.ask, neg: x.neg })) : PR_OLD_ITEMS.map((it) => ({ text: it.text }))),
    ask: "Seberapa sering ini terjadi selama tiga bulan terakhir?",
    options: () => PR_OPTS,
    result(a, cfg, name) {
      if (cfg.n === 40) return amanResult(a, name);
      const p = prProfileOld(a);
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
      // Butir kesesuaian (iklim sekolah): contoh condong ke iklim baik, kecuali murid tertentu.
      const ordered = it.options && type === "aman" ? [...opts].sort((x, y) => (it.neg ? x.v - y.v : y.v - x.v)) : type === "emosi" || type === "aman" || type === "kekuatan" ? [...opts].sort((x, y) => x.v - y.v) : opts;
      answers[i] = ordered[Math.min(opts.length - 1, Math.floor(skew * opts.length))].v;
    });
    (def.extra ? def.extra(cfg) : []).forEach((x) => (answers[x.key] = x.options[Math.floor(rnd(m.no, 99) * 2)].v));
    return { no: m.no, answers };
  });
}
