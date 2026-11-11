// Laporan resmi Sosiometri (Word dan PDF), mengikuti susunan laporan asesmen lain:
// pendahuluan, cara membaca hasil, hasil per bidang BK (dengan sosiogram), hasil gabungan, rencana tindak lanjut, lampiran.
import { sociogramSVG } from "./sociogram.js";
import { AREAS } from "./socio-data.js";
import { docSign, dShort, dIso, tahunAjaran, safeName } from "./report-doc.js";
import { pct, dec2, CATS } from "./socio-calc.js";

const who = (r) => `${r.name} (No. ${r.no})`;
const L = (i) => String.fromCharCode(65 + i);
export const SG_CAPTION = "Tengah = paling banyak dipilih; kotak = laki-laki, lingkaran = perempuan; garis tebal tanpa panah = saling memilih; panah tebal = pilihan pertama, panah tipis = pilihan berikutnya; bertepi putus-putus = belum mengisi; berwarna jingga = paling banyak dipilih.";

export function socioDoc(st, user) {
  const { s, per, pos, combined, filled } = st, N = s.roster.length, max = s.config?.maxPick || 3;
  const when = `${s.createdAt ? dShort(s.createdAt) + " s.d. " : "s.d. "}${dShort(s.closesAt)}`;
  const hasNeg = per.some((p) => p.neg), reasons = !!s.config?.reasons;
  const row = (r, neg) => [String(r.no), r.name, r.g || "-", String(r.count), String(r.score), dec2(r.idx), r.cat];
  const head = (neg) => ["No", "Nama", "L/P", neg ? "Ditolak" : "Dipilih", "Skor", "Indeks", "Kategori"];
  const sections = [];

  sections.push({ h: "Pendahuluan", blocks: [
    { t: "p", text: `Angket sosiometri diisi oleh siswa ${s.className} pada ${when}. Untuk setiap pertanyaan, siswa memilih paling banyak ${max} teman, berurutan dari yang paling diinginkan${reasons ? ", lalu menyebutkan alasannya" : ""}. Ada ${per.length} pertanyaan, dikelompokkan menurut bidang layanan bimbingan dan konseling, dan ${filled.size} dari ${N} siswa mengisi.` },
    { t: "p", text: "Hasilnya memetakan hubungan sosial di kelas: siapa yang banyak dipilih teman, siapa yang belum dipilih, dan bagaimana siswa saling terhubung. Guru memakainya untuk mengenali siswa yang perlu didampingi, membentuk kelompok belajar, dan merencanakan layanan bimbingan klasikal maupun individual." },
    { t: "p", text: "Laporan ini dimulai dengan cara membaca angka-angkanya, lalu hasil setiap bidang, hasil gabungan, dan rencana tindak lanjut. Tabel lengkap untuk setiap pertanyaan ada di lampiran." },
  ] });

  sections.push({ h: "Cara membaca hasil", blocks: [
    { t: "p", text: "Untuk setiap pertanyaan, pilihan siswa dihitung menjadi empat angka per siswa: Dipilih, Skor, Indeks, dan Kategori. Angka-angka ini dipakai di seluruh laporan, jadi cara menghitungnya dijelaskan lebih dulu." },
    { t: "sub", text: "Dipilih" },
    { t: "p", text: "Berapa banyak teman yang memilih seorang siswa, tanpa memperhatikan urutan pilihan." },
    { t: "p", text: "Dᵢ = Σ xⱼᵢ  (j = 1 sampai N)", bold: true },
    { t: "p", text: "Keterangan: Dᵢ = jumlah teman yang memilih siswa i; xⱼᵢ = 1 jika siswa j memilih siswa i, 0 jika tidak; N = jumlah siswa di kelas.", note: true },
    { t: "p", text: "Contoh: tiga teman memilih Amanda (di urutan mana pun), maka Dipilih Amanda = 3." },
    { t: "sub", text: "Skor" },
    { t: "p", text: `Pilihan diberi bobot menurut urutannya: pilihan pertama bernilai 3, kedua 2, ketiga${max > 3 ? " dan seterusnya" : ""} 1. Siswa yang dipilih lebih awal oleh temannya mendapat skor lebih tinggi.` },
    { t: "p", text: "Sᵢ = 3P₁ᵢ + 2P₂ᵢ + P₃ᵢ", bold: true },
    { t: "p", text: `Keterangan: Sᵢ = skor siswa i; Pᵣᵢ = jumlah teman yang memilih siswa i pada urutan ke-r (r = 1 sampai ${Math.min(max, 3)}${max > 3 ? ", urutan berikutnya ikut bernilai 1" : ""}).`, note: true },
    { t: "p", text: "Contoh: Amanda dipilih dua teman di urutan pertama dan satu teman di urutan kedua, maka skornya 3 + 3 + 2 = 8." },
    { t: "sub", text: "Indeks" },
    { t: "p", text: "Indeks pemilihan: bagian dari teman yang memilih siswa itu, dari 0 (tidak ada) sampai 1 (semua)." },
    { t: "p", text: "Iᵢ = Dᵢ / Mᵢ", bold: true },
    { t: "p", text: "Keterangan: Iᵢ = indeks pemilihan siswa i; Mᵢ = jumlah teman yang sudah mengisi angket, tanpa siswa i sendiri.", note: true },
    { t: "p", text: "Bila semua siswa mengisi, M = N - 1 dan rumus ini sama dengan Indeks Status Pemilihan (ISP) = D / (N - 1). Pembaginya teman yang mengisi, bukan seluruh kelas, supaya siswa tidak tampak jarang dipilih hanya karena ada teman yang belum mengisi." },
    { t: "sub", text: "Kategori" },
    { t: "p", text: "Skor dibandingkan dengan teman sekelas lewat skor baku (z): berapa simpangan baku skor seorang siswa di atas atau di bawah rata-rata kelas." },
    { t: "p", text: "Zᵢ = (Sᵢ − S̄) / σS", bold: true },
    { t: "p", text: "Keterangan: S̄ = rata-rata skor di kelas; σS = simpangan baku skor di kelas.", note: true },
    { t: "table", head: ["Kategori", "Batas"], rows: [["Sangat diterima", "Z ≥ 1"], ["Diterima", "0,5 ≤ Z < 1"], ["Sedang", "−0,5 < Z < 0,5"], ["Kurang diterima", "Z ≤ −0,5"], ["Belum dipilih", "Dipilih = 0, berapa pun Z-nya"]] },
    { t: "p", text: "Pada hasil gabungan, Dipilih dan Skor dijumlahkan dari semua pertanyaan positif sebelum dihitung z-nya. Batas kategori adalah patokan Examus; literatur BK tidak punya tabel baku." },
    ...(hasNeg ? [{ t: "p", text: "Pertanyaan penolakan (\"paling tidak ingin ...\") dihitung dengan cara yang sama, tetapi kolomnya menjadi Ditolak. Kategorinya: banyak ditolak (indeks 0,25 atau lebih, atau paling banyak ditolak), ditolak beberapa teman, atau tidak ditolak. Pertanyaan ini tidak ikut dalam hasil gabungan." }] : []),
    { t: "sub", text: "Pola hubungan" },
    { t: "p", text: "Selain angka per siswa, sosiogram memperlihatkan hubungan antarsiswa. Setiap pertanyaan menyebut pola berikut bila ada:" },
    { t: "ol", items: [
      "Kesalingan: dua siswa saling memilih; hubungan paling kuat dalam sosiogram.",
      "Segitiga / kelompok erat: tiga siswa atau lebih yang semuanya saling memilih.",
      "Rantai: pilihan pertama yang tidak dibalas, bersambung dari satu siswa ke siswa berikutnya; hubungan yang belum dekat.",
      "Tingkat kesalingan: banyaknya pilihan yang dibalas oleh teman yang dipilih, dibagi semua pilihan. Makin tinggi, makin banyak hubungan dua arah di kelas.",
    ] },
  ] });

  // Hasil per bidang
  AREAS.forEach((area) => {
    const list = per.filter((p) => p.area === area);
    if (!list.length) return;
    const blocks = [];
    list.forEach((p) => {
      const { q, qi, an, neg, recip, tri, ch } = p, n = qi + 1, verb = neg ? "ditolak" : "dipilih";
      const t = Math.max(1, Math.min(5, Math.ceil(N / 2)));
      const top = [...an.rows].filter((r) => r.count > 0).sort((a, b) => b.score - a.score || b.count - a.count || a.no - b.no).slice(0, t);
      const least = [...an.rows].filter((r) => !top.includes(r)).sort((a, b) => a.score - b.score || a.count - b.count || a.no - b.no).slice(0, t);
      blocks.push({ t: "sub", text: `Pertanyaan ${n}: ${q.text}${neg ? " (penolakan)" : ""}` });
      blocks.push({ t: "img", svg: sociogramSVG(s.roster, an), cm: 12.5, caption: `Gambar ${n}. Sosiogram pertanyaan ${n}. ${SG_CAPTION}` });
      if (top.length) blocks.push({ t: "p", text: `Siswa yang paling banyak ${verb} pada pertanyaan ini, dari skor tertinggi:` }, { t: "table", head: head(neg), rows: top.map((r) => row(r, neg)) });
      else blocks.push({ t: "p", text: `Belum ada siswa yang ${verb} pada pertanyaan ini.` });
      if (least.length) blocks.push({ t: "p", text: neg ? "Siswa yang paling sedikit ditolak, dari skor terendah:" : "Siswa yang paling sedikit dipilih, dari skor terendah. Mereka yang perlu diperhatikan lebih dulu:" }, { t: "table", head: head(neg), rows: least.map((r) => row(r, neg)) });
      const pola = [
        ["Kesalingan", an.mutual.map(([a, b]) => `${who(an.byNo.get(b))} & ${who(an.byNo.get(a))}`)],
        ["Segitiga / kelompok erat", tri.map((x) => x.map((no) => who(an.byNo.get(no))).join(", "))],
        ["Rantai", ch.map((x) => x.map((no) => who(an.byNo.get(no))).join(" -> "))],
      ].filter(([, l]) => l.length);
      if (pola.length) blocks.push({ t: "p", text: "Hubungan antarsiswa yang terlihat pada sosiogram:" }, { t: "table", head: ["Pola", "Jumlah", "Siswa"], rows: pola.map(([k, l]) => [k, String(l.length), l.join("\n")]) });
      const rs = [...p.counts.entries(), ...(p.other ? [["Lainnya (ditulis sendiri)", p.other]] : [])].sort((a, b) => b[1] - a[1]);
      if (!neg && reasons && rs.some(([, v]) => v)) {
        blocks.push({ t: "p", text: "Alasan siswa memilih teman, dari semua pilihan. Satu pilihan boleh punya beberapa alasan." }, { t: "table", head: ["Alasan", "Jumlah pilihan (persentase pilihan)"], rows: rs.map(([k, v]) => [k, `${v} (${pct(v, p.totalPicks)}%)`]) });
        if (p.otherText.length) blocks.push({ t: "p", text: `Alasan yang ditulis sendiri: ${p.otherText.slice(0, 15).join("; ")}.`, note: true });
      }
      const desc = [];
      if (neg) {
        const most = an.maxCount > 0 ? an.rows.filter((r) => r.count === an.maxCount) : [];
        desc.push(most.length ? `${most.map(who).join(", ")} paling banyak ditolak pada pertanyaan ini. Cari tahu penyebabnya lewat pengamatan dan percakapan pribadi; jangan sampaikan di depan kelas.` : "Belum ada siswa yang ditolak pada pertanyaan ini.");
      } else {
        desc.push(`${recip}% pilihan dibalas oleh teman yang dipilih. Ada ${an.mutual.length} pasangan yang saling memilih${tri.length ? ` dan ${tri.length} kelompok tiga siswa yang semuanya saling memilih.` : ", tetapi belum ada kelompok tiga siswa atau lebih yang semuanya saling memilih."}${p.totalPicks ? (recip < 33 ? " Kurang dari sepertiga pilihan dibalas, jadi hubungan di kelas ini masih lebih banyak satu arah daripada dua arah." : recip >= 50 ? " Separuh atau lebih pilihan dibalas, jadi sudah banyak hubungan dua arah." : "") : ""}`);
        if (ch.length) desc.push(`Ada ${ch.length} rantai pilihan yang tidak dibalas. ${ch.map((x) => who(an.byNo.get(x[0]))).join(", ")} berada di ujung rantai: memilih teman yang tidak memilihnya kembali, dan belum dipilih pertama oleh siapa pun. Siswa di ujung rantai bisa didekatkan lewat tugas bersama teman yang dipilihnya pertama.`);
        desc.push(an.isolates.length ? `${an.isolates.map(who).join(", ").replace(/, ([^,]*)$/, " dan $1")} belum dipilih siapa pun pada pertanyaan ini; ajak bicara secara pribadi lebih dulu, sebelum menyusun kelompok.` : "Semua siswa dipilih oleh setidaknya satu teman.");
      }
      blocks.push({ t: "p", text: `Deskripsi pertanyaan ${n}:` }, { t: "ol", items: desc });
    });
    sections.push({ h: `Hasil Bidang ${area}`, blocks });
  });

  // Hasil gabungan dan rencana tindak lanjut
  if (pos.length) {
    const cnt = CATS.map((c) => [c, combined.filter((r) => r.cat === c).length]).filter(([, n]) => n);
    sections.push({ h: "Hasil gabungan", blocks: [
      { t: "p", text: `Hasil gabungan menjumlahkan Dipilih dan Skor setiap siswa dari ${pos.length} pertanyaan positif, lalu menentukan kategorinya dengan rumus yang sama seperti pada setiap pertanyaan. Gambaran ini lebih mantap daripada satu pertanyaan saja. Di kelas ini terdapat ${cnt.map(([c, n]) => `${n} siswa ${c.toLowerCase()}`).join(", ").replace(/, ([^,]*)$/, ", dan $1")}.` },
      { t: "table", head: ["No", "Nama", "L/P", "Dipilih", "Skor", "Kategori"], rows: combined.map((r) => [String(r.no), r.name + (r.filled ? "" : " (belum mengisi)"), r.g || "-", String(r.count), String(r.score), r.cat]) },
    ] });
    const plan = [];
    const grp = (c) => combined.filter((r) => r.cat === c);
    const add = (title, list, text) => list.length && plan.push({ t: "sub", text: title }, { t: "p", text: list.map(who).join(", ") + "." }, { t: "p", text });
    add("Belum dipilih", grp("Belum dipilih"), "Ajak bicara secara pribadi lebih dulu, lalu libatkan dalam kelompok kecil bersama teman yang ia pilih sendiri. Susun langkahnya dengan dokumen Rencana pendampingan.");
    add("Kurang diterima", grp("Kurang diterima"), "Pertimbangkan bimbingan kelompok untuk keterampilan bergaul, dan pasangkan dalam tugas dengan teman yang memilihnya.");
    add("Sangat diterima", grp("Sangat diterima"), "Bisa dilibatkan sebagai teman sebaya pendamping untuk siswa yang belum banyak dipilih.");
    const rej = combined.filter((r) => r.rejectedBy >= 2);
    add("Disebut pada pertanyaan penolakan", rej, "Amati interaksinya di kelas dan saat istirahat, lalu ajak bicara secara pribadi. Jangan bacakan hasil penolakan kepada siswa.");
    add("Belum mengisi", combined.filter((r) => !r.filled), "Peta akan lebih lengkap setelah mereka mengisi; pilihan mereka belum terhitung.");
    sections.push({ h: "Rencana tindak lanjut", blocks: plan.length ? plan : [{ t: "p", text: "Tidak ada catatan khusus dari hasil gabungan." }] });
  }

  sections.push({ h: "Penutup", blocks: [
    { t: "p", text: `Demikian laporan hasil sosiometri ini disusun sebagai bahan pertimbangan layanan bimbingan dan konseling di ${s.className}.` },
    { t: "p", italic: true, text: "Catatan: Hasil ini satu potret hubungan sosial pada waktu pengisian, bukan label. Gunakan bersama pengamatan dan wawancara, dan jangan tunjukkan hasil kepada siswa." },
  ] });

  const after = per.map((p) => ({
    h: `Lampiran ${p.qi + 1}. Tabulasi pertanyaan ${p.qi + 1} (bidang ${p.area.toLowerCase()}${p.neg ? ", penolakan" : ""})`,
    blocks: [
      { t: "p", text: `Pertanyaan: "${p.q.text}" Semua siswa, urut nomor absen; cara menghitung setiap kolom ada di bagian B.` },
      { t: "table", head: head(p.neg), rows: p.an.rows.map((r) => { const x = row(r, p.neg); x[1] = r.name + (r.filled ? "" : " (belum mengisi)"); return x; }) },
    ],
  }));

  return {
    file: safeName(`Sosiometri ${s.className} ${dIso(Date.now())}`),
    title: "LAPORAN HASIL ASESMEN SOSIOMETRI",
    meta: [["Kelas", s.className], ...(user.school ? [["Sekolah", user.school]] : []), ["Tahun ajaran", tahunAjaran(s.createdAt || Date.now())], ["Waktu pelaksanaan", when], ["Partisipasi", `${filled.size} dari ${N} siswa (${pct(filled.size, N)}%)`]],
    sections: sections.map((x, i) => ({ ...x, h: `${L(i)}. ${x.h}` })),
    after, sign: docSign(user),
    footer: "Rahasia: hanya untuk guru dan pihak sekolah yang berwenang",
  };
}
