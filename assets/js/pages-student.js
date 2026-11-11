import { esc, $, firstName, toast } from "./util.js";
import { store } from "./store.js";
import { GAYA_ITEMS, MINAT_ITEMS, MINAT_SCALE, KEBUTUHAN_ITEMS } from "./data.js";

const top = `<div class="fill-top narrow"><span class="lockup"><img src="assets/img/logo.svg" alt="" width="36" height="36"><span class="words"><span class="name">Examus</span><span class="by">by prepod</span></span></span></div>`;
const message = (title, text) => `<div class="fill">${top}<main class="fill-main narrow"><h1>${esc(title)}</h1><p class="page-sub">${esc(text)}</p></main></div>`;

// Menyusun layar pertanyaan sesuai jenis asesmen.
function buildScreens(pub, me) {
  if (pub.type === "sosiometri") {
    const max = pub.config.maxPick || 3;
    return (pub.config.questions || []).map((q) => ({ kind: "pick", key: q.id, title: q.text, hint: `Pilih paling banyak ${max} teman, mulai dari yang paling kamu pilih.`, max, options: pub.roster.filter((m) => m.no !== me).map((m) => ({ v: m.no, t: m.name })) }));
  }
  if (pub.type === "gaya-belajar") return GAYA_ITEMS.map((it, i) => ({ kind: "one", key: i, title: it.text, hint: "Pilih yang paling mirip denganmu.", options: it.options.map((_, j, arr) => arr[(j + i) % 3]).map((o) => ({ v: o.k, t: o.t })) }));
  if (pub.type === "minat-karier") return MINAT_ITEMS.map((it, i) => ({ kind: "one", key: i, title: it.text, hint: "Seberapa tertarik kamu dengan kegiatan ini?", options: [...MINAT_SCALE].reverse().map((o) => ({ v: o.v, t: o.t })) }));
  if (pub.type === "kebutuhan") return KEBUTUHAN_ITEMS.map((it, i) => ({ kind: "one", key: i, title: it.text, hint: "Apakah pernyataan ini sesuai denganmu saat ini?", options: [{ v: true, t: "Ya, sesuai denganku" }, { v: false, t: "Tidak" }] }));
  return [];
}

// Halaman murid: dibuka dari link yang dibagikan guru, tanpa akun.
export async function student({ params }) {
  let pub;
  try { pub = await store.publicSession(params.code); } catch (ex) { return { title: "Angket", html: message("Angket tidak bisa dibuka", ex.message) }; }
  if (!pub) return { title: "Angket", html: message("Link tidak ditemukan", "Periksa lagi link dari gurumu, atau minta link yang baru.") };
  if (!pub.open) return { title: "Angket", html: message("Pengisian sudah ditutup", "Terima kasih. Hubungi gurumu kalau kamu belum sempat mengisi.") };

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
