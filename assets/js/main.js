import { store } from "./store.js";
import { esc, go } from "./util.js";
import { landing, blog, post, legal, login, notFound, header } from "./pages-public.js";
import { onboarding, dashboard, classes, classEdit, start, session, account, admin } from "./pages-app.js";
import { report } from "./reports.js";
import { student } from "./pages-student.js";

// auth: "user" = harus masuk, "admin" = harus admin
const ROUTES = [
  ["/", landing],
  ["/blog", blog],
  ["/blog/:slug", post],
  ["/masuk", login],
  ["/s/:code", student],
  ["/kenalan", onboarding, "user"],
  ["/dasbor", dashboard, "user"],
  ["/kelas", classes, "user"],
  ["/kelas/:id", classEdit, "user"],
  ["/mulai/:type", start, "user"],
  ["/sesi/:id", session, "user"],
  ["/sesi/:id/hasil", report, "user"],
  ["/akun", account, "user"],
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

async function render() {
  const mine = ++token;
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, qs = ""] = raw.split("?");
  const { page, params, auth } = match(path.replace(/\/+$/, "") || "/");
  try {
    const user = await store.me();
    if (auth && !user) { go("/masuk?lanjut=" + encodeURIComponent(path)); return; }
    if (auth === "admin" && !user.isAdmin) { go("/dasbor"); return; }
    if (auth === "user" && !user.onboarded && page !== onboarding) { go("/kenalan"); return; }
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
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-scroll]");
  if (b) document.getElementById(b.dataset.scroll)?.scrollIntoView({ behavior: "smooth" });
});

window.addEventListener("hashchange", render);
render();
