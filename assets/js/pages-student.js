import { esc, $, firstName, toast, fmtDate } from "./util.js";
import { store } from "./store.js";
import { header } from "./pages-public.js";
import { getAssessment, GAYA_ITEMS, MINAT_ITEMS, MINAT_SCALE, KEBUTUHAN_ITEMS } from "./data.js";

const top = `<div class="fill-top narrow"><span class="lockup"><img src="assets/img/logo.svg" alt="" width="36" height="36"><span class="words"><span class="name">Examus</span><span class="by">by prepod</span></span></span></div>`;
const message = (title, text) => `<div class="fill">${top}<main class="fill-main narrow"><h1>${esc(title)}</h1><p class="page-sub">${esc(text)}</p><p style="margin-top:1.2rem"><a class="btn primary" href="#/siswa">Kembali ke daftar angket</a></p></main></div>`;

/* ---------------- Daftar angket milik siswa ---------------- */
export async function studentHome({ user }) {
  const list = await store.studentSessions();
  const todo = list.filter((s) => s.open && !s.done), done = list.filter((s) => s.done);
  const item = (s) => {
    const a = getAssessment(s.type);
    return s.done
      ? `<div class="item"><span><b>${esc(a?.name || s.type)}</b><br><span class="meta">${esc(s.className)}</span></span><span class="badge closed">Sudah diisi</span></div>`
      : `<a class="item" href="#/isi/${s.id}"><span><b>${esc(a?.name || s.type)}</b><br><span class="meta">${esc(s.className)}. Ditutup ${fmtDate(s.closesAt, true)}.</span></span><span class="badge">Isi sekarang</span></a>`;
  };
  return {
    title: "Angket",
    html: `${header(user, "dasbor")}<main class="page"><div class="narrow" style="max-width:640px">
      <h1 class="page-title">Halo, ${esc(firstName(user.name) || "kamu")}</h1>
      <p class="page-sub">Jawabanmu hanya dilihat gurumu. Teman-temanmu tidak bisa melihatnya.</p>
      <h2 class="sec-h">Perlu kamu isi</h2>
      ${todo.length ? `<div class="list">${todo.map(item).join("")}</div>` : `<div class="card"><p>Belum ada angket yang perlu diisi. Kalau gurumu sudah membukanya, tarik halaman ini ke bawah atau muat ulang.</p></div>`}
      ${done.length ? `<h2 class="sec-h">Sudah kamu isi</h2><div class="list">${done.map(item).join("")}</div>` : ""}
    </div></main>`,
  };
}

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

/* ---------------- Mengisi satu angket ---------------- */
export async function studentFill({ user, params }) {
  let pub;
  try { pub = await store.studentSession(params.id); } catch (ex) { return { title: "Angket", html: message("Angket tidak bisa dibuka", ex.message) }; }
  if (!pub) return { title: "Angket", html: message("Angket tidak ditemukan", "Angket ini bukan untuk kelasmu, atau sudah dihapus oleh gurumu.") };
  if (pub.done) return { title: "Angket", html: message("Kamu sudah mengisi", "Terima kasih. Jawabanmu sudah tersimpan dan tidak bisa diubah lagi.") };
  if (!pub.open) return { title: "Angket", html: message("Pengisian sudah ditutup", "Hubungi gurumu kalau kamu belum sempat mengisi.") };
  const me = pub.me ?? user.memberNo;
  const screens = buildScreens(pub, me);
  if (!screens.length) return { title: "Angket", html: message("Angket belum tersedia", "Jenis angket ini belum bisa diisi.") };

  return {
    title: `Angket ${pub.className}`,
    html: `<div class="fill">${top}<main class="fill-main narrow" id="fm"></main><div class="fill-bar"><div class="in narrow"><button class="btn" id="f-back">Kembali</button><button class="btn primary" id="f-next">Lanjut</button></div></div></div>`,
    mount(root) {
      const main = $("#fm", root), back = $("#f-back", root), next = $("#f-next", root), bar = $(".fill-bar", root);
      let step = 0; const answers = {};

      const draw = () => {
        scrollTo(0, 0);
        back.classList.toggle("hide", step === 0);
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
      back.addEventListener("click", () => { step = Math.max(0, step - 1); draw(); });
      next.addEventListener("click", async () => {
        if (step < screens.length - 1) { step++; draw(); return; }
        next.disabled = true;
        try {
          await store.submit(pub.id, answers);
          bar.remove();
          main.innerHTML = `<div class="thanks"><img src="assets/img/logo.svg" alt=""><h1>Terima kasih, ${esc(firstName(user.name))}</h1><p class="page-sub" style="margin-inline:auto">Jawabanmu sudah tersimpan.</p><p style="margin-top:1.2rem"><a class="btn primary" href="#/siswa">Kembali ke daftar angket</a></p></div>`;
        } catch (ex) { toast(ex.message); next.disabled = false; }
      });
      draw();
    },
  };
}
