// Laporan resmi (Word dan PDF) untuk dikirim ke guru BK, psikolog, atau kepala sekolah.
// Isinya diambil dari laporan dasbor yang sama (supaya tidak ada dua versi), lalu dibungkus dengan
// kepala laporan, pendahuluan, cara membaca hasil, penutup, dan tanda tangan.
import { GAYA_ITEMS } from "./data.js";
import { JENJANG } from "./akpd-data.js";
import { TK_ITEMS } from "./instruments.js";
import { PR_ITEMS } from "./aman.js";
import { svgToPngBlob } from "./sociogram.js";

/* ---------------- Teks tetap per asesmen ---------------- */
const nums = (list) => list.map((n) => n).join(", ");
const SERIOUS = PR_ITEMS.map((x, i) => (x.serious ? i + 1 : 0)).filter(Boolean);
const DOC = {
  "gaya-belajar": () => ({
    intro: `Asesmen gaya belajar dilaksanakan untuk mengetahui preferensi cara belajar siswa (visual, auditori, dan kinestetik) melalui ${GAYA_ITEMS.length} situasi sehari-hari. Hasilnya dipakai sebagai bahan merancang pembelajaran berdiferensiasi dan memvariasikan cara mengajar di kelas.`,
    read: `Persentase = bagian jawaban siswa yang memilih gaya itu dari ${GAYA_ITEMS.length} situasi. Kombinasi bila dua gaya teratas selisih paling banyak 2 jawaban; seimbang bila ketiganya selisih paling banyak 1 jawaban.`,
  }),
  "minat-karier": (cfg) => {
    const nw = cfg.scale === 5;
    return {
      intro: "Asesmen minat karier dilaksanakan untuk mengenali minat siswa pada enam bidang kegiatan menurut teori Holland (RIASEC): Realistic, Investigative, Artistic, Social, Enterprising, dan Conventional. Hasilnya dipakai sebagai bahan layanan bimbingan karier, baik klasikal maupun individual.",
      read: `Skor tiap tipe = jumlah nilai ${nw ? "8 kegiatan (sangat tidak suka 0 sampai sangat suka 4), jadi 0–32" : "3 kegiatan (tidak tertarik 0 sampai tertarik 2), jadi 0–6"}. Kode = tiga tipe dengan skor tertinggi; dua tipe yang selisihnya paling banyak 12,5% dari rentang skor dianggap setara. "Belum terbedakan": skor tertinggi dan terendah selisih kurang dari 25% rentang. "Minat rendah": skor tertinggi di bawah 50% rentang. Kode bertanda * bersifat sementara dan dipakai sebagai bahan wawancara, bukan kesimpulan.`,
    };
  },
  kepribadian: () => {
    const per = Math.round(TK_ITEMS.length / 4);
    return {
      intro: "Asesmen tipe kepribadian dilaksanakan untuk membantu siswa mengenali preferensinya pada empat pasangan menurut teori tipe psikologis Jung: sumber energi (Ekstrovert–Introvert), cara menangkap informasi (Sensing–Intuitif), cara mengambil keputusan (Thinking–Feeling), dan cara menata kegiatan (Judging–Perceiving). Hasilnya dipakai sebagai bahan layanan bimbingan pribadi dan untuk memvariasikan cara mengajar.",
      read: `Setiap pasangan diukur dengan ${per} situasi dua pilihan; huruf = sisi yang lebih sering dipilih, diikuti kejelasannya. Kejelasan: tipis 6–7, sedang 8–9, jelas 10–${per} dari ${per}. Huruf yang tipis bisa berubah bila diisi ulang. "Preferensi belum terlihat jelas": tiga pasangan atau lebih tipis.`,
    };
  },
  emosi: (cfg) => {
    const p8 = cfg.variant === "phq8";
    return {
      intro: `Skrining suasana hati dilaksanakan dengan Patient Health Questionnaire-${p8 ? "8 (PHQ-8, tanpa pertanyaan nomor 9)" : "9 (PHQ-9) versi remaja"} untuk mengenali murid yang mengalami gejala depresi dalam dua minggu terakhir, supaya mereka dapat segera didampingi dan dirujuk bila perlu. Skrining ini bukan diagnosis.`,
      read: `Tiap butir: tidak pernah 0, beberapa hari 1, lebih dari separuh hari (lebih dari seminggu) 2, hampir setiap hari 3. Total ${p8 ? "0–24" : "0–27"}: minimal 0–4, ringan 5–9, sedang 10–14, cukup berat 15–19, berat 20 ke atas (Kroenke dkk., 2001). Skor 10 atau lebih: perlu dinilai profesional. ${p8 ? "Versi ini tidak menanyakan pikiran menyakiti diri, jadi risiko itu tidak tertangkap; lengkapi dengan percakapan langsung." : 'Jawaban nomor 9 selain "tidak pernah": murid ditemui hari itu juga, berapa pun totalnya.'}`,
    };
  },
  kekuatan: () => ({
    intro: "Asesmen kekuatan dan kesulitan dilaksanakan untuk mengenali kesejahteraan emosi dan perilaku murid dari jawaban mereka sendiri pada lima area: emosi, perilaku, fokus (hiperaktif-inatensi), hubungan dengan teman sebaya, dan kepedulian (prososial). Hasilnya dipakai sebagai bahan layanan bimbingan dan konseling, bukan sebagai diagnosis.",
    read: "Tiap area terdiri dari 5 kalimat (tidak benar 0, agak benar 1, benar 2; lima kalimat positif dihitung terbalik), jadi 0–10. Total kesulitan = emosi + perilaku + fokus + teman (0–40). Batas kelompok (wajar / perlu diamati / perlu perhatian): total 0–15 / 16–19 / 20–40, emosi 0–5 / 6 / 7–10, perilaku 0–3 / 4 / 5–10, fokus 0–5 / 6 / 7–10, teman 0–2 / 3 / 4–10; kepedulian kekuatan 6–10, cukup 5, perlu dikembangkan 0–4. Batas ini mengikuti titik potong SDQ versi laporan diri dan bersifat sementara.",
  }),
  akpd: (cfg) => {
    const jj = JENJANG[cfg.jenjang] || JENJANG.smp, per = Math.round((cfg.n || 60) / 4);
    return {
      intro: `Analisis Kebutuhan Peserta Didik (AKPD) jenjang ${jj} dilaksanakan untuk mengetahui kebutuhan layanan bimbingan dan konseling yang dirasakan peserta didik pada empat bidang: pribadi, sosial, belajar, dan karier. Hasilnya menjadi dasar penyusunan program BK tahunan dan semesteran, serta layanan klasikal, kelompok, dan individual.`,
      read: `Setiap butir dijawab 1 (tidak butuh bantuan), 2 (sedikit butuh), 3 (butuh), atau 4 (sangat butuh bantuan). Rata-rata bidang = jumlah skor ${per} butir bidang itu / ${per}, jadi 1–4; rata-rata kelas adalah rata-rata dari rata-rata semua siswa yang mengisi. Kategori rata-rata bidang: sampai 1,75 rendah, sampai 2,50 sedang, sampai 3,25 tinggi, di atasnya sangat tinggi. Persentase butir = banyak siswa yang menjawab butuh bantuan atau lebih / banyak siswa yang mengisi × 100%; kebutuhan yang dirasakan 50% siswa atau lebih cocok untuk layanan klasikal, 25–49% untuk layanan kelompok. Batas ini kesepakatan untuk merencanakan layanan, bukan norma.`,
    };
  },
  aman: (cfg) => cfg.n === 40 ? {
    intro: "Angket deteksi dini perundungan dilaksanakan untuk mengenali indikasi perundungan di lingkungan sekolah dari jawaban murid sendiri, pada empat aspek: pengalaman sebagai korban, perilaku sebagai pelaku, pengalaman sebagai saksi, serta keamanan dan iklim sosial sekolah, untuk tiga bulan terakhir. Hasilnya dipakai sebagai bahan layanan bimbingan dan konseling serta pencegahan kekerasan di sekolah, bukan sebagai bukti atau dasar hukuman.",
    read: `Pernyataan 1–30 dijawab tidak pernah (0), jarang (1), kadang-kadang (2), sering (3), atau sangat sering (4); pernyataan 31–40 tentang rasa aman dan iklim sekolah dijawab sangat sesuai sampai tidak sesuai, dan pernyataan yang positif dibalik sehingga makin tinggi makin berisiko (skor iklim 0–30). Skor korban, pelaku, dan saksi adalah jumlah sepuluh pernyataannya (0–40). Tingkat indikasi tiap aspek diambil dari pernyataan dengan skor tertinggi: jarang = pantau, kadang-kadang = perlu tindak lanjut; ancaman atau kekerasan fisik (pernyataan ${nums(SERIOUS)}) yang terjadi walau jarang langsung dihitung perlu perhatian segera. Batas ini adalah panduan operasional awal, bukan norma baku.`,
  } : {
    intro: "Angket deteksi dini perundungan dilaksanakan untuk mengenali indikasi perundungan di lingkungan sekolah dari jawaban murid sendiri, sebagai bahan layanan bimbingan dan konseling serta pencegahan kekerasan di sekolah, bukan sebagai bukti atau dasar hukuman.",
    read: "Tiap pernyataan dijawab menurut seberapa sering hal itu terjadi atau seberapa sesuai dengan murid. Hasilnya adalah indikasi awal yang harus diverifikasi lewat wawancara, keterangan saksi, dan pengamatan guru. Batas ini adalah panduan operasional awal, bukan norma baku.",
  },
};
export const hasDoc = (type) => !!DOC[type];

/* ---------------- Tanggal ---------------- */
const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const dLong = (t) => { const d = new Date(t); return `${d.getDate()} ${BLN[d.getMonth()]} ${d.getFullYear()}`; };
const dShort = (t) => { const d = new Date(t); return `${d.getDate()} ${BLN[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`; };
const dIso = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const tahunAjaran = (t) => { const d = new Date(t), y = d.getFullYear(); return d.getMonth() >= 6 ? `${y}/${y + 1} semester Ganjil` : `${y - 1}/${y} semester Genap`; };

// Tanda tangan dan tanggal untuk semua dokumen resmi.
export const docSign = (user) => ({ date: dLong(Date.now()), role: /\bBK\b/i.test(user.role || "") ? "Guru Bimbingan dan Konseling" : user.role || "Guru", name: user.name || "" });
export const safeName = (x) => String(x).replace(/[&/\\:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
export { dLong, dShort, dIso, tahunAjaran };

/* ---------------- Mengambil isi dari laporan dasbor ---------------- */
const SKIP = "script,style,svg,canvas,dialog,button,.no-print,.eyebrow,.stk-legend";
const T = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
const tableOf = (t) => ({ t: "table", head: [...t.querySelectorAll("thead th")].map(T).filter((x, _, a) => a.length) || null, rows: [...t.querySelectorAll("tbody tr")].map((tr) => [...tr.children].map(T)) });

function walk(node, S) {
  const push = (b) => S.cur.push(b);
  for (const c of [...node.children]) {
    if (c.matches(SKIP)) continue;
    const cl = c.classList, tag = c.tagName;
    if (tag === "H2" && cl.contains("sec-h")) { S.cur = []; S.sections.push({ h: T(c), blocks: S.cur }); continue; }
    if (/^H[1-4]$/.test(tag)) { push({ t: "sub", text: T(c) }); continue; }
    if (cl.contains("caveat")) { S.notes.push(T(c)); continue; }
    if (tag === "TABLE" || cl.contains("tblwrap")) { const t = tableOf(tag === "TABLE" ? c : c.querySelector("table")); if (!t.head?.length) t.head = null; push(t); continue; }
    if (cl.contains("stk")) {
      const legend = [...(c.nextElementSibling?.classList.contains("stk-legend") ? c.nextElementSibling.children : [])].map((sp) => ({ c: sp.querySelector("i")?.className || "", t: T(sp) }));
      const rows = [...c.querySelectorAll(".stk-row")].map((r) => {
        const seg = [...r.querySelectorAll(".bar i")].reduce((m, i) => ((m[i.className] = T(i)), m), {});
        return [T(r.querySelector(".nm")), ...legend.map((l) => seg[l.c] ?? "0")];
      });
      push({ t: "table", head: [S.stkHead, ...legend.map((l) => l.t)], rows }); continue;
    }
    if (cl.contains("hbars") || cl.contains("bars") || cl.contains("rbars")) {
      const last = S.sections[S.sections.length - 1].h;
      push({ t: "table", head: cl.contains("rbars") ? ["Bidang minat", "Rata-rata skor"] : /Bentuk/.test(last) ? ["Pernyataan", "Murid · persen"] : /Gejala/.test(last) ? ["Gejala", "Murid"] : S.type === "emosi" ? ["Tingkat gejala", "Banyak murid"] : ["Kategori", "Hasil"], rows: [...c.children].filter((r) => r.querySelector(".nm")).map((r) => [T(r.querySelector(".nm")), T(r.querySelector(".val"))]) }); continue;
    }
    if (cl.contains("tkheat")) {
      const cells = [...c.children].map((d) => `${T(d.querySelector("small"))}: ${T(d.querySelector("b"))}`), rows = [];
      for (let i = 0; i < cells.length; i += 4) rows.push(cells.slice(i, i + 4));
      push({ t: "table", head: ["ST", "SF", "NF", "NT"], rows }); continue;
    }
    if (cl.contains("tkpairs")) {
      push({ t: "table", head: ["Pasangan", "Sisi pertama", "Sisi kedua"], rows: [...c.querySelectorAll(".tkp")].map((p) => { const sp = p.querySelectorAll(".row > span"), a1 = T(sp[0]).match(/^(\w) · (.+?) (\d+)$/), b1 = T(sp[2]).match(/^(\d+) (.+?) · (\w)$/); return [T(p.querySelector(".t")), a1 ? `${a1[2]} (${a1[1]}): ${a1[3]}` : T(sp[0]), b1 ? `${b1[2]} (${b1[3]}): ${b1[1]}` : T(sp[2])]; }) }); continue;
    }
    if (cl.contains("who")) {
      push({ t: "ol", items: [...c.children].map((li) => { const b = T(li.querySelector("b") || li), tag2 = li.querySelector(".tag2") ? T(li.querySelector(".tag2")).toLowerCase() : "", note = li.querySelector("p") ? T(li.querySelector("p")) : ""; return `${b}${tag2 ? ` (${tag2})` : ""}${note ? `: ${note}` : ""}`; }) }); continue;
    }
    if (cl.contains("ggroups")) {
      push({ t: "table", head: ["Kelompok", "Murid"], rows: [...c.querySelectorAll(":scope > .card")].map((cd) => {
        const gh = cd.querySelector(".gh"), title = gh ? [...gh.childNodes].filter((n) => !(n.classList && n.classList.contains("muted")) && !(n.classList && n.classList.contains("dot"))).map((n) => n.textContent).join("").trim() : "";
        const names = [...cd.querySelectorAll("li")].map((li) => { const sp = li.querySelectorAll("span"), btn = li.querySelector(".linkname"); const n = btn ? T(btn) : T(sp[0] || li), note = btn ? (sp[0] ? T(sp[0]) : "") : sp[1] ? T(sp[1]) : ""; return note && note !== "-" ? `${n} (${note.replace(/^\+\s*/, "")})` : n; });
        return [title || T(cd).slice(0, 40), names.join(", ") || "-"];
      }) }); continue;
    }
    if (cl.contains("needs")) {
      push({ t: "table", head: ["No. butir", "Kebutuhan", "Bidang", "Siswa (butuh bantuan atau lebih)"], rows: [...c.querySelectorAll(".nd")].map((d) => {
        const tx = d.querySelector(".tx"), bid = tx.querySelector(".muted"), bt = bid ? T(bid).replace(/^·\s*/, "") : "";
        if (bid) bid.remove(); return [T(d.querySelector(".no")), T(tx).replace(/[\s·]+$/, ""), bt, T(d.querySelector(".val"))];
      }) }); continue;
    }
    if (cl.contains("akrow-wrap")) {
      push({ t: "table", head: ["Bidang", "Rata-rata kelas (1–4)", "Kategori"], rows: [...c.querySelectorAll(".akrow")].map((r) => { const v = T(r.querySelector(".val")).split(" "); return [T(r.querySelector(".nm")), v[0], (v.slice(1).join(" ") || "").replace(/^./, (x) => x.toUpperCase())]; }) }); continue;
    }
    if (tag === "OL" || tag === "UL") {
      const items = [...c.children].map((li) => { const k = li.cloneNode(true); const nb = k.querySelector(".linkname"); if (nb) { const nt = T(k).slice(T(nb).length).trim(); return nt ? `${T(nb)} (${nt})` : T(nb); } k.querySelectorAll(":scope > span:first-child").forEach((sp) => { if (/^\d+$/.test(T(sp))) sp.remove(); }); return T(k); }).filter(Boolean);
      if (items.length) push({ t: tag === "OL" ? "ol" : "ul", items }); continue;
    }
    if (tag === "DL") {
      const rows = []; [...c.children].forEach((e) => { if (e.tagName === "DT") rows.push([T(e), ""]); else if (e.tagName === "DD" && rows.length) rows[rows.length - 1][1] = T(e); });
      push({ t: "table", head: cl.contains("gloss") ? ["Istilah", "Arti"] : cl.contains("glegend") ? ["Gaya belajar", "Porsi jawaban kelas"] : null, rows }); continue;
    }
    if (tag === "DETAILS") {
      const sum = T(c.querySelector("summary") || c), rest = [...c.children].filter((e) => e.tagName !== "SUMMARY");
      if (c.querySelector("table")) { push({ t: "sub", text: sum }); const wrap = document.createElement("div"); rest.forEach((e) => wrap.appendChild(e.cloneNode(true))); walk(wrap, S); }
      else push({ t: "p", text: /^Belum mengisi/.test(sum) ? `${sum}: ${rest.map(T).join(" ")}.` : `${sum}. ${rest.map(T).join(" ")}` });
      continue;
    }
    if (tag === "P") { const t = T(c); if (t) push({ t: "p", text: t, note: cl.contains("small") }); continue; }
    if (c.children.length) { walk(c, S); continue; }
    const t = T(c); if (t) push({ t: "p", text: t });
  }
}

/* ---------------- Menyusun dokumen ---------------- */
export function buildDoc({ user, s, a, res, bodyHtml }) {
  const cfg = s.config || {}, info = DOC[s.type](cfg);
  const wrap = document.createElement("div"); wrap.innerHTML = bodyHtml;
  const S = { sections: [], notes: [], stkHead: s.type === "kekuatan" ? "Area" : "Aspek", type: s.type };
  S.cur = []; S.sections.push({ h: "Gambaran kelas", blocks: S.cur });
  walk(wrap, S);
  const secs = S.sections.filter((x) => x.blocks.length);
  const title = (a.title || a.name).toUpperCase();
  const pct = s.roster.length ? Math.round((res.length / s.roster.length) * 100) : 0;
  const when = s.createdAt ? `${dShort(s.createdAt)} s.d. ${dShort(s.closesAt)}` : `s.d. ${dShort(s.closesAt)}`;
  const now = Date.now();
  const sections = [
    { h: "Pendahuluan", blocks: [{ t: "p", text: info.intro }] },
    { h: "Cara membaca hasil", blocks: [{ t: "p", text: info.read }] },
    ...secs,
    { h: "Penutup", blocks: [
      { t: "p", text: `Demikian laporan hasil asesmen ${a.name} ini disusun sebagai bahan pertimbangan dalam pembelajaran dan bimbingan siswa ${s.className}.` },
      ...S.notes.map((n) => ({ t: "p", text: `Catatan: ${n}`, italic: true })),
    ] },
  ].map((x, i) => ({ ...x, h: `${String.fromCharCode(65 + i)}. ${x.h}` }));
  const meta = [["Kelas", s.className], ...(user.school ? [["Sekolah", user.school]] : []), ["Tahun ajaran", tahunAjaran(s.createdAt || now)], ["Waktu pelaksanaan", when], ["Partisipasi", `${res.length} dari ${s.roster.length} siswa (${pct}%)`]];
  const wide = Math.max(0, ...sections.flatMap((x) => x.blocks.filter((b) => b.t === "table").map((b) => (b.head || b.rows[0] || []).length))) > 9;
  return {
    file: `${(a.title || a.name).replace(/[&/\\:*?"<>|]/g, "")} ${s.className.replace(/[/\\:*?"<>|]/g, "")} ${dIso(now)}`.replace(/\s+/g, " "),
    title: `LAPORAN HASIL ASESMEN ${title}`, meta, sections, wide,
    sign: docSign(user),
    footer: "Rahasia: hanya untuk guru dan pihak sekolah yang berwenang",
  };
}

/* ---------------- Bentuk dokumen ----------------
   m = { file, footer, wide, parts: [part] }, atau satu part langsung (laporan asesmen).
   part = { title, meta: [[k, v]], lead: [blok], sections: [{ h, blocks }], sign, after: [{ h, blocks }] }
   blok: p { text, italic, bold, note } · sub { text } · ol/ul { items } · checks { items: [{ done, text }] }
         table { head, rows } (isi sel boleh memuat "\n") · img { svg, caption, cm } · slot { id } (khusus pratinjau). */
const partsOf = (m) => m.parts || [m];
const h = (x) => String(x ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hb = (x) => h(x).replace(/\n/g, "<br>");
const E = (ed, path) => (ed ? ` contenteditable="true" spellcheck="false" data-path="${path}"` : "");

function blockHtml(b, path, ed, slot) {
  if (b.t === "p") { const c = [b.italic && "it", b.note && "sm", b.bold && "b"].filter(Boolean).join(" "); return `<p${c ? ` class="${c}"` : ""}${E(ed, path + ".text")}>${hb(b.text)}</p>`; }
  if (b.t === "sub") return `<h3${E(ed, path + ".text")}>${h(b.text)}</h3>`;
  if (b.t === "ol" || b.t === "ul") return `<${b.t}>${b.items.map((x, i) => `<li${E(ed, `${path}.items.${i}`)}>${hb(x)}</li>`).join("")}</${b.t}>`;
  if (b.t === "checks") return `<ol class="checks">${b.items.map((x, i) => `<li>${ed ? `<input type="checkbox" data-path="${path}.items.${i}.done"${x.done ? " checked" : ""} aria-label="Tandai">` : `[${x.done ? "v" : "&nbsp;&nbsp;"}] `}<span${E(ed, `${path}.items.${i}.text`)}>${hb(x.text)}</span></li>`).join("")}</ol>`;
  if (b.t === "img") return `<figure class="img"><div class="svg" style="max-width:${b.cm || 14}cm">${b.svg}</div>${b.caption ? `<figcaption>${h(b.caption)}</figcaption>` : ""}</figure>`;
  if (b.t === "slot") return slot ? slot(b.id) : "";
  if (b.t !== "table") return "";
  const w = colW(b);
  return `<table class="dt"><colgroup>${w.map((x) => `<col style="width:${x}%">`).join("")}</colgroup>${b.head ? `<thead><tr>${b.head.map((c) => `<th>${h(c)}</th>`).join("")}</tr></thead>` : ""}<tbody>${b.rows.map((r, ri) => `<tr>${r.map((c, ci) => `<td${E(ed, `${path}.rows.${ri}.${ci}`)}>${hb(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function partHtml(p, pi, ed, slot) {
  const P = `p.${pi}`;
  const secs = (list, key, brk) => (list || []).map((s, si) => `<h2${brk && si === 0 ? ' class="pb"' : ""}>${h(s.h)}</h2>${s.blocks.map((b, bi) => blockHtml(b, `${P}.${key}.${si}.blocks.${bi}`, ed, slot)).join("")}`).join("");
  return `<h1>${h(p.title)}</h1>
${p.meta?.length ? `<table class="meta">${p.meta.map(([k, v]) => `<tr><td>${h(k)}</td><td>: ${h(v)}</td></tr>`).join("")}</table>` : ""}
${(p.lead || []).map((b, bi) => blockHtml(b, `${P}.lead.${bi}`, ed, slot)).join("")}
${secs(p.sections, "sections")}
${p.sign ? `<div class="sign"><p>${h(p.sign.date)}</p><p>${h(p.sign.role)}</p><p class="nm">${h(p.sign.name) || "&nbsp;"}</p><p>NIP.</p></div>` : ""}
${secs(p.after, "after", true)}`;
}
const DOC_CSS = (m) => `
@page{size:A4 ${m.wide ? "landscape" : "portrait"};margin:20mm 18mm 20mm;${m.footer ? `@bottom-left{content:"${m.footer}";font:italic 8pt "Times New Roman",serif;color:#444}` : ""}@bottom-right{content:"Halaman " counter(page) " dari " counter(pages);font:italic 8pt "Times New Roman",serif;color:#444}}
*{box-sizing:border-box}body{font:11pt/1.5 "Times New Roman",Times,serif;color:#000;margin:0}
h1{font-size:13pt;text-align:center;margin:0 0 6mm}h2{font-size:11.5pt;margin:6mm 0 2mm;break-after:avoid}h3{font-size:11pt;margin:4mm 0 1.5mm;break-after:avoid}
.pb{break-before:page}p{margin:0 0 2.5mm;text-align:justify}p.it{font-style:italic}p.sm{font-size:10pt}p.b{font-weight:bold}ol,ul{margin:0 0 3mm;padding-left:7mm}li{margin:0 0 1mm;text-align:justify}
.meta{border-collapse:collapse;margin-bottom:4mm;width:auto;table-layout:auto}.meta td{border:0;padding:0 3mm 0 0;font-size:11pt}
table.dt{border-collapse:collapse;width:100%;margin:1mm 0 4mm;table-layout:fixed;font-size:${m.wide ? "8" : "9.5"}pt;line-height:1.3}
.dt th,.dt td{border:.6pt solid #000;padding:1.2mm 1.6mm;vertical-align:top;text-align:left;overflow-wrap:anywhere}.dt th{background:#e6e6e6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
thead{display:table-header-group}tr{break-inside:avoid}
figure.img{margin:2mm 0 4mm;text-align:center;break-inside:avoid}figure.img .svg{margin:0 auto}figure.img svg{width:100%;height:auto;display:block;-webkit-print-color-adjust:exact;print-color-adjust:exact}
figcaption{font-size:9pt;font-style:italic;margin-top:2mm;text-align:center}
.sign{margin:10mm 0 0 auto;width:75mm;break-inside:avoid}.sign p{margin:0;text-align:left}.sign .nm{margin-top:20mm;font-weight:bold;text-decoration:underline}`;

export function docHtml(m) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${h(m.file)}</title><style>${DOC_CSS(m)}</style></head><body>
${partsOf(m).map((p, pi) => `<div class="${pi ? "pb" : ""}">${partHtml(p, pi, false)}</div>`).join("")}
</body></html>`;
}
// Pratinjau di halaman: teks bisa diubah langsung (contenteditable), lalu dibaca kembali dengan syncPreview.
export const previewHtml = (m, slot) => partsOf(m).map((p, pi) => `<div class="docprev">${partHtml(p, pi, true, slot)}</div>`).join("");
const textOf = (el) => {
  if (typeof el.innerText === "string") return el.innerText;
  const c = el.cloneNode(true); c.querySelectorAll("br").forEach((b) => b.replaceWith("\n")); return c.textContent;
};
export function syncPreview(m, root) {
  root.querySelectorAll("[data-path]").forEach((el) => {
    const keys = el.dataset.path.split("."), last = keys.pop();
    let o = partsOf(m)[Number(keys[1])];
    for (const k of keys.slice(2)) o = o?.[/^\d+$/.test(k) ? Number(k) : k];
    if (!o) return;
    o[/^\d+$/.test(last) ? Number(last) : last] = el.type === "checkbox" ? el.checked : textOf(el).replace(/ /g, " ").replace(/\n{3,}/g, "\n\n").trim();
  });
  return m;
}
// Lebar kolom proporsional dengan panjang isi, supaya kolom "No" sempit dan kolom catatan lebar.
function colW(b) {
  const n = (b.head || b.rows[0] || []).length || 1;
  const len = (x) => Math.max(...String(x ?? "").split("\n").map((l) => l.length));
  const w = Array.from({ length: n }, (_, i) => Math.min(40, Math.max(4, ...[b.head?.[i], ...b.rows.map((r) => r[i])].map(len))));
  const tot = w.reduce((t, x) => t + x, 0);
  return w.map((x) => Math.round((x / tot) * 1000) / 10);
}

/* ---------------- Word (.docx tanpa pustaka) ---------------- */
const X = (s) => String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const run = (t, o = {}) => `<w:r><w:rPr>${o.b ? "<w:b/>" : ""}${o.i ? "<w:i/>" : ""}${o.sz ? `<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>` : ""}${o.u ? '<w:u w:val="single"/>' : ""}</w:rPr><w:t xml:space="preserve">${X(t)}</w:t></w:r>`;
const par = (runs, o = {}) => `<w:p><w:pPr>${o.keep ? "<w:keepNext/>" : ""}${o.pb ? "<w:pageBreakBefore/>" : ""}<w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 100}"/>${o.ind ? `<w:ind ${o.ind}/>` : ""}${o.jc ? `<w:jc w:val="${o.jc}"/>` : ""}</w:pPr>${runs}</w:p>`;
const bdr = ["top", "left", "bottom", "right", "insideH", "insideV"].map((k) => `<w:${k} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join("");

function docxTable(b, W) {
  const cols = (b.head || b.rows[0] || []).length || 1, sz = cols > 9 ? 15 : cols > 6 ? 17 : 19;
  const w = colW(b).map((p) => Math.max(500, Math.round((p / 100) * W)));
  const cell = (t, i, head) => `<w:tc><w:tcPr><w:tcW w:w="${w[i]}" w:type="dxa"/>${head ? '<w:shd w:val="clear" w:color="auto" w:fill="E6E6E6"/>' : ""}</w:tcPr>${String(t ?? "").split("\n").map((line) => par(run(line, { sz, b: head }), { after: 0 })).join("")}</w:tc>`;
  const row = (r, head) => `<w:tr><w:trPr><w:cantSplit/>${head ? "<w:tblHeader/>" : ""}</w:trPr>${Array.from({ length: cols }, (_, i) => cell(r[i] ?? "", i, head)).join("")}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${w.reduce((t, x) => t + x, 0)}" w:type="dxa"/><w:tblBorders>${bdr}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${w.map((x) => `<w:gridCol w:w="${x}"/>`).join("")}</w:tblGrid>${b.head ? row(b.head, true) : ""}${b.rows.map((r) => row(r, false)).join("")}</w:tbl>${par("", { after: 80 })}`;
}
const NS_PIC = 'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
const drawing = (rid, n, cm) => { const e = Math.round(cm * 360000); return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${e}" cy="${e}"/><wp:docPr id="${n}" name="Gambar ${n}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="gambar${n}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${e}" cy="${e}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`; };

function docxBody(m, images) {
  const W = m.wide ? 16838 - 2 * 1134 : 11906 - 2 * 1418, out = [];
  const blk = (b) => {
    if (b.t === "p") String(b.text ?? "").split("\n").forEach((line) => out.push(par(run(line, { i: b.italic, b: b.bold, sz: b.note ? 20 : 0 }), { jc: b.note ? undefined : "both" })));
    else if (b.t === "sub") out.push(par(run(b.text, { b: true }), { before: 100, after: 60, keep: true }));
    else if (b.t === "ol" || b.t === "ul") b.items.forEach((it, i) => out.push(par(run(`${b.t === "ol" ? i + 1 + "." : "•"}\t${it}`), { ind: 'w:left="425" w:hanging="425"', after: 40, jc: "both" })));
    else if (b.t === "checks") b.items.forEach((it, i) => out.push(par(run(`${i + 1}.\t[${it.done ? "v" : "  "}] ${it.text}`), { ind: 'w:left="425" w:hanging="425"', after: 40, jc: "both" })));
    else if (b.t === "img") {
      const img = images.get(b);
      out.push(img ? par(drawing(img.rid, img.n, b.cm || 14), { jc: "center", after: 60, keep: true }) : par(run("(Gambar tidak dapat dibuat di peramban ini; lihat versi PDF.)", { i: true, sz: 18 }), { jc: "center" }));
      if (b.caption) out.push(par(run(b.caption, { i: true, sz: 18 }), { jc: "center", after: 160 }));
    } else if (b.t === "table") out.push(docxTable(b, W));
  };
  const ind = `w:left="${m.wide ? 9000 : 5200}"`;
  partsOf(m).forEach((p, pi) => {
    out.push(par(run(p.title, { b: true, sz: 26 }), { jc: "center", after: 240, pb: pi > 0 }));
    (p.meta || []).forEach(([k, v]) => out.push(`<w:p><w:pPr><w:tabs><w:tab w:val="left" w:pos="2400"/></w:tabs><w:spacing w:before="0" w:after="20"/></w:pPr>${run(k)}<w:r><w:tab/></w:r>${run(": " + v)}</w:p>`));
    if (p.meta?.length) out.push(par("", { after: 80 }));
    (p.lead || []).forEach(blk);
    const secs = (list, brk) => (list || []).forEach((s, si) => { out.push(par(run(s.h, { b: true }), { before: 200, after: 80, keep: true, pb: brk && si === 0 })); s.blocks.forEach(blk); });
    secs(p.sections);
    if (p.sign) out.push(par("", { after: 200 }), par(run(p.sign.date), { ind, after: 0 }), par(run(p.sign.role), { ind, after: 0 }), par("", { ind, after: 900 }), par(run(p.sign.name || " ", { b: true, u: true }), { ind, after: 0 }), par(run("NIP."), { ind }));
    secs(p.after, true);
  });
  const sect = m.wide ? `<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/>` : `<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1304" w:left="1418" w:header="709" w:footer="567" w:gutter="0"/>`;
  return { xml: out.join("") + `<w:sectPr><w:footerReference w:type="default" r:id="rId2"/>${sect}</w:sectPr>`, W };
}

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

// Gambar SVG diubah menjadi PNG lewat kanvas peramban. Bila gagal, dokumen tetap dibuat tanpa gambar.
async function svgPng(svg) {
  const el = new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
  const blob = await Promise.race([svgToPngBlob(el, 1200), new Promise((_, no) => setTimeout(() => no(new Error("waktu habis")), 8000))]);
  if (!blob) throw new Error("gambar kosong");
  return new Uint8Array(await blob.arrayBuffer());
}

export async function docxBlob(m) {
  const imgs = partsOf(m).flatMap((p) => [...(p.lead || []), ...[...(p.sections || []), ...(p.after || [])].flatMap((s) => s.blocks)]).filter((b) => b.t === "img");
  const images = new Map(), media = [];
  for (const b of imgs) {
    try { const data = await svgPng(b.svg), n = media.length + 1; media.push({ name: `word/media/gambar${n}.png`, data, rid: `rImg${n}` }); images.set(b, { rid: `rImg${n}`, n }); } catch { break; /* peramban tidak bisa menggambar: lanjut tanpa gambar */ }
  }
  const { xml, W } = docxBody(m, images), enc = new TextEncoder();
  const fsz = '<w:sz w:val="16"/><w:szCs w:val="16"/>';
  const fld = (ins) => `<w:fldSimple w:instr="${ins}"><w:r><w:rPr><w:i/>${fsz}</w:rPr><w:t>1</w:t></w:r></w:fldSimple>`;
  const fr = (t) => `<w:r><w:rPr><w:i/>${fsz}</w:rPr><w:t xml:space="preserve">${X(t)}</w:t></w:r>`;
  const files = [
    ["[Content_Types].xml", `${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`],
    ["_rels/.rels", `${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
    ["word/_rels/document.xml.rels", `${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>${media.map((x) => `<Relationship Id="${x.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${x.name.slice(5)}"/>`).join("")}</Relationships>`],
    ["word/styles.xml", `${HEAD}<w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`],
    ["word/footer1.xml", `${HEAD}<w:ftr ${NS}><w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="${W}"/></w:tabs><w:spacing w:before="0" w:after="0"/></w:pPr>${m.footer ? fr(m.footer) : ""}<w:r><w:tab/></w:r>${fr("Halaman ")}${fld("PAGE")}${fr(" dari ")}${fld("NUMPAGES")}</w:p></w:ftr>`],
    ["word/document.xml", `${HEAD}<w:document ${NS} ${NS_PIC}><w:body>${xml}</w:body></w:document>`],
  ].map(([name, text]) => ({ name, data: enc.encode(text) }));
  return zip([...files, ...media]);
}

const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u) => { let c = 0xffffffff; for (let i = 0; i < u.length; i++) c = crcT[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
// ZIP tanpa kompresi (cukup untuk .docx), menulis nama berkas dalam UTF-8.
function zip(files) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
    const l = new DataView(new ArrayBuffer(30));
    l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true); l.setUint16(6, 0x0800, true); l.setUint16(12, 0x21, true);
    l.setUint32(14, crc, true); l.setUint32(18, sz, true); l.setUint32(22, sz, true); l.setUint16(26, name.length, true);
    parts.push(new Uint8Array(l.buffer), name, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true); c.setUint32(20, sz, true); c.setUint32(24, sz, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), name);
    off += 30 + name.length + sz;
  }
  const csz = central.reduce((t, x) => t + x.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csz, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

/* ---------------- Dipanggil dari halaman laporan ---------------- */
export function saveBlob(name, blob) {
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
// PDF: dokumen resmi dibuka di bingkai tersembunyi lalu dialog cetak muncul; pilih "Simpan sebagai PDF".
export function printDoc(m) {
  const f = document.createElement("iframe");
  f.setAttribute("aria-hidden", "true"); f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  const old = document.title, done = () => { document.title = old; setTimeout(() => f.remove(), 500); };
  f.onload = () => { document.title = m.file; const w = f.contentWindow; w.onafterprint = done; w.focus(); w.print(); setTimeout(done, 60000); };
  f.srcdoc = docHtml(m);
}
