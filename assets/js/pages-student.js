import { esc, $, firstName, toast } from "./util.js";
import { store } from "./store.js";
import { GAYA_ITEMS, MINAT_ITEMS, MINAT_SCALE, KEBUTUHAN_ITEMS, VAK } from "./data.js";
import { gayaProfile, donut, VAK_COLOR } from "./gaya.js";
import { socioFlow } from "./socio-flow.js";
import { scaleFlow } from "./scale-flow.js";
import { INSTR } from "./instruments.js";

const top = `<div class="fill-top narrow"><span class="lockup"><img src="assets/img/logo.svg" alt="" width="36" height="36"><span class="words"><span class="name">Examus</span><span class="by">by prepod</span></span></span></div>`;
const message = (title, text) => `<div class="fill">${top}<main class="fill-main narrow"><h1>${esc(title)}</h1><p class="page-sub">${esc(text)}</p></main></div>`;

// Menyusun layar pertanyaan sesuai jenis asesmen.
function buildScreens(pub, me) {
  if (pub.type === "sosiometri") {
    const max = pub.config.maxPick || 3;
    return (pub.config.questions || []).map((q) => ({ kind: "pick", key: q.id, title: q.text, hint: `Pilih paling banyak ${max} teman, mulai dari yang paling kamu pilih.`, max, options: pub.roster.filter((m) => m.no !== me).map((m) => ({ v: m.no, t: m.name })) }));
  }
  if (pub.type === "gaya-belajar") return GAYA_ITEMS.map((it, i) => ({ kind: "one", key: i, title: it.text, hint: "Pilih yang paling mirip denganmu.", options: it.options.map((_, j, arr) => arr[(j + i) % 3]).map((o) => ({ v: o.k, t: o.t })) }));
  if (pub.type === "minat-karier") return MINAT_ITEMS.slice(0, 18).map((it, i) => ({ kind: "one", key: i, title: it.text, hint: "Seberapa tertarik kamu dengan kegiatan ini?", options: [...MINAT_SCALE].reverse().map((o) => ({ v: o.v, t: o.t })) }));
  if (pub.type === "kebutuhan") return KEBUTUHAN_ITEMS.map((it, i) => ({ kind: "one", key: i, title: it.text, hint: "Apakah pernyataan ini sesuai denganmu saat ini?", options: [{ v: true, t: "Ya, sesuai denganku" }, { v: false, t: "Tidak" }] }));
  return [];
}

/* ---------------- Gaya belajar: pengantar, pilih nama, satu soal per layar, hasil ---------------- */
const INTRO = (n) => [
  ["Kamu paling mudah belajar lewat apa?", `Ada ${n} situasi sehari-hari. Pilih satu jawaban yang paling mirip denganmu.`],
  ["Tidak ada jawaban yang salah", "Jawab seperti kamu biasanya. Cuma sekitar 5 menit."],
  ["Hasilnya langsung untukmu", "Di akhir, kamu melihat cara belajar yang paling cocok untukmu."],
];
function gayaFlow(pub) {
  const screens = GAYA_ITEMS.map((it, i) => ({ key: i, title: it.text, options: it.options.map((_, j, arr) => arr[(j + i) % 3]) }));
  return {
    title: `Angket gaya belajar ${pub.className}`,
    html: `<div class="gb">${top}<main class="gb-main narrow" id="gb"></main></div>`,
    mount(root) {
      const main = $("#gb", root);
      const filled = new Set(pub.filled);
      let stage = "intro", introStep = 0, me = null, step = 0, busy = false, result = null, answers = {};
      const goTo = (s) => { stage = s; draw(); scrollTo(0, 0); };

      const draw = () => {
        if (stage === "intro") {
          const cards = INTRO(screens.length), [h, p] = cards[introStep], last = introStep === cards.length - 1;
          main.innerHTML = `<p class="gb-eyebrow">${esc(pub.className)}</p><h1>Kenali cara belajarmu</h1>
            <div class="gb-card"><div class="n">${introStep + 1} / ${cards.length}</div><h2>${esc(h)}</h2><p>${esc(p)}</p></div>
            <div class="gb-dots" aria-hidden="true">${cards.map((_, i) => `<i class="${i === introStep ? "on" : ""}"></i>`).join("")}</div>
            <button class="btn primary block" id="gb-next">${last ? "Mulai" : "Lanjut"}</button>
            ${introStep ? `<button class="gb-ghost" id="gb-back">Kembali</button>` : ""}`;
          $("#gb-next", main).onclick = () => { if (last) goTo("name"); else { introStep++; draw(); } };
          $("#gb-back", main)?.addEventListener("click", () => { introStep--; draw(); });
        } else if (stage === "name") {
          const open = pub.roster.filter((m) => !filled.has(m.no));
          if (!open.length) { main.innerHTML = `<h1 style="margin-top:1.6rem">Semua murid sudah mengisi</h1><p class="page-sub">Terima kasih. Kalau namamu belum tercatat, hubungi gurumu.</p>`; return; }
          main.innerHTML = `<h1 style="margin-top:1.6rem">Siapa namamu?</h1>
            <div class="gb-names">${open.map((m) => `<button class="gb-name" data-v="${m.no}" aria-pressed="${me === m.no}">${esc(m.name)}</button>`).join("")}</div>
            <button class="btn primary block" id="gb-next" style="margin-top:1.6rem"${me == null ? " disabled" : ""}>${me == null ? "Pilih namamu dulu" : "Lanjut"}</button>
            <button class="gb-ghost" id="gb-back">Kembali</button>`;
          main.querySelectorAll(".gb-name").forEach((b) => (b.onclick = () => { me = Number(b.dataset.v); draw(); }));
          $("#gb-next", main).onclick = () => { step = 0; answers = {}; goTo("q"); };
          $("#gb-back", main).onclick = () => { introStep = 0; goTo("intro"); };
        } else if (stage === "q") {
          const sc = screens[step], val = answers[sc.key], last = step === screens.length - 1;
          main.innerHTML = `<div class="gb-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${screens.length}" aria-valuenow="${step}"><i style="width:${(step / screens.length) * 100}%"></i></div>
            <p class="gb-count"><b>${step + 1}</b> / ${screens.length}</p>
            <h1>${esc(sc.title)}</h1>
            <div class="gb-opts">${sc.options.map((o, j) => `<button class="gb-opt" data-v="${o.k}" aria-pressed="${val === o.k}"><span class="l">${"ABC"[j]}</span><span>${esc(o.t)}</span></button>`).join("")}</div>
            <button class="gb-ghost" id="gb-back" style="margin:1.4rem 0 0">← Kembali</button>`;
          main.querySelectorAll(".gb-opt").forEach((b) => (b.onclick = async () => {
            if (busy) return; answers[sc.key] = b.dataset.v;
            main.querySelectorAll(".gb-opt").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
            if (!last) { setTimeout(() => { if (stage === "q" && step === sc.key) { step++; draw(); scrollTo(0, 0); } }, 220); return; }
            busy = true;
            try { await store.submit(pub.code, me, answers); filled.add(me); result = gayaProfile(answers); goTo("result"); }
            catch (ex) { toast(ex.message); }
            busy = false;
          }));
          $("#gb-back", main).onclick = () => { if (step === 0) goTo("name"); else { step--; draw(); } };
        } else {
          const r = result;
          main.innerHTML = `<div class="gb-result"><p class="gb-eyebrow">Hasil gaya belajarmu</p>
            ${donut(r.c, "Perbandingan gaya belajarmu")}
            <h1>${esc(r.title)}</h1><p class="lead">${esc(r.desc)}</p>
            <div class="gb-stack" aria-hidden="true">${r.order.filter((k) => r.c[k] > 0).map((k) => `<i style="flex:${r.c[k]};background:${VAK_COLOR[k]}"></i>`).join("")}</div>
            <div class="gb-legend">${["V", "A", "K"].map((k) => `<span><span class="dot" style="background:${VAK_COLOR[k]}"></span>${VAK[k]} <b>${r.pct[k]}%</b></span>`).join("")}</div>
            <div class="gb-tips"><h2>Coba cara ini saat belajar</h2><ul>${r.tips.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
            ${pub.roster.some((m) => !filled.has(m.no)) ? `<button class="btn block gb-again" id="gb-again">Teman lain mau mengisi di HP ini</button>` : ""}</div>`;
          $("#gb-again", main)?.addEventListener("click", () => { me = null; result = null; goTo("name"); });
        }
      };
      draw();
    },
  };
}

// Halaman murid: dibuka dari link yang dibagikan guru, tanpa akun.
export async function student({ params }) {
  let pub;
  try { pub = await store.publicSession(params.code); } catch (ex) { return { title: "Angket", html: message("Angket tidak bisa dibuka", ex.message) }; }
  if (!pub) return { title: "Angket", html: message("Link tidak ditemukan", "Periksa lagi link dari gurumu, atau minta link yang baru.") };
  if (!pub.open) return { title: "Angket", html: message("Pengisian sudah ditutup", "Terima kasih. Hubungi gurumu kalau kamu belum sempat mengisi.") };

  if (pub.type === "sosiometri") return socioFlow(pub, top);
  // Sesi minat karier lama (18 butir, skala 3) tetap memakai alur lama.
  if (INSTR[pub.type] && !(pub.type === "minat-karier" && pub.config?.scale !== 5)) return scaleFlow(pub, top);

  return {
    title: `Angket ${pub.className}`,
    html: `<div class="fill">${top}<main class="fill-main narrow" id="fm"></main><div class="fill-bar"><div class="in narrow"><button class="btn" id="f-back">Kembali</button><button class="btn primary" id="f-next">Lanjut</button></div></div></div>`,
    mount(root) {
      const main = $("#fm", root), back = $("#f-back", root), next = $("#f-next", root), bar = $(".fill-bar", root);
      const filled = new Set(pub.filled);
      if (filled.size >= pub.roster.length) { main.innerHTML = `<h1>Semua murid sudah mengisi</h1><p class="page-sub">Terima kasih. Kalau namamu belum tercatat, hubungi gurumu.</p>`; bar.remove(); return; }
      let me = null, screens = [], step = -1; const answers = {};

      const draw = () => {
        scrollTo(0, 0);
        back.classList.toggle("hide", step < 0);
        if (step === -1) {
          main.innerHTML = `<p class="step-no">${esc(pub.className)}</p><h1>Pilih namamu</h1><p class="muted" style="margin-top:.5rem">Jawabanmu hanya dilihat gurumu. Teman-temanmu tidak bisa melihatnya.</p>
            <div class="pick-list">${pub.roster.map((m) => `<button class="pick" data-v="${m.no}" aria-pressed="${me === m.no}"${filled.has(m.no) ? " disabled" : ""}><span>${m.no}. ${esc(m.name)}</span>${filled.has(m.no) ? '<span class="small">sudah mengisi</span>' : ""}</button>`).join("")}</div>`;
          next.textContent = "Lanjut"; next.disabled = me == null; return;
        }
        const sc = screens[step], val = answers[sc.key];
        const last = step === screens.length - 1;
        main.innerHTML = `<p class="step-no">Pertanyaan ${step + 1} dari ${screens.length}</p>
          <div class="progress" style="margin-top:.5rem"><i style="width:${((step + 1) / screens.length) * 100}%"></i></div>
          <h1 style="margin-top:1.2rem">${esc(sc.title)}</h1><p class="muted" style="margin-top:.5rem">${esc(sc.hint)}</p>
          <div class="pick-list">${sc.options.map((o) => {
            const ord = sc.kind === "pick" ? (val || []).indexOf(o.v) : -1;
            const on = sc.kind === "pick" ? ord >= 0 : val === o.v;
            return `<button class="pick" data-v="${esc(String(o.v))}" aria-pressed="${on}"><span>${esc(o.t)}</span>${ord >= 0 ? `<span class="ord">${ord + 1}</span>` : ""}</button>`;
          }).join("")}</div>`;
        next.textContent = last ? "Kirim jawaban" : "Lanjut";
        next.disabled = sc.kind === "pick" ? !(val && val.length) : val === undefined;
      };

      const parse = (sc, raw) => { const o = sc.options.find((x) => String(x.v) === raw); return o ? o.v : raw; };
      main.addEventListener("click", (e) => {
        const b = e.target.closest(".pick"); if (!b || b.disabled) return;
        if (step === -1) { me = Number(b.dataset.v); draw(); return; }
        const sc = screens[step], v = parse(sc, b.dataset.v);
        if (sc.kind === "pick") {
          const cur = answers[sc.key] || [];
          if (cur.includes(v)) answers[sc.key] = cur.filter((x) => x !== v);
          else if (cur.length < sc.max) answers[sc.key] = [...cur, v];
          else { toast(`Paling banyak ${sc.max} teman. Ketuk nama yang sudah dipilih untuk membatalkannya.`); return; }
          draw();
        } else {
          answers[sc.key] = v; draw();
          if (step < screens.length - 1) setTimeout(() => { if (screens[step] === sc) { step++; draw(); } }, 220);
        }
      });
      back.addEventListener("click", () => { step = Math.max(-1, step - 1); draw(); });
      next.addEventListener("click", async () => {
        if (step === -1) { screens = buildScreens(pub, me); step = 0; draw(); return; }
        if (step < screens.length - 1) { step++; draw(); return; }
        next.disabled = true;
        try {
          await store.submit(pub.code, me, answers);
          const name = firstName(pub.roster.find((m) => m.no === me).name);
          bar.remove();
          main.innerHTML = `<div class="thanks"><img src="assets/img/logo.svg" alt=""><h1>Terima kasih, ${esc(name)}</h1><p class="page-sub" style="margin-inline:auto">Jawabanmu sudah tersimpan. Kamu boleh menutup halaman ini.</p></div>`;
        } catch (ex) { toast(ex.message); next.disabled = false; }
      });
      draw();
    },
  };
}
