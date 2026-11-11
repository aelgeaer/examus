// Laporan guru untuk asesmen skala: minat karier, kekuatan & kesulitan, suasana hati,
// tipe kepribadian, AKPD, dan deteksi perundungan.
import { esc } from "./util.js";
import { RIASEC, MINAT_ITEMS } from "./data.js";
import {
  RIASEC_EX, minatProfile, KK_AREAS, KK_ITEMS, kkProfile, kkBand, kkTotalBand, PHQ_ITEMS, phqItems, phqProfile,
  TK_DIMS, TK_LETTER, tkProfile, AKPD_BIDANG, akpdItems, akpdProfile, PR_ASPEK, PR_ITEMS, prProfile,
} from "./instruments.js";

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const tbl = (head, rows) => `<div class="tblwrap"><table class="tbl"><thead><tr>${head.map((h) => `<th${h.num ? ' class="num"' : ""}>${esc(h.t ?? h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td${head[i]?.num ? ' class="num"' : ""}${head[i]?.wrap ? ' class="wrapok"' : ""}>${c && c.html ? c.html : esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const bars = (rows, max = 100, suffix = "%") => `<div class="bars">${rows.map(([name, v, label]) => `<div class="b"><span class="nm">${esc(name)}</span><span class="track"><i style="width:${max ? Math.min(100, (v / max) * 100) : 0}%"></i></span><span class="val">${esc(label ?? v + suffix)}</span></div>`).join("")}</div>`;
const names = (rows) => rows.map((r) => esc(r.name)).join(", ");
const prio = (title, cls, rows, note) => `<div class="card ${cls}"><p class="k">${esc(title)} <span class="muted">${rows.length}</span></p>${rows.length ? `<ul class="plist">${rows.map((r) => `<li><span>${esc(r.name)}</span>${r.note ? `<span class="muted small">${esc(r.note)}</span>` : ""}</li>`).join("")}</ul>` : `<p class="muted">-</p>`}${note ? `<p class="muted small" style="margin-top:.5rem">${esc(note)}</p>` : ""}</div>`;
const tips = (title, list) => `<h2 class="sec-h">${title}</h2><ol class="strat">${list.map((x, i) => `<li class="${i < 3 ? "hi" : ""}"><span>${i + 1}</span>${x}</li>`).join("")}</ol>`;
const caveat = (t) => `<div class="caveat">${t}</div>`;
const unfilled = (rows) => (rows.some((r) => !r.filled) ? `<details class="card" style="margin-top:1rem"><summary>Belum mengisi (${rows.filter((r) => !r.filled).length})</summary><p class="muted" style="margin-top:.6rem">${names(rows.filter((r) => !r.filled))}</p></details>` : "");
const join = (s, res, prof) => { const by = new Map(res.map((r) => [r.no, r.answers || {}])); return s.roster.map((m) => (by.has(m.no) ? { ...m, filled: true, a: by.get(m.no), p: prof(by.get(m.no)) } : { ...m, filled: false })); };

/* ---------------- Minat karier ---------------- */
export function minatReport(s, res) {
  const KEYS = Object.keys(RIASEC), cfg = s.config || {};
  const rows = join(s, res, (a) => minatProfile(a, cfg)), done = rows.filter((r) => r.filled);
  const avg = Object.fromEntries(KEYS.map((k) => [k, done.length ? Math.round(done.reduce((t, r) => t + r.p.pct[k], 0) / done.length) : 0]));
  const order = [...KEYS].sort((a, b) => avg[b] - avg[a]);
  const by = Object.fromEntries(KEYS.map((k) => [k, done.filter((r) => r.p.top === k)]));
  const flat = done.filter((r) => r.p.flat);
  const body = `
    <div class="gsum1 card"><h2>Kelas ini paling berminat pada bidang ${RIASEC[order[0]].name.toLowerCase()} dan ${RIASEC[order[1]].name.toLowerCase()}.</h2>
      <p class="muted" style="margin-top:.4rem">Rata-rata skor minat kelas per bidang (persen dari skor tertinggi).</p>
      <div style="margin-top:.9rem">${bars(order.map((k) => [`${RIASEC[k].name} (${k})`, avg[k]]))}</div></div>
    <h2 class="sec-h">Murid yang perlu diajak bicara</h2>
    <div class="sumcards">${prio("Minat belum jelas", "warn", flat.map((r) => ({ name: r.name, note: r.p.code })), "Skor semua bidang hampir sama. Biasanya mereka belum banyak mengenal pilihan; ajak mengikuti kegiatan eksplorasi karier.")}
      ${prio("Minat sangat menonjol", "ok", done.filter((r) => r.p.pct[r.p.top] >= 85).map((r) => ({ name: r.name, note: RIASEC[r.p.top].name })), "Dukung dengan informasi jurusan dan kegiatan yang sesuai.")}</div>
    <h2 class="sec-h">Murid per minat utama</h2>
    <div class="ggroups g3">${KEYS.map((k) => `<div class="card"><p class="gh">${RIASEC[k].name} (${k}) <span class="muted">${by[k].length}</span></p>${by[k].length ? `<ul>${by[k].map((r) => `<li><span>${esc(r.name)}</span><span class="muted small">${r.p.code}</span></li>`).join("")}</ul>` : `<p class="muted">-</p>`}</div>`).join("")}</div>
    <h2 class="sec-h">Arti enam bidang</h2>
    ${tbl(["Bidang", { t: "Ciri", wrap: 1 }, { t: "Contoh mapel", wrap: 1 }, { t: "Contoh jurusan", wrap: 1 }, { t: "Contoh pekerjaan", wrap: 1 }], KEYS.map((k) => [`${RIASEC[k].name} (${k})`, RIASEC[k].hint, RIASEC_EX[k].mapel, RIASEC_EX[k].jurusan, RIASEC_EX[k].kerja]))}
    <h2 class="sec-h">Skor per murid</h2>
    ${tbl(["No", "Nama", ...KEYS.map((k) => ({ t: k, num: 1 })), "Kode"], rows.map((r) => (r.filled ? [r.no, r.name, ...KEYS.map((k) => r.p.pct[k]), r.p.code] : [r.no, r.name, ...KEYS.map(() => "-"), "Belum mengisi"])))}
    <p class="muted small" style="margin-top:.5rem">Skor = persen dari nilai tertinggi untuk tiap bidang (${MINAT_ITEMS.length / 6} kegiatan per bidang). Kode minat = tiga bidang dengan skor tertinggi.</p>
    ${unfilled(rows)}
    ${tips("Saran tindak lanjut", [
      `Undang narasumber atau alumni dari bidang ${RIASEC[order[0]].name.toLowerCase()}, minat terbanyak di kelas ini.`,
      "Pakai kode minat sebagai pembuka percakapan: tanyakan kegiatan apa yang membuat murid memilih jawabannya.",
      "Hubungkan dengan pilihan mapel atau jurusan, tetapi jangan menjadikannya satu-satunya dasar keputusan.",
      "Minat masih berubah di usia sekolah. Ulangi setahun sekali dan bandingkan hasilnya bersama murid.",
    ])}`;
  return { body, csv: () => [["No", "Nama", "L/P", ...KEYS.map((k) => RIASEC[k].name + " (%)"), "Kode"], ...rows.map((r) => (r.filled ? [r.no, r.name, r.g, ...KEYS.map((k) => r.p.pct[k]), r.p.code] : [r.no, r.name, r.g, ...KEYS.map(() => ""), "Belum mengisi"]))] };
}

/* ---------------- Kekuatan & kesulitan ---------------- */
export function kekuatanReport(s, res) {
  const rows = join(s, res, kkProfile), done = rows.filter((r) => r.filled), DIFF = ["emosi", "perilaku", "fokus", "teman"];
  const share = (k) => pct(done.filter((r) => ["tinggi", "agak tinggi"].includes(kkBand(r.p.s[k], k))).length, done.length);
  const high = done.filter((r) => kkTotalBand(r.p.total) === "tinggi" || r.p.impact >= 2).sort((a, b) => b.p.total - a.p.total);
  const bullied = done.filter((r) => r.p.bullied);
  const groups = Object.fromEntries(DIFF.map((k) => [k, done.filter((r) => kkBand(r.p.s[k], k) === "tinggi")]));
  const lowCare = done.filter((r) => kkBand(r.p.s.peduli, "peduli") === "rendah");
  const body = `
    <div class="gsum1 card"><h2>Gambaran kelas per area</h2><p class="muted" style="margin-top:.4rem">Persentase murid dengan skor agak tinggi atau tinggi di tiap area kesulitan.</p>
      <div style="margin-top:.9rem">${bars(DIFF.map((k) => [KK_AREAS[k], share(k)]))}</div>
      <p style="margin-top:.8rem">Kepedulian rendah: ${lowCare.length} murid.</p></div>
    <h2 class="sec-h">Siapa diajak bicara lebih dulu</h2>
    <div class="sumcards">${prio("Kesulitan tinggi atau berdampak", "warn", high.map((r) => ({ name: r.name, note: `total ${r.p.total}` })), "Total kesulitan tinggi, atau murid merasa sangat terganggu.")}
      ${prio("Sering diganggu teman", "warn", bullied.map((r) => ({ name: r.name })), "Menjawab agak benar atau benar pada kalimat tentang diejek atau diganggu.")}
      ${prio("Kepedulian rendah", "", lowCare.map((r) => ({ name: r.name })), "Bisa dilibatkan dalam kegiatan menolong teman.")}</div>
    <h2 class="sec-h">Kelompok bimbingan</h2>
    <div class="ggroups">${DIFF.map((k) => `<div class="card"><p class="gh">${KK_AREAS[k]} <span class="muted">${groups[k].length}</span></p>${groups[k].length ? `<ul>${groups[k].map((r) => `<li><span>${esc(r.name)}</span><span class="muted small">${r.p.s[k]}/10</span></li>`).join("")}</ul>` : `<p class="muted">-</p>`}</div>`).join("")}</div>
    <h2 class="sec-h">Skor per murid</h2>
    ${tbl(["No", "Nama", ...Object.values(KK_AREAS).map((t) => ({ t, num: 1 })), { t: "Total kesulitan", num: 1 }, "Dampak", "Catatan"], rows.map((r) => (r.filled
      ? [r.no, r.name, ...Object.keys(KK_AREAS).map((k) => r.p.s[k]), r.p.total, ["Tidak", "Sedikit", "Cukup", "Sangat"][r.p.impact], [kkTotalBand(r.p.total) !== "wajar" ? `kesulitan ${kkTotalBand(r.p.total)}` : "", r.p.bullied ? "sering diganggu" : ""].filter(Boolean).join(", ") || "-"]
      : [r.no, r.name, ...Object.keys(KK_AREAS).map(() => "-"), "-", "-", "Belum mengisi"])))}
    <p class="muted small" style="margin-top:.5rem">Tiap area 0 sampai 10 (5 kalimat, nilai 0 sampai 2). Total kesulitan = emosi + perilaku + fokus + pertemanan (0 sampai 40). Batas "agak tinggi" (16) dan "tinggi" (20) adalah patokan kasar Examus, bukan norma baku; pakai untuk memilih siapa yang ditemui lebih dulu.</p>
    ${unfilled(rows)}
    ${tips("Saran tindak lanjut", [
      "Temui murid di kotak \"kesulitan tinggi\" secara pribadi minggu ini. Mulai dari kekuatannya, lalu tanyakan apa yang sedang berat.",
      "Untuk murid yang sering diganggu, cocokkan dengan sosiometri atau deteksi perundungan dan amati saat istirahat.",
      "Bentuk kelompok bimbingan kecil per area (misalnya mengelola emosi atau mengatur fokus belajar).",
      "Libatkan orang tua bila kesulitan juga terasa di rumah.",
      "Rujuk ke psikolog bila kesulitan berat dan menetap.",
    ])}
    ${caveat("Ini skrining awal, bukan diagnosis. Butir ditulis untuk Examus dengan struktur lima area dan belum divalidasi. Jangan tampilkan skor atau label kepada murid maupun teman sekelasnya.")}`;
  return { body, csv: () => [["No", "Nama", "L/P", ...Object.values(KK_AREAS), "Total kesulitan", "Dampak"], ...rows.map((r) => (r.filled ? [r.no, r.name, r.g, ...Object.keys(KK_AREAS).map((k) => r.p.s[k]), r.p.total, r.p.impact] : [r.no, r.name, r.g, "", "", "", "", "", "", ""]))] };
}

/* ---------------- Suasana hati (PHQ-9) ---------------- */
export function emosiReport(s, res) {
  const cfg = s.config || {}, items = phqItems(cfg);
  const rows = join(s, res, (a) => phqProfile(a, cfg)), done = rows.filter((r) => r.filled);
  const today = done.filter((r) => r.p.priority === "hari ini"), week = done.filter((r) => r.p.priority === "minggu ini"), watch = done.filter((r) => r.p.priority === "pantau");
  const BANDS = ["Minimal", "Ringan", "Sedang", "Cukup berat", "Berat"];
  const body = `
    ${cfg.variant === "phq8" ? `<div class="notice">Sesi ini memakai PHQ-8 (tanpa pertanyaan tentang menyakiti diri). Tetap tanyakan keselamatan saat berbicara dengan murid yang skornya tinggi.</div>` : ""}
    <h2 class="sec-h">Siapa dihubungi</h2>
    <div class="sumcards">${prio("Hari ini", "warn", today.map((r) => ({ name: r.name, note: r.p.item9 ? "menjawab nomor 9" : `skor ${r.p.total}` })), "Skor 20 ke atas atau menjawab selain \"tidak pernah\" pada pertanyaan nomor 9.")}
      ${prio("Minggu ini", "warn", week.map((r) => ({ name: r.name, note: `skor ${r.p.total}` })), "Skor 15 sampai 19.")}
      ${prio("Pantau", "", watch.map((r) => ({ name: r.name, note: `skor ${r.p.total}` })), "Skor 10 sampai 14. Ajak bicara dan ulangi skrining 2 sampai 4 minggu lagi.")}</div>
    <h2 class="sec-h">Sebaran tingkat gejala</h2>
    <div class="card">${bars(BANDS.map((b) => [b, done.filter((r) => r.p.band === b).length, `${done.filter((r) => r.p.band === b).length} murid`]), Math.max(1, done.length), "")}</div>
    <h2 class="sec-h">Sebaran gejala</h2>
    ${tbl([{ t: "Gejala", wrap: 1 }, { t: "Lebih dari seminggu atau hampir setiap hari", num: 1 }], items.map((t, i) => [`${i + 1}. ${t[0].toUpperCase() + t.slice(1)}`, `${pct(done.filter((r) => Number(r.a[i]) >= 2).length, done.length)}%`]))}
    <h2 class="sec-h">Skor per murid</h2>
    ${tbl(["No", "Nama", { t: "Skor", num: 1 }, "Tingkat", ...(items.length === 9 ? [{ t: "No. 9", num: 1 }] : []), "Dampak"], rows.map((r) => (r.filled
      ? [r.no, r.name, r.p.total, r.p.band, ...(items.length === 9 ? [r.p.item9] : []), ["Tidak sulit", "Agak sulit", "Sulit", "Sangat sulit"][r.p.impact]]
      : [r.no, r.name, "-", "Belum mengisi", ...(items.length === 9 ? ["-"] : []), "-"])))}
    <p class="muted small" style="margin-top:.5rem">Skor 0 sampai ${items.length * 3}. Tingkat: 0-4 minimal, 5-9 ringan, 10-14 sedang, 15-19 cukup berat, 20 ke atas berat (batas PHQ-9).</p>
    ${unfilled(rows)}
    ${tips("Protokol tindak lanjut", [
      "<b>Hari ini:</b> temui murid secara pribadi. Tanyakan langsung tentang keselamatannya. Bila ada rencana menyakiti diri, jangan tinggalkan sendirian, hubungi orang tua, dan rujuk ke puskesmas, psikolog, atau layanan darurat 112.",
      "<b>Minggu ini:</b> ajak bicara, kabari orang tua dengan izin murid, dan pertimbangkan rujukan ke psikolog atau puskesmas.",
      "<b>Pantau:</b> sapa secara berkala, libatkan wali kelas, dan ulangi skrining dalam 2 sampai 4 minggu.",
      "Catat setiap tindak lanjut beserta tanggalnya.",
      "Jangan menyebut kata \"depresi\" kepada murid; hasil ini skrining, bukan diagnosis.",
    ])}
    ${caveat("PHQ-9 adalah alat skrining (Kroenke, Spitzer & Williams), bukan diagnosis. Kalimat di Examus adalah terjemahan bebas berbahasa remaja dan belum divalidasi untuk murid Indonesia. Hasil ini data kesehatan yang sensitif: simpan dan bicarakan secara rahasia.")}`;
  return { body, csv: () => [["No", "Nama", "L/P", ...items.map((_, i) => `B${i + 1}`), "Skor", "Tingkat", "Dampak"], ...rows.map((r) => (r.filled ? [r.no, r.name, r.g, ...items.map((_, i) => r.a[i]), r.p.total, r.p.band, r.p.impact] : [r.no, r.name, r.g, ...items.map(() => ""), "", "Belum mengisi", ""]))] };
}

/* ---------------- Tipe kepribadian ---------------- */
export function kepribadianReport(s, res) {
  const rows = join(s, res, tkProfile), done = rows.filter((r) => r.filled);
  const grid = [["IS", "IN"], ["ES", "EN"]].flatMap((r) => r).flatMap((a) => ["TJ", "FJ", "TP", "FP"].map((b) => a[0] + a[1] + b));
  const count = (t) => done.filter((r) => r.p.type === t);
  const split = Object.entries(TK_DIMS).map(([d, [L, R]]) => [d, L, R, done.filter((r) => r.p.type.includes(L)).length]);
  const body = `
    <h2 class="sec-h">Tabel 16 tipe</h2>
    <div class="tkgrid">${grid.map((t) => `<div class="cell${count(t).length ? " on" : ""}"><b>${t}</b><span>${count(t).length}</span>${count(t).length ? `<small>${count(t).map((r) => esc(r.name.split(" ")[0])).join(", ")}</small>` : ""}</div>`).join("")}</div>
    <h2 class="sec-h">Sebaran tiap pasangan</h2>
    <div class="card">${split.map(([, L, R, nL]) => `<div class="tksplit"><span>${TK_LETTER[L].name} (${L}) <b>${nL}</b></span><span class="bar"><i style="width:${pct(nL, done.length)}%"></i></span><span><b>${done.length - nL}</b> ${TK_LETTER[R].name} (${R})</span></div>`).join("")}</div>
    <h2 class="sec-h">Murid per kelompok</h2>
    <div class="ggroups">${Object.values(TK_DIMS).flat().map((l) => { const list = done.filter((r) => r.p.type.includes(l)); return `<div class="card"><p class="gh">${TK_LETTER[l].name} (${l}) <span class="muted">${list.length}</span></p><p class="muted small" style="margin-top:.3rem">Cocok dengan ${esc(TK_LETTER[l].learn)}.</p>${list.length ? `<p style="margin-top:.4rem">${names(list)}</p>` : ""}</div>`; }).join("")}</div>
    <h2 class="sec-h">Tipe per murid</h2>
    ${tbl(["No", "Nama", "Tipe", { t: "E/I", num: 1 }, { t: "S/N", num: 1 }, { t: "T/F", num: 1 }, { t: "J/P", num: 1 }, "Hampir seimbang"], rows.map((r) => (r.filled
      ? [r.no, r.name, r.p.type, ...Object.values(TK_DIMS).map(([L, R]) => `${r.p.c[L] || 0}-${r.p.c[R] || 0}`), r.p.close.join(", ") || "-"]
      : [r.no, r.name, "Belum mengisi", "-", "-", "-", "-", "-"])))}
    <p class="muted small" style="margin-top:.5rem">Angka = jumlah pilihan untuk huruf pertama dan kedua (8 situasi per pasangan). Selisih 2 atau kurang berarti hampir seimbang.</p>
    ${unfilled(rows)}
    ${tips("Saran mengajar", [
      `${split[0][3] >= done.length / 2 ? "Kelas ini lebih banyak ekstrovert: sediakan diskusi dan kerja kelompok, tetapi beri juga waktu berpikir sendiri." : "Kelas ini lebih banyak introvert: beri waktu berpikir sebelum meminta jawaban, dan pakai diskusi berpasangan sebelum diskusi kelas."}`,
      `${split[1][3] >= done.length / 2 ? "Banyak murid sensing: mulai dari contoh nyata dan langkah yang jelas." : "Banyak murid intuition: mulai dari gambaran besar, lalu turun ke detail."}`,
      "Campur tipe yang berbeda saat menyusun kelompok supaya saling melengkapi.",
      "Pakai hasil ini untuk mengenal diri dan memvariasikan cara mengajar, bukan untuk melabeli atau memilih murid.",
    ])}
    ${caveat("Butir ditulis untuk Examus berdasarkan teori tipe psikologis Jung (E/I, S/N, T/F, J/P). Ini bukan MBTI® dan belum divalidasi. Tipe menggambarkan kecenderungan, bukan kemampuan.")}`;
  return { body, csv: () => [["No", "Nama", "L/P", "Tipe", "E", "I", "S", "N", "T", "F", "J", "P"], ...rows.map((r) => (r.filled ? [r.no, r.name, r.g, r.p.type, ..."EISNTFJP".split("").map((l) => r.p.c[l] || 0)] : [r.no, r.name, r.g, "Belum mengisi"]))] };
}

/* ---------------- AKPD ---------------- */
export function akpdReport(s, res) {
  const cfg = s.config || {}, items = akpdItems(cfg), KEYS = Object.keys(AKPD_BIDANG);
  const rows = join(s, res, (a) => akpdProfile(a, cfg)), done = rows.filter((r) => r.filled);
  const need = items.map((it, i) => ({ ...it, i, n: done.filter((r) => Number(r.a[i]) >= 2).length })).map((x) => ({ ...x, p: pct(x.n, done.length) }));
  const bid = KEYS.map((k) => [AKPD_BIDANG[k], Math.round(need.filter((x) => x.k === k).reduce((t, x) => t + x.p, 0) / need.filter((x) => x.k === k).length)]);
  const sorted = [...need].sort((a, b) => b.p - a.p || a.i - b.i);
  const klasikal = sorted.filter((x) => x.p >= 50), kelompok = sorted.filter((x) => x.p >= 25 && x.p < 50);
  const first = [...done].sort((a, b) => b.p.total - a.p.total).filter((r) => r.p.total / r.p.max >= 0.5).slice(0, 10);
  const body = `
    <p class="muted" style="margin-top:1rem">Jenjang: ${cfg.jenjang === "sma" ? "SMA/MA" : "SMP/MTs"}. Persentase = murid yang memilih "butuh bantuan" atau "sangat butuh bantuan".</p>
    <h2 class="sec-h">Kebutuhan kelas per bidang</h2>
    <div class="card">${bars(bid)}</div>
    <h2 class="sec-h">Topik bimbingan klasikal</h2>
    <p class="muted">Dibutuhkan separuh kelas atau lebih.</p>
    ${klasikal.length ? tbl([{ t: "Kebutuhan", wrap: 1 }, "Bidang", { t: "Murid", num: 1 }, { t: "Persen", num: 1 }], klasikal.map((x) => [x.text, AKPD_BIDANG[x.k], x.n, x.p + "%"])) : `<div class="card"><p class="muted">Belum ada kebutuhan yang dirasakan separuh kelas.</p></div>`}
    <h2 class="sec-h">Topik bimbingan kelompok</h2>
    <p class="muted">Dibutuhkan seperempat sampai separuh kelas.</p>
    ${kelompok.length ? tbl([{ t: "Kebutuhan", wrap: 1 }, "Bidang", { t: "Murid", num: 1 }, { t: "Persen", num: 1 }], kelompok.map((x) => [x.text, AKPD_BIDANG[x.k], x.n, x.p + "%"])) : `<div class="card"><p class="muted">-</p></div>`}
    <h2 class="sec-h">Murid yang perlu diajak bicara lebih dulu</h2>
    <div class="card">${first.length ? `<ul class="plist">${first.map((r) => `<li><span>${esc(r.name)}</span><span class="muted small">${AKPD_BIDANG[r.p.order[0]]} · ${pct(r.p.total, r.p.max)}%</span></li>`).join("")}</ul>` : `<p class="muted">Tidak ada murid dengan kebutuhan di atas separuh skor.</p>`}</div>
    <h2 class="sec-h">Rekap ${items.length} butir</h2>
    ${tbl(["No", { t: "Kebutuhan", wrap: 1 }, "Bidang", { t: "Murid", num: 1 }, { t: "Persen", num: 1 }], need.map((x) => [x.i + 1, x.text, AKPD_BIDANG[x.k], x.n, x.p + "%"]))}
    <h2 class="sec-h">Skor per murid</h2>
    ${tbl(["No", "Nama", ...KEYS.map((k) => ({ t: AKPD_BIDANG[k] + " (%)", num: 1 })), "Bidang utama"], rows.map((r) => (r.filled ? [r.no, r.name, ...KEYS.map((k) => r.p.pct[k]), AKPD_BIDANG[r.p.order[0]]] : [r.no, r.name, ...KEYS.map(() => "-"), "Belum mengisi"])))}
    ${unfilled(rows)}
    ${caveat("Butir AKPD ini ditulis untuk Examus (10 kebutuhan per bidang layanan BK) dan bisa dipakai sebagai dasar menyusun program BK. Cocokkan dengan pengamatan dan data sekolah lain.")}`;
  return { body, csv: () => [["No", "Kebutuhan", "Bidang", "Murid", "Persen"], ...need.map((x) => [x.i + 1, x.text, AKPD_BIDANG[x.k], x.n, x.p]), [], ["No", "Nama", "L/P", ...KEYS.map((k) => AKPD_BIDANG[k] + " (%)")], ...rows.map((r) => (r.filled ? [r.no, r.name, r.g, ...KEYS.map((k) => r.p.pct[k])] : [r.no, r.name, r.g]))] };
}

/* ---------------- Deteksi perundungan ---------------- */
export function amanReport(s, res) {
  const rows = join(s, res, prProfile), done = rows.filter((r) => r.filled);
  const first = done.filter((r) => r.p.victim === "didahulukan"), victims = done.filter((r) => r.p.victim === "perlu"), doers = done.filter((r) => r.p.doer === "perlu");
  const safePct = pct(done.filter((r) => r.p.safe >= 3).length, done.length);
  const forms = PR_ITEMS.map((it, i) => ({ ...it, i })).filter((it) => it.k === "korban").map((it) => ({ ...it, n: done.filter((r) => Number(r.a[it.i]) >= 2).length }));
  const aspect = (k) => Math.round((done.reduce((t, r) => t + r.p[k], 0) / Math.max(1, done.length)) * 25);
  const body = `
    <h2 class="sec-h">Siapa diajak bicara lebih dulu</h2>
    <div class="sumcards">${prio("Didahulukan", "warn", first.map((r) => ({ name: r.name, note: r.p.forms.join(", ") })), "Mengalami ancaman atau kekerasan fisik setidaknya kadang-kadang.")}
      ${prio("Mengalami perundungan", "warn", victims.map((r) => ({ name: r.name, note: r.p.forms.slice(0, 2).join(", ") })), "Sering mengalami setidaknya satu bentuk perundungan.")}
      ${prio("Melakukan perundungan", "", doers.map((r) => ({ name: r.name })), "Ajak bicara tanpa menghakimi; cari tahu penyebabnya.")}</div>
    <h2 class="sec-h">Gambaran kelas</h2>
    <div class="card">${bars([[PR_ASPEK.korban, aspect("korban")], [PR_ASPEK.pelaku, aspect("pelaku")], ["Merasa aman di sekolah", safePct]])}
      <p class="muted small" style="margin-top:.6rem">Mengalami dan melakukan = rata-rata frekuensi (0% tidak pernah, 100% sangat sering). Rasa aman = murid yang menjawab sering atau sangat sering pada kalimat tentang rasa aman.</p></div>
    <h2 class="sec-h">Bentuk perundungan di kelas</h2>
    ${tbl([{ t: "Bentuk", wrap: 1 }, { t: "Murid yang mengalami (kadang-kadang ke atas)", num: 1 }, { t: "Persen", num: 1 }], [...forms].sort((a, b) => b.n - a.n).map((f) => [f.form + (f.serious ? " (berat)" : ""), f.n, pct(f.n, done.length) + "%"]))}
    <h2 class="sec-h">Ringkasan per murid</h2>
    ${tbl(["No", "Nama", "Mengalami", "Melakukan", "Membela teman", { t: "Rasa aman (0-4)", num: 1 }], rows.map((r) => (r.filled
      ? [r.no, r.name, r.p.victim || "-", r.p.doer || "-", r.p.defender ? "ya" : "-", r.p.safe.toFixed(1)]
      : [r.no, r.name, "Belum mengisi", "-", "-", "-"])))}
    ${unfilled(rows)}
    ${tips("Usulan layanan", [
      "Temui murid di kotak \"didahulukan\" hari ini, satu per satu dan di tempat yang aman. Pastikan keselamatannya dulu.",
      "Laporkan kasus kekerasan kepada TPPK sekolah (Permendikbudristek 46/2023) dan libatkan orang tua.",
      "Ajak bicara murid yang melakukan perundungan: dengarkan, tegaskan dampaknya, dan sepakati langkah perbaikan.",
      `${safePct < 70 ? "Rasa aman kelas masih rendah: bahas aturan kelas bersama murid dan perkuat pengawasan di tempat rawan." : "Pertahankan rasa aman: beri penghargaan kepada murid yang membela atau melapor."}`,
      "Bimbingan klasikal tentang peran saksi: cara membela teman dan melapor dengan aman.",
    ])}
    <details class="card" style="margin-top:1rem"><summary>Panduan wawancara singkat</summary><ul class="tips" style="margin-top:.6rem">
      <li>Mulai dengan rasa aman: "Aku ingin memastikan kamu baik-baik saja di sekolah."</li><li>Tanyakan apa yang terjadi, di mana, kapan, dan siapa saja yang terlibat atau melihat.</li>
      <li>Jangan menyalahkan dan jangan menjanjikan kerahasiaan penuh bila ada bahaya; jelaskan siapa yang perlu tahu.</li><li>Sepakati langkah berikutnya dan kapan bertemu lagi.</li></ul></details>
    ${caveat("Hasil ini untuk melindungi dan membantu, bukan menghukum. Nama murid tidak boleh disampaikan kepada murid lain. Butir ditulis untuk Examus dengan empat aspek (mengalami, melakukan, menyaksikan, rasa aman) dan belum divalidasi.")}`;
  return { body, csv: () => [["No", "Nama", "L/P", "Mengalami", "Melakukan", "Membela", "Rasa aman", "Bentuk"], ...rows.map((r) => (r.filled ? [r.no, r.name, r.g, r.p.victim, r.p.doer, r.p.defender ? "ya" : "", r.p.safe.toFixed(1).replace(".", ","), r.p.forms.join("; ")] : [r.no, r.name, r.g, "Belum mengisi"]))] };
}
