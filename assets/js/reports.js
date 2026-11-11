import { esc, $, $$, toast, fmtDate, firstName, download, toCSV } from "./util.js";
import { store } from "./store.js";
import { getAssessment, VAK, GAYA_ITEMS, RIASEC, MINAT_ITEMS, BIDANG, KEBUTUHAN_ITEMS } from "./data.js";
import { gayaProfile, donut, VAK_COLOR } from "./gaya.js";
import { header } from "./pages-public.js";
import { socioReport } from "./report-socio.js";
import { minatReport, kekuatanReport, emosiReport, kepribadianReport, akpdReport } from "./report-more.js";
import { amanReport } from "./report-aman.js";
import { hasDoc, buildDoc, docxBlob, printDoc, saveBlob } from "./report-doc.js";
import { kekuatanReport2, emosiReport2, kepribadianReport2, akpdReport2 } from "./report-v2.js";

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const bars = (rows, max) => `<div class="bars">${rows.map(([name, val, label]) => `<div class="b"><span class="nm">${esc(name)}</span><span class="track"><i style="width:${max ? (val / max) * 100 : 0}%"></i></span><span class="val">${esc(label ?? val)}</span></div>`).join("")}</div>`;
const table = (head, rows) => `<div class="tblwrap"><table class="tbl"><thead><tr>${head.map((h) => `<th${h.num ? ' class="num"' : ""}>${esc(h.t ?? h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td${head[i].num ? ' class="num"' : ""}${head[i].wrap ? ' class="wrapok"' : ""}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const tips = (list) => `<h2 class="sec-h">Saran tindak lanjut</h2><div class="card"><ul class="tips">${list.map((t) => `<li>${t}</li>`).join("")}</ul></div>`;
const names = (rows) => esc(rows.map((r) => firstName(r.name)).join(", "));

/* ---------- Gaya belajar ---------- */
const STRATEGI = {
  V: ["Tampilkan bagan, peta konsep, atau gambar di setiap materi baru.", "Tulis langkah dan kata kunci di papan, dan pakai warna untuk mengelompokkannya.", "Beri contoh yang bisa dilihat sebelum penjelasan panjang."],
  A: ["Buka materi dengan pertanyaan atau cerita, lalu ajak berdiskusi.", "Minta murid menjelaskan ulang dengan kata-katanya sendiri secara berpasangan.", "Bacakan instruksi penting dengan lantang, jangan hanya ditulis."],
  K: ["Sisipkan praktik atau gerak di sela penjelasan, misalnya tiap 15 sampai 20 menit.", "Pakai benda nyata, peragaan, atau permainan peran.", "Beri tugas membuat sesuatu atau mencoba langsung, tidak hanya mencatat."],
};
const GROUP = { V: "Visual", A: "Auditori", K: "Kinestetik", S: "Seimbang" };

function gaya(s, res) {
  const byNo = new Map(res.map((r) => [r.no, r.answers || {}]));
  const rows = s.roster.map((m) => (byNo.has(m.no) ? { ...m, filled: true, p: gayaProfile(byNo.get(m.no)) } : { ...m, filled: false }));
  const done = rows.filter((r) => r.filled);
  const tot = { V: 0, A: 0, K: 0 }; done.forEach((r) => "VAK".split("").forEach((k) => (tot[k] += r.p.c[k])));
  const sum = tot.V + tot.A + tot.K || 1;
  const cp = Object.fromEntries("VAK".split("").map((k) => [k, Math.round((tot[k] / sum) * 100)]));
  const order = Object.keys(tot).sort((a, b) => tot[b] - tot[a]);
  const close = cp[order[0]] - cp[order[1]] < 5;
  const headline = close ? `Kelas ini cenderung ${VAK[order[0]].toLowerCase()} dan ${VAK[order[1]].toLowerCase()}.` : `Kelas ini cenderung ${VAK[order[0]].toLowerCase()}.`;
  const groups = { V: [], A: [], K: [], S: [] }; done.forEach((r) => groups[r.p.group].push(r));
  const perStudent = Object.keys(groups).filter((k) => groups[k].length).map((k) => `${groups[k].length} ${GROUP[k].toLowerCase()}`).join(", ");
  const strategies = [...STRATEGI[order[0]], "Variasikan cara mengajar: tiap materi dijelaskan, diperlihatkan, dan dicoba.", "Pakai hasil ini agar murid nyaman belajar, bukan untuk membatasi cara mereka belajar."];
  const share = Math.round((done.length / s.roster.length) * 100);
  const body = `
    <div class="gsum">
      ${donut(tot, "Perbandingan gaya belajar kelas")}
      <div>
        <h2>${esc(headline)}</h2>
        <dl class="glegend">${"VAK".split("").map((k) => `<dt><span class="dot" style="background:${VAK_COLOR[k]}"></span>${VAK[k]}</dt><dd>${cp[k]}%</dd>`).join("")}</dl>
        <p style="margin-top:.6rem">Per murid: ${esc(perStudent || "-")}.</p>
        <p class="muted" style="margin-top:.4rem">${esc(STRATEGI[order[0]][0])}</p>
      </div>
    </div>

    <h2 class="sec-h">Strategi mengajar untuk kelas ini</h2>
    <ol class="strat">${strategies.map((x, i) => `<li class="${i < 3 ? "hi" : ""}"><span>${i + 1}</span>${esc(x)}</li>`).join("")}</ol>

    <h2 class="sec-h">Murid per gaya</h2>
    <p class="muted">Berguna untuk membagi kelompok yang beragam: ambil satu atau dua murid dari tiap kotak.</p>
    <div class="ggroups">${Object.keys(groups).map((k) => `<div class="card"><p class="gh"><span class="dot" style="background:${VAK_COLOR[k] || "#cdeedd"}"></span>${GROUP[k]} <span class="muted">${groups[k].length}</span></p>
      ${groups[k].length ? `<ul>${groups[k].map((r) => `<li><span>${esc(r.name)}</span>${r.p.combo ? `<span class="muted small">+ ${VAK[r.p.top[1]]}</span>` : ""}</li>`).join("")}</ul>` : `<p class="muted">-</p>`}</div>`).join("")}</div>

    <h2 class="sec-h">Skor per murid</h2>
    ${table(["No", "Nama", "L/P", { t: "V (%)", num: 1 }, { t: "A (%)", num: 1 }, { t: "K (%)", num: 1 }, "Gaya"], rows.map((r) => r.filled ? [r.no, r.name, r.g || "-", r.p.pct.V, r.p.pct.A, r.p.pct.K, r.p.title] : [r.no, r.name, r.g || "-", "-", "-", "-", "Belum mengisi"]))}
    <p class="muted small" style="margin-top:.5rem">Persentase = bagian jawaban murid yang memilih gaya itu dari ${GAYA_ITEMS.length} situasi. Kombinasi bila dua gaya teratas selisih paling banyak 2 jawaban; seimbang bila ketiganya selisih paling banyak 1 jawaban.</p>
    ${rows.some((r) => !r.filled) ? `<details class="card" style="margin-top:1rem"><summary>Belum mengisi (${rows.filter((r) => !r.filled).length})</summary><p class="muted" style="margin-top:.6rem">${esc(rows.filter((r) => !r.filled).map((r) => r.name).join(", "))}</p></details>` : ""}

    <div class="caveat">Hasil ini menunjukkan <b>preferensi</b> belajar, bukan kemampuan. Riset tidak mendukung mengajar hanya dengan satu gaya; gunakan hasil ini untuk memvariasikan cara mengajar dan membuat murid nyaman. Hasil perorangan boleh dibicarakan dengan murid dan orang tuanya.</div>
    <p class="no-print" style="margin-top:1rem"><a class="btn" href="#/mulai/sosiometri${s.classId ? "?kelas=" + s.classId : ""}">Petakan pertemanan kelas ini → Sosiometri</a></p>`;
  return { body, csv: () => [["No", "Nama", "L/P", "Visual (%)", "Auditori (%)", "Kinestetik (%)", "Gaya"], ...rows.map((r) => r.filled ? [r.no, r.name, r.g, r.p.pct.V, r.p.pct.A, r.p.pct.K, r.p.title] : [r.no, r.name, r.g, "", "", "", "Belum mengisi"])] };
}

/* ---------- Kebutuhan siswa ---------- */
function kebutuhan(s, res) {
  const n = res.length, KEYS = Object.keys(BIDANG);
  const items = KEBUTUHAN_ITEMS.map((it, i) => ({ ...it, i, yes: res.filter((r) => r.answers?.[i] === true).length }));
  const dom = KEYS.map((k) => { const its = items.filter((x) => x.k === k); return [BIDANG[k], its.reduce((a, x) => a + pct(x.yes, n), 0) / its.length]; });
  const top = [...items].sort((a, b) => b.yes - a.yes || a.i - b.i).slice(0, 8);
  const byNo = new Map(res.map((r) => [r.no, r.answers || {}]));
  const rows = s.roster.map((m) => {
    const a = byNo.get(m.no); if (!a) return [m.no, m.name, ...KEYS.map(() => "-"), "Belum mengisi"];
    const c = KEYS.map((k) => KEBUTUHAN_ITEMS.filter((it, i) => it.k === k && a[i] === true).length);
    return [m.no, m.name, ...c, c.reduce((x, y) => x + y, 0)];
  });
  const sortedDom = [...dom].sort((a, b) => b[1] - a[1]);
  const majority = top.filter((x) => pct(x.yes, n) >= 50), some = top.filter((x) => pct(x.yes, n) < 50 && x.yes > 0);
  const t = [`Bidang dengan kebutuhan tertinggi: <strong>${sortedDom[0][0].toLowerCase()}</strong> (rata-rata ${Math.round(sortedDom[0][1])}%), disusul ${sortedDom[1][0].toLowerCase()}.`];
  if (majority.length) t.push(`Dirasakan separuh kelas atau lebih, cocok untuk bimbingan klasikal: ${majority.slice(0, 3).map((x) => `"${esc(x.text)}"`).join(" ")}`);
  if (some.length) t.push(`Dirasakan sebagian murid, cocok untuk bimbingan kelompok: ${some.slice(0, 2).map((x) => `"${esc(x.text)}"`).join(" ")}`);
  t.push('Persentase kecil tidak berarti tidak penting. Tindak lanjuti secara pribadi murid yang menjawab sesuai pada butir "Aku pernah merasa dijauhi atau diejek teman."');
  const body = `
    <h2 class="sec-h">Rata-rata per bidang</h2>
    <div class="card">${bars(dom.map(([g, v]) => [g, v, Math.round(v) + "%"]), 100)}</div>
    <h2 class="sec-h">Delapan kebutuhan tertinggi</h2>
    ${table([{ t: "Pernyataan", wrap: 1 }, "Bidang", { t: "Murid", num: 1 }, { t: "Persen", num: 1 }], top.map((x) => [x.text, BIDANG[x.k], x.yes, pct(x.yes, n) + "%"]))}
    <h2 class="sec-h">Jumlah kebutuhan per murid</h2>
    ${table(["No", "Nama", ...KEYS.map((k) => ({ t: BIDANG[k], num: 1 })), { t: "Total", num: 1 }], rows)}
    <p class="muted small" style="margin-top:.5rem">Angka menunjukkan berapa dari 5 pernyataan di tiap bidang yang dijawab "sesuai denganku".</p>
    ${tips(t)}`;
  return { body, csv: () => [["Pernyataan", "Bidang", "Murid", "Persen"], ...items.map((x) => [x.text, BIDANG[x.k], x.yes, pct(x.yes, n)]), [], ["No", "Nama", ...KEYS.map((k) => BIDANG[k]), "Total"], ...rows] };
}

export const BUILD = { sosiometri: socioReport, "gaya-belajar": gaya, "minat-karier": minatReport, kebutuhan, kekuatan: kekuatanReport2, emosi: emosiReport2, kepribadian: kepribadianReport2, akpd: akpdReport2, aman: amanReport };

export async function report({ user, params }) {
  const s = await store.getSession(params.id);
  if (!s) return { html: `${header(user, "dasbor")}<main class="page"><div class="narrow"><h1 class="page-title">Sesi tidak ditemukan</h1><p style="margin-top:1rem"><a class="btn" href="#/dasbor">Ke dasbor</a></p></div></main>` };
  const a = getAssessment(s.type);
  const res = await store.listResponses(s.id);
  if (!res.length) return { html: `${header(user, "dasbor")}<main class="page"><div class="narrow"><a class="back" href="#/sesi/${s.id}">← ${esc(s.className)}</a><h1 class="page-title">Belum ada jawaban</h1><p class="page-sub">Laporan muncul setelah setidaknya satu murid mengisi.</p></div></main>` };
  const r = BUILD[s.type](s, res), formal = hasDoc(s.type) || !!r.doc;
  const today = fmtDate(Date.now()).replace(/^\S+,\s*/, "");
  const html = `${header(user, "dasbor")}<main class="page"><div class="wrap">
    <a class="back no-print" href="#/sesi/${s.id}">← Sesi</a>
    <div class="print-head">${user.school ? `<p style="font-weight:600;font-size:14pt">${esc(user.school)}</p>` : ""}</div>
    <p class="eyebrow">Laporan ${esc(a.title || a.name.toLowerCase())} · ${today}</p>
    <h1 class="page-title" style="margin-top:.2rem">${esc(s.className)}</h1>
    <p class="page-sub">${res.length} dari ${s.roster.length} murid mengisi (${pct(res.length, s.roster.length)}%).</p>
    ${pct(res.length, s.roster.length) < 80 ? `<div class="notice">Baru ${pct(res.length, s.roster.length)}% yang mengisi. Gambaran kelas lebih tepat setelah 80% murid mengisi.</div>` : ""}
    <p class="muted small" style="margin-top:.4rem">Rahasia. Hanya untuk guru yang berwenang.</p>
    <div class="rowflex no-print" style="margin-top:1.2rem">${formal ? `<button class="btn primary sm" id="rp-docx">Unduh Word</button><button class="btn sm" id="rp-pdf">Unduh PDF</button>` : `<button class="btn primary sm" id="rp-print">Cetak atau simpan PDF</button>`}</div>
    ${formal ? `<p class="muted small no-print" style="margin-top:.6rem;max-width:34rem">Laporan resmi dengan tanda tangan, siap dikirim ke guru BK, psikolog, atau kepala sekolah. Untuk PDF, pilih "Simpan sebagai PDF" di dialog cetak.</p>` : ""}
    <div class="rowflex no-print" style="margin-top:.8rem"><button class="btn sm" id="rp-csv">Unduh CSV untuk Excel</button></div>
    ${r.body}
    <div class="print-sign"><p>${today}</p><p>${esc(user.role || "")}</p><p class="line">${esc(user.name || "")}</p></div>
  </div></main>`;
  return {
    title: `Laporan ${a.name}, ${s.className}`, html,
    mount(root) {
      r.mount && r.mount(root);
      $("#rp-print", root)?.addEventListener("click", () => window.print());
      const doc = async () => (r.doc ? r.doc(user) : buildDoc({ user, s, a, res, bodyHtml: r.body }));
      const safe = (fn) => async (e) => { const b = e?.currentTarget; if (b) b.disabled = true; try { await fn(); } catch (ex) { console.error(ex); toast("Laporan belum bisa dibuat: " + ex.message); } if (b) b.disabled = false; };
      $("#rp-docx", root)?.addEventListener("click", safe(async () => { const m = await doc(); saveBlob(m.file + ".docx", await docxBlob(m)); }));
      $("#rp-pdf", root)?.addEventListener("click", safe(async () => printDoc(await doc())));
      $("#rp-csv", root).addEventListener("click", () => download(`examus-${a.id}-${s.className}.csv`.replace(/\s+/g, "-").toLowerCase(), toCSV(r.csv()), "text/csv"));
    },
  };
}
