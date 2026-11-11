// Halaman murid untuk asesmen skala: pengantar, pilih nama, satu butir per layar, hasil atau terima kasih.
import { esc, $, firstName, toast } from "./util.js";
import { store } from "./store.js";
import { INSTR } from "./instruments.js";

export function scaleFlow(pub, top) {
  const def = INSTR[pub.type], cfg = pub.config || {};
  const items = def.items(cfg), extra = def.extra ? def.extra(cfg) : [];
  const screens = [...items.map((it, i) => ({ key: i, text: it.text, options: it.options || def.options(cfg), stem: def.stem, ask: def.ask })),
    ...extra.map((x) => ({ key: x.key, text: x.text, options: x.options, ask: "" }))];
  return {
    title: `${def.heading}, ${pub.className}`,
    html: `<div class="gb">${top}<main class="gb-main narrow" id="gb"></main></div>`,
    mount(root) {
      const main = $("#gb", root);
      const filled = new Set(pub.filled);
      let stage = "intro", introStep = 0, me = null, step = 0, busy = false, answers = {};
      const nameOf = (no) => pub.roster.find((m) => m.no === no)?.name || "";
      const goTo = (s) => { stage = s; draw(); scrollTo(0, 0); };

      const draw = () => {
        if (stage === "intro") {
          const cards = def.intro(cfg), [h, p] = cards[introStep], last = introStep === cards.length - 1;
          main.innerHTML = `<p class="gb-eyebrow">${esc(pub.className)}</p><h1>${esc(def.heading)}</h1>
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
            <button class="btn primary block" id="gb-next" style="margin-top:1.6rem"${me == null ? " disabled" : ""}>${me == null ? "Pilih namamu dulu" : `Lanjut sebagai ${esc(firstName(nameOf(me)))}`}</button>
            <button class="gb-ghost" id="gb-back">Kembali</button>`;
          main.querySelectorAll(".gb-name").forEach((b) => (b.onclick = () => { me = Number(b.dataset.v); draw(); }));
          $("#gb-next", main).onclick = () => { step = 0; answers = {}; goTo("q"); };
          $("#gb-back", main).onclick = () => { introStep = 0; goTo("intro"); };
        } else if (stage === "q") {
          const sc = screens[step], val = answers[sc.key], last = step === screens.length - 1;
          main.innerHTML = `<div class="gb-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${screens.length}" aria-valuenow="${step}"><i style="width:${(step / screens.length) * 100}%"></i></div>
            <p class="gb-count"><b>${step + 1}</b> / ${screens.length}</p>
            ${sc.stem && typeof sc.key === "number" ? `<p class="muted" style="margin-top:.8rem">${esc(sc.stem)}</p>` : ""}
            <h1>${esc(sc.text)}</h1>
            ${sc.ask ? `<p class="muted" style="margin-top:.5rem">${esc(sc.ask)}</p>` : ""}
            <div class="gb-opts">${sc.options.map((o) => `<button class="gb-opt" data-v="${esc(String(o.v))}" aria-pressed="${val === o.v}"><span>${esc(o.t)}</span></button>`).join("")}</div>
            <button class="gb-ghost" id="gb-back" style="margin:1.4rem 0 0">← Kembali</button>`;
          main.querySelectorAll(".gb-opt").forEach((b, j) => (b.onclick = async () => {
            if (busy) return;
            answers[sc.key] = sc.options[j].v;
            main.querySelectorAll(".gb-opt").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
            if (!last) { setTimeout(() => { if (stage === "q" && screens[step] === sc) { step++; draw(); scrollTo(0, 0); } }, 220); return; }
            busy = true;
            try { await store.submit(pub.code, me, answers); filled.add(me); goTo("result"); }
            catch (ex) { toast(ex.message); }
            busy = false;
          }));
          $("#gb-back", main).onclick = () => { if (step === 0) goTo("name"); else { step--; draw(); } };
        } else {
          const more = pub.roster.some((m) => !filled.has(m.no));
          main.innerHTML = `<div class="gb-result">${def.result(answers, cfg, firstName(nameOf(me)))}
            ${more ? `<button class="btn block gb-again" id="gb-again" style="margin-top:1.4rem">Teman lain mau mengisi di HP ini</button>` : ""}</div>`;
          $("#gb-again", main)?.addEventListener("click", () => { me = null; goTo("name"); });
        }
      };
      draw();
    },
  };
}
