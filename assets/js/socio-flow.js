// Halaman murid untuk sosiometri: pengantar, pilih nama, pilih teman berurutan, alasan, selesai.
import { esc, $, firstName, toast } from "./util.js";
import { store } from "./store.js";
import { SOCIO_REASONS, OTHER_REASON, areaOf } from "./socio-data.js";

const INTRO = (n, max, reasons) => [
  ["Kamu paling nyaman bersama siapa?", `Ada ${n} pertanyaan. Di tiap pertanyaan, pilih 1 sampai ${max} teman, mulai dari yang paling kamu inginkan.`],
  reasons ? ["Lalu, alasannya", "Setelah memilih teman, pilih juga alasannya. Boleh lebih dari satu, atau tulis sendiri."] : ["Pilih dengan jujur", "Pilih teman yang benar-benar kamu maksud, bukan yang menurutmu diharapkan guru."],
  ["Rahasia, hanya gurumu yang melihat", "Tidak ada jawaban benar atau salah. Teman-temanmu tidak tahu siapa yang kamu pilih."],
];

export function socioFlow(pub, top) {
  const qs = pub.config.questions || [];
  const max = pub.config.maxPick || 3;
  const askReasons = !!pub.config.reasons;
  return {
    title: `Survei pertemanan ${pub.className}`,
    html: `<div class="gb">${top}<main class="gb-main narrow" id="gb"></main></div>`,
    mount(root) {
      const main = $("#gb", root);
      const filled = new Set(pub.filled);
      let stage = "intro", introStep = 0, me = null, qi = 0, busy = false;
      let picks = {}, reasons = {};   // picks[qid] = [no...]; reasons[qid][no] = [teks...]
      const nameOf = (no) => pub.roster.find((m) => m.no === no)?.name || "";
      const goTo = (s) => { stage = s; draw(); scrollTo(0, 0); };
      const needReasons = (q) => askReasons && !q.neg;

      const next = async () => {
        if (qi < qs.length - 1) { qi++; goTo("pick"); return; }
        if (busy) return; busy = true;
        const answers = { ...picks };
        if (askReasons) answers.reasons = reasons;
        try { await store.submit(pub.code, me, answers); filled.add(me); goTo("done"); }
        catch (ex) { toast(ex.message); }
        busy = false;
      };

      const draw = () => {
        if (stage === "intro") {
          const cards = INTRO(qs.length, max, askReasons), [h, p] = cards[introStep], last = introStep === cards.length - 1;
          main.innerHTML = `<p class="gb-eyebrow">${esc(pub.className)}</p><h1>Survei pertemanan</h1>
            <div class="gb-card"><div class="n">${introStep + 1} / ${cards.length}</div><h2>${esc(h)}</h2><p>${esc(p)}</p></div>
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
          $("#gb-next", main).onclick = () => { qi = 0; picks = {}; reasons = {}; goTo("pick"); };
          $("#gb-back", main).onclick = () => { introStep = 0; goTo("intro"); };
        } else if (stage === "pick") {
          const q = qs[qi], cur = picks[q.id] || [];
          main.innerHTML = `<p class="gb-count" style="margin-top:1.6rem">Pertanyaan ${qi + 1} dari ${qs.length} · ${esc(areaOf(q))}</p>
            <h1>${esc(q.text)}</h1>
            <p style="margin-top:.7rem">Pilih 1 sampai ${max} teman, mulai dari yang <b>paling</b> kamu ${q.neg ? "maksud" : "inginkan"}.</p>
            <div class="gb-names">${pub.roster.filter((m) => m.no !== me).map((m) => { const o = cur.indexOf(m.no); return `<button class="gb-name gb-pick" data-v="${m.no}" aria-pressed="${o >= 0}"><span>${esc(m.name)}</span>${o >= 0 ? `<span class="ord">${o + 1}</span>` : ""}</button>`; }).join("")}</div>
            <p class="muted small" style="text-align:center;margin-top:1.2rem">${cur.length} dari maksimal ${max} dipilih</p>
            <button class="btn primary block" id="gb-next" style="margin-top:.5rem"${cur.length ? "" : " disabled"}>Lanjut</button>
            <button class="gb-ghost" id="gb-back">Kembali</button>`;
          main.querySelectorAll(".gb-pick").forEach((b) => (b.onclick = () => {
            const no = Number(b.dataset.v), list = picks[q.id] || [];
            if (list.includes(no)) picks[q.id] = list.filter((x) => x !== no);
            else if (list.length < max) picks[q.id] = [...list, no];
            else { toast(`Paling banyak ${max} teman. Ketuk nama yang sudah dipilih untuk membatalkannya.`); return; }
            const y = scrollY; draw(); scrollTo(0, y);
          }));
          $("#gb-next", main).onclick = () => { if (needReasons(q)) goTo("why"); else next(); };
          $("#gb-back", main).onclick = () => {
            if (qi === 0) { goTo("name"); return; }
            qi--; goTo(needReasons(qs[qi]) ? "why" : "pick");
          };
        } else if (stage === "why") {
          const q = qs[qi], chosen = picks[q.id] || [], opts = SOCIO_REASONS[areaOf(q)] || [];
          const r = (reasons[q.id] ||= {});
          main.innerHTML = `<p class="gb-count" style="margin-top:1.6rem">Pertanyaan ${qi + 1} dari ${qs.length} · ${esc(areaOf(q))}</p>
            <h1>Kenapa kamu memilih mereka?</h1>
            <p style="margin-top:.7rem">Untuk setiap teman, pilih alasan yang cocok (boleh lebih dari satu), atau tulis sendiri.</p>
            ${chosen.map((no, i) => { const mine = r[no] || []; const other = mine.find((x) => x.startsWith(OTHER_REASON + ": ")); return `<div class="why" data-no="${no}">
              <p class="whoname"><span class="ord">${i + 1}</span>${esc(nameOf(no))}</p>
              <div class="rchips">${[...opts, OTHER_REASON].map((t) => `<button type="button" class="rchip" data-t="${esc(t)}" aria-pressed="${t === OTHER_REASON ? !!other || mine.includes(OTHER_REASON) : mine.includes(t)}">${esc(t)}</button>`).join("")}</div>
              <input type="text" class="rother${other || mine.includes(OTHER_REASON) ? "" : " hide"}" maxlength="80" placeholder="Tulis alasanmu sendiri" value="${esc(other ? other.slice(OTHER_REASON.length + 2) : "")}">
            </div>`; }).join("")}
            <p class="muted small" id="why-hint" style="text-align:center;margin-top:1rem">Pilih minimal satu alasan untuk setiap teman, lalu lanjut.</p>
            <button class="btn primary block" id="gb-next" style="margin-top:.5rem">${qi === qs.length - 1 ? "Kirim jawaban" : "Lanjut"}</button>
            <button class="gb-ghost" id="gb-back">Kembali</button>`;
          const save = (box) => {
            const no = Number(box.dataset.no);
            const sel = [...box.querySelectorAll(".rchip[aria-pressed=true]")].map((b) => b.dataset.t);
            const txt = box.querySelector(".rother").value.trim();
            r[no] = sel.filter((t) => t !== OTHER_REASON);
            if (sel.includes(OTHER_REASON)) r[no].push(txt ? `${OTHER_REASON}: ${txt}` : OTHER_REASON);
          };
          // Tiap teman yang dipilih harus punya minimal satu alasan; "Lainnya" dihitung bila ada tulisannya.
          const complete = () => chosen.every((no) => (r[no] || []).some((t) => t !== OTHER_REASON));
          const check = () => { const ok = complete(); $("#gb-next", main).disabled = !ok; $("#why-hint", main).classList.toggle("hide", ok); };
          main.querySelectorAll(".why").forEach((box) => {
            save(box);
            box.querySelectorAll(".rchip").forEach((b) => (b.onclick = () => {
              const on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", String(on));
              if (b.dataset.t === OTHER_REASON) { const inp = box.querySelector(".rother"); inp.classList.toggle("hide", !on); if (on) inp.focus(); }
              save(box); check();
            }));
            box.querySelector(".rother").oninput = () => { save(box); check(); };
          });
          check();
          $("#gb-next", main).onclick = () => { main.querySelectorAll(".why").forEach(save); if (!complete()) { check(); return; } next(); };
          $("#gb-back", main).onclick = () => { main.querySelectorAll(".why").forEach(save); goTo("pick"); };
        } else {
          const more = pub.roster.some((m) => !filled.has(m.no));
          main.innerHTML = `<div style="padding-top:12vh"><h1>Terima kasih, ${esc(firstName(nameOf(me)))}!</h1>
            <p class="page-sub" style="font-size:1.15rem">Jawabanmu sudah tersimpan. Hanya gurumu yang bisa melihatnya.</p>
            <p class="muted" style="margin-top:1rem">Halaman ini boleh ditutup.</p>
            ${more ? `<button class="btn block" id="gb-again" style="margin-top:1.6rem">Teman lain mau mengisi di HP ini</button>` : ""}</div>`;
          $("#gb-again", main)?.addEventListener("click", () => { me = null; goTo("name"); });
        }
      };
      draw();
    },
  };
}
