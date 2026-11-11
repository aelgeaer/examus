// Perhitungan sosiometri bersama: laporan dasbor, laporan resmi, dan dokumen tindak lanjut memakai angka yang sama.
//   Dipilih (D)  = banyak teman yang memilih, tanpa melihat urutan.
//   Skor (S)     = 3 untuk pilihan pertama, 2 kedua, 1 ketiga dan seterusnya.
//   Indeks (I)   = D / M, M = teman yang sudah mengisi (tanpa murid itu sendiri). Bila semua mengisi, sama dengan ISP = D / (N - 1).
//   Kategori     = skor baku z = (S - rata-rata) / simpangan baku, dihitung di dalam kelas:
//                  z >= 1 sangat diterima, 0,5-1 diterima, -0,5-0,5 sedang, <= -0,5 kurang diterima; D = 0 belum dipilih.
//   Gabungan     = D dan S dijumlahkan dari semua pertanyaan positif, lalu z dihitung ulang.
// Batas kategori adalah patokan Examus; literatur BK tidak punya tabel baku.
import { analyze } from "./sociogram.js";
import { SOCIO_REASONS, OTHER_REASON, areaOf } from "./socio-data.js";
import { firstName } from "./util.js";

export const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
export const CATS = ["Sangat diterima", "Diterima", "Sedang", "Kurang diterima", "Belum dipilih"];
export const catRank = (c) => CATS.indexOf(c);
export const needsHelp = (c) => c === "Kurang diterima" || c === "Belum dipilih";
export const catOf = (count, z) => (count === 0 ? "Belum dipilih" : z >= 1 ? "Sangat diterima" : z >= 0.5 ? "Diterima" : z > -0.5 ? "Sedang" : "Kurang diterima");
export const dec2 = (x) => x.toFixed(2).replace(".", ",");

export function zScores(vals) {
  const n = vals.length || 1, mean = vals.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(vals.reduce((t, v) => t + (v - mean) ** 2, 0) / n);
  return vals.map((v) => (sd ? (v - mean) / sd : 0));
}

// Kelompok erat: tiga murid yang semuanya saling memilih.
export function triangles(an) {
  const out = [], nos = an.rows.map((r) => r.no);
  for (const [a, b] of an.mutual) for (const c of nos) if (c > b && an.isMutual(a, c) && an.isMutual(b, c)) out.push([a, b, c]);
  return out;
}

// Rantai pilihan pertama yang tidak dibalas: mulai dari murid yang tidak dipilih pertama oleh siapa pun.
export function chains(an) {
  const first = new Map(an.rows.filter((r) => r.picks.length).map((r) => [r.no, r.picks[0]]));
  const firstPicked = new Set(first.values());
  const out = [];
  for (const r of an.rows) {
    if (!first.has(r.no) || firstPicked.has(r.no)) continue;
    const path = [r.no]; let cur = r.no;
    while (first.has(cur)) {
      const nx = first.get(cur);
      if (path.includes(nx)) break;
      path.push(nx);
      if (an.isMutual(cur, nx)) break;
      cur = nx;
    }
    if (path.length >= 3) out.push(path);
  }
  return out;
}

const negCat = (r, an) => (r.count === 0 ? "Tidak ditolak" : r.idx >= 0.25 || r === an.star ? "Banyak ditolak" : "Ditolak beberapa teman");

export function socioStats(s, res) {
  const filled = new Set(res.map((r) => r.no));
  const qs = s.config?.questions || [];
  const per = qs.map((q, qi) => {
    // Jawaban dibaca dengan hati-hati: data yang bentuknya tidak wajar dianggap kosong, bukan merusak laporan.
    const picks = {}; res.forEach((r) => (picks[r.no] = Array.isArray(r.answers?.[q.id]) ? r.answers[q.id].filter((x) => Number.isInteger(x)) : []));
    const an = analyze(s.roster, picks, filled);
    an.rows.forEach((r) => { r.M = filled.size - (filled.has(r.no) ? 1 : 0); r.idx = r.M ? r.count / r.M : 0; });
    const z = zScores(an.rows.map((r) => r.score));
    an.rows.forEach((r, i) => { r.z = z[i]; r.cat = q.neg ? negCat(r, an) : catOf(r.count, r.z); });
    const totalPicks = an.rows.reduce((t, r) => t + r.picks.length, 0);
    const counts = new Map((SOCIO_REASONS[areaOf(q)] || []).map((t) => [t, 0]));
    let other = 0; const otherText = [];
    const objOf = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x : {});
    res.forEach((r) => Object.values(objOf(objOf(r.answers?.reasons)[q.id])).forEach((list) => (Array.isArray(list) ? list : []).forEach((t) => {
      if (typeof t !== "string") return;
      if (String(t).startsWith(OTHER_REASON)) { other++; const x = String(t).slice(OTHER_REASON.length + 2).trim(); if (x) otherText.push(x); }
      else counts.set(t, (counts.get(t) || 0) + 1);
    })));
    return { q, qi, area: areaOf(q), neg: !!q.neg, an, totalPicks, recip: pct(an.mutual.length * 2, totalPicks), tri: triangles(an), ch: chains(an), counts, other, otherText };
  });
  const pos = per.filter((p) => !p.neg), negs = per.filter((p) => p.neg);
  const combined = s.roster.map((m) => {
    let count = 0, score = 0; const by = new Set(), mutual = new Set(), rej = new Set(), pf = new Map();
    pos.forEach((p) => { const r = p.an.byNo.get(m.no); count += r.count; score += r.score; r.pickedBy.forEach((x) => by.add(x)); r.mutualWith.forEach((x) => mutual.add(x)); r.picks.forEach((x, i) => pf.set(x, (pf.get(x) || 0) + (3 - Math.min(i, 2)))); });
    negs.forEach((p) => p.an.byNo.get(m.no).pickedBy.forEach((x) => rej.add(x)));
    return { ...m, filled: filled.has(m.no), count, score, pickers: by.size, mutual: [...mutual], rejectedBy: rej.size, picks: [...pf.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map((x) => x[0]) };
  });
  const z = zScores(combined.map((r) => r.score));
  combined.forEach((r, i) => { r.z = z[i]; r.cat = pos.length ? catOf(r.count, r.z) : "-"; });
  const nameOf = (no) => s.roster.find((m) => m.no === no)?.name || `No. ${no}`;
  return {
    s, res, filled, per, pos, negs, combined, byNo: new Map(combined.map((r) => [r.no, r])),
    share: pct(filled.size, s.roster.length), nameOf, first: (no) => firstName(nameOf(no)),
    names: (nos) => nos.map((n) => firstName(nameOf(n))).join(", "),
  };
}

// Fakta singkat satu murid dari hasil gabungan, dipakai Rencana pendampingan dan Profil murid.
export function socioFacts(st, r) {
  const f = firstName(r.name), out = [];
  out.push(r.count === 0 ? `Belum dipilih: tidak dipilih teman pada ${st.pos.length} pertanyaan.` : `${r.cat}: dipilih ${r.count} kali oleh ${r.pickers} teman yang mengisi.`);
  out.push(r.filled ? (r.picks.length ? `${f} memilih: ${st.names(r.picks.slice(0, 3))}.` : `${f} tidak memilih siapa pun.`) : `${f} belum mengisi angket, jadi pilihannya belum diketahui.`);
  out.push(r.mutual.length ? `Saling memilih dengan: ${st.names(r.mutual)}.` : "Belum ada teman yang saling memilih dengannya.");
  if (r.rejectedBy) out.push(`Disebut oleh ${r.rejectedBy} teman pada pertanyaan penolakan.`);
  return out;
}
export const shareNote = (st) => (st.share < 80 ? `Catatan: Baru ${st.filled.size} dari ${st.s.roster.length} murid mengisi Sosiometri. Hasilnya lebih tepat setelah minimal 80% mengisi.` : "");
