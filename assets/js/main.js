import { store, configured } from "./store.js";
import { esc, go, homePath } from "./util.js";
import { landing, blog, post, legal, login, notFound, header } from "./pages-public.js";
import { onboarding, dashboard, classes, classEdit, start, session, account, admin, changePassword } from "./pages-app.js";
import { report } from "./reports.js";
import { studentHome, studentFill } from "./pages-student.js";

// auth: "any" = semua akun yang sudah masuk, "staff" = guru dan admin,
//       "student" = siswa, "admin" = admin
const ROUTES = [
  ["/", landing],
  ["/blog", blog],
  ["/blog/:slug", post],
  ["/masuk", login],
  ["/ganti-sandi", changePassword, "any"],
  ["/siswa", studentHome, "student"],
  ["/isi/:id", studentFill, "student"],
  ["/kenalan", onboarding, "staff"],
  ["/dasbor", dashboard, "staff"],
  ["/kelas", classes, "staff"],
  ["/kelas/:id", classEdit, "admin"],
  ["/mulai/:type", start, "staff"],
  ["/sesi/:id", session, "staff"],
  ["/sesi/:id/hasil", report, "staff"],
  ["/akun", account, "any"],
  ["/admin", admin, "admin"],
];

function match(path) {
  if (path === "/syarat" || path === "/privasi") return { page: legal, params: { doc: path.slice(1) } };
  const parts = path.split("/").filter(Boolean);
  for (const [pattern, page, auth] of ROUTES) {
    const p = pattern.split("/").filter(Boolean);
    if (p.length !== parts.length) continue;
    const params = {};
    if (p.every((seg, i) => (seg[0] === ":" ? ((params[seg.slice(1)] = decodeURIComponent(parts[i])), true) : seg === parts[i]))) return { page, params, auth };
  }
  return { page: notFound, params: {} };
}

const app = document.getElementById("app");
let token = 0;

const setupNotice = () => `<main class="page"><div class="narrow"><h1 class="page-title">Examus belum dihubungkan ke database</h1>
  <p class="page-sub">Isi <b>SUPABASE_URL</b> dan <b>SUPABASE_ANON_KEY</b> di <code>assets/js/config.js</code>, lalu deploy ulang. Langkah lengkapnya ada di README.</p></div></main>`;

async function render() {
  const mine = ++token;
  if (!configured) { app.innerHTML = setupNotice(); return; }
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, qs = ""] = raw.split("?");
  const { page, params, auth } = match(path.replace(/\/+$/, "") || "/");
  try {
    const user = await store.me();
    if (auth && !user) { go("/masuk?lanjut=" + encodeURIComponent(path)); return; }
    if (user) {
      // Akun baru wajib mengganti kata sandi dari admin sebelum memakai apa pun.
      if (user.mustChange && page !== changePassword) { go("/ganti-sandi"); return; }
      if (auth === "admin" && !user.isAdmin) { go(homePath(user)); return; }
      if (auth === "staff" && user.kind === "siswa") { go("/siswa"); return; }
      if (auth === "student" && user.kind !== "siswa") { go(homePath(user)); return; }
      if (page === dashboard && user.isSuper) { go("/admin"); return; }
      if (auth === "staff" && user.kind === "guru" && !user.onboarded && page !== onboarding) { go("/kenalan"); return; }
    }
    const ctx = { user, params, query: new URLSearchParams(qs), reload: render };
    const view = await page(ctx);
    if (mine !== token) return;
    app.innerHTML = view.html;
    document.title = view.title ? `${view.title} | Examus` : "Examus by prepod: asesmen psikologi untuk sekolah";
    scrollTo(0, 0);
    view.mount && view.mount(app, ctx);
  } catch (ex) {
    console.error(ex);
    if (mine !== token) return;
    app.innerHTML = `${header(null)}<main class="page"><div class="narrow"><h1 class="page-title">Halaman tidak bisa dimuat</h1><p class="page-sub">${esc(ex.message || "Terjadi kesalahan.")}</p><p style="margin-top:1.2rem"><a class="btn primary" href="#/">Ke beranda</a></p></div></main>`;
  }
}

// Tombol yang menggulir ke bagian halaman (hash dipakai untuk rute, jadi tidak bisa memakai #anchor).
document.addEventListener("click", async (e) => {
  // Menu akun: Keluar, dan tutup menu bila klik di luarnya.
  const menu = document.querySelector(".usermenu[open]");
  if (e.target.closest("[data-logout]")) { await store.signOut(); go("/masuk"); return; }
  if (menu && !menu.contains(e.target)) menu.removeAttribute("open");
  const b = e.target.closest("[data-scroll]");
  if (b) document.getElementById(b.dataset.scroll)?.scrollIntoView({ behavior: "smooth" });
});

window.addEventListener("hashchange", render);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelector(".usermenu[open]")?.removeAttribute("open"); });
render();
