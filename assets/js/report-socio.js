// Laporan sosiometri untuk guru.
import { esc, $, $$, toast, firstName, download } from "./util.js";
import { analyze, mountSociogram, describe, svgToPngBlob } from "./sociogram.js";
import { SOCIO_REASONS, OTHER_REASON, areaOf } from "./socio-data.js";

const tbl = (head, rows, cls = "") => `<div class="tblwrap"><table class="tbl ${cls}"><thead><tr>${head.map((h) => `<th${h.num ? ' class="num"' : ""}>${esc(h.t ?? h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
const who = (r) => `${esc(r.name)} (No. ${r.no})`;
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

// Kelompok erat: tiga murid yang semuanya saling memilih.
function triangles(an) {
  const out = [], nos = an.rows.map((r) => r.no);
  for (const [a, b] of an.mutual) for (const c of nos) if (c > b && an.isMutual(a, c) && an.isMutual(b, c)) out.push([a, b, c]);
  return out;
}

// Rantai pilihan pertama yang tidak dibalas: mulai dari murid yang tidak dipilih pertama oleh siapa pun.
function chains(an) {
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

function category(r, an, neg) {
  if (r.count === 0) return neg ? "Tidak ditolak" : "Belum dipilih";
  if (neg) return r.index >= 0.25 || r === an.star ? "Banyak ditolak" : "Ditolak beberapa teman";
  if (r === an.star || r.index >= 0.5) return "Sangat diterima";
  if (r.index >= 0.25) return "Diterima";
  return "Cukup diterima";
}

export function socioReport(s, res) {
  const filled = new Set(res.map((r) => r.no));
  const qs = s.config.questions || [];
  const per = qs.map((q) => {
    const picks = {}; res.forEach((r) => (picks[r.no] = r.answers?.[q.id] || []));
    const an = analyze(s.roster, picks, filled);
    const totalPicks = an.rows.reduce((t, r) => t + r.picks.length, 0);
    const mutualPicks = an.mutual.length * 2;
    // Alasan: dihitung dari semua pilihan untuk pertanyaan ini.
    const counts = new Map((SOCIO_REASONS[areaOf(q)] || []).map((t) => [t, 0]));
    let other = 0; const otherText = [];
    res.forEach((r) => Object.values(r.answers?.reasons?.[q.id] || {}).forEach((list) => (list || []).forEach((t) => {
      if (String(t).startsWith(OTHER_REASON)) { other++; const x = String(t).slice(OTHER_REASON.length + 2).trim(); if (x) otherText.push(x); }
      else counts.set(t, (counts.get(t) || 0) + 1);
    })));
    return { q, an, neg: !!q.neg, totalPicks, mutualPicks, tri: triangles(an), ch: chains(an), counts, other, otherText };
  });

  const section = ({ q, an, neg, totalPicks, mutualPicks, tri, ch, counts, other, otherText }, i) => {
    const top = an.maxCount > 0 ? an.rows.filter((r) => r.count === an.maxCount) : [];
    const recip = pct(mutualPicks, totalPicks);
    const least = [...an.rows].sort((a, b) => a.count - b.count || a.no - b.no).slice(0, 4);
    const verb = neg ? "ditolak" : "dipilih";
    const desc = [
      `${recip}% pilihan dibalas oleh teman yang dipilih. Ada ${an.mutual.length} pasangan yang saling memilih${tri.length ? ` dan ${tri.length} kelompok tiga murid yang semuanya saling memilih` : ", tetapi belum ada kelompok tiga murid atau lebih yang semuanya saling memilih"}.`
        + (totalPicks ? (recip < 33 ? " Kurang dari sepertiga pilihan dibalas, jadi hubungan di kelas ini masih lebih banyak satu arah daripada dua arah." : recip >= 60 ? " Sebagian besar pilihan dibalas: hubungan di kelas ini cukup timbal balik." : "") : ""),
      neg
        ? (top.length ? `${top.map(who).join(", ")} paling banyak ${verb} pada pertanyaan ini. Cari tahu penyebabnya lewat pengamatan dan percakapan pribadi, jangan disampaikan di depan kelas.` : "Belum ada murid yang ditolak pada pertanyaan ini.")
        : (an.isolates.length ? `${an.isolates.map(who).join(", ")} belum dipilih siapa pun pada pertanyaan ini; ajak bicara secara pribadi lebih dulu, sebelum menyusun kelompok.` : "Semua murid dipilih oleh setidaknya satu teman."),
    ];
    const reasonRows = [...counts.entries(), ...(other ? [["Lainnya (ditulis sendiri)", other]] : [])];
    const reasonMax = Math.max(1, ...reasonRows.map(([, v]) => v));
    const sorted = [...an.rows].sort((a, b) => b.count - a.count || b.score - a.score || a.no - b.no);
    const sugg = [];
    if (!neg && an.isolates.length) sugg.push([`Belum dipilih: ${an.isolates.map((r) => firstName(r.name)).join(", ")}`, "Ajak bicara secara pribadi (konseling individual) dan libatkan dalam kelompok kecil bersama teman yang hangat atau teman yang ia pilih sendiri."]);
    if (!neg && top.length && an.maxCount >= 2) sugg.push([`Sangat diterima: ${top.map((r) => firstName(r.name)).join(", ")}`, "Bisa dilibatkan sebagai teman sebaya pendamping untuk murid yang belum banyak dipilih."]);
    if (!neg && an.oneWay.length) sugg.push([`Memilih tetapi belum dipilih balik: ${an.oneWay.map((r) => firstName(r.name)).join(", ")}`, "Pertimbangkan menempatkan mereka satu kelompok dengan salah satu teman yang mereka pilih."]);
    if (neg && top.length) sugg.push([`Paling banyak ditolak: ${top.map((r) => firstName(r.name)).join(", ")}`, "Amati interaksinya di kelas dan saat istirahat, lalu ajak bicara secara pribadi. Jangan bacakan hasil penolakan kepada murid."]);
    if (an.unfilled.length) sugg.push([`Belum mengisi: ${an.unfilled.map((r) => firstName(r.name)).join(", ")}`, "Peta akan lebih lengkap setelah mereka mengisi."]);

    const others = s.roster;
    return `<section class="rep-q${i ? " hide" : ""}" data-i="${i}">
      <p class="qhead"><span class="tag">${esc(areaOf(q))}</span>${neg ? `<span class="tag neg">Penolakan</span>` : ""} ${esc(q.text)}</p>
      <div class="sumcards">
        <div class="card ok"><p class="k">Paling banyak ${verb}</p>${top.length ? top.map((r) => `<p>${esc(r.name)} <span class="muted">· ${r.count}×</span></p>`).join("") : `<p class="muted">-</p>`}</div>
        <div class="card warn"><p class="k">${neg ? "Tidak ditolak siapa pun" : "Belum dipilih siapa pun"}</p>${an.isolates.length ? an.isolates.slice(0, 8).map((r) => `<p>${esc(r.name)}</p>`).join("") + (an.isolates.length > 8 ? `<p class="muted">+${an.isolates.length - 8} lagi</p>` : "") : `<p class="muted">-</p>`}</div>
        <div class="card"><p class="k">Saling memilih</p><p><span class="big-num">${an.mutual.length}</span> <span class="muted">pasangan</span></p></div>
      </div>

      <h2 class="sec-h">Deskripsi</h2>
      ${desc.map((p) => `<p style="margin-top:.5rem">${p}</p>`).join("")}
      <p class="muted" style="margin-top:.5rem">Paling sedikit ${verb}: ${least.map((r) => `${esc(firstName(r.name))} (${r.count}×)`).join(", ")}.</p>

      <h2 class="sec-h">Sosiogram</h2>
      <div class="spread no-print"><p class="muted">Ketuk murid untuk melihat pilihannya.</p><label class="check"><input type="checkbox" data-act="names"><span>Tampilkan nama</span></label></div>
      <div class="rowflex no-print" style="margin:.6rem 0"><button class="btn sm" data-act="png">Unduh gambar</button></div>
      <div class="readout" aria-live="polite">${describe(an, null)}</div>
      <div class="rep-plate" style="margin-top:.8rem"><div class="sg-mount"></div></div>

      <h2 class="sec-h">Pola relasi</h2>
      ${tbl(["Pola", { t: "Jumlah", num: 1 }, "Murid"], [
        ["Bintang", neg ? "Paling banyak ditolak." : "Paling banyak dipilih; bisa diajak menjadi teman sebaya pendamping.", top.length && an.maxCount >= 2 ? top.map(who) : []],
        ["Kesalingan", "Dua murid saling memilih; hubungan paling kuat dalam sosiogram.", an.mutual.map(([a, b]) => `${esc(firstName(an.byNo.get(a).name))} ↔ ${esc(firstName(an.byNo.get(b).name))}`)],
        ["Segitiga / kelompok erat", "Tiga murid yang semuanya saling memilih.", tri.map((t) => t.map((n) => esc(firstName(an.byNo.get(n).name))).join(", "))],
        ["Rantai", "Pilihan pertama yang tidak dibalas, bersambung dari satu murid ke murid berikutnya.", ch.map((p) => p.map((n) => esc(firstName(an.byNo.get(n).name))).join(" → "))],
        [neg ? "Tidak ditolak" : "Belum dipilih", neg ? "Tidak disebut siapa pun pada pertanyaan ini." : "Belum dipilih siapa pun pada pertanyaan ini; perlu didekati lebih dulu.", an.isolates.map(who)],
      ].map(([p, d, list]) => `<tr><td class="wrapok"><b style="font-weight:500">${p}</b><br><span class="muted small">${d}</span></td><td class="num">${list.length}</td><td class="wrapok">${list.length ? list.join("<br>") : "-"}</td></tr>`), "pola")}
      <p class="muted small" style="margin-top:.5rem">Tingkat kesalingan: ${recip}% pilihan dibalas oleh teman yang dipilih (jumlah pilihan yang dibalas dibagi semua pilihan). Rantai dibaca dari pilihan pertama: mulai dari murid yang tidak dipilih pertama oleh siapa pun, dan berakhir di pasangan yang saling memilih atau di murid yang belum mengisi.</p>

      ${reasonRows.some(([, v]) => v) ? `<h2 class="sec-h">Alasan memilih</h2>
      <p class="muted">Berapa kali tiap alasan disebut, dari semua pilihan. Satu pilihan boleh punya beberapa alasan.</p>
      <div class="card" style="margin-top:.6rem"><div class="bars">${reasonRows.map(([t, v]) => `<div class="b"><span class="nm">${esc(t)}</span><span class="track"><i style="width:${(v / reasonMax) * 100}%"></i></span><span class="val">${v}</span></div>`).join("")}</div>
      ${otherText.length ? `<p class="muted small" style="margin-top:.8rem">Ditulis sendiri: ${esc(otherText.slice(0, 12).join("; "))}${otherText.length > 12 ? " …" : ""}</p>` : ""}</div>` : ""}

      <h2 class="sec-h">Indeks per murid</h2>
      ${tbl(["No", "Nama", "L/P", { t: neg ? "Ditolak" : "Dipilih", num: 1 }, { t: "Skor", num: 1 }, { t: "Indeks", num: 1 }, "Kategori"],
        sorted.map((r) => `<tr><td>${r.no}</td><td>${esc(r.name)}${r.filled ? "" : ` <span class="muted small">· belum mengisi</span>`}</td><td>${r.g || "-"}</td><td class="num">${r.count}</td><td class="num">${r.score}</td><td class="num">${r.index.toFixed(2)}</td><td>${category(r, an, neg)}</td></tr>`))}
      <details class="card" style="margin-top:1rem"><summary>Cara menghitung Dipilih, Skor, Indeks, dan Kategori</summary>
        <ul class="tips" style="margin-top:.6rem"><li><b style="font-weight:500">${neg ? "Ditolak" : "Dipilih"}</b>: berapa teman yang menyebut murid ini.</li><li><b style="font-weight:500">Skor</b>: pilihan pertama bernilai 3, kedua 2, ketiga dan seterusnya 1.</li><li><b style="font-weight:500">Indeks</b>: ${neg ? "ditolak" : "dipilih"} dibagi jumlah murid lain di kelas (${an.N - 1}).</li><li><b style="font-weight:500">Kategori</b>: ${neg ? "banyak ditolak bila indeks 0,25 atau lebih; ditolak beberapa teman bila di bawahnya; tidak ditolak bila tidak disebut." : "sangat diterima bila indeks 0,50 atau lebih (atau paling banyak dipilih); diterima 0,25 sampai 0,49; cukup diterima di bawah 0,25; belum dipilih bila tidak ada yang memilih."}</li></ul></details>
      <details class="card" style="margin-top:.6rem"><summary>Matriks pilihan (tabulasi)</summary>
        <p class="muted small" style="margin-top:.6rem">Baris = murid yang memilih, kolom = nomor murid yang dipilih, angka = urutan pilihan.</p>
        <div class="tblwrap" style="margin-top:.5rem"><table class="tbl matrix"><thead><tr><th>Memilih ↓ / Dipilih →</th>${others.map((m) => `<th class="num">${m.no}</th>`).join("")}</tr></thead><tbody>
        ${an.rows.map((r) => `<tr><td>${r.no}. ${esc(firstName(r.name))}</td>${others.map((m) => { const k = r.picks.indexOf(m.no); return `<td class="num">${m.no === r.no ? "·" : k >= 0 ? k + 1 : ""}</td>`; }).join("")}</tr>`).join("")}
        <tr class="tot"><td>Jumlah ${verb}</td>${others.map((m) => `<td class="num">${an.byNo.get(m.no).count}</td>`).join("")}</tr></tbody></table></div></details>

      <h2 class="sec-h">Saran tindak lanjut</h2>
      <div class="stack">${sugg.map(([h, t]) => `<div class="card"><p style="font-weight:500">${esc(h)}</p><p style="margin-top:.3rem">${esc(t)}</p></div>`).join("") || `<div class="card"><p>Tidak ada catatan khusus untuk pertanyaan ini.</p></div>`}</div>
      <p class="muted small" style="margin-top:.6rem">Hasil ini satu potret, bukan label. Gunakan bersama pengamatan dan wawancara, dan jangan tunjukkan hasilnya kepada murid.</p>
    </section>`;
  };

  const body = `
    ${qs.length > 1 ? `<p class="flabel no-print" style="margin-top:1.6rem">Lihat hasil untuk pertanyaan nomor</p>
    <div class="seg qnums no-print" role="tablist" aria-label="Nomor pertanyaan">${qs.map((_, i) => `<label><input type="radio" name="qn" value="${i}"${i ? "" : " checked"}><span>${i + 1}</span></label>`).join("")}</div>` : ""}
    ${per.map(section).join("")}`;

  return {
    body,
    csv() {
      const rows = [["Pertanyaan", "Bidang", "No", "Nama", "L/P", "Dipilih", "Skor", "Indeks", "Kategori", "Pilihan 1", "Pilihan 2", "Pilihan 3", "Pilihan 4", "Pilihan 5"]];
      per.forEach(({ q, an, neg }, i) => an.rows.forEach((r) => rows.push([`${i + 1}. ${q.text}`, areaOf(q), r.no, r.name, r.g, r.count, r.score, r.index.toFixed(2).replace(".", ","), category(r, an, neg), ...[0, 1, 2, 3, 4].map((k) => (r.picks[k] ? an.byNo.get(r.picks[k]).name : ""))])));
      return rows;
    },
    mount(root) {
      const secs = $$(".rep-q", root);
      secs.forEach((sec, i) => {
        const { an } = per[i]; const read = $(".readout", sec);
        const sg = mountSociogram($(".sg-mount", sec), s.roster, an, { onFocus: (row) => (read.innerHTML = describe(an, row)) });
        $('[data-act="names"]', sec).addEventListener("change", (e) => sg.toggleNames(e.target.checked));
        $('[data-act="png"]', sec).addEventListener("click", async () => {
          try { download(`sosiogram-${s.className}-${i + 1}.png`.replace(/\s+/g, "-").toLowerCase(), await svgToPngBlob($("svg", sg.fig))); } catch { toast("Gambar tidak bisa dibuat di browser ini"); }
        });
      });
      $$('input[name="qn"]', root).forEach((r) => r.addEventListener("change", () => secs.forEach((sec) => sec.classList.toggle("hide", sec.dataset.i !== r.value))));
    },
  };
}
