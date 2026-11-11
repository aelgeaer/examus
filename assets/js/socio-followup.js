// Dokumen tindak lanjut dari Sosiometri: Kelompok belajar, Rencana pendampingan, Perubahan dari Sosiometri
// sebelumnya, dan Profil murid. Semuanya draf yang bisa diubah guru sebelum diunduh sebagai Word atau PDF.
import { esc, $, $$, toast, firstName } from "./util.js";
import { store } from "./store.js";
import { header } from "./pages-public.js";
import { socioStats, socioFacts, shareNote, needsHelp, catRank, CATS, pct } from "./socio-calc.js";
import { docSign, dShort, safeName, previewHtml, syncPreview, docxBlob, printDoc, saveBlob } from "./report-doc.js";
import { gayaProfile } from "./gaya.js";
import { VAK } from "./data.js";
import { minatProfile, RIASEC_LABEL, kkProfile, kkLevel, kkTotalLevel, kkLevelName, KK_AREAS, tkProfile } from "./instruments.js";

const L = (i) => String.fromCharCode(65 + i);
const META = (st, ket) => [["Kelas", st.s.className], ["Keterangan", ket]];

export const FOLLOWUPS = {
  kelompok: { title: "Kelompok belajar", desc: "Kelompok 3-6 murid. Dari Sosiometri: tiap murid bersama teman yang ia pilih, dan murid yang belum dipilih tidak dikumpulkan jadi satu. Dari Gaya Belajar: cara belajarnya bercampur." },
  pendampingan: { title: "Rencana pendampingan", desc: "Rencana 4 minggu untuk tiap murid yang belum dipilih atau kurang diterima: data, langkah berupa daftar centang, dan kolom catatan." },
  perubahan: { title: "Perubahan dari Sosiometri sebelumnya", desc: "Bandingkan dua Sosiometri terakhir kelas ini: siapa yang kini mulai dipilih teman, siapa yang masih atau baru perlu didampingi, dan langkah berikutnya.", note: "Butuh dua sesi Sosiometri yang sudah diisi di kelas ini untuk dibandingkan. Jalankan Sosiometri lagi di kelas ini, sebaiknya setelah satu semester, untuk melihat perubahannya." },
  profil: { title: "Profil murid", desc: "Satu halaman per murid yang menggabungkan semua asesmen kelas ini (posisi di kelas, cara belajar, minat, kekuatan dan kesulitan, tipe kepribadian) dan beberapa hal yang bisa dicoba guru minggu ini." },
};
export const ICONS = {
  kelompok: `<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="9" fill="#cfe6fb"/><circle cx="13" cy="14" r="3.2" fill="#0c2340"/><circle cx="21" cy="14" r="3.2" fill="#ffcf8f"/><circle cx="27" cy="25" r="3.2" fill="#0c2340"/><circle cx="17" cy="26" r="3.2" fill="#1565b8"/></svg>`,
  pendampingan: `<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="9" fill="#cfe6fb"/><rect x="9" y="10" width="6" height="6" rx="1.5" fill="none" stroke="#0c2340" stroke-width="2"/><path d="M10.5 13l1.6 1.6 2.6-3" stroke="#0c2340" stroke-width="1.8" fill="none"/><path d="M18 13h13M18 21h13M18 29h9" stroke="#0c2340" stroke-width="2.2" stroke-linecap="round"/><rect x="9" y="18" width="6" height="6" rx="1.5" fill="none" stroke="#0c2340" stroke-width="2"/><rect x="9" y="26" width="6" height="6" rx="1.5" fill="#ffcf8f"/></svg>`,
  perubahan: `<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="9" fill="#cfe6fb"/><circle cx="13" cy="27" r="4" fill="#fff" stroke="#0c2340" stroke-width="1.6"/><circle cx="27" cy="13" r="4" fill="#ffcf8f"/><circle cx="27" cy="13" r="1.6" fill="#0c2340"/><path d="M16 24l7-7" stroke="#0c2340" stroke-width="2" stroke-linecap="round"/><path d="M23 17v4M23 17h-4" stroke="#0c2340" stroke-width="2" stroke-linecap="round"/></svg>`,
  profil: `<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="9" fill="#cfe6fb"/><circle cx="20" cy="13" r="4.2" fill="#0c2340"/><path d="M11 30c1.5-5 5-7 9-7s7.5 2 9 7" fill="#fff"/><circle cx="16" cy="27" r="2" fill="#ffcf8f"/><circle cx="25" cy="28" r="2" fill="#0c2340"/></svg>`,
};

/* ---------------- Kelompok belajar ---------------- */
// Afinitas pasangan: pilihan pada pertanyaan positif (bidang Belajar dihitung dua kali), saling memilih lebih kuat,
// penolakan menjauhkan. Murid yang paling banyak dipilih disebar sebagai inti, murid yang belum dipilih ditaruh di
// kelompok berbeda bersama teman yang ia pilih, sisanya ditaruh di kelompok yang paling cocok.
export function makeGroups(st, { size = 4, mix = false, gaya = null } = {}) {
  const ros = st.s.roster, n = ros.length, k = Math.max(1, Math.round(n / size));
  const cap = Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0));
  const aff = new Map(), key = (a, b) => a + "-" + b;
  const add = (a, b, w) => aff.set(key(a, b), (aff.get(key(a, b)) || 0) + w);
  st.pos.forEach((p) => p.an.rows.forEach((r) => r.picks.forEach((b) => add(r.no, b, p.area === "Belajar" ? 2 : 1))));
  st.negs.forEach((p) => p.an.rows.forEach((r) => r.picks.forEach((b) => add(r.no, b, -6))));
  const pick = (a, b) => aff.get(key(a, b)) || 0, w = (a, b) => pick(a, b) + pick(b, a);
  const groups = Array.from({ length: k }, (_, i) => ({ name: `Kelompok ${i + 1}`, members: [] }));
  const isoCount = (g) => g.members.filter((m) => st.byNo.get(m).count === 0).length;
  const score = (x, g) => {
    let v = g.members.reduce((t, m) => t + w(x, m), 0);
    const g0 = st.byNo.get(x).g;
    if (mix && g0) { const same = g.members.filter((m) => st.byNo.get(m).g === g0).length; v += same > g.members.length - same ? -2 : 0.5; }
    if (gaya?.has(x)) { const same = g.members.filter((m) => gaya.get(m) === gaya.get(x)).length; v += same ? -0.8 * same : 0.3; }
    return v - 0.01 * g.members.length;
  };
  const place = (x, extra = () => 0) => {
    let best = null, bv = -Infinity;
    groups.forEach((g, i) => { if (g.members.length >= cap[i]) return; const v = score(x, g) + extra(g); if (v > bv) { bv = v; best = g; } });
    (best || groups.find((g, i) => g.members.length < cap[i]) || groups[0]).members.push(x);
  };
  const byCount = [...st.combined].sort((a, b) => b.count - a.count || b.score - a.score || a.no - b.no);
  const stars = byCount.filter((r) => r.count > 0).slice(0, k);
  stars.forEach((r, i) => groups[i].members.push(r.no));
  const used = new Set(stars.map((r) => r.no));
  byCount.filter((r) => r.count === 0 && !used.has(r.no)).forEach((r) => { used.add(r.no); place(r.no, (g) => g.members.reduce((t, m) => t + 2 * pick(r.no, m), 0) - 3 * isoCount(g)); });
  byCount.filter((r) => !used.has(r.no)).sort((a, b) => a.count - b.count || a.no - b.no).forEach((r) => { used.add(r.no); place(r.no); });
  return groups.map((g) => ({ name: g.name, members: g.members.map((no) => ({ no, name: st.nameOf(no), note: memberNote(st, no, g.members, stars) })) }));
}
function memberNote(st, no, members, stars) {
  const r = st.byNo.get(no), chosen = r.picks.filter((x) => members.includes(x) && x !== no);
  const out = [];
  if (r.count === 0) out.push("belum dipilih");
  else if (stars.some((x) => x.no === no)) out.push(`dipilih ${r.count} kali`);
  if (chosen.length) out.push(`bersama ${st.names(chosen)} yang ia pilih`);
  if (!r.filled) out.push("belum mengisi");
  return out.join("; ");
}
export const groupNotes = (st, groups) => groups.forEach((g) => g.members.forEach((m) => (m.note = memberNote(st, m.no, g.members.map((x) => x.no), []))));

export function kelompokDoc(st, user, groups, opt) {
  const n = st.s.roster.length, gaya = !!opt.gaya, src = gaya ? "Sosiometri dan Gaya Belajar" : "Sosiometri";
  const rules = [
    "Murid yang saling memilih ditaruh bersama; pilihan untuk belajar kelompok dihitung dua kali.",
    "Murid yang belum dipilih teman ditaruh di kelompok berbeda, masing-masing bersama teman yang ia pilih.",
    "Murid yang paling banyak dipilih disebar ke kelompok yang berbeda.",
    ...(st.negs.length ? ["Murid yang saling menyebut pada pertanyaan penolakan dipisahkan bila memungkinkan."] : []),
    ...(gaya ? ["Cara belajar (visual, auditori, kinestetik) di tiap kelompok dibuat bercampur."] : []),
    ...(opt.mix ? ["Laki-laki dan perempuan dicampur di tiap kelompok."] : []),
  ];
  return {
    file: safeName(`Kelompok belajar ${st.s.className}`), footer: "",
    parts: [{
      title: `KELOMPOK BELAJAR ${st.s.className.toUpperCase()}`, meta: META(st, `${groups.length} kelompok · dari ${src}`),
      lead: [
        { t: "p", text: `${groups.length} kelompok untuk ${n} murid, disusun dari ${src}. Geser nama bila Anda lebih mengenal kelasnya.` },
        { t: "ol", items: rules },
        ...(shareNote(st) ? [{ t: "p", italic: true, text: shareNote(st) }] : []),
        ...(gaya ? [] : [{ t: "p", text: "Jalankan Gaya Belajar di kelas ini supaya tiap kelompok juga punya campuran cara belajar." }]),
        { t: "slot", id: "groups" },
      ],
      sections: [{ h: "A. Cara memakai", blocks: [
        { t: "ol", items: ["Umumkan kelompok tanpa alasan penempatannya.", "Beri peran bergiliran di tiap kelompok (pemandu, pencatat, penyaji) supaya semua ikut aktif.", "Amati dua pertemuan pertama. Pindahkan murid yang tampak tidak nyaman."] },
        { t: "p", italic: true, text: "Catatan: Catatan di bawah nama hanya untuk guru: jangan bacakan alasan penempatan, dan jangan beri tahu murid siapa memilih siapa. Kelompok ini bukan pengelompokan menurut kemampuan atau gaya belajar." },
      ] }],
      sign: docSign(user),
    }],
  };
}
// Untuk diunduh, slot kelompok diganti tabel.
const groupsTable = (groups) => ({ t: "table", head: ["Kelompok", "Anggota"], rows: groups.map((g) => [g.name, g.members.map((m) => `${m.no}. ${m.name}${m.note ? ` (${m.note})` : ""}`).join("\n") || "-"]) });
const fillSlots = (m, groups) => ({ ...m, parts: m.parts.map((p) => ({ ...p, lead: p.lead.map((b) => (b.t === "slot" ? groupsTable(groups) : b)) })) });

/* ---------------- Rencana pendampingan ---------------- */
export function pendampinganDoc(st, user) {
  const targets = st.combined.filter((r) => needsHelp(r.cat)).sort((a, b) => catRank(b.cat) - catRank(a.cat) || a.score - b.score || a.no - b.no);
  const sections = targets.map((r, i) => {
    const f = firstName(r.name), friendNo = r.mutual[0] ?? r.picks[0], friend = friendNo != null ? st.first(friendNo) : "";
    return { h: `${L(i)}. ${r.no}. ${r.name}`, blocks: [
      { t: "ol", items: socioFacts(st, r) },
      { t: "checks", items: [
        `Minggu 1: Ajak ${f} bicara secara pribadi. Tanyakan bagaimana rasanya di kelas dan dengan siapa ia nyaman, tanpa menyebut hasil angket.`,
        friend ? `Minggu 1–4: Pasangkan dalam tugas dengan ${friend}, teman yang ${f} pilih sendiri.` : "Minggu 1–4: Pasangkan dalam tugas dengan teman yang hangat dan mudah bergaul.",
        `Minggu 2–3: Libatkan dalam kelompok kecil (3–4 murid) bersama teman yang ${friend ? "ia pilih" : "hangat dan mau menerima"}.`,
        "Minggu 2–4: Pertimbangkan bimbingan kelompok tentang keterampilan bergaul.",
        "Minggu 2–4: Amati saat istirahat dan kerja kelompok: dengan siapa ia mengobrol, dan apakah ada yang mengejek atau menjauhinya.",
        `Minggu 4: Ajak ${f} bicara lagi. Apa yang berubah? Catat di bawah.`,
      ].map((text) => ({ done: false, text })) },
      { t: "table", head: ["Minggu", "Yang diamati atau dibicarakan"], rows: [["1", ""], ["2", ""], ["3", ""], ["4", ""]] },
    ] };
  });
  sections.push({ h: `${L(sections.length)}. Setelah satu semester`, blocks: [
    { t: "p", text: "Jalankan Sosiometri lagi di kelas ini dengan angket yang sama untuk melihat apakah posisi mereka berubah (dokumen Perubahan dari Sosiometri sebelumnya). Kalau ada tanda perundungan, masalah di rumah, atau murid tampak sangat tertekan, jangan menunggu: tangani sesuai prosedur sekolah dan rujuk bila perlu." },
    { t: "p", italic: true, text: "Catatan: Dokumen ini rahasia, hanya untuk guru BK dan wali kelas. Jangan tunjukkan kepada murid atau orang tua siapa memilih siapa, dan jangan menyebut murid \"terisolir\" di depan siapa pun." },
  ] });
  return {
    file: safeName(`Rencana pendampingan ${st.s.className}`), footer: "",
    parts: [{
      title: `RENCANA PENDAMPINGAN ${st.s.className.toUpperCase()}`, meta: META(st, `${targets.length} murid · dari Sosiometri`),
      lead: [
        ...(shareNote(st) ? [{ t: "p", italic: true, text: shareNote(st) }] : []),
        { t: "p", text: targets.length ? "\"Belum dipilih\" dan \"kurang diterima\" adalah posisi murid di kelas ini saat angket diisi, bukan sifat anak. Posisi ini bisa berubah." : "Pada hasil gabungan Sosiometri ini tidak ada murid yang belum dipilih atau kurang diterima. Tetap amati murid yang baru pindah atau yang belum mengisi." },
      ],
      sections, sign: docSign(user),
    }],
  };
}

/* ---------------- Perubahan dari Sosiometri sebelumnya ---------------- */
export function perubahanDoc(prev, cur, user) {
  const norm = (x) => String(x).trim().toLowerCase();
  const find = (r) => prev.combined.find((x) => norm(x.name) === norm(r.name)) || prev.combined.find((x) => x.no === r.no && norm(firstName(x.name)) === norm(firstName(r.name)));
  const rows = cur.combined.map((r) => ({ r, p: find(r) }));
  const was = (x) => x.p && needsHelp(x.p.cat), now = (x) => needsHelp(x.r.cat);
  const line = (x) => `${x.r.name}: ${x.p ? `${x.p.cat} → ${x.r.cat} (dipilih ${x.p.count} → ${x.r.count} kali)` : `${x.r.cat} (belum ada di sesi sebelumnya)`}.`;
  const better = rows.filter((x) => was(x) && !now(x)), still = rows.filter((x) => was(x) && now(x)), worse = rows.filter((x) => !was(x) && now(x));
  const sameQ = JSON.stringify((prev.s.config?.questions || []).map((q) => q.id).sort()) === JSON.stringify((cur.s.config?.questions || []).map((q) => q.id).sort());
  const list = (l, empty) => (l.length ? { t: "ol", items: l.map(line) } : { t: "p", text: empty });
  const sections = [
    { h: "Ringkasan", blocks: [
      { t: "p", text: `Kategori gabungan kedua sesi, dihitung dengan cara yang sama (Dipilih dan Skor dari semua pertanyaan positif, lalu skor baku z di dalam kelas).` },
      { t: "table", head: ["Kategori", "Sebelumnya", "Sekarang"], rows: CATS.map((c) => [c, String(prev.combined.filter((r) => r.cat === c).length), String(cur.combined.filter((r) => r.cat === c).length)]) },
    ] },
    { h: "Mulai dipilih teman", blocks: [list(better, "Belum ada murid yang sebelumnya belum dipilih atau kurang diterima dan kini sudah lebih diterima.")] },
    { h: "Masih perlu didampingi", blocks: [list(still, "Tidak ada.")] },
    { h: "Baru perlu didampingi", blocks: [list(worse, "Tidak ada.")] },
    { h: "Semua murid", blocks: [{ t: "table", head: ["No", "Nama", "Sebelumnya", "Sekarang"], rows: rows.map((x) => [String(x.r.no), x.r.name, x.p ? `${x.p.cat} (${x.p.count})` : "-", `${x.r.cat} (${x.r.count})`]) }, { t: "p", note: true, text: "Angka dalam kurung = Dipilih pada hasil gabungan." }] },
    { h: "Langkah berikutnya", blocks: [{ t: "checks", items: [
      ...(better.length ? [`Pertahankan yang sudah berjalan untuk ${better.map((x) => firstName(x.r.name)).join(", ")}; beri tahu kemajuannya tanpa menyebut angket.`] : []),
      ...(still.length ? [`Lanjutkan Rencana pendampingan untuk ${still.map((x) => firstName(x.r.name)).join(", ")} dan pertimbangkan konseling individual.`] : []),
      ...(worse.length ? [`Ajak ${worse.map((x) => firstName(x.r.name)).join(", ")} bicara secara pribadi minggu ini; cari tahu apa yang berubah (tempat duduk, konflik dengan teman, masalah di rumah).`] : []),
      "Jalankan Sosiometri lagi satu semester berikutnya dengan angket yang sama.",
    ].map((text) => ({ done: false, text })) }] },
  ].map((x, i) => ({ ...x, h: `${L(i)}. ${x.h}` }));
  return {
    file: safeName(`Perubahan Sosiometri ${cur.s.className}`), footer: "",
    parts: [{
      title: `PERUBAHAN SOSIOMETRI ${cur.s.className.toUpperCase()}`,
      meta: [["Kelas", cur.s.className], ["Dibandingkan", `${dShort(prev.s.createdAt)} (sebelumnya) dan ${dShort(cur.s.createdAt)} (sekarang)`], ["Partisipasi", `${prev.filled.size} dari ${prev.s.roster.length} siswa, lalu ${cur.filled.size} dari ${cur.s.roster.length} siswa`]],
      lead: [
        { t: "p", text: "Dokumen ini membandingkan posisi tiap murid di kelas pada dua Sosiometri. Perubahan kategori bisa karena hubungan yang memang berubah, tetapi juga karena siapa yang mengisi; baca bersama pengamatan Anda." },
        ...(sameQ ? [] : [{ t: "p", italic: true, text: "Catatan: Pertanyaan kedua sesi tidak sama persis, jadi bandingkan dengan hati-hati." }]),
        ...(cur.share < 80 || prev.share < 80 ? [{ t: "p", italic: true, text: "Catatan: Salah satu sesi diisi kurang dari 80% murid. Hasil perbandingan lebih tepat bila keduanya diisi hampir semua murid." }] : []),
      ],
      sections: [...sections.slice(0, -1), { ...sections[sections.length - 1], blocks: [...sections[sections.length - 1].blocks, { t: "p", italic: true, text: "Catatan: Dokumen ini rahasia, hanya untuk guru BK dan wali kelas. Jangan tunjukkan kepada murid atau orang tua siapa memilih siapa." }] }],
      sign: docSign(user),
    }],
  };
}

/* ---------------- Profil murid ---------------- */
const TK_NAME = { E: "Ekstrovert", I: "Introvert", S: "Sensing", N: "Intuitif", T: "Thinking", F: "Feeling", J: "Judging", P: "Perceiving" };
const GAYA_TIP = { V: "tunjukkan gambar, bagan, atau contoh tertulis saat menjelaskan kepadanya", A: "jelaskan secara lisan dan beri kesempatan ia menjelaskan ulang dengan kata-katanya sendiri", K: "beri kesempatan mencoba langsung atau bergerak saat belajar" };
const OTHER = [
  ["gaya-belajar", "Gaya Belajar", "cara belajar yang paling nyaman baginya"],
  ["minat-karier", "Minat Karier", "kegiatan yang paling ia minati"],
  ["kekuatan", "Kekuatan & Kesulitan", "kekuatan dan hal yang sedang terasa berat baginya"],
  ["kepribadian", "Tipe Kepribadian", "apa yang terasa paling nyaman baginya, misalnya sumber energinya"],
];
export const PROFILE_TYPES = OTHER.map((x) => x[0]);

// others[type] = { s, byNo: Map(no -> answers) } untuk sesi terbaru tiap asesmen di kelas ini.
export function profilPart(st, r, others, user) {
  const f = firstName(r.name), secs = [], tries = [], missing = [], used = ["Sosiometri"];
  const friendNo = r.mutual[0] ?? r.picks[0];
  if (friendNo != null) tries.push(`Pasangkan ${f} dengan ${st.first(friendNo)}, teman yang ${f} pilih sendiri, dalam tugas kecil yang dikerjakan berdua.`);
  else if (needsHelp(r.cat)) tries.push(`Dekati ${f} lebih dulu: sapa secara pribadi dan libatkan dalam kelompok kecil bersama teman yang hangat.`);
  secs.push({ h: "Posisi di kelas (Sosiometri)", blocks: [...(shareNote(st) ? [{ t: "p", italic: true, text: shareNote(st) }] : []), { t: "ol", items: socioFacts(st, r) }] });
  for (const [type, name, why] of OTHER) {
    const o = others[type];
    if (!o) { missing.push(`${name} belum dijalankan di kelas ini. Jalankan untuk melengkapi profil ini dengan ${why}.`); continue; }
    const a = o.byNo.get(r.no);
    if (!a) { missing.push(`${name} sudah dijalankan di kelas ini, tetapi ${f} belum mengisinya.`); continue; }
    used.push(name);
    if (type === "gaya-belajar") {
      const p = gayaProfile(a);
      secs.push({ h: "Cara belajar (Gaya Belajar)", blocks: [{ t: "ol", items: [`Paling nyaman belajar lewat: ${p.title.toLowerCase()} (visual ${p.pct.V}%, auditori ${p.pct.A}%, kinestetik ${p.pct.K}%).`, p.even ? "Ketiga cara belajar hampir sama kuat; variasikan cara menjelaskan." : `Saat menjelaskan materi baru, ${GAYA_TIP[p.top[0]]}.`] }] });
      if (!p.even) tries.push(`Saat menjelaskan materi baru kepada ${f}, ${GAYA_TIP[p.top[0]]}.`);
    } else if (type === "minat-karier") {
      const p = minatProfile(a, o.s.config || {});
      const items = p.code ? [`Kode minat: ${p.code}${p.provisional ? "*" : ""} (${p.order.slice(0, 3).map((k) => RIASEC_LABEL[k]).join(", ")}).`] : [`Belum ada kode minat: ${p.note}.`];
      if (p.provisional) items.push(`Kode sementara karena ${p.note}; pakai sebagai bahan wawancara, bukan kesimpulan.`);
      secs.push({ h: "Minat (Minat Karier)", blocks: [{ t: "ol", items }] });
      if (p.code) tries.push(`Ajak ${f} mengobrol tentang kegiatan bidang ${RIASEC_LABEL[p.order[0]].toLowerCase()} yang ia sukai, dan sebutkan satu contoh pekerjaan di bidang itu.`);
    } else if (type === "kekuatan") {
      const p = kkProfile(a), DIFF = ["emosi", "perilaku", "fokus", "teman"];
      const flag = DIFF.filter((k) => kkLevel(p.s[k], k) >= 1);
      const items = [flag.length ? `Perlu diperhatikan: ${flag.map((k) => `${KK_AREAS[k].toLowerCase()} (${kkLevelName(kkLevel(p.s[k], k), k).toLowerCase()})`).join(", ")}.` : "Keempat area kesulitan dalam batas wajar.", `Total kesulitan ${p.total} dari 40 (${kkLevelName(kkTotalLevel(p.total)).toLowerCase()}).`, kkLevel(p.s.peduli, "peduli") === 0 ? "Kepedulian kepada teman (prososial) menjadi kekuatannya." : `Kepedulian kepada teman: ${kkLevelName(kkLevel(p.s.peduli, "peduli"), "peduli").toLowerCase()}.`];
      secs.push({ h: "Kekuatan dan kesulitan", blocks: [{ t: "ol", items }] });
      if (flag.length) tries.push(`Ajak ${f} bicara secara pribadi dan tanyakan kabarnya, terutama soal ${flag.map((k) => KK_AREAS[k].toLowerCase()).join(" dan ")}, tanpa menyebut skor.`);
      else if (kkLevel(p.s.peduli, "peduli") === 0) tries.push(`Beri ${f} peran membantu teman, misalnya teman sebaya pendamping, karena kepeduliannya tinggi.`);
    } else if (type === "kepribadian") {
      const p = tkProfile(a);
      const items = [`Tipe ${p.type}: ${p.axes.map((x) => `${TK_NAME[x.win]} (${x.strength})`).join(", ")}.`];
      if (p.flexible) items.push("Preferensinya belum terlihat jelas (tiga pasangan atau lebih tipis); bisa berarti luwes atau masih mengenal dirinya.");
      secs.push({ h: "Tipe kepribadian", blocks: [{ t: "ol", items }] });
      const ei = p.axes.find((x) => x.d === "EI");
      if (ei && ei.strength !== "tipis") tries.push(ei.win === "I" ? `Beri ${f} waktu berpikir sebelum diminta menjawab di depan kelas.` : `Beri ${f} kesempatan berdiskusi atau menyampaikan ide secara lisan.`);
    }
  }
  secs.push({ h: "Yang bisa dicoba guru minggu ini", blocks: [
    ...(tries.length ? [{ t: "checks", items: tries.map((text) => ({ done: false, text })) }] : [{ t: "p", text: "Sapa secara pribadi dan amati dengan siapa ia nyaman bekerja." }]),
    ...missing.map((text) => ({ t: "p", text })),
    { t: "p", italic: true, text: "Catatan: Profil ini rahasia, hanya untuk guru BK dan wali kelas: isinya bisa memuat pilihan teman dari Sosiometri. Jangan tunjukkan kepada murid atau orang tua, dan jangan menyebut posisi di kelas, gaya belajar, kode minat, atau tipe kepribadian sebagai sifat anak. Semua hasil menggambarkan kecenderungan saat angket diisi, bukan kemampuan atau bakat, dan bisa berubah." },
  ] });
  return {
    title: `PROFIL ${r.name.toUpperCase()}`, meta: META(st, `${st.s.className} · dari ${used.join(", ")}`),
    lead: [{ t: "p", text: `Ringkasan ${used.join(", ")} untuk ${f} dalam satu halaman. Bacalah bersama apa yang Anda lihat sendiri di kelas: angka di sini adalah titik awal percakapan, bukan kesimpulan.` }],
    sections: secs.map((x, i) => ({ ...x, h: `${L(i)}. ${x.h}` })), sign: docSign(user),
  };
}

/* ---------------- Halaman ---------------- */
async function latestOf(s, types) {
  const all = await store.listSessions();
  const mine = all.filter((x) => x.classId === s.classId && x.id !== s.id);
  const out = {};
  for (const t of types) {
    const x = mine.find((y) => y.type === t && y.filledCount > 0);
    if (x) out[t] = { s: x, res: await store.listResponses(x.id) };
  }
  return { all: mine, out };
}

const downloads = (id = "") => `<div class="rowflex no-print" style="margin-top:1.4rem"><button class="btn primary sm" data-dl="docx${id}">Unduh Word</button><button class="btn sm" data-dl="pdf${id}">Unduh PDF</button></div>
  <p class="muted small" style="margin-top:.5rem;max-width:34rem">Laporan resmi dengan tanda tangan. Untuk PDF, pilih "Simpan sebagai PDF" di dialog cetak.</p>`;

export async function followup({ user, params }) {
  const kind = params.kind, info = FOLLOWUPS[kind];
  const s = await store.getSession(params.id);
  const fail = (t, p) => ({ html: `${header(user, "dasbor")}<main class="page"><div class="narrow"><a class="back" href="#/sesi/${params.id}/hasil">← Kembali ke laporan</a><h1 class="page-title">${esc(t)}</h1><p class="page-sub">${p}</p></div></main>` });
  if (!s || !info || s.type !== "sosiometri") return fail("Dokumen tidak ditemukan", "Dokumen tindak lanjut ini dibuat dari laporan Sosiometri.");
  const res = await store.listResponses(s.id);
  if (!res.length) return fail(info.title, "Belum ada murid yang mengisi Sosiometri ini.");
  const st = socioStats(s, res);
  if (!st.pos.length) return fail(info.title, "Angket ini hanya berisi pertanyaan penolakan, jadi dokumen ini belum bisa disusun.");
  const top = `${header(user, "dasbor")}<main class="page"><div class="narrow">
    <a class="back no-print" href="#/sesi/${s.id}/hasil">← Kembali ke laporan</a>
    <div class="fu-ico" style="margin-top:1.4rem">${ICONS[kind]}</div>
    <p class="eyebrow" style="color:var(--blue)">Tindak lanjut · ${esc(s.className)}</p>
    <h1 class="page-title" style="margin-top:.2rem">${esc(info.title)}</h1>
    <p class="page-sub">${esc(info.desc)}</p>`;
  const end = `</div></main>`;
  const run = (fn) => async (e) => { const b = e.currentTarget; b.disabled = true; try { await fn(); } catch (ex) { console.error(ex); toast("Dokumen belum bisa dibuat: " + ex.message); } b.disabled = false; };
  const wire = (root, getModel, id = "") => {
    $(`[data-dl="docx${id}"]`, root).addEventListener("click", run(async () => { const m = getModel(); saveBlob(m.file + ".docx", await docxBlob(m)); }));
    $(`[data-dl="pdf${id}"]`, root).addEventListener("click", run(async () => printDoc(getModel())));
  };

  if (kind === "kelompok") {
    const { out } = await latestOf(s, ["gaya-belajar"]);
    const g = out["gaya-belajar"], gaya = g ? new Map(g.res.map((r) => [r.no, gayaProfile(r.answers).group])) : null;
    return {
      title: info.title,
      html: `${top}
        <div class="card soft fu-set no-print">
          <p class="flabel" id="fu-size-l">Murid per kelompok</p>
          <div class="seg" role="radiogroup" aria-labelledby="fu-size-l">${[3, 4, 5, 6].map((n) => `<label><input type="radio" name="size" value="${n}"${n === 4 ? " checked" : ""}><span>${n}</span></label>`).join("")}</div>
          <label class="check" style="background:none;padding:.9rem 0 0"><input type="checkbox" id="fu-mix"><span>Campur laki-laki dan perempuan</span></label>
          <p class="muted small" style="margin-top:.6rem">Mengubah pilihan menyusun ulang dokumen dan membuang perubahan yang belum diunduh.</p>
        </div>
        <p class="muted small no-print" style="margin-top:1.4rem">Ini draf. Ketuk teks untuk mengubahnya, pindahkan murid lewat "Pindah ke...", lalu unduh. Perubahan hilang bila halaman ditutup.</p>
        <div id="fu-doc"></div>${downloads()}${end}`,
      mount(root) {
        let opt, groups, model;
        const box = $("#fu-doc", root);
        const slot = () => `<div class="fu-groups">${groups.map((gr, gi) => `<div class="fu-grp"><p class="gh">${esc(gr.name)}</p><ul>${gr.members.map((m) => `<li><span class="no">${m.no}</span><span class="nm">${esc(m.name)}${m.note ? `<small>${esc(m.note)}</small>` : ""}</span>
          <select data-no="${m.no}" data-g="${gi}" aria-label="Pindahkan ${esc(m.name)}"><option value="">Pindah ke...</option>${groups.map((x, xi) => (xi === gi ? "" : `<option value="${xi}">${esc(x.name)}</option>`)).join("")}</select></li>`).join("")}</ul><p class="muted small">${gr.members.length} murid</p></div>`).join("")}</div>`;
        const draw = () => {
          box.innerHTML = previewHtml(model, slot);
          $$("select[data-no]", box).forEach((sel) => sel.addEventListener("change", () => {
            if (sel.value === "") return;
            syncPreview(model, box);
            const from = groups[Number(sel.dataset.g)], to = groups[Number(sel.value)], i = from.members.findIndex((m) => m.no === Number(sel.dataset.no));
            to.members.push(...from.members.splice(i, 1)); groupNotes(st, groups); draw();
          }));
        };
        const build = () => {
          opt = { size: Number($('input[name="size"]:checked', root).value), mix: $("#fu-mix", root).checked, gaya };
          groups = makeGroups(st, opt); model = kelompokDoc(st, user, groups, opt); draw();
        };
        $$('input[name="size"]', root).forEach((x) => x.addEventListener("change", build));
        $("#fu-mix", root).addEventListener("change", build);
        build();
        wire(root, () => fillSlots(syncPreview(model, box), groups));
      },
    };
  }

  if (kind === "pendampingan") {
    const model = pendampinganDoc(st, user);
    return {
      title: info.title,
      html: `${top}<p class="muted small no-print" style="margin-top:1.4rem">Ini draf. Ketuk teks untuk mengubahnya, centang langkah yang sudah dikerjakan, lalu unduh. Perubahan hilang bila halaman ditutup.</p>
        <div id="fu-doc">${previewHtml(model)}</div>${downloads()}${end}`,
      mount(root) { wire(root, () => syncPreview(model, $("#fu-doc", root))); },
    };
  }

  if (kind === "perubahan") {
    const { all } = await latestOf(s, []);
    const prevS = all.filter((x) => x.type === "sosiometri" && x.filledCount > 0 && new Date(x.createdAt) < new Date(s.createdAt))[0];
    if (!prevS) return { title: info.title, html: `${top}<div class="notice" style="margin-top:1.4rem">${esc(info.note)}</div>
      <p style="margin-top:1.2rem"><a class="btn primary" href="#/mulai/sosiometri${s.classId ? "?kelas=" + s.classId : ""}">Jalankan Sosiometri lagi</a></p>${end}` };
    const prev = socioStats(prevS, await store.listResponses(prevS.id));
    const model = perubahanDoc(prev, st, user);
    return {
      title: info.title,
      html: `${top}<p class="muted small no-print" style="margin-top:1.4rem">Dibandingkan dengan Sosiometri ${esc(dShort(prevS.createdAt))}. Ini draf. Ketuk teks untuk mengubahnya, lalu unduh.</p>
        <div id="fu-doc">${previewHtml(model)}</div>${downloads()}${end}`,
      mount(root) { wire(root, () => syncPreview(model, $("#fu-doc", root))); },
    };
  }

  // Profil murid: satu dokumen per murid yang mengisi Sosiometri.
  const { out } = await latestOf(s, PROFILE_TYPES);
  const others = Object.fromEntries(Object.entries(out).map(([t, o]) => [t, { s: o.s, byNo: new Map(o.res.map((r) => [r.no, r.answers || {}])) }]));
  const kids = st.combined.filter((r) => r.filled);
  const models = kids.map((r) => ({ file: safeName(`Profil ${r.name} ${s.className}`), footer: "", parts: [profilPart(st, r, others, user)] }));
  return {
    title: info.title,
    html: `${top}<p style="margin-top:1.4rem">${kids.length} dokumen, satu per murid yang mengisi Sosiometri. Buka untuk memeriksa atau mengubahnya, lalu unduh satu per satu atau semuanya sekaligus.</p>
      <div class="fu-list">${kids.map((r, i) => `<details class="fu-item"><summary><span>Profil ${esc(r.name)}</span><span class="muted small">${esc(r.cat)}</span></summary>
        <div class="fu-doc" data-i="${i}">${previewHtml(models[i])}</div>${downloads("-" + i)}</details>`).join("")}</div>
      <div class="card soft" style="margin-top:1.6rem"><h2 style="font-size:1.25rem">Cetak semuanya</h2>
        <p style="margin-top:.4rem">Satu file berisi ${kids.length} dokumen, masing-masing mulai di halaman baru dengan tanda tangan.</p>
        <div class="rowflex" style="margin-top:1rem"><button class="btn primary sm" data-dl="docx-all">Unduh semua (Word)</button><button class="btn sm" data-dl="pdf-all">Unduh semua (PDF)</button></div></div>${end}`,
    mount(root) {
      const sync = (i) => syncPreview(models[i], $(`.fu-doc[data-i="${i}"]`, root));
      kids.forEach((_, i) => wire(root, () => sync(i), "-" + i));
      wire(root, () => ({ file: safeName(`Profil murid ${s.className}`), footer: "", parts: kids.map((_, i) => sync(i).parts[0]) }), "-all");
    },
  };
}
