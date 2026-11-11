// Angket sosiometri: daftar angket, lihat pertanyaan, dan pembuat angket sendiri.
import { esc, $, $$, toast, go } from "./util.js";
import { store } from "./store.js";
import { header } from "./pages-public.js";
import { SOCIO_BANK, SOCIO_VARIANTS, AREAS, socioSummary, areaOf } from "./socio-data.js";

const MAX_Q = 8;

// Angket siap pakai atau milik guru, dalam bentuk { id, name, own, config }.
export async function findQuestionnaire(id) {
  const v = SOCIO_VARIANTS.find((x) => x.id === id);
  if (v) return { id: v.id, name: v.name, own: false, config: { maxPick: v.maxPick, reasons: v.reasons, questions: v.questions } };
  if (!id) return null;
  const q = await store.getQuestionnaire(id).catch(() => null);
  return q && { id: q.id, name: q.name, own: true, config: q.config };
}

const byArea = (qs) => AREAS.map((a) => [a, qs.map((q, i) => ({ q, i })).filter((x) => areaOf(x.q) === a)]).filter(([, l]) => l.length);

/* ---------------- Daftar angket ---------------- */
export async function questionnaires({ user }) {
  const mine = await store.listQuestionnaires();
  const card = (id, name, c, own) => `<div class="card qcard">
    <h3>${esc(name)}</h3><p class="muted">${esc(socioSummary(c))} · ${esc([...new Set(c.questions.map(areaOf))].join(", "))}</p>
    <ol>${c.questions.map((q) => `<li>${esc(q.text)}${q.neg ? ` <span class="tag neg">Penolakan</span>` : ""}</li>`).join("")}</ol>
    <div class="rowflex" style="margin-top:.9rem">${own
      ? `<a class="btn sm" href="#/angket/${id}">Ubah</a><a class="btn sm" href="#/mulai/sosiometri?angket=${id}">Pakai</a><button class="btn sm danger" data-del="${id}">Hapus</button>`
      : `<a class="btn sm" href="#/mulai/sosiometri?angket=${id}">Pakai</a><a class="btn sm" href="#/angket/baru?dari=${id}">Salin lalu ubah</a>`}</div></div>`;
  const html = `${header(user, "angket")}<main class="page"><div class="narrow">
    <a class="back" href="#/dasbor">← Dasbor</a>
    <div class="spread"><h1 class="page-title">Angket</h1><a class="btn primary" href="#/angket/baru">Buat angket</a></div>
    <p class="page-sub">Angket adalah daftar pertanyaan sosiometri yang dipakai saat memulai sesi. Angket siap pakai bisa disalin lalu diubah sesuai kebutuhan.</p>
    ${mine.length ? `<h2 class="sec-h">Angket saya</h2><div class="stack">${mine.map((q) => card(q.id, q.name, q.config, true)).join("")}</div>` : ""}
    <h2 class="sec-h">Siap pakai</h2>
    <div class="stack">${SOCIO_VARIANTS.map((v) => card(v.id, v.name, v, false)).join("")}</div>
  </div></main>`;
  return {
    title: "Angket", html,
    mount(root, ctx) {
      $$("[data-del]", root).forEach((b) => b.addEventListener("click", async () => {
        if (!confirm("Hapus angket ini? Sesi yang sudah memakainya tidak terpengaruh.")) return;
        try { await store.deleteQuestionnaire(b.dataset.del); toast("Angket dihapus"); ctx.reload(); } catch (ex) { toast(ex.message); }
      }));
    },
  };
}

/* ---------------- Lihat pertanyaan satu angket ---------------- */
export async function questionnaireView({ user, params, query }) {
  const q = await findQuestionnaire(params.id);
  const kelas = query.get("kelas");
  const back = `#/mulai/sosiometri?angket=${encodeURIComponent(params.id)}${kelas ? `&kelas=${encodeURIComponent(kelas)}` : ""}`;
  if (!q) return { html: `${header(user, "dasbor")}<main class="page"><div class="narrow"><h1 class="page-title">Angket tidak ditemukan</h1><p style="margin-top:1rem"><a class="btn" href="#/angket">Ke daftar angket</a></p></div></main>` };
  const c = q.config;
  const html = `${header(user, "dasbor")}<main class="page"><div class="narrow">
    <a class="back" href="${back}">← Kembali ke mulai sosiometri</a>
    <h1 class="page-title">${esc(q.name)}</h1>
    <p class="page-sub">${c.questions.length} pertanyaan. Untuk tiap pertanyaan, murid memilih maksimal ${c.maxPick} teman${c.reasons ? " dan menyebutkan alasannya" : ""}.</p>
    ${byArea(c.questions).map(([a, list]) => `<h2 class="sec-h">${a}</h2><div class="card"><ol class="qlist">${list.map(({ q: x, i }) => `<li value="${i + 1}">${esc(x.text)}${x.neg ? ` <span class="tag neg">Penolakan</span>` : ""}</li>`).join("")}</ol></div>`).join("")}
    <a class="btn primary block" href="${back}" style="margin-top:1.6rem">Pakai angket ini</a>
    ${q.own ? `<p style="margin-top:.8rem;text-align:center"><a href="#/angket/${q.id}">Ubah angket ini</a></p>` : ""}
  </div></main>`;
  return { title: q.name, html };
}

/* ---------------- Buat atau ubah angket ---------------- */
export async function questionnaireEdit({ user, params, query }) {
  const isNew = params.id === "baru";
  const src = isNew ? (query.get("dari") ? await findQuestionnaire(query.get("dari")) : null) : await findQuestionnaire(params.id);
  if (!isNew && (!src || !src.own)) return { html: `${header(user, "angket")}<main class="page"><div class="narrow"><h1 class="page-title">Angket tidak ditemukan</h1><p style="margin-top:1rem"><a class="btn" href="#/angket">Ke daftar angket</a></p></div></main>` };
  const next = query.get("lanjut") || "";
  let name = isNew ? (src ? `${src.name} (salinan)` : "") : src.name;
  let maxPick = src?.config.maxPick || 3, reasons = src ? !!src.config.reasons : true;
  let qs = src ? src.config.questions.map((q) => ({ ...q })) : [];
  let area = "Sosial";

  const html = `${header(user, "angket")}<main class="page"><div class="narrow">
    <a class="back" href="${next ? "#" + next : "#/angket"}">← ${next ? "Kembali" : "Angket"}</a>
    <h1 class="page-title">${isNew ? "Buat angket" : "Ubah angket"}</h1>
    <label class="field"><span>Nama angket</span><input type="text" id="a-name" maxlength="60" placeholder="Misalnya: Awal semester kelas 7" value="${esc(name)}"></label>
    <div class="field"><span class="flabel">Paling banyak teman yang dipilih per pertanyaan</span>
      <div class="seg" role="radiogroup" id="a-max">${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="max" value="${n}"${n === maxPick ? " checked" : ""}><span>${n}</span></label>`).join("")}</div>
      <span class="hint">Umumnya 3. Murid boleh memilih lebih sedikit, berurutan dari yang paling diinginkan.</span></div>
    <label class="check" style="margin-top:1.2rem"><input type="checkbox" id="a-reasons"${reasons ? " checked" : ""}><span>Tanyakan alasan memilih</span></label>
    <p class="muted small" style="margin:.3rem 0 0 1.9rem">Murid memilih alasan untuk setiap teman, misalnya "sabar mendengarkan", dari daftar sesuai bidang pertanyaan. Laporan lalu menunjukkan alasan yang paling sering. Hanya untuk pertanyaan positif; menambah satu ketukan per teman.</p>

    <h2 class="sec-h">Pertanyaan <span class="muted" id="a-count"></span></h2>
    <div id="a-list"></div>

    <section class="card soft" style="margin-top:1.4rem">
      <h3>Ambil dari bank pertanyaan</h3>
      <div id="a-bank"></div>
    </section>

    <section class="card" style="margin-top:1rem">
      <h3>Tulis pertanyaan sendiri</h3>
      <label class="field"><span>Pertanyaan</span><textarea id="a-text" maxlength="200" style="min-height:90px"></textarea><span class="hint">Tulis sebagai pertanyaan tentang teman, misalnya: Dengan siapa kamu paling senang mengerjakan tugas praktik?</span></label>
      <div class="field"><span class="flabel">Bidang</span><div class="seg" id="a-area">${AREAS.map((a) => `<label><input type="radio" name="area" value="${a}"${a === area ? " checked" : ""}><span>${a}</span></label>`).join("")}</div></div>
      <label class="check" style="margin-top:.9rem"><input type="checkbox" id="a-neg"><span>Pertanyaan penolakan (paling tidak ingin)</span></label>
      <button class="btn sm" id="a-add" style="margin-top:.9rem">Tambah pertanyaan</button>
    </section>

    <p class="err" id="a-err" role="alert"></p>
    <button class="btn primary block" id="a-save" style="margin-top:1rem">Simpan angket</button>
  </div></main>`;

  return {
    title: isNew ? "Buat angket" : "Ubah angket", html,
    mount(root) {
      const err = $("#a-err", root);
      const draw = () => {
        $("#a-count", root).textContent = `${qs.length}/${MAX_Q}`;
        $("#a-list", root).innerHTML = qs.length
          ? `<ol class="qedit">${qs.map((q, i) => `<li data-i="${i}"><span class="tag">${esc(areaOf(q))}</span>${q.neg ? `<span class="tag neg">Penolakan</span>` : ""}<span class="tx">${esc(q.text)}</span>
              <span class="acts"><button type="button" class="linkbtn" data-act="up" aria-label="Naikkan"${i ? "" : " disabled"}>↑</button><button type="button" class="linkbtn" data-act="down" aria-label="Turunkan"${i < qs.length - 1 ? "" : " disabled"}>↓</button><button type="button" class="linkbtn" data-act="rm">Hapus</button></span></li>`).join("")}</ol>`
          : `<p class="muted">Belum ada pertanyaan. Ambil dari bank di bawah atau tulis sendiri.</p>`;
        const used = new Set(qs.map((q) => q.id));
        $("#a-bank", root).innerHTML = AREAS.map((a) => `<p class="bank-h">${a}</p>${SOCIO_BANK.filter((q) => q.area === a).map((q) => `<div class="bank-q${used.has(q.id) ? " used" : ""}"><span>${esc(q.text)}</span><button type="button" class="linkbtn" data-add="${q.id}"${used.has(q.id) ? " disabled" : ""}>${used.has(q.id) ? "Dipakai" : q.neg ? "+ Penolakan" : "+ Tambah"}</button></div>`).join("")}`).join("");
      };
      const full = () => { if (qs.length >= MAX_Q) { toast(`Paling banyak ${MAX_Q} pertanyaan`); return true; } return false; };
      $("#a-list", root).addEventListener("click", (e) => {
        const b = e.target.closest("[data-act]"); if (!b) return;
        const i = Number(b.closest("li").dataset.i);
        if (b.dataset.act === "rm") qs.splice(i, 1);
        if (b.dataset.act === "up" && i > 0) [qs[i - 1], qs[i]] = [qs[i], qs[i - 1]];
        if (b.dataset.act === "down" && i < qs.length - 1) [qs[i + 1], qs[i]] = [qs[i], qs[i + 1]];
        draw();
      });
      $("#a-bank", root).addEventListener("click", (e) => {
        const b = e.target.closest("[data-add]"); if (!b || full()) return;
        qs.push({ ...SOCIO_BANK.find((q) => q.id === b.dataset.add) }); draw();
      });
      $("#a-add", root).addEventListener("click", () => {
        const text = $("#a-text", root).value.trim();
        if (text.length < 8) { toast("Tulis pertanyaannya dulu"); $("#a-text", root).focus(); return; }
        if (full()) return;
        const neg = $("#a-neg", root).checked;
        qs.push({ id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), area: $('input[name="area"]:checked', root).value, text, ...(neg ? { neg: true } : {}) });
        $("#a-text", root).value = ""; $("#a-neg", root).checked = false; draw(); toast("Pertanyaan ditambahkan");
      });
      $("#a-save", root).addEventListener("click", async (e) => {
        name = $("#a-name", root).value.trim();
        if (!name) { err.textContent = "Isi nama angket."; $("#a-name", root).focus(); return; }
        if (!qs.length) { err.textContent = "Tambahkan minimal satu pertanyaan."; return; }
        const config = { maxPick: Number($('input[name="max"]:checked', root).value), reasons: $("#a-reasons", root).checked, questions: qs };
        e.currentTarget.disabled = true; err.textContent = "";
        try {
          const saved = await store.saveQuestionnaire({ id: isNew ? null : src.id, name, config });
          toast("Angket disimpan");
          go(next ? `${next}${next.includes("?") ? "&" : "?"}angket=${saved.id}` : "/angket");
        } catch (ex) { err.textContent = ex.message; e.currentTarget.disabled = false; }
      });
      draw();
    },
  };
}
