// Sosiometri: bank pertanyaan, alasan memilih, dan angket siap pakai.
// Pertanyaan: { id, area: "Pribadi" | "Sosial" | "Belajar" | "Karier", text, neg? }.
// neg = pertanyaan penolakan ("paling tidak ingin ..."); tidak ditanyakan alasannya.

export const AREAS = ["Pribadi", "Sosial", "Belajar", "Karier"];

const Q = (id, area, text, neg = false) => ({ id, area, text, ...(neg ? { neg: true } : {}) });

export const SOCIO_BANK = [
  Q("p1", "Pribadi", "Kalau sedang ada masalah, kepada siapa di kelas ini kamu paling nyaman bercerita?"),
  Q("p2", "Pribadi", "Siapa teman yang paling kamu percaya untuk menyimpan rahasia?"),
  Q("p3", "Pribadi", "Saat sedang sedih, siapa teman yang paling bisa menghiburmu?"),
  Q("p4", "Pribadi", "Siapa teman yang paling kamu mintai pendapat sebelum mengambil keputusan?"),
  Q("p5", "Pribadi", "Siapa teman yang membuatmu merasa dihargai apa adanya?"),
  Q("p6", "Pribadi", "Siapa teman yang paling bisa menenangkanmu saat kamu kesal?"),
  Q("s1", "Sosial", "Saat jam istirahat, dengan siapa kamu paling senang menghabiskan waktu?"),
  Q("s2", "Sosial", "Kalau tempat duduk boleh dipilih sendiri, siapa yang ingin kamu jadikan teman sebangku?"),
  Q("s3", "Sosial", "Kalau kelas pergi karyawisata, dengan siapa kamu ingin satu rombongan?"),
  Q("s4", "Sosial", "Siapa teman yang paling pandai mendamaikan teman yang sedang berselisih?"),
  Q("s5", "Sosial", "Kalau kelompokmu butuh ketua, siapa yang paling cocok?"),
  Q("s6", "Sosial", "Siapa teman yang ingin kamu ajak dalam kegiatan kelas atau ekstrakurikuler?"),
  Q("sn1", "Sosial", "Dengan siapa kamu paling tidak ingin duduk sebangku?", true),
  Q("sn2", "Sosial", "Dengan siapa kamu paling sulit bekerja sama?", true),
  Q("b1", "Belajar", "Kalau ada tugas kelompok, dengan siapa kamu paling ingin satu kelompok?"),
  Q("b2", "Belajar", "Kalau ada materi yang belum kamu pahami, kepada siapa kamu paling nyaman bertanya?"),
  Q("b3", "Belajar", "Menjelang ulangan, siapa yang ingin kamu ajak belajar bersama?"),
  Q("b4", "Belajar", "Siapa teman yang paling bisa menjelaskan pelajaran sampai mudah dipahami?"),
  Q("b5", "Belajar", "Siapa teman yang membuatmu lebih semangat belajar?"),
  Q("b6", "Belajar", "Siapa teman yang ingin kamu ajak menyiapkan presentasi?"),
  Q("bn1", "Belajar", "Dengan siapa kamu paling tidak ingin satu kelompok belajar?", true),
  Q("k1", "Karier", "Dengan siapa kamu paling suka mengobrol tentang cita-cita dan rencana setelah lulus?"),
  Q("k2", "Karier", "Siapa teman yang ingin kamu ajak mencari informasi sekolah lanjutan atau kuliah?"),
  Q("k3", "Karier", "Kalau boleh membuat proyek apa saja (usaha kecil, karya, atau percobaan), siapa yang ingin kamu ajak?"),
  Q("k4", "Karier", "Siapa teman yang paling memberimu semangat untuk meraih cita-cita?"),
  Q("k5", "Karier", "Siapa teman yang ingin kamu ajak berdiskusi tentang bakat dan minat?"),
  Q("k6", "Karier", "Siapa teman yang ingin kamu ajak mencari informasi pekerjaan atau beasiswa?"),
];
const byId = (id) => SOCIO_BANK.find((q) => q.id === id);

export const SOCIO_REASONS = {
  Pribadi: ["Bisa dipercaya dan menjaga rahasia", "Sabar mendengarkan", "Membuatku merasa nyaman", "Memberi nasihat yang baik", "Tidak menghakimi"],
  Sosial: ["Seru dan menyenangkan", "Ramah ke semua teman", "Sering bermain bersama", "Mudah diajak bekerja sama", "Adil dan bisa memimpin"],
  Belajar: ["Pintar menjelaskan", "Rajin dan tekun", "Mau berbagi catatan atau ilmu", "Bertanggung jawab dalam tugas", "Membuatku semangat belajar"],
  Karier: ["Punya cita-cita yang jelas", "Tahu banyak informasi sekolah atau pekerjaan", "Mendukung bakat dan minatku", "Pantang menyerah", "Minatnya mirip denganku"],
};
export const OTHER_REASON = "Lainnya";

// Angket siap pakai.
export const SOCIO_VARIANTS = [
  { id: "lengkap", name: "Lengkap", maxPick: 3, reasons: true, desc: "Dua pertanyaan per bidang BK.", questions: ["p1", "p2", "s1", "s2", "b1", "b4", "k1", "k2"].map(byId) },
  { id: "simpel", name: "Simpel", maxPick: 3, reasons: true, desc: "Satu pertanyaan per bidang BK.", questions: ["p1", "s1", "b1", "k1"].map(byId) },
];

// Ringkasan satu baris untuk kartu angket.
export const socioSummary = (c) => `${c.questions.length} pertanyaan · pilih maksimal ${c.maxPick} teman${c.reasons ? " · dengan alasan" : ""}`;

// Bidang sebuah pertanyaan, juga untuk sesi lama yang memakai huruf kecil ("belajar").
export const areaOf = (q) => {
  const a = String(q.area || "").toLowerCase();
  return AREAS.find((x) => x.toLowerCase() === a) || "Sosial";
};
