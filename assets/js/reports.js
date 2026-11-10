import { esc, $, $$, toast, fmtDate, firstName, download, toCSV } from "./util.js";
import { store } from "./store.js";
import { getAssessment, VAK, VAK_TIPS, GAYA_ITEMS, RIASEC, MINAT_ITEMS, BIDANG, KEBUTUHAN_ITEMS } from "./data.js";
import { header } from "./pages-public.js";
import { analyze, mountSociogram, describe, svgToPngBlob } from "./sociogram.js";

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const bars = (rows, max) => `<div class="bars">${rows.map(([name, val, label]) => `<div class="b"><span class="nm">${esc(name)}</span><span class="track"><i style="width:${max ? (val / max) * 100 : 0}%"></i></span><span class="val">${esc(label ?? val)}</span></div>`).join("")}</div>`;
const table = (head, rows) => `<div class="tblwrap"><table class="tbl"><thead><tr>${head.map((h) => `<th${h.num ? ' class="num"' : ""}>${esc(h.t ?? h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td${head[i].num ? ' class="num"' : ""}${head[i].wrap ? ' class="wrapok"' : ""}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const tips = (list) => `<h2 class="sec-h">Saran tindak lanjut</h2><div class="card"><ul class="tips">${list.map((t) => `<li>${t}</li>`).join("")}</ul></div>`;
const names = (rows) => esc(rows.map((r) => firstName(r.name)).join(", "));

/* ---------- Sosiometri ---------- */
function socio(s, res) {
  const filled = new Set(res.map((r) => r.no));
  const qs = s.config.questions || [];
  const per = qs.map((q) => {
    const picks = {}; res.forEach((r) => (picks[r.no] = r.answers?.[q.id] || []));
    return { q, an: analyze(s.roster, picks, filled) };
  });
  const body = `
    <div class="report-tabs no-print" role="tablist" aria-label="Pertanyaan">${per.map(({ q }, i) => `<button role="tab" data-i="${i}" aria-selected="${i === 0}">${esc(q.short)}</button>`).join("")}</div>
    ${per.map(({ q, an }, i) => {
      const sorted = [...an.rows].sort((a, b) => b.count - a.count || b.score - a.score || a.no - b.no);
      const t = [];
      if (an.isolates.length) t.push(`Temui <strong>${names(an.isolates)}</strong> secara pribadi dalam minggu ini. Amati juga saat istirahat dan kerja kelompok.`);
      if (an.star) t.push(`<strong>${esc(firstName(an.star.name))}</strong> paling banyak dipilih. Ia bisa diajak menjadi tutor sebaya atau penghubung bagi murid yang belum dipilih.`);
      if (an.oneWay.length) t.push(`Memilih tetapi belum dipilih balik: ${names(an.oneWay)}. Pertimbangkan menempatkan mereka bersama salah satu teman pilihannya.`);
      t.push("Saat menyusun kelompok, pasangkan murid yang belum dipilih dengan teman yang ia pilih sendiri, bukan dengan sesama murid yang belum dipilih.");
      if (an.unfilled.length) t.push(`Belum mengisi: ${names(an.unfilled)}. Peta akan lebih lengkap setelah mereka mengisi.`);
      t.push("Peta ini memotret satu hari. Cocokkan dengan pengamatan Anda sebelum mengambil kesimpulan.");
      return `<section class="rep-q${i ? " hide" : ""}" data-i="${i}">
        <p class="muted">Pertanyaan ${i + 1}, bidang ${esc(q.area.toLowerCase())}</p>
        <h2 style="font-size:clamp(1.3rem,3vw,1.8rem);margin:.2rem 0 1rem">${esc(q.text)}</h2>
        <div class="rep-grid">
          <div class="rep-plate"><div class="sg-mount"></div></div>
          <div class="stack">
            <div class="readout" aria-live="polite">${describe(an, null)}</div>
            <div class="kv">
              <div class="card"><div class="k">Sudah mengisi</div><div class="v">${an.N - an.unfilled.length} / ${an.N}</div></div>
              <div class="card"><div class="k">Pasangan saling memilih</div><div class="v">${an.mutual.length}</div></div>
              <div class="card"><div class="k">Belum dipilih</div><div class="v">${an.isolates.length}</div></div>
            </div>
            <div class="rowflex no-print"><button class="btn dark sm" data-act="names" aria-pressed="false">Tampilkan nama</button><button class="btn sm" data-act="png">Unduh gambar</button></div>
          </div>
        </div>
        <h2 class="sec-h">Indeks per murid</h2>
        ${table(["No", "Nama", "L/P", { t: "Dipilih", num: 1 }, { t: "Skor", num: 1 }, { t: "Indeks", num: 1 }, "Keterangan"], sorted.map((r) => [r.no, r.name, r.g || "-", r.count, r.score, r.index.toFixed(2), r.status + (r.filled ? "" : " (belum mengisi)")]))}
        <p class="muted small" style="margin-top:.5rem">Dipilih: berapa teman yang memilih. Skor: pilihan pertama bernilai 3, kedua 2, ketiga 1. Indeks: dipilih dibagi jumlah murid lain di kelas.</p>
        ${tips(t)}
      </section>`;
    }).join("")}`;
  return {
    body,
    csv() {
      const rows = [["Pertanyaan", "No", "Nama", "L/P", "Dipilih", "Skor", "Indeks", "Keterangan", "Pilihan 1", "Pilihan 2", "Pilihan 3"]];
      per.forEach(({ q, an }) => an.rows.forEach((r) => rows.push([q.short, r.no, r.name, r.g, r.count, r.score, r.index.toFixed(2).replace(".", ","), r.status, ...[0, 1, 2].map((i) => (r.picks[i] ? an.byNo.get(r.picks[i]).name : ""))])));
      return rows;
    },
    mount(root) {
      const secs = $$(".rep-q", root);
      secs.forEach((sec, i) => {
        const { an, q } = per[i]; const read = $(".readout", sec);
        const sg = mountSociogram($(".sg-mount", sec), s.roster, an, { onFocus: (row) => (read.innerHTML = describe(an, row)) });
        let on = false;
        $('[data-act="names"]', sec).addEventListener("click", (e) => { on = !on; sg.toggleNames(on); e.currentTarget.setAttribute("aria-pressed", String(on)); e.currentTarget.textContent = on ? "Sembunyikan nama" : "Tampilkan nama"; });
        $('[data-act="png"]', sec).addEventListener("click", async () => {
          try { download(`sosiogram-${s.className}-${q.id}.png`.replace(/\s+/g, "-").toLowerCase(), await svgToPngBlob($("svg", sg.fig))); } catch { toast("Gambar tidak bisa dibuat di browser ini"); }
        });
      });
      $$(".report-tabs button", root).forEach((b) => b.addEventListener("click", () => {
        $$(".report-tabs button", root).forEach((x) => x.setAttribute("aria-selected", String(x === b)));
        secs.forEach((sec) => sec.classList.toggle("hide", sec.dataset.i !== b.dataset.i));
      }));
    },
  };
}

/* ---------- Gaya belajar ---------- */
function gaya(s, res) {
  const byNo = new Map(res.map((r) => [r.no, r.answers || {}]));
  const rows = s.roster.map((m) => {
    const a = byNo.get(m.no); if (!a) return { ...m, filled: false };
    const c = { V: 0, A: 0, K: 0 }; GAYA_ITEMS.forEach((_, i) => a[i] in c && c[a[i]]++);
    const max = Math.max(c.V, c.A, c.K), top = Object.keys(c).filter((k) => c[k] === max);
    const label = top.length === 1 ? VAK[top[0]] : top.length === 2 ? `${VAK[top[0]]} dan ${VAK[top[1]].toLowerCase()}` : "Seimbang";
    return { ...m, filled: true, c, top, label };
  });
  const done = rows.filter((r) => r.filled), n = done.length;
  const groups = [["Visual", done.filter((r) => r.top.length === 1 && r.top[0] === "V").length], ["Auditori", done.filter((r) => r.top.length === 1 && r.top[0] === "A").length], ["Kinestetik", done.filter((r) => r.top.length === 1 && r.top[0] === "K").length], ["Kombinasi atau seimbang", done.filter((r) => r.top.length > 1).length]];
  const tot = { V: 0, A: 0, K: 0 }; done.forEach((r) => "VAK".split("").forEach((k) => (tot[k] += r.c[k])));
  const order = Object.keys(tot).sort((a, b) => tot[b] - tot[a]);
  const body = `
    <h2 class="sec-h">Kecenderungan kelas</h2>
    <div class="card">${bars(groups.map(([g, v]) => [g, v, `${v} murid`]), Math.max(1, ...groups.map((g) => g[1])))}</div>
    <h2 class="sec-h">Hasil per murid</h2>
    ${table(["No", "Nama", { t: "Visual", num: 1 }, { t: "Auditori", num: 1 }, { t: "Kinestetik", num: 1 }, "Kecenderungan"], rows.map((r) => r.filled ? [r.no, r.name, r.c.V, r.c.A, r.c.K, r.label] : [r.no, r.name, "-", "-", "-", "Belum mengisi"]))}
    <p class="muted small" style="margin-top:.5rem">Angka menunjukkan berapa dari ${GAYA_ITEMS.length} butir yang dijawab dengan pilihan visual, auditori, atau kinestetik.</p>
    ${tips([
      `Pilihan terbanyak di kelas ini: <strong>${VAK[order[0]].toLowerCase()}</strong>, lalu ${VAK[order[1]].toLowerCase()}. ${VAK_TIPS[order[0]]}`,
      `Tetap sediakan kegiatan untuk kecenderungan lain. ${VAK_TIPS[order[2]]}`,
      "Baca hasil ini sebagai preferensi, bukan kemampuan. Murid tetap perlu berlatih belajar dengan berbagai cara.",
      "Pakai hasil perorangan untuk membuka obrolan tentang kebiasaan belajar, bukan untuk mengelompokkan murid secara permanen.",
    ])}`;
  return { body, n, csv: () => [["No", "Nama", "L/P", "Visual", "Auditori", "Kinestetik", "Kecenderungan"], ...rows.map((r) => r.filled ? [r.no, r.name, r.g, r.c.V, r.c.A, r.c.K, r.label] : [r.no, r.name, r.g, "", "", "", "Belum mengisi"])] };
}

/* ---------- Minat karier ---------- */
function minat(s, res) {
  const KEYS = Object.keys(RIASEC);
  const byNo = new Map(res.map((r) => [r.no, r.answers || {}]));
  const rows = s.roster.map((m) => {
    const a = byNo.get(m.no); if (!a) return { ...m, filled: false };
    const c = Object.fromEntries(KEYS.map((k) => [k, 0]));
    MINAT_ITEMS.forEach((it, i) => (c[it.k] += Number(a[i]) || 0));
    const order = [...KEYS].sort((x, y) => c[y] - c[x] || KEYS.indexOf(x) - KEYS.indexOf(y));
    return { ...m, filled: true, c, code: order.slice(0, 3).join(""), top: order[0] };
  });
  const done = rows.filter((r) => r.filled);
  const dist = KEYS.map((k) => [`${RIASEC[k].name} (${k})`, done.filter((r) => r.top === k).length]);
  const best = [...KEYS].sort((a, b) => done.filter((r) => r.top === b).length - done.filter((r) => r.top === a).length)[0];
  const body = `
    <h2 class="sec-h">Minat tertinggi di kelas</h2>
    <div class="card">${bars(dist.map(([g, v]) => [g, v, `${v} murid`]), Math.max(1, ...dist.map((d) => d[1])))}</div>
    <h2 class="sec-h">Arti enam bidang minat</h2>
    <div class="card"><ul class="tips">${KEYS.map((k) => `<li><strong>${RIASEC[k].name} (${k}).</strong> ${RIASEC[k].hint}</li>`).join("")}</ul></div>
    <h2 class="sec-h">Hasil per murid</h2>
    ${table(["No", "Nama", ...KEYS.map((k) => ({ t: k, num: 1 })), "Kode minat"], rows.map((r) => r.filled ? [r.no, r.name, ...KEYS.map((k) => r.c[k]), r.code] : [r.no, r.name, ...KEYS.map(() => "-"), "Belum mengisi"]))}
    <p class="muted small" style="margin-top:.5rem">Skor tiap bidang 0 sampai 6. Kode minat adalah tiga bidang dengan skor tertinggi.</p>
    ${tips([
      `Bidang yang paling banyak menjadi minat utama: <strong>${RIASEC[best].name.toLowerCase()}</strong>. Pertimbangkan mengundang narasumber atau alumni dari bidang ini.`,
      "Gunakan kode minat sebagai pembuka percakapan: tanyakan kegiatan apa yang membuat murid memilih jawabannya.",
      "Minat masih berubah di usia sekolah. Ulangi angket setahun sekali dan bandingkan hasilnya bersama murid.",
      "Skor yang rata di semua bidang biasanya berarti murid belum banyak mengenal pilihan. Mereka terbantu dengan kegiatan eksplorasi karier.",
    ])}`;
  return { body, csv: () => [["No", "Nama", "L/P", ...KEYS.map((k) => RIASEC[k].name), "Kode minat"], ...rows.map((r) => r.filled ? [r.no, r.name, r.g, ...KEYS.map((k) => r.c[k]), r.code] : [r.no, r.name, r.g, ...KEYS.map(() => ""), "Belum mengisi"])] };
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

const BUILD = { sosiometri: socio, "gaya-belajar": gaya, "minat-karier": minat, kebutuhan };

export async function report({ user, params }) {
  const s = await store.getSession(params.id);
  if (!s) return { html: `${header(user, "dasbor")}<main class="page"><div class="narrow"><h1 class="page-title">Sesi tidak ditemukan</h1><p style="margin-top:1rem"><a class="btn" href="#/dasbor">Ke dasbor</a></p></div></main>` };
  const a = getAssessment(s.type);
  const res = await store.listResponses(s.id);
  if (!res.length) return { html: `${header(user, "dasbor")}<main class="page"><div class="narrow"><a class="back" href="#/sesi/${s.id}">← ${esc(s.className)}</a><h1 class="page-title">Belum ada jawaban</h1><p class="page-sub">Laporan muncul setelah setidaknya satu murid mengisi.</p></div></main>` };
  const r = BUILD[s.type](s, res);
  const today = fmtDate(Date.now()).replace(/^\S+,\s*/, "");
  const html = `${header(user, "dasbor")}<main class="page"><div class="wrap">
    <a class="back no-print" href="#/sesi/${s.id}">← ${esc(s.className)}</a>
    <div class="print-head">${user.school ? `<p style="font-weight:600;font-size:14pt">${esc(user.school)}</p>` : ""}</div>
    <h1 class="page-title">Laporan ${esc(a.name.toLowerCase())}</h1>
    <p class="page-sub">${esc(s.className)}. ${res.length} dari ${s.roster.length} murid mengisi. Disusun ${today}.</p>
    <p class="muted small" style="margin-top:.4rem">Rahasia. Hanya untuk guru yang berwenang.</p>
    <div class="rowflex no-print" style="margin-top:1.2rem"><button class="btn primary sm" id="rp-print">Cetak atau simpan PDF</button><button class="btn sm" id="rp-csv">Unduh CSV untuk Excel</button></div>
    ${r.body}
    <div class="print-sign"><p>${today}</p><p>${esc(user.role || "")}</p><p class="line">${esc(user.name || "")}</p></div>
  </div></main>`;
  return {
    title: `Laporan ${a.name}, ${s.className}`, html,
    mount(root) {
      r.mount && r.mount(root);
      $("#rp-print", root).addEventListener("click", () => window.print());
      $("#rp-csv", root).addEventListener("click", () => download(`examus-${a.id}-${s.className}.csv`.replace(/\s+/g, "-").toLowerCase(), toCSV(r.csv()), "text/csv"));
    },
  };
}
