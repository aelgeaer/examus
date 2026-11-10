import { esc, $, $$, toast, go, fmtDate, fmtShort, parseRoster, studentLink } from "./util.js";
import { store, isOpen } from "./store.js";
import { ASSESSMENTS, ICONS, getAssessment, SOCIO_VARIANTS, GAYA_ITEMS, MINAT_ITEMS, KEBUTUHAN_ITEMS } from "./data.js";
import { header } from "./pages-public.js";

const localNotice = () => store.mode === "lokal"
  ? `<p class="notice no-print">Mode percobaan: data tersimpan di browser ini saja, dan link murid hanya bisa dibuka di perangkat ini. Agar murid bisa mengisi dari HP masing-masing, hubungkan database (panduan ada di README).</p>` : "";
const ROLES = ["Guru BK", "Psikolog sekolah", "Wali kelas", "Guru mata pelajaran", "Kepala sekolah", "Lainnya"];
const itemCount = (type, config) => type === "sosiometri" ? (config.questions || []).length : { "gaya-belajar": GAYA_ITEMS.length, "minat-karier": MINAT_ITEMS.length, kebutuhan: KEBUTUHAN_ITEMS.length }[type];

/* ---------------- Kenalan (onboarding) ---------------- */
export function onboarding({ user }) {
  const html = `${header(user)}<main class="page"><div class="narrow" style="max-width:600px">
    <section id="ob1">
      <p class="muted">Langkah 1 dari 2</p>
      <h1 class="page-title" style="margin-top:.3rem">Selamat datang di Examus</h1>
      <p class="page-sub">Isi data singkat ini. Nama dan sekolah Anda tampil di laporan yang dicetak.</p>
      <form id="ob-form" novalidate>
        <label class="field"><span>Nama lengkap</span><input type="text" name="name" value="${esc(user.name)}" autocomplete="name"><span class="hint">Boleh dengan gelar. Dipakai untuk sapaan dan tanda tangan laporan.</span></label>
        <div class="field"><span class="flabel" id="role-l">Peran di sekolah</span><div class="chips" role="radiogroup" aria-labelledby="role-l">${ROLES.map((r) => `<label><input type="radio" name="role" value="${r}"${user.role === r ? " checked" : ""}><span>${r}</span></label>`).join("")}</div></div>
        <label class="field"><span>Nama sekolah</span><input type="text" name="school" value="${esc(user.school)}" placeholder="Misalnya: SMP Negeri 3 Banjarbaru"></label>
        <label class="field"><span>Kota atau kabupaten</span><input type="text" name="city" value="${esc(user.city)}" placeholder="Misalnya: Banjarbaru"></label>
        <p class="err" id="ob-err" role="alert"></p>
        <button class="btn primary block">Lanjut</button>
      </form>
    </section>
    <section id="ob2" class="hide">
      <p class="muted">Langkah 2 dari 2</p>
      <h1 class="page-title" style="margin-top:.3rem">Sebelum mulai</h1>
      <p class="page-sub">Data murid itu sensitif. Ini kesepakatan kita.</p>
      <div class="card sky stack" style="margin-top:1.4rem">
        <p><b style="font-weight:500">Data murid milik sekolah.</b> Examus hanya menyimpan dan mengolahnya untuk membuat laporan Anda. Tidak dijual dan tidak dipakai untuk iklan.</p>
        <p><b style="font-weight:500">Murid dan orang tua perlu tahu.</b> Jalankan asesmen dengan izin sekolah dan jelaskan tujuannya kepada murid serta orang tua.</p>
        <p><b style="font-weight:500">Hasil untuk dipahami, bukan untuk melabeli.</b> Laporan bukan diagnosis, bukan dasar hukuman, dan tidak menentukan nilai murid.</p>
        <p><b style="font-weight:500">Hasil bersifat rahasia.</b> Sosiogram dan laporan perorangan hanya untuk guru yang berwenang. Link pengisian hanya untuk kelas yang bersangkutan.</p>
      </div>
      <label class="check" style="margin-top:1rem"><input type="checkbox" id="ob-agree"><span>Saya sudah membaca dan menyetujui <a href="#/syarat">Syarat penggunaan</a> serta <a href="#/privasi">Kebijakan privasi</a>.</span></label>
      <button class="btn primary block" id="ob-done" disabled style="margin-top:1rem">Setuju dan mulai</button>
      <button class="btn block" id="ob-back" style="margin-top:.6rem">Kembali</button>
    </section>
  </div></main>`;
  return {
    title: "Selamat datang", html,
    mount(root) {
      const f = $("#ob-form", root); let data = {};
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        data = { name: f.name.value.trim(), role: f.role.value, school: f.school.value.trim(), city: f.city.value.trim() };
        if (!data.name) { $("#ob-err", root).textContent = "Isi nama lengkap Anda."; f.name.focus(); return; }
        if (!data.role) { $("#ob-err", root).textContent = "Pilih peran Anda di sekolah."; return; }
        $("#ob1", root).classList.add("hide"); $("#ob2", root).classList.remove("hide"); scrollTo(0, 0);
      });
      $("#ob-back", root).addEventListener("click", () => { $("#ob2", root).classList.add("hide"); $("#ob1", root).classList.remove("hide"); });
      $("#ob-agree", root).addEventListener("change", (e) => ($("#ob-done", root).disabled = !e.target.checked));
      $("#ob-done", root).addEventListener("click", async () => {
        try { await store.updateProfile({ ...data, onboarded: true }); go("/dasbor"); } catch (ex) { toast(ex.message); }
      });
    },
  };
}

/* ---------------- Dasbor ---------------- */
const sessionItem = (s) => {
  const a = getAssessment(s.type), total = s.roster.length, open = isOpen(s);
  return `<a class="item" href="#/sesi/${s.id}"><span><b>${esc(a?.name || s.type)}, ${esc(s.className)}</b><br><span class="meta">${s.filledCount} dari ${total} murid sudah mengisi. Dibuat ${fmtShort(s.createdAt)}.</span></span><span class="badge${open ? "" : " closed"}">${open ? "Dibuka" : "Ditutup"}</span></a>`;
};

export async function dashboard({ user }) {
  const sessions = await store.listSessions();
  const html = `${header(user, "dasbor")}<main class="page"><div class="narrow" style="max-width:800px">
    <h1 class="page-title">Halo, ${esc(user.name || "Bapak/Ibu")}</h1>
    <div style="margin-top:1.2rem">${localNotice()}</div>
    <h2 class="sec-h">Mulai asesmen</h2>
    <div class="astart">${ASSESSMENTS.map((a) => a.ready
      ? `<a href="#/mulai/${a.id}">${ICONS[a.id]}<span><b>${esc(a.name)}</b><small>${esc(a.short)}</small></span><span class="go" aria-hidden="true">›</span></a>`
      : `<a class="off" aria-disabled="true" tabindex="-1">${ICONS[a.id]}<span><b>${esc(a.name)}</b><small>Segera hadir. ${esc(a.short)}</small></span><span></span></a>`).join("")}</div>
    <h2 class="sec-h">Sesi Anda</h2>
    ${sessions.length ? `<div class="list">${sessions.map(sessionItem).join("")}</div>` : `<div class="card"><p>Belum ada sesi. Pilih salah satu asesmen di atas, atau lihat dulu contoh laporan dari kelas yang sudah terisi.</p></div>`}
    <div class="rowflex" style="margin-top:1rem">
      <label class="rowflex" style="gap:.5rem"><span class="small muted">Contoh laporan:</span>
        <select id="sample-type" class="btn sm" style="padding-right:.6rem">${ASSESSMENTS.filter((a) => a.ready).map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></label>
      <button class="btn sm" id="sample-go">Buat sesi contoh</button>
    </div>
  </div></main>`;
  return {
    title: "Dasbor", html,
    mount(root) {
      $("#sample-go", root).addEventListener("click", async (e) => {
        e.currentTarget.disabled = true;
        try { const s = await store.addSample($("#sample-type", root).value); toast("Sesi contoh dibuat"); go(`/sesi/${s.id}/hasil`); }
        catch (ex) { toast(ex.message); e.currentTarget.disabled = false; }
      });
    },
  };
}

/* ---------------- Daftar kelas ---------------- */
export async function classes({ user }) {
  const list = await store.listClasses();
  return {
    title: "Kelas",
    html: `${header(user, "kelas")}<main class="page"><div class="narrow">
      <h1 class="page-title">Kelas</h1>
      <p class="page-sub">Satu daftar nama bisa dipakai untuk banyak asesmen.</p>
      <div class="list" style="margin-top:1.6rem">${list.map((c) => `<a class="item" href="#/kelas/${c.id}"><span><b>${esc(c.name)}</b><br><span class="meta">${c.members.length} murid</span></span><span aria-hidden="true">›</span></a>`).join("") || `<div class="card"><p>Belum ada daftar kelas. Buat satu dengan menempel nama dari Excel atau WhatsApp.</p></div>`}</div>
      <p style="margin-top:1rem"><a class="btn primary" href="#/kelas/baru">Buat daftar kelas</a></p>
    </div></main>`,
  };
}

export async function classEdit({ user, params, query }) {
  const existing = params.id === "baru" ? null : await store.getClass(params.id);
  if (params.id !== "baru" && !existing) return { html: `${header(user, "kelas")}<main class="page"><div class="narrow"><h1 class="page-title">Kelas tidak ditemukan</h1><p style="margin-top:1rem"><a class="btn" href="#/kelas">Ke daftar kelas</a></p></div></main>` };
  let members = existing ? existing.members.map((m) => ({ name: m.name, g: m.g || "" })) : [];
  const next = query.get("lanjut");
  const html = `${header(user, "kelas")}<main class="page"><div class="narrow">
    <a class="back" href="#/kelas">← Semua kelas</a>
    <h1 class="page-title">${existing ? "Ubah daftar kelas" : "Buat daftar kelas"}</h1>
    <label class="field"><span>Nama kelas</span><input type="text" id="c-name" value="${esc(existing?.name || "")}" placeholder="Misalnya: Kelas 8C"></label>
    <div class="card soft" style="margin-top:1.4rem">
      <label class="field" style="margin-top:0"><span>Tambah banyak nama sekaligus</span>
        <textarea id="c-paste" placeholder="Tempel dari Excel atau WhatsApp, satu murid per baris.&#10;Contoh:&#10;1  Arya Wibowo  L&#10;2  Bella Kusuma  P"></textarea>
        <span class="hint">Nomor urut dan tanda L/P dikenali otomatis.</span></label>
      <button class="btn dark sm" id="c-read" style="margin-top:.7rem">Baca daftar</button>
    </div>
    <div class="spread" style="margin-top:1.8rem"><h2 class="sec-h" style="margin:0">Murid <span class="muted" id="c-count"></span></h2><span class="err" id="c-warn" style="margin:0"></span></div>
    <div id="c-members" style="margin-top:.8rem"></div>
    <button class="btn sm" id="c-add" style="margin-top:.7rem">Tambah satu murid</button>
    <p class="err" id="c-err" role="alert"></p>
    <div class="rowflex" style="margin-top:1rem"><button class="btn primary" id="c-save">Simpan daftar kelas</button>${existing ? `<button class="btn danger" id="c-del">Hapus kelas</button>` : ""}</div>
  </div></main>`;
  return {
    title: existing ? existing.name : "Buat daftar kelas", html,
    mount(root) {
      const box = $("#c-members", root);
      const draw = () => {
        box.innerHTML = members.map((m, i) => `<div class="member" data-i="${i}"><span class="no">${i + 1}</span><input type="text" value="${esc(m.name)}" aria-label="Nama murid ${i + 1}"><span class="lp" role="group" aria-label="Jenis kelamin"><button type="button" data-g="L" aria-pressed="${m.g === "L"}">L</button><button type="button" data-g="P" aria-pressed="${m.g === "P"}">P</button></span><button type="button" class="x" aria-label="Hapus ${esc(m.name)}">×</button></div>`).join("") || `<p class="muted">Belum ada nama. Tempel daftar di atas atau tambah satu per satu.</p>`;
        $("#c-count", root).textContent = members.length || "";
        const missing = members.filter((m) => !m.g).length;
        $("#c-warn", root).textContent = missing ? `${missing} nama belum diberi L/P.` : "";
      };
      box.addEventListener("input", (e) => { const row = e.target.closest(".member"); if (row && e.target.matches("input")) members[row.dataset.i].name = e.target.value; });
      box.addEventListener("click", (e) => {
        const row = e.target.closest(".member"); if (!row) return; const i = Number(row.dataset.i);
        if (e.target.dataset.g) { members[i].g = members[i].g === e.target.dataset.g ? "" : e.target.dataset.g; draw(); }
        else if (e.target.classList.contains("x")) { members.splice(i, 1); draw(); }
      });
      $("#c-read", root).addEventListener("click", () => {
        const found = parseRoster($("#c-paste", root).value);
        if (!found.length) { toast("Tidak ada nama yang terbaca"); return; }
        members.push(...found); $("#c-paste", root).value = ""; draw(); toast(`${found.length} nama ditambahkan`);
      });
      $("#c-add", root).addEventListener("click", () => { members.push({ name: "", g: "" }); draw(); $$(".member input", box).pop()?.focus(); });
      $("#c-save", root).addEventListener("click", async () => {
        const name = $("#c-name", root).value.trim(), err = $("#c-err", root);
        const clean = members.map((m) => ({ name: m.name.trim(), g: m.g })).filter((m) => m.name);
        if (!name) { err.textContent = "Isi nama kelas."; $("#c-name", root).focus(); return; }
        if (clean.length < 3) { err.textContent = "Daftar kelas perlu minimal 3 murid."; return; }
        try {
          const c = await store.saveClass({ id: existing?.id, name, members: clean.map((m, i) => ({ no: i + 1, ...m })) });
          toast("Daftar kelas disimpan"); go(next ? `/${next}?kelas=${c.id}` : "/kelas");
        } catch (ex) { err.textContent = ex.message; }
      });
      $("#c-del", root)?.addEventListener("click", async () => {
        if (!confirm(`Hapus ${existing.name}? Sesi yang sudah berjalan tidak ikut terhapus.`)) return;
        await store.deleteClass(existing.id); toast("Kelas dihapus"); go("/kelas");
      });
      draw();
    },
  };
}

/* ---------------- Mulai sesi ---------------- */
const DEADLINES = [[1, "1 hari"], [3, "3 hari"], [7, "1 minggu"], [14, "2 minggu"], [30, "30 hari"]];
export async function start({ user, params, query }) {
  const a = getAssessment(params.type);
  if (!a || !a.ready) return { html: `${header(user, "dasbor")}<main class="page"><div class="narrow"><h1 class="page-title">Asesmen belum tersedia</h1><p style="margin-top:1rem"><a class="btn" href="#/dasbor">Ke dasbor</a></p></div></main>` };
  const list = await store.listClasses();
  const pre = query.get("kelas") || list[0]?.id;
  const socio = a.id === "sosiometri";
  const html = `${header(user, "dasbor")}<main class="page"><div class="narrow">
    <a class="back" href="#/dasbor">← Dasbor</a>
    <h1 class="page-title">Mulai ${esc(a.name.toLowerCase())}</h1>
    <p class="page-sub">${esc(a.long)}</p>
    <h2 class="sec-h">Untuk kelas mana?</h2>
    ${list.length ? `<div class="chips" role="radiogroup" aria-label="Kelas">${list.map((c) => `<label><input type="radio" name="kelas" value="${c.id}"${c.id === pre ? " checked" : ""}><span>${esc(c.name)} (${c.members.length})</span></label>`).join("")}</div><p style="margin-top:.7rem"><a href="#/kelas/baru?lanjut=mulai/${a.id}">Buat daftar kelas baru</a></p>`
      : `<div class="card"><p>Belum ada daftar kelas. Buat dulu daftar nama muridnya; cukup tempel dari Excel atau WhatsApp.</p></div><p style="margin-top:.7rem"><a class="btn primary" href="#/kelas/baru?lanjut=mulai/${a.id}">Buat daftar kelas</a></p>`}
    <h2 class="sec-h">${socio ? "Pertanyaan apa yang diajukan?" : "Isi angket"}</h2>
    ${socio ? SOCIO_VARIANTS.map((v, i) => `<label class="opt"><input type="radio" name="variant" value="${v.id}"${i === 0 ? " checked" : ""}><span class="t">${v.name}</span><span class="d">${v.desc}</span><ol>${v.questions.map((q) => `<li>${esc(q.text)}</li>`).join("")}</ol></label>`).join("")
      : `<div class="card"><p>${itemCount(a.id, {})} butir, satu butir per layar. Murid cukup mengetuk jawaban yang paling sesuai, kira-kira 5 menit.</p></div>`}
    <h2 class="sec-h">Batas pengisian</h2>
    <div class="seg" role="radiogroup" aria-label="Batas pengisian">${DEADLINES.map(([d, t]) => `<label><input type="radio" name="days" value="${d}"${d === 14 ? " checked" : ""}><span>${t}</span></label>`).join("")}</div>
    <p class="muted small" id="st-until" style="margin-top:.6rem"></p>
    <p class="err" id="st-err" role="alert"></p>
    <button class="btn primary block" id="st-go"${list.length ? "" : " disabled"}>Mulai dan buat link</button>
  </div></main>`;
  return {
    title: "Mulai " + a.name, html,
    mount(root) {
      const until = () => { const d = Number($('input[name="days"]:checked', root).value); $("#st-until", root).textContent = `Link ditutup otomatis ${fmtDate(Date.now() + d * 86400000, true)}. Anda bisa menutupnya lebih awal.`; };
      $$('input[name="days"]', root).forEach((r) => r.addEventListener("change", until)); until();
      $("#st-go", root).addEventListener("click", async (e) => {
        const classId = $('input[name="kelas"]:checked', root)?.value;
        if (!classId) { $("#st-err", root).textContent = "Pilih kelas lebih dulu."; return; }
        const config = socio ? (() => { const v = SOCIO_VARIANTS.find((x) => x.id === $('input[name="variant"]:checked', root).value); return { variant: v.id, maxPick: 3, questions: v.questions }; })() : {};
        e.currentTarget.disabled = true;
        try { const s = await store.createSession({ classId, type: a.id, config, days: Number($('input[name="days"]:checked', root).value) }); toast("Sesi dibuat"); go(`/sesi/${s.id}`); }
        catch (ex) { $("#st-err", root).textContent = ex.message; e.currentTarget.disabled = false; }
      });
    },
  };
}

/* ---------------- Halaman sesi: bagikan dan pantau ---------------- */
export async function session({ user, params }) {
  const s = await store.getSession(params.id);
  if (!s) return { html: `${header(user, "dasbor")}<main class="page"><div class="narrow"><h1 class="page-title">Sesi tidak ditemukan</h1><p style="margin-top:1rem"><a class="btn" href="#/dasbor">Ke dasbor</a></p></div></main>` };
  const a = getAssessment(s.type), open = isOpen(s), total = s.roster.length;
  const res = await store.listResponses(s.id);
  const done = new Set(res.map((r) => r.no));
  const waiting = s.roster.filter((m) => !done.has(m.no));
  const link = studentLink(s.code);
  const waText = `Halo, mohon isi angket ${a.name.toLowerCase()} untuk ${s.className}. Pilih namamu lalu jawab pertanyaannya, sekitar 5 menit.\n${link}`;
  const html = `${header(user, "dasbor")}<main class="page"><div class="narrow">
    <a class="back" href="#/dasbor">← Dasbor</a>
    <h1 class="page-title">${esc(s.className)}</h1>
    <p class="page-sub">${esc(a.name)}. ${open ? `Dibuka sampai ${fmtDate(s.closesAt, true)}.` : "Pengisian sudah ditutup."}</p>
    ${open ? `<div class="sharebox" style="margin-top:1.4rem">
      <b style="font-weight:500">Bagikan ke murid</b>
      <div class="url" id="ss-url">${esc(link)}</div>
      <a class="btn primary block" href="https://wa.me/?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener">Kirim lewat WhatsApp</a>
      <button class="btn white block" id="ss-share">Bagikan lewat aplikasi lain</button>
      <button class="btn white block" id="ss-copy">Salin link</button>
      <a class="btn white block" href="#/s/${s.code}">Buka halaman murid di perangkat ini</a>
    </div><div style="margin-top:.8rem">${localNotice()}</div>` : ""}
    <h2 class="sec-h">Jawaban</h2>
    <p><span class="big-num">${done.size}</span> <span class="muted">dari ${total} murid sudah mengisi</span></p>
    <div class="progress" style="margin:.7rem 0 1rem" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done.size}"><i style="width:${(done.size / total) * 100}%"></i></div>
    <a class="btn primary block" href="#/sesi/${s.id}/hasil"${done.size ? "" : ' aria-disabled="true" tabindex="-1" style="pointer-events:none"'}>Lihat hasil</a>
    <button class="btn block" id="ss-refresh" style="margin-top:.6rem">Perbarui</button>
    ${waiting.length && waiting.length < total ? `<details class="card" style="margin-top:1rem"><summary style="cursor:pointer;font-weight:500">Belum mengisi (${waiting.length})</summary><p class="muted" style="margin-top:.6rem">${esc(waiting.map((m) => m.name).join(", "))}</p></details>` : ""}
    <h2 class="sec-h">Pengaturan sesi</h2>
    <div class="rowflex"><button class="btn" id="ss-toggle">${open ? "Tutup pengisian sekarang" : "Buka lagi selama 7 hari"}</button><button class="btn danger" id="ss-del">Hapus sesi</button></div>
  </div></main>`;
  return {
    title: s.className, html,
    mount(root, ctx) {
      $("#ss-copy", root)?.addEventListener("click", async () => { try { await navigator.clipboard.writeText(link); toast("Link disalin"); } catch { prompt("Salin link ini:", link); } });
      $("#ss-share", root)?.addEventListener("click", async () => {
        if (navigator.share) { try { await navigator.share({ title: `Angket ${s.className}`, text: waText }); } catch { /* dibatalkan */ } }
        else { try { await navigator.clipboard.writeText(waText); toast("Pesan dan link disalin"); } catch { prompt("Salin link ini:", link); } }
      });
      $("#ss-refresh", root).addEventListener("click", () => ctx.reload());
      $("#ss-toggle", root).addEventListener("click", async () => { await store.setClosed(s.id, open); toast(open ? "Pengisian ditutup" : "Pengisian dibuka lagi"); ctx.reload(); });
      $("#ss-del", root).addEventListener("click", async () => {
        if (!confirm("Hapus sesi ini beserta semua jawabannya? Tindakan ini tidak bisa dibatalkan.")) return;
        await store.deleteSession(s.id); toast("Sesi dihapus"); go("/dasbor");
      });
    },
  };
}

/* ---------------- Akun ---------------- */
async function fileToLetterhead(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("Gambar tidak bisa dibaca.")); img.src = url; });
  const scale = Math.min(1, 1400 / img.width);
  const c = document.createElement("canvas"); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", 0.85);
}

export function account({ user }) {
  const html = `${header(user, "akun")}<main class="page"><div class="narrow" style="max-width:600px">
    <h1 class="page-title">Akun</h1>
    <p class="page-sub">${esc(user.email)}</p>
    <form id="ac" novalidate>
      <label class="field"><span>Nama lengkap</span><input type="text" name="name" value="${esc(user.name)}"></label>
      <div class="field"><span class="flabel">Peran di sekolah</span><div class="chips">${ROLES.map((r) => `<label><input type="radio" name="role" value="${r}"${user.role === r ? " checked" : ""}><span>${r}</span></label>`).join("")}</div></div>
      <label class="field"><span>Nama sekolah</span><input type="text" name="school" value="${esc(user.school)}"></label>
      <label class="field"><span>Kota atau kabupaten</span><input type="text" name="city" value="${esc(user.city)}"></label>
      <button class="btn primary" style="margin-top:1.2rem">Simpan perubahan</button>
    </form>
    <h2 class="sec-h">Kop surat sekolah</h2>
    <p class="muted">Kop tampil di bagian atas laporan yang dicetak. Unggah gambar PNG atau JPG yang memanjang ke samping, misalnya tangkapan layar kop dari template Word sekolah.</p>
    <div class="card" style="margin-top:.8rem" id="ac-lh">${user.letterhead ? `<img src="${user.letterhead}" alt="Kop surat sekolah">` : `<p class="muted">Belum ada kop surat.</p>`}</div>
    <div class="rowflex" style="margin-top:.7rem"><label class="btn sm">Unggah kop surat<input type="file" id="ac-file" accept="image/png,image/jpeg" hidden></label>${user.letterhead ? `<button class="btn sm danger" id="ac-lh-del">Hapus kop</button>` : ""}</div>
    <h2 class="sec-h">Sesi masuk</h2>
    <p class="muted small" style="margin-bottom:.7rem">Penyimpanan data: ${store.mode === "lokal" ? "browser ini (mode percobaan)" : "database Supabase"}.</p>
    <button class="btn" id="ac-out">Keluar</button>
  </div></main>`;
  return {
    title: "Akun", html,
    mount(root, ctx) {
      const f = $("#ac", root);
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!f.name.value.trim()) { toast("Isi nama lengkap Anda"); return; }
        try { await store.updateProfile({ name: f.name.value.trim(), role: f.role.value, school: f.school.value.trim(), city: f.city.value.trim() }); toast("Perubahan disimpan"); ctx.reload(); } catch (ex) { toast(ex.message); }
      });
      $("#ac-file", root).addEventListener("change", async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try { await store.updateProfile({ letterhead: await fileToLetterhead(file) }); toast("Kop surat disimpan"); ctx.reload(); } catch (ex) { toast(ex.message); }
      });
      $("#ac-lh-del", root)?.addEventListener("click", async () => { await store.updateProfile({ letterhead: "" }); toast("Kop surat dihapus"); ctx.reload(); });
      $("#ac-out", root).addEventListener("click", async () => { await store.signOut(); toast("Anda sudah keluar"); go("/"); });
    },
  };
}

/* ---------------- Admin ---------------- */
export async function admin({ user }) {
  const d = await store.admin();
  const html = `${header(user, "admin")}<main class="page"><div class="wrap">
    <h1 class="page-title">Dasbor admin</h1>
    <p class="page-sub">Ringkasan pemakaian Examus. ${store.mode === "lokal" ? "Dalam mode percobaan, angka di bawah hanya mencakup data di browser ini." : ""}</p>
    <div class="kv" style="margin-top:1.4rem">
      <div class="card"><div class="k">Pengguna</div><div class="v">${d.totals.users}</div></div>
      <div class="card"><div class="k">Daftar kelas</div><div class="v">${d.totals.classes}</div></div>
      <div class="card"><div class="k">Sesi asesmen</div><div class="v">${d.totals.sessions}</div></div>
      <div class="card"><div class="k">Jawaban murid</div><div class="v">${d.totals.responses}</div></div>
    </div>
    <h2 class="sec-h">Pengguna</h2>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>Email</th><th>Nama</th><th>Peran</th><th>Sekolah</th><th>Kota</th><th class="num">Sesi</th><th>Terdaftar</th></tr></thead>
      <tbody>${d.users.map((u) => `<tr><td>${esc(u.email)}${u.isAdmin ? ' <span class="badge">admin</span>' : ""}</td><td>${esc(u.name || "-")}</td><td>${esc(u.role || "-")}</td><td>${esc(u.school || "-")}</td><td>${esc(u.city || "-")}</td><td class="num">${u.sessions}</td><td>${u.createdAt ? fmtShort(u.createdAt) : "-"}</td></tr>`).join("")}</tbody></table></div>
    <h2 class="sec-h">Sesi asesmen</h2>
    ${d.sessions.length ? `<div class="tblwrap"><table class="tbl"><thead><tr><th>Kelas</th><th>Asesmen</th><th>Pemilik</th><th class="num">Mengisi</th><th>Status</th><th>Dibuat</th></tr></thead>
      <tbody>${d.sessions.map((s) => `<tr><td>${esc(s.className)}</td><td>${esc(getAssessment(s.type)?.name || s.type)}</td><td>${esc(s.owner || "-")}</td><td class="num">${s.filled} / ${s.total}</td><td><span class="badge${s.open ? "" : " closed"}">${s.open ? "Dibuka" : "Ditutup"}</span></td><td>${fmtShort(s.createdAt)}</td></tr>`).join("")}</tbody></table></div>`
      : `<div class="card"><p>Belum ada sesi asesmen.</p></div>`}
  </div></main>`;
  return { title: "Dasbor admin", html };
}
