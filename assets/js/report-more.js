// Laporan guru untuk asesmen skala: minat karier, kekuatan & kesulitan, suasana hati,
// tipe kepribadian, AKPD, dan deteksi perundungan.
import { esc, $, $$ } from "./util.js";
import { radar } from "./charts.js";
import { RIASEC, MINAT_ITEMS } from "./data.js";
import {
  RIASEC_EX, RIASEC_KEYS, RIASEC_LABEL, minatProfile, KK_AREAS, KK_ITEMS, kkProfile, kkLevel, kkTotalLevel, kkLevelName, PHQ_ITEMS, PHQ_IMPACT, phqItems, phqProfile,
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
  const cfg = s.config || {}, K = RIASEC_KEYS, newScale = cfg.scale === 5;
  const rows = join(s, res, (a) => minatProfile(a, cfg)), done = rows.filter((r) => r.filled);
  const avgPct = Object.fromEntries(K.map((k) => [k, done.length ? done.reduce((t, r) => t + r.p.pct[k], 0) / done.length : 0]));
  const avgRaw = Object.fromEntries(K.map((k) => [k, done.length ? done.reduce((t, r) => t + r.p.raw[k], 0) / done.length : 0]));
  const order = [...K].sort((a, b) => avgPct[b] - avgPct[a]);
  const coded = done.filter((r) => r.p.code && !r.p.provisional), talk = done.filter((r) => r.p.note);
  const by = Object.fromEntries(K.map((k) => [k, coded.filter((r) => r.p.order[0] === k)]));
  const showCode = (p) => (p.code ? p.code + (p.provisional ? "*" : "") : "—");
  const fmt = (x) => (Math.round(x * 10) / 10).toString().replace(".", ",");
  const maxRaw = newScale ? 32 : 6;
  const nameBtn = (r, note) => `<button type="button" class="linkname" data-no="${r.no}">${esc(r.name)}</button>${note ? `<span class="muted small">${esc(note)}</span>` : ""}`;
  const body = `
    <div class="mkw"><div class="gsum1 card"><p class="eyebrow" style="margin-top:0">Rata-rata minat kelas</p>
      <h2>Kelas ini paling berminat pada bidang ${order.slice(0, 3).map((k) => RIASEC_LABEL[k]).join(", ")}.</h2>
      <p style="margin-top:.4rem">Minat utama murid biasanya beragam di dalam satu kelas. Lihat sebaran minat utama dan kartu tiap murid di bawah; rata-rata kelas hanya membantu merancang bimbingan klasikal.</p>
      <div class="radar2"><div>${radar(Object.fromEntries(K.map((k) => [k, avgPct[k] / 100])), K, RIASEC_LABEL, { bold: order.slice(0, 3), size: 240 })}</div>
      <div class="rbars">${K.map((k) => `<div class="b"><b>${k}</b><span class="nm">${RIASEC_LABEL[k]}</span><span class="track"><i style="width:${avgPct[k]}%"></i></span><span class="val">${fmt(avgRaw[k])}</span></div>`).join("")}
      <p class="muted small" style="margin-top:.4rem">Angka = rata-rata skor mentah kelas (0-${maxRaw}).</p></div></div></div>

    <h2 class="sec-h">Perlu diajak bicara (${talk.length})</h2>
    <p class="muted">Ajak bicara secara pribadi, tanpa menghakimi. Minat rendah bisa berarti belum punya pengalaman, belum mengenal pilihan, kurang serius mengisi, atau sedang ada masalah (suasana hati, keluarga, sekolah). Minat yang belum terbedakan wajar di SMP: tawarkan pengalaman baru dan ulangi angket 6 sampai 12 bulan lagi.</p>
    ${talk.length ? `<ul class="talk">${talk.map((r) => `<li>${nameBtn(r, [r.p.note, r.p.code ? `kode sementara ${r.p.code}` : ""].filter(Boolean).join("; "))}</li>`).join("")}</ul>` : `<div class="card" style="margin-top:.6rem"><p class="muted">Tidak ada.</p></div>`}

    <h2 class="sec-h">Murid per minat utama</h2>
    <p class="muted">Dikelompokkan menurut huruf pertama kode. Ketuk nama untuk melihat kartu murid.</p>
    <div class="ggroups g3" style="margin-top:.8rem">${K.filter((k) => by[k].length).map((k) => `<div class="card"><p class="gh">${RIASEC_LABEL[k]} (${k}) <span class="muted">${by[k].length}</span></p><ul>${by[k].map((r) => `<li>${nameBtn(r, r.p.code)}</li>`).join("")}</ul></div>`).join("")}
      ${talk.length ? `<div class="card"><p class="gh">Kode sementara <span class="muted">${talk.length}</span></p><p class="muted small" style="margin-top:.3rem">Profil datar atau rendah. Dikonfirmasi lewat wawancara.</p><ul>${talk.map((r) => `<li>${nameBtn(r, r.p.code ? r.p.code + "*" : "")}</li>`).join("")}</ul></div>` : ""}
      ${!done.length ? `<div class="card"><p class="muted">Belum ada yang mengisi.</p></div>` : ""}</div>

    <h2 class="sec-h">Arti enam bidang</h2>
    ${tbl(["Bidang", { t: "Ciri", wrap: 1 }, { t: "Contoh mapel", wrap: 1 }, { t: "Contoh jurusan", wrap: 1 }, { t: "Contoh pekerjaan", wrap: 1 }], K.map((k) => [`${RIASEC_LABEL[k]} (${k})`, RIASEC[k].hint, RIASEC_EX[k].mapel, RIASEC_EX[k].jurusan, RIASEC_EX[k].kerja]))}

    <h2 class="sec-h">Skor per murid</h2>
    ${tbl(["No", "Nama", "L/P", ...K.map((k) => ({ t: k, num: 1 })), "Kode", "Catatan"], rows.map((r) => (r.filled
      ? [r.no, { html: nameBtn(r) }, r.g || "-", ...K.map((k) => r.p.raw[k]), showCode(r.p), [r.p.note, r.p.provisional ? "kode sementara" : "", r.p.tied.length ? `urutan ${r.p.tied.join(", ")} setara` : ""].filter(Boolean).join("; ") || "-"]
      : [r.no, r.name, r.g || "-", ...K.map(() => "-"), "-", "Belum mengisi"])))}
    <p class="muted small" style="margin-top:.5rem">* = kode sementara (lihat Keterangan istilah di bawah).</p>
    ${unfilled(rows)}
    <h2 class="sec-h">Keterangan istilah</h2>
    <dl class="gloss">
      <dt>Skor mentah</dt><dd>Jumlah nilai semua kegiatan satu bidang. ${newScale ? "Tiap bidang punya 8 kegiatan, nilainya sangat tidak suka 0 sampai sangat suka 4, jadi skornya 0 sampai 32." : "Sesi lama: tiap bidang punya 3 kegiatan, nilainya tidak tertarik 0 sampai tertarik 2, jadi skornya 0 sampai 6."} Persen pada grafik = skor mentah dibagi skor tertinggi yang mungkin.</dd>
      <dt>Kode minat (kode Holland)</dt><dd>Tiga huruf bidang dengan skor tertinggi, diurutkan dari yang paling tinggi. Contoh: SAE berarti Sosial paling tinggi, lalu Artistik, lalu Wirausaha. Satu atau dua huruf pertama paling bermakna; huruf ketiga paling lemah.</dd>
      <dt>Urutan setara</dt><dd>Dua bidang yang skornya selisih 12,5% rentang (4 poin) atau kurang. Perbedaan sekecil itu masih dalam batas kesalahan ukur, jadi urutannya boleh ditukar.</dd>
      <dt>Profil datar (belum terbedakan)</dt><dd>Skor tertinggi dan terendah selisih kurang dari 25% rentang (kurang dari 8 poin), sehingga keenam bidang hampir sama tinggi. Penyebabnya bisa murid memang berminat luas, menjawab "suka" untuk hampir semua kegiatan, atau belum mengenal pilihan. Batas 25% adalah patokan Examus, bukan norma baku.</dd>
      <dt>Minat rendah</dt><dd>Skor tertinggi di bawah 50% rentang (di bawah 16 poin), artinya tidak ada bidang yang rata-rata dinilai "ragu-ragu" atau lebih. Bisa berarti murid belum banyak pengalaman, kurang serius mengisi, atau sedang ada masalah lain. Batas 50% adalah patokan Examus.</dd>
      <dt>Kode sementara (*)</dt><dd>Kode tetap dihitung dari skor tertinggi, tetapi karena profilnya datar atau rendah, urutannya kurang kokoh. Pakai sebagai bahan wawancara, jangan sebagai kesimpulan. Jawaban yang semuanya sama tidak diberi kode sama sekali.</dd>
      <dt>Perlu diajak bicara</dt><dd>Murid dengan profil datar, minat rendah, atau jawaban semuanya sama. Ini penanda untuk ditemui secara pribadi, bukan penilaian tentang murid.</dd>
      <dt>Rata-rata kelas</dt><dd>Rata-rata skor mentah semua murid yang sudah mengisi, per bidang. Hanya membantu merancang bimbingan klasikal; jangan dipakai untuk menilai murid perorangan.</dd>
    </dl>
    ${tips("Tindak lanjut untuk kelas ini", [
      `Adakan bimbingan klasikal tentang enam tipe minat, lalu minta tiap murid mencari tahu satu pekerjaan dari kodenya.`,
      `Undang alumni atau orang tua dengan pekerjaan yang beragam, terutama dari bidang ${RIASEC_LABEL[order[0]].toLowerCase()} dan ${RIASEC_LABEL[order[1]].toLowerCase()}.`,
      "Temui murid di daftar \"perlu diajak bicara\" satu per satu; tawarkan kegiatan eksplorasi seperti ekstrakurikuler, kunjungan, atau proyek kecil.",
      "Pakai hasil ini sebagai bahan percakapan saat memilih mapel pilihan, jurusan SMK, atau jurusan kuliah, bersama nilai rapor dan keinginan murid.",
      "Ulangi angket 6 sampai 12 bulan lagi dan bandingkan hasilnya bersama murid.",
    ])}
    ${caveat("Hasil ini menunjukkan minat, bukan bakat atau kemampuan, dan bukan keputusan akhir. Minat remaja masih berkembang; untuk murid SMP cukup perhatikan satu atau dua huruf pertama dan pakai untuk eksplorasi. Gunakan sebagai bahan percakapan bersama murid dan orang tua, berdampingan dengan prestasi belajar, bakat, nilai-nilai keluarga, dan kesempatan yang ada. Semua pekerjaan bisa dijalani laki-laki maupun perempuan. Angket ini disusun Examus berdasarkan teori Holland dan belum dinormakan pada murid Indonesia, jadi skornya dibaca relatif terhadap diri murid sendiri.")}
    <p class="no-print" style="margin-top:1rem"><a class="btn" href="#/mulai/gaya-belajar${s.classId ? "?kelas=" + s.classId : ""}">Kenali cara belajar kelas ini → Gaya Belajar</a></p>
    <dialog class="sheet" id="mk-card"></dialog></div>`;
  return {
    body,
    csv: () => [["No", "Nama", "L/P", ...K.map((k) => RIASEC_LABEL[k]), "Kode", "Catatan"], ...rows.map((r) => (r.filled ? [r.no, r.name, r.g, ...K.map((k) => r.p.raw[k]), r.p.code, [r.p.note, r.p.provisional ? "kode sementara" : ""].filter(Boolean).join("; ")] : [r.no, r.name, r.g, ...K.map(() => ""), "", "Belum mengisi"]))],
    mount(root) {
      const dlg = $("#mk-card", root);
      $(".mkw", root).addEventListener("click", (e) => {
        const b = e.target.closest(".linkname"); if (!b) return;
        const r = rows.find((x) => x.no === Number(b.dataset.no)); if (!r?.filled) return;
        const p = r.p;
        dlg.innerHTML = `<p class="eyebrow" style="margin-top:0">${r.no}. ${esc(r.name)}</p>
          <div class="mkhead"><div>${radar(Object.fromEntries(K.map((k) => [k, p.pct[k] / 100])), K, RIASEC_LABEL, { avg: Object.fromEntries(K.map((k) => [k, avgPct[k] / 100])), size: 150, bold: p.code ? p.order.slice(0, 3) : [] })}</div>
          <div><h2>${p.code ? p.code + (p.provisional ? "*" : "") : "Tanpa kode"}</h2><p class="muted small">${p.provisional ? "Kode sementara. " : ""}Garis putus-putus: rata-rata kelas.</p></div></div>
          ${p.note ? `<p class="notice">Perlu diajak bicara: ${esc(p.note)}.</p>` : ""}
          ${p.code ? `<ul class="tips" style="margin-top:.8rem">${p.order.slice(0, 3).map((k) => `<li><b style="font-weight:500">${RIASEC_LABEL[k]} (${p.raw[k]}).</b> Mapel: ${RIASEC_EX[k].mapel}. Jurusan: ${RIASEC_EX[k].jurusan}.</li>`).join("")}</ul>` : ""}
          <button class="btn block" style="margin-top:1rem" data-close>Tutup</button>`;
        dlg.querySelector("[data-close]").onclick = () => dlg.close();
        dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", "");
      });
      dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    },
  };
}

/* ---------------- Kekuatan & kesulitan ---------------- */
export function kekuatanReport(s, res) {
  const rows = join(s, res, kkProfile), done = rows.filter((r) => r.filled), DIFF = ["emosi", "perilaku", "fokus", "teman"], ALL = Object.keys(KK_AREAS);
  const lvlCount = (k, l) => done.filter((r) => (k === "total" ? kkTotalLevel(r.p.total) : kkLevel(r.p.s[k], k)) === l).length;
  const high = done.filter((r) => kkTotalLevel(r.p.total) >= 2 || r.p.impact >= 2).sort((a, b) => b.p.total - a.p.total);
  const watch = done.filter((r) => !high.includes(r) && (kkTotalLevel(r.p.total) === 1 || DIFF.some((k) => kkLevel(r.p.s[k], k) >= 2)));
  const bullied = done.filter((r) => r.p.bullied);
  const groups = Object.fromEntries(DIFF.map((k) => [k, done.filter((r) => kkLevel(r.p.s[k], k) >= 2)]));
  const lowCare = done.filter((r) => kkLevel(r.p.s.peduli, "peduli") >= 2);
  const cls = ["", "l1", "l2", "l3"];
  const cell = (score, area) => { const l = area === "total" ? kkTotalLevel(score) : kkLevel(score, area); return { html: `<span class="lv ${cls[l]}">${score}</span>` }; };
  const body = `
    <h2 class="sec-h">Gambaran kelas per area</h2>
    <div class="tblwrap"><table class="tbl lvl"><thead><tr><th>Area</th>${["Wajar", "Sedikit meningkat", "Tinggi", "Sangat tinggi"].map((x, i) => `<th class="num"><span class="lv ${cls[i]}">${x}</span></th>`).join("")}</tr></thead><tbody>
      ${[...DIFF, "total"].map((k) => `<tr><td>${k === "total" ? "<b>Total kesulitan</b>" : KK_AREAS[k]}</td>${[0, 1, 2, 3].map((l) => `<td class="num">${lvlCount(k, l)}</td>`).join("")}</tr>`).join("")}
      <tr><td>Kepedulian (kekuatan)</td>${[0, 1, 2, 3].map((l) => `<td class="num">${lvlCount("peduli", l)}</td>`).join("")}</tr></tbody></table></div>
    <p class="muted small" style="margin-top:.4rem">Untuk kepedulian, kolom dibaca: wajar, sedikit rendah, rendah, sangat rendah.</p>
    <h2 class="sec-h">Siapa diajak bicara lebih dulu</h2>
    <div class="sumcards">${prio("Tinggi atau berdampak", "warn", high.map((r) => ({ name: r.name, note: `total ${r.p.total}${r.p.impact >= 2 ? ", melaporkan kesulitan" : ""}` })), "Total kesulitan tinggi (20+), atau murid menjawab ya, kesulitan yang jelas atau berat.")}
      ${prio("Sering diganggu teman", "warn", bullied.map((r) => ({ name: r.name })), "Menjawab agak benar atau benar pada kalimat tentang diejek atau diganggu.")}
      ${prio("Pantau", "", watch.map((r) => ({ name: r.name, note: `total ${r.p.total}` })), "Total sedikit meningkat (16-19), atau satu area tinggi.")}</div>
    <h2 class="sec-h">Kelompok bimbingan</h2>
    <p class="muted">Murid dengan area tinggi atau sangat tinggi.</p>
    <div class="ggroups" style="margin-top:.8rem">${DIFF.map((k) => `<div class="card"><p class="gh">${KK_AREAS[k]} <span class="muted">${groups[k].length}</span></p>${groups[k].length ? `<ul>${groups[k].map((r) => `<li><span>${esc(r.name)}</span><span class="muted small">${r.p.s[k]}/10</span></li>`).join("")}</ul>` : `<p class="muted">-</p>`}</div>`).join("")}
      <div class="card"><p class="gh">Kepedulian rendah <span class="muted">${lowCare.length}</span></p>${lowCare.length ? `<ul>${lowCare.map((r) => `<li><span>${esc(r.name)}</span><span class="muted small">${r.p.s.peduli}/10</span></li>`).join("")}</ul>` : `<p class="muted">-</p>`}</div></div>
    <h2 class="sec-h">Skor per murid</h2>
    ${tbl(["No", "Nama", ...Object.values(KK_AREAS).map((t) => ({ t, num: 1 })), { t: "Total", num: 1 }, "Dampak", "Catatan"], rows.map((r) => (r.filled
      ? [r.no, r.name, ...ALL.map((k) => cell(r.p.s[k], k)), cell(r.p.total, "total"), ["Tidak", "Sedikit kesulitan", "Kesulitan jelas", "Kesulitan berat"][r.p.impact], [kkTotalLevel(r.p.total) ? `total ${kkLevelName(kkTotalLevel(r.p.total)).toLowerCase()}` : "", r.p.bullied ? "sering diganggu" : ""].filter(Boolean).join(", ") || "-"]
      : [r.no, r.name, ...ALL.map(() => "-"), "-", "-", "Belum mengisi"])))}
    <p class="muted small" style="margin-top:.5rem">Tiap area 0-10: 5 kalimat, tidak benar 0, agak benar 1, benar 2; lima butir berkode terbalik (nomor 9, 10, 15, 17, 22). Total kesulitan = emosi + perilaku + fokus + pertemanan (0-40). Empat pita (wajar, sedikit meningkat, tinggi, sangat tinggi) mengikuti tabel SDQ laporan diri usia 11-17: total 0-15 / 16-19 / 20-25 / 26-40; emosi 0-5 / 6 / 7 / 8-10; perilaku 0-3 / 4 / 5 / 6-10; fokus 0-5 / 6 / 7 / 8-10; pertemanan 0-2 / 3 / 4 / 5-10; kepedulian 6-10 / 5 / 4 / 0-3. Dampak = jawaban murid pada pertanyaan "apakah kamu sedang punya kesulitan".</p>
    <h2 class="sec-h">Keterangan istilah</h2>
    <dl class="gloss">
      <dt>Emosi, perilaku, fokus, pertemanan, kepedulian</dt><dd>Lima area SDQ: gejala emosi, masalah perilaku, hiperaktivitas atau kurang perhatian, masalah dengan teman sebaya, dan perilaku prososial (peduli dan suka menolong). Empat area pertama mengukur kesulitan, jadi skor tinggi berarti lebih banyak kesulitan. Kepedulian mengukur kekuatan, jadi skor rendah yang perlu diperhatikan.</dd>
      <dt>Total kesulitan</dt><dd>Jumlah skor emosi, perilaku, fokus, dan pertemanan (0-40). Kepedulian tidak ikut dihitung.</dd>
      <dt>Butir berkode terbalik</dt><dd>Kalimat positif seperti "Aku punya setidaknya satu sahabat". Jawaban "benar" justru menurunkan skor kesulitan, sehingga nilainya dibalik (0 menjadi 2, 2 menjadi 0) sebelum dijumlahkan.</dd>
      <dt>Wajar / sedikit meningkat / tinggi / sangat tinggi</dt><dd>Empat pita skor. Pada sampel normatif SDQ di Inggris, kira-kira 80% anak masuk wajar, 10% sedikit meningkat, 5% tinggi, dan 5% sangat tinggi. Pita bukan diagnosis; pita "tinggi" dan "sangat tinggi" berarti anak perlu dilihat lebih dekat.</dd>
      <dt>Dampak</dt><dd>Jawaban murid atas pertanyaan apakah ia sedang punya kesulitan dengan perasaan, konsentrasi, perilaku, atau pertemanan: tidak, sedikit, jelas, atau berat. Ini baru pertanyaan pembuka dari suplemen dampak SDQ; pertanyaan lanjutan (lama, rasa terganggu, hambatan di rumah dan sekolah) belum ada, jadi skor dampak SDQ penuh belum bisa dihitung.</dd>
      <dt>Sering diganggu</dt><dd>Murid menjawab agak benar atau benar pada kalimat "Aku sering diejek, diganggu, atau dijahili anak lain". Cocokkan dengan sosiometri atau deteksi perundungan.</dd>
    </dl>
    ${unfilled(rows)}
    ${tips("Saran tindak lanjut", [
      "Temui murid di kotak \"tinggi atau berdampak\" secara pribadi minggu ini. Mulai dari kekuatannya, lalu tanyakan apa yang sedang berat.",
      "Untuk murid yang sering diganggu, cocokkan dengan sosiometri atau deteksi perundungan dan amati saat istirahat.",
      "Bentuk kelompok bimbingan kecil per area, misalnya mengelola emosi atau mengatur fokus belajar.",
      "Libatkan orang tua bila kesulitan juga terasa di rumah.",
      "Rujuk ke psikolog bila kesulitan sangat tinggi, menetap, atau sangat mengganggu.",
    ])}
    ${caveat("Ini skrining awal, bukan diagnosis. Butir dan pembagian pita mengikuti SDQ (Strengths and Difficulties Questionnaire, hak cipta Robert Goodman, bebas dipakai non-komersial tanpa diubah). Pastikan kalimat yang dipakai sama dengan versi resmi berbahasa Indonesia di sdqinfo.org. Batas pita berasal dari sampel normatif Inggris, jadi belum tentu mewakili murid Indonesia; pakai sebagai patokan sementara dan padukan dengan wawancara. Jangan tampilkan skor atau label kepada murid maupun teman sekelasnya.")}`;
  return { body, csv: () => [["No", "Nama", "L/P", ...Object.values(KK_AREAS), "Total kesulitan", "Pita total", "Dampak"], ...rows.map((r) => (r.filled ? [r.no, r.name, r.g, ...ALL.map((k) => r.p.s[k]), r.p.total, kkLevelName(kkTotalLevel(r.p.total)), r.p.impact] : [r.no, r.name, r.g]))] };
}

/* ---------------- Suasana hati (PHQ-9) ---------------- */
export function emosiReport(s, res) {
  const cfg = s.config || {}, items = phqItems(cfg);
  const rows = join(s, res, (a) => phqProfile(a, cfg)), done = rows.filter((r) => r.filled);
  const today = done.filter((r) => r.p.priority === "hari ini"), week = done.filter((r) => r.p.priority === "minggu ini"), watch = done.filter((r) => r.p.priority === "pantau");
  const BANDS = ["Minimal", "Ringan", "Sedang", "Sedang-berat", "Berat"];
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
      ? [r.no, r.name, r.p.total, r.p.band, ...(items.length === 9 ? [r.p.item9] : []), PHQ_IMPACT[r.p.impact]?.t || "-"]
      : [r.no, r.name, "-", "Belum mengisi", ...(items.length === 9 ? ["-"] : []), "-"])))}
    <p class="muted small" style="margin-top:.5rem">Skor 0 sampai ${items.length * 3}. Tingkat: 0-4 minimal, 5-9 ringan, 10-14 sedang, 15-19 sedang-berat, 20-27 berat (pita standar PHQ-9, Kroenke dkk. 2001). Skor 10 ke atas dianjurkan evaluasi lanjut oleh tenaga profesional. Jawaban apa pun selain "tidak pernah" pada nomor 9 perlu ditanyakan langsung pada hari yang sama, berapa pun skor totalnya.</p>
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
      ${prio("Mengalami perundungan", "warn", victims.map((r) => ({ name: r.name, note: [r.p.forms.slice(0, 2).join(", "), r.p.both ? "juga melakukan" : ""].filter(Boolean).join("; ") })), "Setidaknya satu bentuk, kadang-kadang atau lebih.")}
      ${prio("Melakukan perundungan", "", doers.map((r) => ({ name: r.name })), "Ajak bicara tanpa menghakimi; cari tahu penyebabnya.")}</div>
    <p class="muted small" style="margin-top:.6rem">Klasifikasi mengikuti batas Solberg & Olweus (2003): mengalami atau melakukan bila setidaknya satu bentuk terjadi "kadang-kadang" (sekitar 2-3 kali sebulan) atau lebih dalam tiga bulan terakhir; "jarang" dicatat sebagai pantau.</p>
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
