// Laporan guru versi 2 (mengikuti contoh): Kekuatan & Kesulitan, Suasana Hati, Tipe Kepribadian, AKPD.
// Deteksi Perundungan ada di report-aman.js. Komponen tampilan bersama juga diekspor dari sini.
import { esc } from "./util.js";
import { join, tbl, pct, caveat, unfilled } from "./report-more.js";
import {
  KK_AREAS, kkProfile, kkLevel, kkTotalLevel, kkLevelName,
  PHQ_OPTS, PHQ_IMPACT, phqItems, phqProfile,
  TK_ITEMS, TK_DIMS, TK_AXIS, tkProfile,
  AKPD_BIDANG, akpdItems,
} from "./instruments.js";

/* ---------------- Komponen bersama ---------------- */
// Batang bertumpuk: rows = [[label, [{ n, c }]]], c = ok | mid | warn | dark.
export const stack = (rows, legend) => `<div class="stk">${rows.map(([label, segs]) => `<div class="stk-row"><span class="nm">${esc(label)}</span><span class="bar">${segs.filter((s) => s.n > 0).map((s) => `<i class="${s.c}" style="flex:${s.n}">${s.n}</i>`).join("") || `<i class="none" style="flex:1">0</i>`}</span></div>`).join("")}</div>
  <div class="stk-legend">${legend.map(([c, t]) => `<span><i class="${c}"></i>${esc(t)}</span>`).join("")}</div>`;
export const summary = (eyebrow, head, text, inner) => `<div class="card sumcard"><p class="eyebrow" style="margin-top:0">${eyebrow}</p><h2>${head}</h2>${text ? `<p class="muted" style="margin-top:.4rem">${text}</p>` : ""}<div style="margin-top:1.1rem">${inner}</div></div>`;
// Daftar murid: { name, tag, note, cls: warn | soft | white }
export const people = (rows) => (rows.length ? `<ul class="who">${rows.map((r) => `<li class="${r.cls || "warn"}"><div class="top"><b>${esc(r.name)}</b>${r.tag ? `<span class="tag2">${esc(r.tag)}</span>` : ""}</div>${r.note ? `<p class="small">${esc(r.note)}</p>` : ""}</li>`).join("")}</ul>` : `<div class="card"><p class="muted">Tidak ada.</p></div>`);
export const steps = (title, list) => `<h2 class="sec-h">${title}</h2><ol class="strat">${list.map((x, i) => `<li class="hi"><span>${i + 1}</span>${x}</li>`).join("")}</ol>`;
export const groupCards = (cards) => (cards.length ? `<div class="ggroups">${cards.map((c) => `<div class="card"><p class="gh">${esc(c.title)} <span class="muted">${c.rows.length}</span></p>${c.sub ? `<p class="muted small" style="margin-top:.2rem">${esc(c.sub)}</p>` : ""}<ul>${c.rows.map((r) => `<li><span>${esc(r.name)}</span><span class="muted small">${esc(r.note || "")}</span></li>`).join("")}</ul></div>`).join("")}</div>` : `<div class="card"><p class="muted">Belum ada murid yang perlu dikelompokkan.</p></div>`);
// Batang mendatar: rows = [[labelHtml, n, rightText, cls]]
export const hbars = (rows, max) => `<div class="hbars">${rows.map(([label, n, right, cls]) => `<div class="hb"><span class="nm">${label}</span><span class="track"><i class="${cls || ""}" style="width:${max ? Math.min(100, (n / max) * 100) : 0}%"></i></span><span class="val">${esc(right)}</span></div>`).join("")}</div>`;
export const hl = (v, on, strong = false) => ({ html: on ? `<span class="hl${strong ? " hl2" : ""}">${esc(String(v))}</span>` : esc(String(v)) });
export const linkBtn = (href, text) => `<p class="no-print" style="margin-top:1rem"><a class="btn" href="${href}">${esc(text)} →</a></p>`;
const kelas = (s) => (s.classId ? `?kelas=${s.classId}` : "");
const dec = (x) => x.toFixed(2).replace(".", ",");

/* ---------------- Kekuatan & Kesulitan ---------------- */
const KK_THEME = { emosi: "Mengelola cemas dan sedih", perilaku: "Mengelola marah dan menyelesaikan konflik", fokus: "Mengatur fokus dan kebiasaan belajar", teman: "Berteman dan menghadapi gangguan" };
const KK_SHORT = { emosi: "Emo", perilaku: "Per", fokus: "Fok", teman: "Tem", peduli: "Ped" };
export function kekuatanReport2(s, res) {
  const rows = join(s, res, kkProfile), done = rows.filter((r) => r.filled), N = done.length;
  const DIFF = ["emosi", "perilaku", "fokus", "teman"], ALL = [...DIFF, "peduli"];
  const lv = (r, k) => (k === "total" ? kkTotalLevel(r.p.total) : kkLevel(r.p.s[k], k));
  const status = (r) => (kkTotalLevel(r.p.total) >= 2 || r.p.impact >= 2 || DIFF.some((k) => lv(r, k) >= 2) ? "talk"
    : kkTotalLevel(r.p.total) === 1 || DIFF.some((k) => lv(r, k) === 1) || r.p.bullied || lv(r, "peduli") >= 2 ? "watch" : "");
  const flags = (r) => [
    ...DIFF.filter((k) => lv(r, k) >= 1).map((k) => `${KK_AREAS[k].toLowerCase()} ${lv(r, k) >= 2 ? "perlu perhatian" : "perlu diamati"}`),
    lv(r, "peduli") >= 2 ? "kepedulian rendah" : "", r.p.bullied ? "sering diganggu" : "", r.p.impact >= 2 ? "merasa terbebani" : "",
  ].filter(Boolean);
  const talk = done.filter((r) => status(r) === "talk"), watch = done.filter((r) => status(r) === "watch");
  const seg = (k) => { const c = [0, 1, 2].map((x) => done.filter((r) => (x < 2 ? lv(r, k) === x : lv(r, k) >= 2)).length); return [{ n: c[0], c: "ok" }, { n: c[1], c: "mid" }, { n: c[2], c: "warn" }]; };
  const share = (k) => pct(done.filter((r) => lv(r, k) >= 1).length, N);
  const primary = (r) => [...DIFF].sort((a, b) => lv(r, b) - lv(r, a) || r.p.s[b] - r.p.s[a])[0];
  const flagged = [...talk, ...watch].filter((r) => DIFF.some((k) => lv(r, k) >= 1));
  const groups = DIFF.map((k) => ({ title: KK_THEME[k], rows: flagged.filter((r) => primary(r) === k).map((r) => ({ name: r.name, note: lv(r, k) >= 2 ? "perlu perhatian" : "perlu diamati" })) })).filter((g) => g.rows.length);
  const buddies = done.filter((r) => !status(r) && lv(r, "peduli") === 0);
  if (buddies.length) groups.push({ title: "Calon teman pendamping", sub: "Kepeduliannya tinggi dan tidak perlu ditindaklanjuti.", rows: buddies.map((r) => ({ name: r.name, note: `peduli ${r.p.s.peduli}` })) });
  const IMP = ["Tidak", "Ya, sedikit", "Ya, jelas", "Ya, berat"];
  const body = `
    ${summary("Gambaran kelas", talk.length ? `${talk.length} murid perlu diajak bicara minggu ini.` : "Belum ada murid yang perlu segera diajak bicara.", "Tiap baris adalah satu area. Angka di dalam batang = banyak murid. Kepedulian adalah kekuatan, jadi yang perlu dikembangkan justru skornya rendah.",
      stack([["Total kesulitan", seg("total")], ...ALL.map((k) => [KK_AREAS[k], seg(k)])], [["ok", "Wajar (kepedulian: kekuatan)"], ["mid", "Perlu diamati"], ["warn", "Perlu perhatian (kepedulian: perlu dikembangkan)"]]))}

    <h2 class="sec-h">Siapa didahulukan (${talk.length + watch.length})</h2>
    <p class="muted">Mulailah dengan percakapan pribadi yang hangat, bukan dengan menyebut skor. Tanyakan kabarnya, dengarkan, lalu cocokkan dengan pengamatan Anda, wali kelas, dan orang tua. Yang "Ajak bicara minggu ini" didahulukan.</p>
    ${people([...talk.map((r) => ({ name: r.name, tag: "Ajak bicara minggu ini", note: flags(r).join(" · ") })), ...watch.map((r) => ({ name: r.name, tag: "Amati", note: flags(r).join(" · "), cls: "soft" }))])}

    <h2 class="sec-h">Usulan bimbingan kelompok</h2>
    <p class="muted">Murid dikelompokkan menurut area yang paling menonjol, untuk 4 sampai 8 murid per kelompok. Calon teman pendamping: kepeduliannya tinggi dan tidak perlu ditindaklanjuti.</p>
    ${groupCards(groups)}

    <h2 class="sec-h">Skor per murid</h2>
    ${tbl(["No", "Nama", "L/P", ...ALL.map((k) => ({ t: KK_SHORT[k], num: 1 })), { t: "Total", num: 1 }, "Beban", "Tindak lanjut", { t: "Catatan", wrap: 1 }], rows.map((r) => (r.filled
      ? [r.no, r.name, r.g || "-", ...ALL.map((k) => hl(r.p.s[k], lv(r, k) >= 1, lv(r, k) >= 2)), hl(r.p.total, lv(r, "total") >= 1, lv(r, "total") >= 2), IMP[r.p.impact] || "-", status(r) === "talk" ? "Ajak bicara" : status(r) === "watch" ? "Amati" : "-", flags(r).join(", ") || "-"]
      : [r.no, r.name, r.g || "-", ...ALL.map(() => "-"), "-", "-", "-", "Belum mengisi"])))}
    <p class="muted small" style="margin-top:.5rem">Tiap area 0-10 (5 kalimat: tidak benar 0, agak benar 1, benar 2; lima kalimat positif dihitung terbalik). Total kesulitan = emosi + perilaku + fokus + teman (0-40). Sel bersorot = di luar batas wajar (total 16, emosi 6, perilaku 4, fokus 6, teman 3, atau kepedulian di bawah 6); sorot merah = tinggi atau sangat tinggi. Batas mengikuti tabel SDQ laporan diri usia 11-17 (norma Inggris) dan bersifat sementara.</p>
    ${unfilled(rows)}

    <h2 class="sec-h">Keterangan istilah</h2>
    <dl class="gloss">
      <dt>Lima area</dt><dd>Emosi, perilaku, fokus (hiperaktivitas atau kurang perhatian), teman (masalah dengan teman sebaya), dan kepedulian (perilaku prososial). Empat area pertama mengukur kesulitan; kepedulian mengukur kekuatan.</dd>
      <dt>Wajar, perlu diamati, perlu perhatian</dt><dd>Wajar = pita wajar SDQ. Perlu diamati = pita sedikit meningkat. Perlu perhatian = pita tinggi atau sangat tinggi. Kira-kira 80%, 10%, dan 10% anak pada sampel normatif.</dd>
      <dt>Ajak bicara minggu ini / amati</dt><dd>Ajak bicara: total kesulitan 20 ke atas, satu area tinggi, atau murid merasa jelas terbebani. Amati: total 16-19, satu area sedikit meningkat, sering diganggu, atau kepedulian rendah.</dd>
      <dt>Beban</dt><dd>Jawaban murid atas pertanyaan apakah ia sedang punya kesulitan dengan perasaan, konsentrasi, perilaku, atau pertemanan.</dd>
      <dt>Sering diganggu</dt><dd>Menjawab agak benar atau benar pada "Aku sering diejek, diganggu, atau dijahili anak lain".</dd>
    </dl>

    ${steps("Tindak lanjut untuk kelas ini", [
      ...(share("perilaku") >= 25 ? ["Banyak murid melaporkan sulit menahan marah atau sering bertengkar. Sepakati ulang aturan kelas bersama murid, latih cara jeda saat marah, dan perbanyak pujian untuk perilaku yang diharapkan."] : []),
      ...(share("teman") >= 25 || done.filter((r) => r.p.bullied).length >= 2 ? ["Banyak murid melaporkan kesulitan berteman atau sering diganggu. Periksa suasana kelas, tegaskan aturan anti-perundungan, atur kelompok kerja secara terencana, dan pertimbangkan Sosiometri atau Deteksi Perundungan."] : []),
      ...(share("emosi") >= 25 ? ["Banyak murid melaporkan cemas, sedih, atau takut. Adakan bimbingan klasikal tentang mengenali dan mengelola perasaan, dan pertimbangkan skrining Suasana Hati."] : []),
      ...(share("fokus") >= 25 ? ["Banyak murid sulit tenang dan fokus. Pecah tugas menjadi langkah pendek, beri jeda gerak, dan pakai rutinitas kelas yang jelas."] : []),
      "Untuk semua murid: sampaikan bahwa guru BK terbuka untuk diajak bicara, dan bahwa meminta bantuan adalah tanda berani, bukan lemah.",
      "Ulangi asesmen ini satu semester lagi untuk melihat apakah dukungan yang diberikan membantu.",
    ])}
    ${caveat("Hasil ini skrining dari jawaban murid sendiri, bukan diagnosis. Jangan memberi label kepada murid (\"anak bermasalah\", \"hiperaktif\"), jangan menyebut hasilnya di depan kelas, dan jangan memakainya untuk hukuman atau nilai. Cocokkan dengan pengamatan guru dan orang tua; hanya psikolog atau psikiater yang dapat menegakkan diagnosis. Butir dan batas pita mengikuti SDQ laporan diri (hak cipta Robert Goodman) dengan norma Inggris, jadi bersifat sementara. Hasil per murid bersifat rahasia, untuk guru BK dan wali kelas.")}
    ${linkBtn(`#/mulai/emosi${kelas(s)}`, "Lihat gejala depresi dengan Suasana Hati (PHQ-9)")}`;
  return { body, csv: () => [["No", "Nama", "L/P", ...Object.values(KK_AREAS), "Total kesulitan", "Pita total", "Beban", "Tindak lanjut", "Catatan"], ...rows.map((r) => (r.filled ? [r.no, r.name, r.g, ...ALL.map((k) => r.p.s[k]), r.p.total, kkLevelName(kkTotalLevel(r.p.total)), r.p.impact, status(r) === "talk" ? "Ajak bicara" : status(r) === "watch" ? "Amati" : "", flags(r).join("; ")] : [r.no, r.name, r.g, "Belum mengisi"]))] };
}

/* ---------------- Suasana Hati (PHQ-9 / PHQ-8) ---------------- */
const PHQ_SHORT = ["Kehilangan minat atau rasa senang", "Sedih, murung, mudah kesal, putus asa", "Gangguan tidur", "Lelah, kurang tenaga", "Perubahan nafsu makan", "Merasa buruk, gagal, atau bersalah", "Sulit berkonsentrasi", "Sangat lambat atau sangat gelisah", "Pikiran tentang kematian atau menyakiti diri"];
export function emosiReport2(s, res) {
  const cfg = s.config || {}, items = phqItems(cfg), has9 = items.length === 9, MAX = items.length * 3;
  const rows = join(s, res, (a) => phqProfile(a, cfg)), done = rows.filter((r) => r.filled), N = done.length;
  const by = (l) => done.filter((r) => r.p.level === l).sort((a, b) => b.p.item9 - a.p.item9 || b.p.total - a.p.total);
  const today = by(3), week = by(2), watch = by(1), pos = done.filter((r) => r.p.positive);
  const note = (r) => [r.p.item9 ? `nomor 9: ${PHQ_OPTS[r.p.item9].t.toLowerCase()}` : "", r.p.total >= 5 ? `skor ${r.p.total} (${r.p.band.toLowerCase()})` : "", r.p.impact >= 2 ? "keseharian sangat terganggu" : "", r.p.pattern === "mayor" ? "pola gejala mayor" : ""].filter(Boolean).join(" · ");
  const sym = (i) => done.filter((r) => Number(r.a[i]) >= (i === 8 ? 1 : 2)).length;
  const symShare = (...ids) => Math.max(...ids.map((i) => pct(sym(i), N)));
  const BANDS = [["Minimal", "0-4"], ["Ringan", "5-9"], ["Sedang", "10-14"], ["Sedang-berat", "15-19"], ["Berat", `20-${MAX}`]];
  const LEVEL = ["-", "Pantau", "Minggu ini", "Hari ini"];
  const body = `
    ${!has9 ? `<div class="notice"><b style="font-weight:600">Sesi ini memakai PHQ-8 (tanpa nomor 9).</b> Laporan tidak bisa menunjukkan siapa yang berpikir menyakiti diri. Tanyakan keselamatan secara langsung pada setiap murid dengan skor 10 ke atas.</div>` : ""}
    ${today.length ? `<div class="urgent"><h2>Temui hari ini (${today.length})</h2>
      <p>${has9 ? "Menjawab nomor 9 (pikiran lebih baik mati atau menyakiti diri) selain \"tidak pernah\", atau skor 20 ke atas." : "Skor 20 ke atas."} Jangan tunggu sampai laporan selesai dibaca.</p>
      ${people(today.map((r) => ({ name: r.name, tag: note(r), cls: "white" })))}
      <ol class="proto">
        <li>Hari ini juga, ajak murid bicara berdua di tempat yang tenang. Jangan menunggu jadwal konseling.</li>
        <li>Tanyakan langsung dan tenang tentang pikiran menyakiti diri atau mengakhiri hidup. Bertanya tidak menanamkan ide; justru membuka jalan untuk ditolong.</li>
        <li>Bila ia punya rencana, pernah mencoba, atau merasa tidak aman: jangan tinggalkan sendirian, hubungi orang tua atau wali, dan antar ke IGD atau puskesmas hari itu.</li>
        <li>Bila tidak ada rencana: susun rencana keselamatan bersama (tanda bahaya, siapa yang dihubungi, Healing119 di 119 tekan 8), beri tahu orang tua atau wali sesuai prosedur, dan rujuk ke psikolog atau puskesmas.</li>
        <li>Bila bahaya diduga datang dari rumah, jangan menghubungi orang tua lebih dulu: ikuti jalur perlindungan anak sekolah (TPPK, UPTD PPA atau Dinas P3A setempat).</li>
        <li>Catat tanggal, isi pembicaraan, dan siapa yang dihubungi. Temui lagi dalam beberapa hari.</li>
      </ol></div>` : ""}

    ${summary("Gambaran kelas · dua minggu terakhir", `${pos.length} dari ${N} murid punya skor 10 atau lebih: gejala sedang sampai berat.`, `Skor 0-${MAX}. Tingkat menggambarkan kuatnya gejala, bukan diagnosis.`,
      hbars(BANDS.map(([b, range], i) => { const n = done.filter((r) => r.p.band === b).length; return [`${b} <small class="muted">${range}</small>`, n, String(n), i >= 2 ? "warn" : i === 1 ? "ok" : "grey"]; }), Math.max(1, N)))}

    ${week.length ? `<h2 class="sec-h">Temui minggu ini (${week.length})</h2><p class="muted">Skor 15-19, atau skor 10 ke atas dengan keseharian sangat terganggu. Ajak bicara dan pertimbangkan rujukan.</p>${people(week.map((r) => ({ name: r.name, tag: "Minggu ini", note: note(r) })))}` : ""}
    ${watch.length ? `<h2 class="sec-h">Pantau (${watch.length})</h2><p class="muted">Skor 10-14, skor 5-9 dengan keseharian sangat terganggu, atau pola gejala mayor. Sapa berkala dan ulangi skrining 2-4 minggu lagi.</p>${people(watch.map((r) => ({ name: r.name, tag: "Pantau", note: note(r), cls: "soft" })))}` : ""}

    <h2 class="sec-h">Gejala yang sering muncul di kelas</h2>
    <p class="muted">Banyak murid yang mengalaminya lebih dari seminggu atau hampir setiap hari${has9 ? " (nomor 9: dijawab selain \"tidak pernah\")" : ""}.</p>
    ${hbars(items.map((_, i) => [`${i + 1}. ${PHQ_SHORT[i]}`, sym(i), String(sym(i)), "ink"]), Math.max(1, N))}

    <h2 class="sec-h">Skor per murid</h2>
    ${tbl(["No", "Nama", "L/P", ...items.map((_, i) => ({ t: String(i + 1), num: 1 })), { t: "Total", num: 1 }, "Tingkat", "Keseharian", "Tindak lanjut"], rows.map((r) => (r.filled
      ? [r.no, r.name, r.g || "-", ...items.map((_, i) => hl(Number(r.a[i]) || 0, Number(r.a[i]) >= (i === 8 ? 1 : 2), i === 8 && Number(r.a[i]) >= 1)), hl(r.p.total, r.p.total >= 10, r.p.total >= 15), r.p.band, PHQ_IMPACT[r.p.impact]?.t || "-", LEVEL[r.p.level]]
      : [r.no, r.name, r.g || "-", ...items.map(() => "-"), "-", "Belum mengisi", "-", "-"])))}
    <p class="muted small" style="margin-top:.5rem">Angka 1-${items.length} = nomor butir (0 tidak pernah sampai 3 hampir setiap hari). Total 0-${MAX}: minimal 0-4, ringan 5-9, sedang 10-14, sedang-berat 15-19, berat 20 ke atas. Sel bersorot = gejala lebih dari seminggu, nomor 9 selain "tidak pernah", atau total 10 ke atas.</p>
    ${unfilled(rows)}

    <h2 class="sec-h">Keterangan istilah</h2>
    <dl class="gloss">
      <dt>Skor dan tingkat</dt><dd>Jumlah nilai semua butir. Pita standar PHQ-9 (Kroenke dkk., 2001), juga untuk PHQ-8. Skor 10 ke atas = skrining positif, perlu evaluasi lanjut; pada remaja 13-17 tahun titik potong 11 paling seimbang (Richardson dkk., 2010).</dd>
      <dt>Nomor 9</dt><dd>Pikiran lebih baik mati atau menyakiti diri. Jawaban apa pun selain "tidak pernah" ditindaklanjuti hari itu juga, berapa pun skornya.</dd>
      <dt>Hari ini / minggu ini / pantau</dt><dd>Hari ini: nomor 9 atau skor 20 ke atas. Minggu ini: skor 15-19, atau 10 ke atas dengan keseharian sangat terganggu. Pantau: skor 10-14, skor 5-9 dengan keseharian sangat terganggu, atau pola gejala mayor. Pengaruh keseharian pada prioritas adalah kebijakan Examus.</dd>
      <dt>Pola gejala mayor</dt><dd>Algoritma PHQ-9: lima gejala atau lebih muncul lebih dari seminggu, termasuk nomor 1 atau 2. Hanya petunjuk untuk wawancara klinis, bukan diagnosis.</dd>
      <dt>Keseharian</dt><dd>Seberapa sulit gejala itu membuat murid belajar, mengurus urusan di rumah, atau bergaul.</dd>
      <dt>Perubahan bermakna</dt><dd>Bila skrining diulang, perubahan 5 poin atau lebih dianggap bermakna secara klinis (Löwe dkk., 2004).</dd>
    </dl>

    ${steps("Untuk seluruh kelas", [
      ...(symShare(2, 3) >= 30 ? ["Banyak murid kurang tidur atau mudah lelah. Bahas kebersihan tidur di kelas (jam tidur tetap, gawai disimpan sebelum tidur) dan tinjau beban PR yang menumpuk."] : []),
      ...(symShare(1, 5) >= 30 ? ["Banyak murid merasa murung atau gagal. Kurangi perbandingan antarmurid, beri umpan balik yang menyebut kemajuan, dan adakan bimbingan klasikal tentang mengelola stres dan bicara baik kepada diri sendiri."] : []),
      ...(symShare(6) >= 30 ? ["Banyak murid sulit berkonsentrasi. Periksa beban belajar dan jadwal, dan ajarkan cara membagi tugas menjadi langkah kecil."] : []),
      "Sampaikan kepada seluruh kelas siapa yang bisa didatangi saat sedang berat, termasuk Healing119 (telepon 119, tekan 8), tanpa menyebut hasil siapa pun.",
      "Ulangi skrining 2-4 minggu lagi untuk murid yang dipantau, dan satu semester lagi untuk seluruh kelas.",
    ])}
    ${caveat("PHQ-9 adalah alat skrining, bukan alat diagnosis: skor tinggi berarti murid perlu dinilai oleh tenaga profesional (psikolog, psikiater, atau dokter), bukan bahwa ia \"depresi\". Jangan menyebut hasilnya kepada murid lain, jangan memakai label, dan jangan memakainya untuk nilai atau hukuman. Skor bisa dipengaruhi rasa malu, kondisi fisik, atau keadaan sesaat, dan tidak menangkap gangguan lain seperti kecemasan. Hasil per murid bersifat rahasia, hanya untuk guru BK dan pihak yang menangani.")}
    ${linkBtn(`#/mulai/kekuatan${kelas(s)}`, "Lihat emosi, perilaku, dan pertemanan dengan Kekuatan & Kesulitan")}`;
  return { body, csv: () => [["No", "Nama", "L/P", ...items.map((_, i) => `B${i + 1}`), "Skor", "Tingkat", "Gejala", "Pola", "Keseharian", "Tindak lanjut"], ...rows.map((r) => (r.filled ? [r.no, r.name, r.g, ...items.map((_, i) => r.a[i]), r.p.total, r.p.band, r.p.count, r.p.pattern, r.p.impact, LEVEL[r.p.level]] : [r.no, r.name, r.g, "Belum mengisi"]))] };
}

/* ---------------- Tipe Kepribadian ---------------- */
const TK_NAME = { E: "Ekstrovert", I: "Introvert", S: "Sensing", N: "Intuitif", T: "Thinking", F: "Feeling", J: "Judging", P: "Perceiving" };
const TK_TABLE = [["ISTJ", "ISFJ", "INFJ", "INTJ"], ["ISTP", "ISFP", "INFP", "INTP"], ["ESTP", "ESFP", "ENFP", "ENTP"], ["ESTJ", "ESFJ", "ENFJ", "ENTJ"]];
const TK_GROUP = { ST: "Praktis dan logis", SF: "Praktis dan peduli", NF: "Imajinatif dan peduli", NT: "Imajinatif dan logis" };
export function kepribadianReport2(s, res) {
  const rows = join(s, res, tkProfile), done = rows.filter((r) => r.filled), N = done.length;
  const count = (t) => done.filter((r) => r.p.type === t).length, maxC = Math.max(1, ...TK_TABLE.flat().map(count));
  const pairs = Object.entries(TK_DIMS).map(([d, [L, R]]) => ({ d, L, R, nL: done.filter((r) => r.p.type.includes(L)).length }));
  const lead = [...pairs].sort((a, b) => Math.abs(b.nL - (N - b.nL)) - Math.abs(a.nL - (N - a.nL))).slice(0, 2).map((p) => { const w = p.nL >= N - p.nL ? p.L : p.R; return `${TK_NAME[w]} (${w === p.L ? p.nL : N - p.nL} dari ${N})`; });
  const straight = (r) => { const pos = TK_ITEMS.map((it, i) => it.options.findIndex((o) => o.v === r.a[i])).filter((x) => x >= 0); return pos.length >= 30 && pos.every((x) => x === pos[0]); };
  const talk = done.filter((r) => r.p.flexible || straight(r)).map((r) => ({ name: r.name, tag: straight(r) ? "jawaban semuanya di posisi yang sama" : "preferensi belum terlihat jelas" }));
  const axisTxt = (x) => `${x.win} ${x.strength}`;
  const heat = (c) => (c ? `style="background:rgba(232,120,120,${(0.25 + 0.6 * (c / maxC)).toFixed(2)})"` : "");
  const body = `
    <div class="card sumcard tkcard"><div class="tkhead"><div>
      <p class="eyebrow" style="margin-top:0">Sebaran tipe di kelas</p>
      <h2>${N ? `Kelas ini lebih banyak ${lead.join(" dan ")}.` : "Belum ada yang mengisi."}</h2>
      <p class="muted" style="margin-top:.5rem">Setiap kelas berisi beragam tipe. Pakai sebaran ini untuk memberi ruang pada kedua sisi setiap pasangan, bukan untuk mengelompokkan murid menurut tipe.</p></div>
      <div><div class="tkheat">${TK_TABLE.flat().map((t) => `<div ${heat(count(t))}><small>${t}</small><b>${count(t)}</b></div>`).join("")}</div>
      <p class="muted small" style="margin-top:.4rem">Baris: IJ, IP, EP, EJ. Kolom: ST, SF, NF, NT. Makin merah muda, makin banyak murid.</p></div></div>
      <div class="tkpairs">${pairs.map((p) => `<div class="tkp"><p class="t">${TK_AXIS[p.d].title}</p><div class="row"><span>${p.L} · ${TK_NAME[p.L]} <b>${p.nL}</b></span><span class="bar"><i style="width:${N ? (p.nL / N) * 100 : 0}%"></i></span><span><b>${N - p.nL}</b> ${TK_NAME[p.R]} · ${p.R}</span></div></div>`).join("")}</div></div>

    <h2 class="sec-h">Perlu diajak bicara (${talk.length})</h2>
    <p class="muted">Preferensi yang belum jelas bukan masalah: murid bisa jadi luwes, masih mengenal dirinya, atau kurang serius mengisi. Ajak mengobrol tentang hasilnya dan tanyakan bagian mana yang terasa cocok. Jawaban yang semuanya di posisi yang sama bisa diulang lewat sesi baru.</p>
    ${people(talk)}

    <h2 class="sec-h">Murid per kelompok preferensi</h2>
    <p class="muted">Dikelompokkan menurut huruf tengah (cara menangkap informasi dan mengambil keputusan). Untuk bimbingan klasikal: tiap kelompok bercerita apa yang membantunya belajar. Untuk kerja kelompok, campurlah anggota dari kelompok yang berbeda.</p>
    ${groupCards(Object.keys(TK_GROUP).map((g) => ({ title: `${g} · ${TK_GROUP[g]}`, rows: done.filter((r) => r.p.type.slice(1, 3) === g).map((r) => ({ name: r.name, note: r.p.type })) })).filter((c) => c.rows.length))}

    <h2 class="sec-h">Skor per murid</h2>
    ${tbl(["No", "Nama", "L/P", "E/I", "S/N", "T/F", "J/P", "Tipe", { t: "Catatan", wrap: 1 }], rows.map((r) => (r.filled
      ? [r.no, r.name, r.g || "-", ...r.p.axes.map((x) => ({ html: x.strength === "jelas" ? `<b>${esc(axisTxt(x))}</b>` : esc(axisTxt(x)) })), r.p.type, straight(r) ? "jawaban semuanya di posisi yang sama" : r.p.flexible ? "preferensi belum terlihat jelas" : "-"]
      : [r.no, r.name, r.g || "-", "-", "-", "-", "-", "Belum mengisi", "-"])))}
    <p class="muted small" style="margin-top:.5rem">Tiap pasangan diukur dengan 11 situasi dua pilihan. Huruf = sisi yang lebih sering dipilih, diikuti kejelasannya: jelas (10-11 dari 11, ditebalkan), sedang (8-9), atau tipis (6-7). Huruf yang tipis bisa berubah bila diisi ulang. "Preferensi belum terlihat jelas": tiga pasangan atau lebih tipis.</p>
    ${unfilled(rows)}

    <h2 class="sec-h">Keterangan istilah</h2>
    <dl class="gloss">
      <dt>Empat pasangan</dt><dd>E/I sumber energi (bersama orang atau waktu sendiri), S/N cara menangkap informasi (fakta nyata atau ide dan kemungkinan), T/F cara mengambil keputusan (logika atau nilai dan perasaan), J/P cara menata kegiatan (terencana atau fleksibel).</dd>
      <dt>Tipis, sedang, jelas</dt><dd>Kejelasan preferensi dari jumlah pilihan terbanyak (6-7, 8-9, 10-11 dari 11). Patokan Examus, bukan norma baku.</dd>
      <dt>Kelompok preferensi</dt><dd>ST praktis dan logis, SF praktis dan peduli, NF imajinatif dan peduli, NT imajinatif dan logis.</dd>
    </dl>

    ${steps("Tindak lanjut untuk kelas ini", [
      "Bentuk kelompok kerja yang campuran: pemilik ide (N) dengan pelaksana yang teliti (S), yang lugas (T) dengan yang menjaga suasana (F).",
      "Adakan bimbingan klasikal tentang perbedaan preferensi: tiap murid mengenali kekuatannya dan menghargai cara teman yang berbeda.",
      "Variasikan cara mengajar (diskusi dan kerja mandiri, contoh nyata dan gambaran besar), bukan mengelompokkan murid menurut tipe.",
    ])}
    ${caveat("Tipe kepribadian menggambarkan preferensi (apa yang terasa paling nyaman), bukan kemampuan, kecerdasan, atau bakat, dan bukan diagnosis. Tidak ada tipe yang lebih baik dari tipe lain. Banyak orang hasilnya berubah saat mengisi ulang, terutama pada huruf yang tipis, dan remaja masih berkembang. Jangan memakai hasil ini untuk memberi label, memilih ketua atau jurusan, atau membatasi apa yang boleh dicoba murid. Angket ini disusun Examus berdasarkan teori tipe Jung dan belum dinormakan pada murid Indonesia; ini bukan MBTI®, merek dagang The Myers-Briggs Company. Hasil per murid boleh dibagikan kepada murid dan orang tuanya.")}
    ${linkBtn(`#/mulai/minat-karier${kelas(s)}`, "Kenali minat karier kelas ini dengan Minat Karier")}`;
  return { body, csv: () => [["No", "Nama", "L/P", "Tipe", "E/I", "S/N", "T/F", "J/P", "Catatan"], ...rows.map((r) => (r.filled ? [r.no, r.name, r.g, r.p.type, ...r.p.axes.map(axisTxt), straight(r) ? "jawaban sama" : r.p.flexible ? "belum jelas" : ""] : [r.no, r.name, r.g, "Belum mengisi"]))] };
}

/* ---------------- AKPD ---------------- */
const AK_LEVEL = (x) => (x <= 1.75 ? "rendah" : x <= 2.5 ? "sedang" : x <= 3.25 ? "tinggi" : "sangat tinggi");
const AK_SENSITIVE = /perundungan|ejekan|dijauhi|cemas|khawatir|marah|perasaan|takut|tekanan|ajakan|kesehatan|gagal/i;
const AK_SERVICE = {
  pribadi: "Bimbingan klasikal tentang mengenal diri, mengelola emosi, dan percaya diri.",
  sosial: "Bimbingan kelompok tentang komunikasi asertif, pertemanan sehat, dan menolak tekanan teman sebaya.",
  belajar: "Bimbingan tentang cara belajar, mengatur waktu, dan menghadapi ujian.",
  karier: "Layanan informasi studi lanjut, eksplorasi karier, dan perencanaan masa depan.",
};
export function akpdReport2(s, res) {
  const cfg = s.config || {}, items = akpdItems(cfg), K = Object.keys(AKPD_BIDANG);
  const prof = (a) => {
    const avg = Object.fromEntries(K.map((k) => { const ids = items.map((it, i) => [it, i]).filter(([it]) => it.k === k).map(([, i]) => i); return [k, ids.reduce((t, i) => t + (Number(a?.[i]) || 0), 0) / ids.length + 1]; }));
    const top = [...K].sort((x, y) => avg[y] - avg[x])[0];
    const very = items.filter((_, i) => Number(a?.[i]) === 3).length;
    const flags = items.map((it, i) => [it, i]).filter(([it, i]) => AK_SENSITIVE.test(it.text) && Number(a?.[i]) >= (/perundungan|ejekan|dijauhi/i.test(it.text) ? 2 : 3)).map(([, i]) => i + 1);
    return { avg, top, very, flags };
  };
  const rows = join(s, res, prof), done = rows.filter((r) => r.filled), N = done.length;
  const classAvg = Object.fromEntries(K.map((k) => [k, N ? done.reduce((t, r) => t + r.p.avg[k], 0) / N : 1]));
  const order = [...K].sort((a, b) => classAvg[b] - classAvg[a]);
  const need = items.map((it, i) => { const n = done.filter((r) => Number(r.a[i]) >= 2).length; return { ...it, i, n, p: pct(n, N) }; });
  const topNeeds = [...need].filter((x) => x.n > 0).sort((a, b) => b.p - a.p || a.i - b.i).slice(0, 10);
  const jenjang = { sd: "SD/MI", sma: "SMA/SMK/MA" }[cfg.jenjang] || "SMP/MTs";
  const cat = (p) => (p >= 50 ? "Klasikal" : p >= 25 ? "Kelompok" : "-");
  const body = `
    ${summary(`Rata-rata kebutuhan kelas · ${jenjang}`, N ? `Kelas ini paling membutuhkan layanan bidang ${AKPD_BIDANG[order[0]].toLowerCase()}.` : "Belum ada yang mengisi.", "",
      `<div class="akrow-wrap">${K.map((k) => `<div class="akrow"><span class="nm">${AKPD_BIDANG[k]}</span><span class="track"><i style="width:${((classAvg[k] - 1) / 3) * 100}%"></i></span><span class="val">${dec(classAvg[k])} ${AK_LEVEL(classAvg[k])}</span></div>`).join("")}</div>
      <p class="muted small" style="margin-top:.9rem">Rata-rata 1 (tidak butuh bantuan) sampai 4 (sangat butuh bantuan). Kebutuhan tiap murid bisa sangat berbeda dari rata-rata; lihat juga daftar di bawah dan tabel tiap murid.</p>`)}

    <h2 class="sec-h">Kebutuhan yang paling banyak dirasakan</h2>
    <p class="muted">Persentase murid yang menjawab butuh bantuan atau lebih. Butir 50% ke atas cocok menjadi topik bimbingan klasikal.</p>
    ${topNeeds.length ? `<div class="needs">${topNeeds.map((x) => `<div class="nd"><span class="no">${x.i + 1}</span><span class="tx">${esc(x.text)} <span class="muted">· ${AKPD_BIDANG[x.k]}</span></span><span class="track"><i class="${x.p >= 50 ? "hi" : ""}" style="width:${x.p}%"></i></span><span class="val">${x.p}%</span></div>`).join("")}</div>` : `<div class="card"><p class="muted">Belum ada kebutuhan yang dirasakan.</p></div>`}
    <details class="card" style="margin-top:1rem"><summary>Rekap semua ${items.length} butir per bidang</summary>
      ${K.map((k) => `<h3 style="margin-top:1rem">${AKPD_BIDANG[k]}</h3>${tbl(["No", { t: "Kebutuhan", wrap: 1 }, { t: "Murid", num: 1 }, { t: "Persen", num: 1 }, "Layanan"], need.filter((x) => x.k === k).map((x) => [x.i + 1, x.text, x.n, x.p + "%", cat(x.p)]))}`).join("")}</details>

    <h2 class="sec-h">Murid per bidang kebutuhan tertinggi</h2>
    <p class="muted">Dikelompokkan menurut bidang dengan rata-rata tertinggi tiap murid, sebagai bahan bimbingan kelompok.</p>
    ${groupCards(K.map((k) => ({ title: AKPD_BIDANG[k], rows: done.filter((r) => r.p.top === k).map((r) => ({ name: r.name, note: `${dec(r.p.avg[k])} ${AK_LEVEL(r.p.avg[k])}` })) })).filter((c) => c.rows.length))}

    <h2 class="sec-h">Skor per murid</h2>
    ${tbl(["No", "Nama", "L/P", ...K.map((k) => ({ t: AKPD_BIDANG[k], num: 1 })), { t: "Sangat butuh", num: 1 }, { t: "Catatan", wrap: 1 }], rows.map((r) => (r.filled
      ? [r.no, r.name, r.g || "-", ...K.map((k) => hl(dec(r.p.avg[k]), r.p.avg[k] > 2.5, r.p.avg[k] > 3.25)), r.p.very, r.p.flags.length ? `tanyakan butir ${r.p.flags.join(", ")}` : "-"]
      : [r.no, r.name, r.g || "-", ...K.map(() => "-"), "-", "Belum mengisi"])))}
    <p class="muted small" style="margin-top:.5rem">Angka per bidang = rata-rata ${items.length / 4} butir, 1 (tidak butuh) sampai 4 (sangat butuh bantuan): sampai 1,75 rendah, sampai 2,50 sedang, sampai 3,25 tinggi, di atasnya sangat tinggi. "Sangat butuh" = banyak butir yang dijawab sangat butuh bantuan. Catatan menyebut nomor butir yang perlu ditanyakan langsung (perundungan dari "butuh", kecemasan, emosi, kesehatan, dan tekanan teman dari "sangat butuh").</p>
    ${unfilled(rows)}

    <h2 class="sec-h">Keterangan istilah</h2>
    <dl class="gloss">
      <dt>Skor bidang (1-4)</dt><dd>Rata-rata jawaban murid pada satu bidang: tidak butuh bantuan 1, sedikit 2, butuh 3, sangat butuh 4. Batas rendah, sedang, tinggi, dan sangat tinggi membagi rentang itu sama rata (patokan Examus).</dd>
      <dt>Persen kebutuhan per butir</dt><dd>Murid yang menjawab "butuh bantuan" atau "sangat butuh bantuan" dibagi murid yang sudah mengisi. 50% ke atas = topik bimbingan klasikal, 25-49% = bimbingan kelompok, di bawahnya = layanan individual bila perlu (patokan Examus).</dd>
      <dt>Bidang tertinggi murid</dt><dd>Bidang dengan rata-rata tertinggi bagi tiap murid, dipakai untuk menyusun kelompok.</dd>
      <dt>Butir yang perlu ditanyakan</dt><dd>Butir tentang perundungan (dijawab butuh bantuan atau lebih) dan tentang kecemasan, emosi, kesehatan, atau tekanan teman (dijawab sangat butuh bantuan). Tanyakan secara pribadi.</dd>
    </dl>

    ${steps("Tindak lanjut untuk kelas ini", [
      ...order.slice(0, 2).map((k) => AK_SERVICE[k]),
      "Susun program BK dari rekap per butir: kebutuhan yang dirasakan banyak murid menjadi topik bimbingan klasikal, yang dirasakan sebagian murid menjadi bimbingan kelompok, dan kebutuhan yang sangat tinggi perorangan menjadi konseling individual.",
      "Lengkapi hasil ini dengan observasi, wawancara, catatan wali kelas, dan data lain sebelum menetapkan layanan.",
      "Ulangi AKPD di awal semester berikutnya untuk melihat apakah kebutuhannya bergeser.",
    ])}
    ${caveat("Hasil AKPD adalah kebutuhan yang dirasakan dan dilaporkan murid sendiri, bukan diagnosis, bukan ukuran kemampuan, dan bukan penilaian sikap. Gunakan bersama observasi, wawancara, dan informasi lain yang relevan. Jangan memberi label, membandingkan murid di depan kelas, atau membagikan jawaban perorangan kepada teman, orang tua, atau guru lain tanpa izin murid. Butir ditulis untuk Examus dan dapat diadaptasi; ini bukan instrumen baku, jadi skornya dibaca untuk merencanakan layanan, bukan untuk menilai murid.")}
    ${linkBtn(`#/mulai/minat-karier${kelas(s)}`, "Kenali minat karier kelas ini dengan Minat Karier")}`;
  return { body, csv: () => [["No", "Kebutuhan", "Bidang", "Murid", "Persen", "Layanan"], ...need.map((x) => [x.i + 1, x.text, AKPD_BIDANG[x.k], x.n, x.p, cat(x.p)]), [], ["No", "Nama", "L/P", ...K.map((k) => AKPD_BIDANG[k] + " (1-4)"), "Sangat butuh", "Butir ditanyakan"], ...rows.map((r) => (r.filled ? [r.no, r.name, r.g, ...K.map((k) => dec(r.p.avg[k])), r.p.very, r.p.flags.join("; ")] : [r.no, r.name, r.g, "Belum mengisi"]))] };
}
