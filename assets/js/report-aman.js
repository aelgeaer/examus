// Laporan guru Deteksi Perundungan versi 40 butir (sesi lama memakai laporan lama).
import { esc } from "./util.js";
import { PR_ITEMS, PR_IDX, PR_FORMS, prProfile } from "./aman.js";
import { amanReportOld, join, tbl, bars, prio, tips, caveat, unfilled, pct } from "./report-more.js";

const LV = { didahulukan: "didahulukan", perlu: "ya", pantau: "pantau", "": "-" };

export function amanReport(s, res) {
  if ((s.config || {}).n !== 40) return amanReportOld(s, res);
  const rows = join(s, res, prProfile), done = rows.filter((r) => r.filled), N = done.length;
  const L = (p) => rows.filter((r) => r.filled && p(r.p));
  const first = L((p) => p.victim === "didahulukan"), victims = L((p) => p.victim === "perlu"), watchV = L((p) => p.victim === "pantau");
  const doers = L((p) => p.doer === "perlu"), both = L((p) => p.both), passive = L((p) => p.passive === "perlu");
  const unsafe = L((p) => p.lowSafe || p.unsafe), witnesses = L((p) => p.witness);
  const note = (r, extra = []) => ({ name: r.name, note: [...extra, r.p.both ? "juga melakukan" : ""].filter(Boolean).join("; ") });
  const val = (r, i) => Number(r.a[i]) || 0;
  const cnt = (i) => done.filter((r) => val(r, i) >= 2).length;
  const adjOf = (r, i) => (PR_ITEMS[i].neg ? 3 - val(r, i) : val(r, i));
  const safeShare = pct(done.filter((r) => !r.p.unsafe).length, N);

  const formRows = PR_FORMS.map((f, k) => {
    const iV = PR_IDX.korban[k], iD = PR_IDX.pelaku[k], iS = PR_IDX.witness.find((i) => PR_ITEMS[i].form === f);
    return [f + (PR_ITEMS[iV].serious ? " (berat)" : ""), cnt(iV), pct(cnt(iV), N) + "%", cnt(iD), pct(cnt(iD), N) + "%", iS === undefined ? "-" : cnt(iS), iS === undefined ? "-" : pct(cnt(iS), N) + "%"];
  });
  const iklimRows = PR_IDX.iklim.map((i) => { const n = done.filter((r) => adjOf(r, i) >= 2).length; return [PR_ITEMS[i].text + (PR_ITEMS[i].neg ? " (dibalik)" : ""), n, pct(n, N) + "%"]; });

  const body = `
    <div class="sumcards" style="margin-top:1.2rem">
      <div class="card"><p class="k">Sudah mengisi</p><p><span class="big-num">${N}</span> <span class="muted">dari ${rows.length} murid</span></p></div>
      <div class="card${first.length ? " warn" : ""}"><p class="k">Didahulukan</p><p><span class="big-num">${first.length}</span> <span class="muted">murid</span></p><p class="muted small" style="margin-top:.3rem">Mengalami ancaman atau kekerasan fisik.</p></div>
      <div class="card"><p class="k">Merasa aman di sekolah</p><p><span class="big-num">${safeShare}%</span></p><p class="muted small" style="margin-top:.3rem">Murid yang menjawab sesuai atau sangat sesuai pada "Aku merasa aman".</p></div>
    </div>

    <h2 class="sec-h">Siapa diajak bicara lebih dulu</h2>
    <div class="sumcards">${prio("Didahulukan", "warn", first.map((r) => note(r, [r.p.forms.join(", ")])), "Mengalami ancaman atau kekerasan fisik, kadang-kadang atau lebih. Temui hari ini.")}
      ${prio("Mengalami perundungan", "warn", victims.map((r) => note(r, [r.p.forms.slice(0, 2).join(", ")])), "Setidaknya satu bentuk, kadang-kadang atau lebih.")}
      ${prio("Melakukan perundungan", "", doers.map((r) => ({ name: r.name, note: [r.p.doForms.slice(0, 2).join(", "), r.p.both ? "juga mengalami" : ""].filter(Boolean).join("; ") })), "Ajak bicara tanpa menghakimi; cari tahu penyebabnya.")}
      ${prio("Rasa aman rendah", "warn", unsafe.map((r) => ({ name: r.name, note: [r.p.unsafe ? "tidak merasa aman" : "", r.p.noReport ? "tidak tahu melapor" : ""].filter(Boolean).join("; ") })), "Rata-rata rasa aman di bawah 1,5 dari 3, atau tidak merasa aman di sekolah.")}
      ${prio("Saksi yang membiarkan", "", passive.map((r) => ({ name: r.name, note: "ikut tertawa atau diam saja" })), "Menyaksikan perundungan dan ikut tertawa atau diam saja, kadang-kadang atau lebih. Cocok untuk bimbingan peran saksi.")}
      ${prio("Pantau", "", watchV.map((r) => ({ name: r.name, note: "mengalami, jarang" })), "Mengalami perundungan hanya \"jarang\". Sapa dan amati.")}</div>

    <h2 class="sec-h">Gambaran kelas</h2>
    <div class="card">${bars([
      ["Mengalami perundungan", pct(first.length + victims.length, N)], ["Melakukan perundungan", pct(doers.length, N)],
      ["Menyaksikan perundungan", pct(witnesses.length, N)], ["Korban sekaligus pelaku", pct(both.length, N)], ["Merasa aman di sekolah", safeShare],
    ])}<p class="muted small" style="margin-top:.6rem">Persentase murid yang sudah mengisi. Mengalami, melakukan, dan menyaksikan = setidaknya satu bentuk terjadi "kadang-kadang" atau lebih dalam tiga bulan terakhir.</p></div>

    <h2 class="sec-h">Bentuk perundungan di kelas</h2>
    ${tbl([{ t: "Bentuk", wrap: 1 }, { t: "Mengalami", num: 1 }, { t: "%", num: 1 }, { t: "Melakukan", num: 1 }, { t: "%", num: 1 }, { t: "Menyaksikan", num: 1 }, { t: "%", num: 1 }], formRows)}
    <p class="muted small" style="margin-top:.5rem">Jumlah murid yang menjawab "kadang-kadang" atau lebih untuk bentuk itu. Murid yang menyaksikan tidak ditanya tentang julukan dan dikucilkan dari kegiatan kelompok.</p>

    <h2 class="sec-h">Iklim sekolah</h2>
    ${tbl([{ t: "Pernyataan", wrap: 1 }, { t: "Murid", num: 1 }, { t: "Persen", num: 1 }], iklimRows)}
    <p class="muted small" style="margin-top:.5rem">Murid yang menjawab sesuai atau sangat sesuai. Pernyataan bertanda (dibalik) dihitung terbalik: "tidak sesuai" dan "kurang sesuai" berarti iklim baik.</p>

    <h2 class="sec-h">Ringkasan per murid</h2>
    ${tbl(["No", "Nama", "Mengalami", "Melakukan", "Menyaksikan", "Saksi pasif", { t: "Rasa aman (0-3)", num: 1 }, { t: "Catatan", wrap: 1 }], rows.map((r) => (r.filled
      ? [r.no, r.name, LV[r.p.victim], LV[r.p.doer], r.p.witness ? "ya" : "-", LV[r.p.passive], r.p.safe.toFixed(1), [r.p.forms.join(", "), r.p.both ? "korban sekaligus pelaku" : "", r.p.unsafe ? "tidak merasa aman" : "", r.p.noReport ? "tidak tahu melapor" : "", r.p.noTrust ? "kurang percaya guru BK" : ""].filter(Boolean).join("; ") || "-"]
      : [r.no, r.name, "Belum mengisi", "-", "-", "-", "-", "-"])))}
    ${unfilled(rows)}

    <h2 class="sec-h">Keterangan istilah</h2>
    <dl class="gloss">
      <dt>Mengalami / melakukan perundungan</dt><dd>Murid yang menjawab "kadang-kadang" atau lebih untuk setidaknya satu bentuk. Ini batas yang dipakai penelitian Solberg dan Olweus (2003), kira-kira dua sampai tiga kali sebulan. Jawaban "jarang" dicatat sebagai pantau.</dd>
      <dt>Didahulukan</dt><dd>Mengalami ancaman atau kekerasan fisik pada tingkat "kadang-kadang" atau lebih. Pada murid ini keselamatan ditangani dulu, tanpa menunggu bentuk lain.</dd>
      <dt>Korban sekaligus pelaku</dt><dd>Murid yang mengalami dan juga melakukan perundungan. Kelompok ini sering paling rentan; perlu didampingi dan tidak diperlakukan semata sebagai pelaku.</dd>
      <dt>Menyaksikan dan saksi yang membiarkan</dt><dd>Menyaksikan = melihat atau mengetahui bentuk perundungan, kadang-kadang atau lebih. Saksi yang membiarkan = menjawab ikut tertawa atau diam saja, kadang-kadang atau lebih.</dd>
      <dt>Rasa aman (0-3)</dt><dd>Rata-rata 10 pernyataan iklim sekolah. Sangat sesuai bernilai 3 dan tidak sesuai 0; tiga pernyataan tentang rasa takut dan menghindar dihitung terbalik. Rata-rata di bawah 1,5 dianggap rendah, patokan Examus.</dd>
      <dt>Tidak merasa aman / tidak tahu melapor / kurang percaya guru BK</dt><dd>Murid yang menjawab kurang sesuai atau tidak sesuai pada pernyataan "Aku merasa aman saat berada di sekolah", "Aku tahu kepada siapa aku bisa melapor", dan "Aku yakin guru BK akan menolongku". Ini petunjuk celah layanan, bukan penilaian murid.</dd>
      <dt>Bentuk perundungan</dt><dd>Ejekan, julukan, dipermalukan, dikucilkan, tidak diajak kegiatan kelompok, ancaman, kekerasan fisik, barang diambil atau dirusak, gosip, dan perundungan daring. Ancaman dan kekerasan fisik dinilai berat.</dd>
    </dl>

    ${tips("Usulan layanan", [
      "Temui murid di kotak \"didahulukan\" hari ini, satu per satu dan di tempat yang aman. Pastikan keselamatannya dulu.",
      "Laporkan kasus kekerasan kepada TPPK sekolah (Permendikbudristek 46/2023) dan libatkan orang tua. Examus adalah alat skrining, penanganannya mengikuti prosedur TPPK.",
      "Ajak bicara murid yang melakukan perundungan: dengarkan, tegaskan dampaknya, dan sepakati langkah perbaikan. Untuk korban sekaligus pelaku, mulai dari dukungan.",
      safeShare < 70 ? "Rasa aman kelas masih rendah: bahas aturan kelas bersama murid dan perkuat pengawasan di tempat rawan." : "Pertahankan rasa aman: beri penghargaan kepada murid yang membela atau melapor.",
      "Bimbingan klasikal tentang peran saksi: cara menolong teman dengan aman dan melapor kepada guru, terutama bila banyak yang menjawab ikut tertawa atau diam saja.",
      "Bila banyak murid tidak tahu melapor atau kurang percaya guru BK, umumkan jalur pelaporan yang jelas dan jaga kerahasiaan pelapor.",
    ])}
    <details class="card" style="margin-top:1rem"><summary>Panduan wawancara singkat</summary><ul class="tips" style="margin-top:.6rem">
      <li>Mulai dengan rasa aman: "Aku ingin memastikan kamu baik-baik saja di sekolah."</li><li>Tanyakan apa yang terjadi, di mana, kapan, dan siapa saja yang terlibat atau melihat.</li>
      <li>Jangan menyalahkan dan jangan menjanjikan kerahasiaan penuh bila ada bahaya; jelaskan siapa yang perlu tahu.</li><li>Sepakati langkah berikutnya dan kapan bertemu lagi.</li></ul></details>
    ${caveat("Hasil ini untuk melindungi dan membantu, bukan menghukum. Nama murid tidak boleh disampaikan kepada murid lain. Butir ditulis untuk Examus dengan empat aspek (mengalami, melakukan, menyaksikan, iklim sekolah) dan belum divalidasi; batas \"kadang-kadang\" mengacu pada Solberg & Olweus (2003), batas rasa aman rendah adalah patokan Examus. Laporan diri bisa kurang melaporkan, jadi tidak adanya tanda bukan jaminan murid aman.")}`;
  return { body, csv: () => [["No", "Nama", "L/P", "Mengalami", "Melakukan", "Menyaksikan", "Saksi pasif", "Rasa aman (0-3)", "Bentuk dialami", ...PR_ITEMS.map((_, i) => `B${i + 1}`)], ...rows.map((r) => (r.filled ? [r.no, r.name, r.g, r.p.victim, r.p.doer, r.p.witness ? "ya" : "", r.p.passive, r.p.safe.toFixed(1).replace(".", ","), r.p.forms.join("; "), ...PR_ITEMS.map((_, i) => r.a[i])] : [r.no, r.name, r.g, "Belum mengisi"]))] };
}
