// Halaman murid untuk asesmen skala: pengantar, pilih nama, satu butir per layar,
// ringkasan untuk memeriksa dan mengganti jawaban, lalu kirim dan lihat hasil.
import { esc, $, firstName, toast } from "./util.js";
import { store } from "./store.js";
import { INSTR } from "./instruments.js";

const CHECK = `<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function scaleFlow(pub, top) {
  const def = INSTR[pub.type], cfg = pub.config || {};
  const items = def.items(cfg), extra = def.extra ? def.extra(cfg) : [];
  const screens = [...items.map((it, i) => ({ key: i, text: it.text, options: it.options || def.options(cfg), stem: def.stem, ask: it.ask ?? def.ask })),
    ...extra.map((x) => ({ key: x.key, text: x.text, options: x.options, ask: "" }))];
  const badge = (j) => (def.letters ? "ABCDE"[j] : String(j + 1));
  return {
    title: `${def.heading}, ${pub.className}`,
    html: `<div class="gb">${top}<main class="gb-main narrow" id="gb"></main></div>`,
    mount(root) {
      const main = $("#gb", root);
      const filled = new Set(pub.filled);
      let stage = "intro", introStep = 0, me = null, step = 0, busy = false, answers = {}, reviewed = false;
      const nameOf = (no) => pub.roster.find((m) => m.no === no)?.name || "";
      const goTo = (s) => { stage = s; draw(); scrollTo(0, 0); };
      const answered = () => screens.filter((sc) => answers[sc.key] !== undefined).length;
      const labelOf = (sc) => sc.options.find((o) => o.v === answers[sc.key])?.t;

      const draw = () => {
        if (stage === "intro") {
          const cards = def.intro(cfg), [h, p, chips] = cards[introStep], last = introStep === cards.length - 1;
          main.innerHTML = `<p class="gb-eyebrow">${esc(pub.className)}</p><h1>${esc(def.heading)}</h1>
            <div class="gb-card"><div class="n">${introStep + 1} / ${cards.length}</div><h2>${esc(h)}</h2><p>${esc(p)}</p>${chips ? `<div class="achips">${chips.map((x) => `<span>${esc(x)}</span>`).join("")}</div>` : ""}</div>
            <div class="gb-dots" aria-hidden="true">${cards.map((_, i) => `<i class="${i === introStep ? "on" : ""}"></i>`).join("")}</div>
            <button class="btn primary block" id="gb-next">${last ? "Mulai" : "Lanjut"}</button>
            ${introStep ? `<button class="gb-ghost" id="gb-back">Kembali</button>` : ""}`;
          $("#gb-next", main).onclick = () => { if (last) goTo("name"); else { introStep++; draw(); } };
          $("#gb-back", main)?.addEventListener("click", () => { introStep--; draw(); });
        } else if (stage === "name") {
          const open = pub.roster.filter((m) => !filled.has(m.no));
          main.innerHTML = `<h1 style="margin-top:1.6rem">Siapa namamu?</h1>
            <div class="gb-names">${pub.roster.map((m) => (filled.has(m.no) ? `<button class="gb-name done" disabled><span>${esc(m.name)}</span><span class="tag">sudah mengisi</span></button>` : `<button class="gb-name" data-v="${m.no}" aria-pressed="${me === m.no}">${esc(m.name)}</button>`)).join("")}</div>${open.length ? "" : `<p class="muted" style="margin-top:1rem">Semua murid sudah mengisi. Kalau namamu belum tercatat, hubungi gurumu.</p>`}
            <button class="btn primary block" id="gb-next" style="margin-top:1.6rem"${me == null ? " disabled" : ""}>${me == null ? "Pilih namamu dulu" : `Lanjut sebagai ${esc(firstName(nameOf(me)))}`}</button>
            <button class="gb-ghost" id="gb-back">Kembali</button>`;
          main.querySelectorAll(".gb-name").forEach((b) => (b.onclick = () => { me = Number(b.dataset.v); draw(); }));
          $("#gb-next", main).onclick = () => { step = 0; answers = {}; reviewed = false; goTo("q"); };
          $("#gb-back", main).onclick = () => { introStep = 0; goTo("intro"); };
        } else if (stage === "q") {
          const sc = screens[step], val = answers[sc.key], last = step === screens.length - 1;
          main.innerHTML = `<div class="gb-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${screens.length}" aria-valuenow="${answered()}"><i style="width:${(answered() / screens.length) * 100}%"></i></div>
            <p class="gb-count"><b>${step + 1}</b> / ${screens.length}</p>
            ${sc.stem && typeof sc.key === "number" ? `<p class="muted" style="margin-top:.8rem">${esc(sc.stem)}</p>` : ""}
            <h1>${esc(sc.text)}</h1>
            ${sc.ask ? `<p class="muted" style="margin-top:.5rem">${esc(sc.ask)}</p>` : ""}
            <div class="gb-opts">${sc.options.map((o, j) => `<button class="gb-opt" aria-pressed="${val === o.v}"><span class="l">${val === o.v ? CHECK : badge(j)}</span><span>${esc(o.t)}</span></button>`).join("")}</div>
            <div class="gb-nav"><button class="gb-ghost" id="gb-back">← Kembali</button>${reviewed ? `<button class="gb-ghost" id="gb-sum">Ke ringkasan →</button>` : ""}</div>`;
          main.querySelectorAll(".gb-opt").forEach((b, j) => (b.onclick = () => {
            answers[sc.key] = sc.options[j].v;
            main.querySelectorAll(".gb-opt").forEach((x, k) => { x.setAttribute("aria-pressed", String(k === j)); x.querySelector(".l").innerHTML = k === j ? CHECK : badge(k); });
            setTimeout(() => {
              if (stage !== "q" || screens[step] !== sc) return;
              if (reviewed || last) goTo("review"); else { step++; draw(); scrollTo(0, 0); }
            }, 230);
          }));
          $("#gb-back", main).onclick = () => { if (reviewed) goTo("review"); else if (step === 0) goTo("name"); else { step--; draw(); } };
          $("#gb-sum", main)?.addEventListener("click", () => goTo("review"));
        } else if (stage === "review") {
          reviewed = true;
          const n = answered(), all = n === screens.length;
          main.innerHTML = `<p class="gb-eyebrow">${all ? "Semua terjawab" : `${screens.length - n} belum dijawab`}</p>
            <h1>Siap dikirim, ${esc(firstName(nameOf(me)))}?</h1>
            <p class="lead" style="margin-top:.6rem">Kamu sudah menjawab ${n} dari ${screens.length}. Ketuk satu jawaban untuk menggantinya. Setelah dikirim, jawaban tidak bisa diubah lagi.</p>
            <ol class="rv">${screens.map((sc, i) => `<li><button type="button" data-i="${i}"><span class="q">${i + 1}. ${esc(sc.text)}</span><span class="a${labelOf(sc) ? "" : " none"}">${esc(labelOf(sc) || "Belum dijawab")}</span></button></li>`).join("")}</ol>
            <div class="rv-bar"><button class="btn primary block" id="gb-send"${all ? "" : " disabled"}>${all ? def.sendLabel || "Kirim dan lihat hasilku" : "Jawab semua dulu"}</button>
            <button class="gb-ghost" id="gb-back">Kembali</button></div>`;
          main.querySelectorAll(".rv button").forEach((b) => (b.onclick = () => { step = Number(b.dataset.i); goTo("q"); }));
          $("#gb-back", main).onclick = () => { step = screens.length - 1; goTo("q"); };
          $("#gb-send", main).onclick = async (e) => {
            if (busy) return; busy = true; e.currentTarget.disabled = true;
            try { await store.submit(pub.code, me, answers); filled.add(me); goTo("result"); }
            catch (ex) { toast(ex.message); e.currentTarget.disabled = false; }
            busy = false;
          };
        } else {
          const more = pub.roster.some((m) => !filled.has(m.no));
          main.innerHTML = `<div class="gb-result">${def.result(answers, cfg, firstName(nameOf(me)))}
            <p class="muted" style="margin-top:1.2rem">Jawabanmu sudah terkirim ke gurumu. Halaman ini boleh ditutup.</p>
            ${more ? `<button class="btn block gb-again" id="gb-again" style="margin-top:1rem">Teman lain mau mengisi di HP ini</button>` : ""}</div>`;
          $("#gb-again", main)?.addEventListener("click", () => { me = null; goTo("name"); });
        }
      };
      draw();
    },
  };
}
