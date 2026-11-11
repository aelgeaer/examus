// Laporan guru Deteksi Perundungan versi 40 butir (mengikuti contoh). Sesi lama memakai laporan lama.
import { esc } from "./util.js";
import { PR_ITEMS, PR_IDX, prProfile } from "./aman.js";
import { amanReportOld, join, tbl, pct, caveat, unfilled } from "./report-more.js";
import { stack, summary, people, steps, groupCards, hbars, hl, linkBtn } from "./report-v2.js";

const STATUS = ["", "Perlu perhatian", "Perlu tindak lanjut", "Perlu perhatian segera"];
const LV = { "": 0, pantau: 1, perlu: 2, didahulukan: 3 };

export function amanReport(s, res) {
  if ((s.config || {}).n !== 40) return amanReportOld(s, res);
  const rows = join(s, res, prProfile), done = rows.filter((r) => r.filled), N = done.length;
  const val = (r, i) => Number(r.a[i]) || 0;
  const vLv = (p) => LV[p.victim], dLv = (p) => (p.doerSerious ? 3 : LV[p.doer]);
  const wLv = (p) => (p.witLevel === 2 ? 2 : p.witLevel === 1 || p.passive ? 1 : 0);
  const sLv = (p) => (p.lowSafe || p.unsafe ? 2 : p.safe < 2 ? 1 : 0);
  const status = (p) => Math.max(vLv(p), dLv(p), sLv(p), wLv(p) ? 1 : 0, p.passive === "perlu" ? 1 : 0);
  const notes = (p) => [
    p.both ? "korban sekaligus pelaku" : "",
    vLv(p) ? `terindikasi mengalami perundungan (${STATUS[vLv(p)].toLowerCase()})` : "",
    dLv(p) ? `terindikasi melakukan perundungan (${STATUS[dLv(p)].toLowerCase()})` : "",
    sLv(p) >= 2 ? "merasa tidak aman di sekolah" : "",
    p.witLevel === 2 ? "sering menyaksikan perundungan" : "",
    p.passive === "perlu" ? "ikut tertawa atau diam saat ada yang dirundung" : "",
    p.threatened ? "mengaku diancam" : "", p.hurt ? "mengaku disakiti secara fisik" : "",
    p.threatens ? "mengaku mengancam teman" : "", p.hurts ? "mengaku menyakiti teman secara fisik" : "",
    p.noReport ? "tidak tahu ke mana melapor" : "",
  ].filter(Boolean);
  const seg = (f) => { const c = [0, 1, 2, 3].map((l) => done.filter((r) => f(r.p) === l).length); return [{ n: c[0], c: "ok" }, { n: c[1], c: "mid" }, { n: c[2], c: "warn" }, { n: c[3], c: "dark" }]; };
  const priority = done.filter((r) => status(r.p) >= 2).sort((a, b) => status(b.p) - status(a.p));
  const urgent = done.filter((r) => status(r.p) === 3);
  const forms = PR_IDX.korban.map((i) => ({ text: PR_ITEMS[i].text, n: done.filter((r) => val(r, i) >= 2 || (PR_ITEMS[i].serious && val(r, i) >= 1)).length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
  const concern = (r, i) => r.p.adj(i) <= 1;
  const climate = PR_IDX.iklim.map((i) => ({ text: PR_ITEMS[i].text, n: done.filter((r) => concern(r, i)).length }));
  const share = (f) => pct(done.filter((r) => f(r)).length, N);
  const atId = (id) => PR_IDX.at(id);
  const verbalShare = share((r) => ["Ejekan", "Julukan", "Dikucilkan", "Gosip", "Tidak diajak"].some((f) => r.p.forms.includes(f)) || r.p.witLevel >= 1);
  const grp = [
    ["Terindikasi korban", (p) => vLv(p) >= 2 && !p.both, vLv, "Konseling individual, perlindungan, dan pemantauan."],
    ["Korban sekaligus pelaku", (p) => p.both, (p) => Math.max(vLv(p), dLv(p)), "Konseling individual, perlindungan, pembinaan tanggung jawab, dan intervensi perilaku."],
    ["Terindikasi pelaku", (p) => dLv(p) >= 2 && !p.both, dLv, "Konseling individual, pembinaan tanggung jawab, dan pemantauan perilaku; libatkan orang tua."],
    ["Sering menyaksikan", (p) => p.witLevel === 2, () => 2, "Edukasi peran pembela (upstander) dan cara melapor dengan aman."],
    ["Saksi yang membiarkan", (p) => p.passive === "perlu", () => 1, "Bimbingan kelompok tentang peran saksi: tidak ikut menertawakan, menemani korban, dan melapor."],
    ["Merasa tidak aman", (p) => sLv(p) >= 2, (p) => Math.max(2, vLv(p)), "Konseling individual: cari tahu siapa dan apa yang membuatnya takut."],
  ].map(([title, f, lvf, svc]) => ({ title, svc, rows: done.filter((r) => f(r.p)).map((r) => ({ name: r.name, note: STATUS[lvf(r.p)].toLowerCase() })) })).filter((g) => g.rows.length);

  const body = `
    ${summary("Gambaran kelas", urgent.length ? `${urgent.length} murid perlu perhatian segera.` : priority.length ? `${priority.length} murid perlu ditindaklanjuti.` : "Belum ada murid yang perlu segera ditindaklanjuti.",
      "Tiap baris adalah satu aspek. Angka di dalam batang = banyak murid, menurut pernyataan dengan tingkat tertinggi. Ancaman atau kekerasan fisik, walau jarang, langsung masuk perlu perhatian segera.",
      stack([["Korban", seg(vLv)], ["Pelaku", seg(dLv)], ["Saksi", seg(wLv)], ["Rasa aman", seg(sLv)]], [["ok", "Tidak terindikasi / rendah"], ["mid", "Perlu perhatian"], ["warn", "Perlu tindak lanjut"], ["dark", "Perlu perhatian segera"]]))}

    <h2 class="sec-h">Siapa ditemui lebih dulu (${priority.length})</h2>
    <p class="muted">Mulailah dengan percakapan pribadi, bukan dengan menyebut skor atau memanggil murid di depan kelas. Hasil angket adalah indikasi: verifikasi dulu lewat wawancara, keterangan saksi, dan pengamatan guru. Yang "perlu perhatian segera" ditemui hari ini atau besok, terutama bila ada ancaman atau kekerasan fisik.</p>
    ${people(priority.map((r) => ({ name: r.name, tag: STATUS[status(r.p)], note: notes(r.p).join(" · "), cls: status(r.p) === 3 ? "warn" : "soft" })))}

    <h2 class="sec-h">Bentuk yang paling banyak dialami</h2>
    <p class="muted">Banyak murid yang mengalaminya kadang-kadang atau lebih dalam 3 bulan terakhir (ancaman dan kekerasan fisik: walau jarang).</p>
    ${forms.length ? hbars(forms.map((f) => [esc(f.text), f.n, `${f.n} · ${pct(f.n, N)}%`, "warn"]), Math.max(1, N)) : `<div class="card"><p class="muted">Belum ada bentuk perundungan yang dilaporkan dialami.</p></div>`}

    <h2 class="sec-h">Usulan layanan</h2>
    <p class="muted">Murid dikelompokkan menurut indikasinya. Satu murid bisa ada di beberapa kelompok.</p>
    ${groupCards(grp)}
    ${grp.length ? `<ul class="tips" style="margin-top:1rem">${grp.map((g) => `<li><b style="font-weight:600">${esc(g.title)}:</b> ${esc(g.svc)}</li>`).join("")}</ul>` : ""}

    <h2 class="sec-h">Skor per murid</h2>
    ${tbl(["No", "Nama", "L/P", { t: "Korban", num: 1 }, { t: "Pelaku", num: 1 }, { t: "Saksi", num: 1 }, { t: "Iklim", num: 1 }, "Tindak lanjut", { t: "Catatan", wrap: 1 }], rows.map((r) => (r.filled
      ? [r.no, r.name, r.g || "-", hl(r.p.sums.korban, vLv(r.p) >= 2, vLv(r.p) === 3), hl(r.p.sums.pelaku, dLv(r.p) >= 2, dLv(r.p) === 3), hl(r.p.sums.saksi, wLv(r.p) >= 1), hl(r.p.sums.iklim, sLv(r.p) >= 1, sLv(r.p) >= 2), STATUS[status(r.p)] || "-", notes(r.p).join(", ") || "-"]
      : [r.no, r.name, r.g || "-", "-", "-", "-", "-", "-", "Belum mengisi"])))}
    <p class="muted small" style="margin-top:.5rem">Korban, pelaku, dan saksi = jumlah 10 pernyataan (0 tidak pernah sampai 4 sangat sering), jadi 0-40. Iklim = jumlah risiko 10 pernyataan rasa aman (0 sangat sesuai sampai 3 tidak sesuai; pernyataan tentang rasa takut dan menghindar dihitung terbalik), jadi 0-30; makin tinggi makin berisiko. Sel bersorot = ada pernyataan di aspek itu yang mencapai batas indikasi. Tingkat indikasi mengikuti pernyataan tertinggi, bukan jumlahnya: satu bentuk yang sering dialami sudah berarti.</p>
    ${unfilled(rows)}

    <h2 class="sec-h">Keamanan dan iklim sosial sekolah</h2>
    <p class="muted">Banyak murid yang kurang atau tidak setuju dengan pernyataan positif, atau setuju dengan pernyataan tentang rasa takut.</p>
    ${hbars(climate.map((c) => [esc(c.text), c.n, `${c.n} · ${pct(c.n, N)}%`, "warn"]), Math.max(1, N))}

    ${steps("Tindak lanjut untuk kelas ini", [
      ...(verbalShare >= 25 ? ["Ejekan, julukan, pengucilan, atau gosip cukup banyak dialami atau dilihat. Adakan bimbingan klasikal tentang beda bercanda dan merundung (sama-sama tertawa, atau hanya satu pihak yang tertawa?), lalu sepakati aturan kelas bersama murid."] : []),
      ...(share((r) => r.p.passive) >= 20 ? ["Banyak murid ikut tertawa atau memilih diam saat ada yang dirundung. Latih peran pembela yang aman: tidak ikut menonton, menemani korban, mengajaknya pergi, dan melapor tanpa harus melawan."] : []),
      ...(share((r) => r.p.noReport || r.p.noTrust) >= 20 ? ["Cukup banyak murid belum tahu ke mana melapor atau belum yakin guru BK akan membantu. Sampaikan jalur melapor yang jelas dan aman (guru BK, wali kelas, TPPK, kotak atau formulir rahasia), dan tunjukkan bahwa laporan ditindaklanjuti."] : []),
      ...(share((r) => r.p.unsafe || concern(r, atId("takut")) || concern(r, atId("hindari"))) >= 20 ? ["Sebagian murid merasa tidak aman, takut pada siswa tertentu, atau menghindari tempat tertentu. Petakan tempat dan waktu rawan (kantin, toilet, jam istirahat, pulang sekolah) bersama TPPK, lalu atur pengawasannya."] : []),
      "Untuk semua murid: tegaskan bahwa perundungan tidak diterima di sekolah ini, bahwa melapor bukan mengadu, dan bahwa identitas pelapor dijaga.",
    ])}

    <h2 class="sec-h">Alur penanganan</h2>
    <ol class="tips">
      <li>Pengisian angket oleh murid.</li>
      <li>Penilaian dan pemilahan indikasi: laporan ini.</li>
      <li>Wawancara dan verifikasi: percakapan pribadi dengan murid yang terindikasi, mulai dari yang perlu perhatian segera, ditambah keterangan saksi dan pengamatan guru.</li>
      <li>Penentuan perlindungan dan intervensi: bila dugaan terkonfirmasi, tangani bersama TPPK sekolah sesuai Permendikbudristek 46/2023.</li>
      <li>Evaluasi dan pemantauan: temui lagi murid yang ditangani dalam 1-2 minggu, dan ulangi angket ini satu semester lagi.</li>
    </ol>

    <h2 class="sec-h">Keterangan istilah</h2>
    <dl class="gloss">
      <dt>Perlu perhatian segera</dt><dd>Mengalami atau melakukan ancaman atau kekerasan fisik, walau hanya "jarang". Keselamatan ditangani dulu.</dd>
      <dt>Perlu tindak lanjut</dt><dd>Mengalami atau melakukan setidaknya satu bentuk lain "kadang-kadang" atau lebih (batas Solberg & Olweus, 2003, kira-kira 2-3 kali sebulan), atau merasa tidak aman di sekolah.</dd>
      <dt>Perlu perhatian</dt><dd>Mengalami atau melakukan perundungan hanya "jarang", menyaksikan perundungan, ikut tertawa atau diam saja, atau rasa aman agak rendah.</dd>
      <dt>Korban sekaligus pelaku</dt><dd>Mengalami dan juga melakukan perundungan. Kelompok ini sering paling rentan; dampingi, jangan diperlakukan semata sebagai pelaku.</dd>
      <dt>Rasa aman dan iklim</dt><dd>Sepuluh pernyataan kesesuaian. Rasa aman rendah: rata-rata di bawah 1,5 dari 3 atau menjawab kurang sesuai pada "Aku merasa aman saat berada di sekolah" (patokan Examus).</dd>
    </dl>
    ${caveat("Hasil ini adalah skrining awal dari jawaban murid sendiri, bukan bukti dan bukan vonis. Verifikasi setiap indikasi lewat wawancara, keterangan saksi, dan pengamatan sebelum mengambil langkah. Jangan memakai hasilnya untuk menghukum: murid yang jujur mengaku pernah merundung justru sedang membuka jalan untuk berubah. Jangan memberi label (\"si pelaku\", \"si korban\"), jangan menyebut hasil di depan kelas, dan jangan mempertemukan korban dengan terduga pelaku tanpa persiapan. Jaga kerahasiaan, tetapi jangan menjanjikan kerahasiaan mutlak bila ada ancaman keselamatan: kasus kekerasan ditangani bersama TPPK sesuai Permendikbudristek 46/2023. Batas indikasi adalah panduan operasional awal, bukan norma baku; instrumen ini belum diuji validitas dan reliabilitasnya.")}
    ${linkBtn(`#/mulai/sosiometri${s.classId ? "?kelas=" + s.classId : ""}`, "Lihat peta pertemanan kelas dengan Sosiometri")}`;
  return { body, csv: () => [["No", "Nama", "L/P", "Korban (0-40)", "Pelaku (0-40)", "Saksi (0-40)", "Iklim risiko (0-30)", "Tindak lanjut", "Catatan", ...PR_ITEMS.map((_, i) => `B${i + 1}`)], ...rows.map((r) => (r.filled ? [r.no, r.name, r.g, r.p.sums.korban, r.p.sums.pelaku, r.p.sums.saksi, r.p.sums.iklim, STATUS[status(r.p)], notes(r.p).join("; "), ...PR_ITEMS.map((_, i) => r.a[i])] : [r.no, r.name, r.g, "Belum mengisi"]))] };
}
