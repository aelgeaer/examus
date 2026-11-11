import { esc, $, $$, toast, go, fmtDate, fmtShort, parseRoster, homePath, genPassword, suggestUsername, studentLink } from "./util.js";
import { store, isOpen } from "./store.js";
import { ASSESSMENTS, ICONS, getAssessment, SOCIO_VARIANTS, GAYA_ITEMS, MINAT_ITEMS, KEBUTUHAN_ITEMS } from "./data.js";
import { header } from "./pages-public.js";

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
        <p class="muted" style="margin-top:1rem">Sekolah: <b style="font-weight:500">${esc(user.school || "-")}</b></p>
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
        <p><b style="font-weight:500">Hasil bersifat rahasia.</b> Sosiogram dan laporan perorangan hanya untuk guru yang berwenang. Bagikan link sesi hanya ke murid kelas itu.</p>
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
        data = { name: f.name.value.trim(), role: f.role.value };
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
// Guru membuat kelas dan daftar muridnya sendiri. Admin sekolah melihat dan mengatur semua kelas di sekolahnya.
export async function classes({ user }) {
  const [list, schools] = await Promise.all([store.listClasses(), user.isSuper ? store.schools() : []]);
  const schoolOf = (id) => schools.find((s) => s.id === id)?.name || "";
  const html = `${header(user, "kelas")}<main class="page"><div class="narrow">
    <h1 class="page-title">Kelas</h1>
    <p class="page-sub">${user.isAdmin ? "Semua daftar kelas di sekolah Anda. Anda juga bisa memilih guru yang memegang tiap kelas." : "Daftar kelas Anda. Buat sekali, pakai untuk semua asesmen."}</p>
    <div class="list" style="margin-top:1.6rem">${list.map((c) => `<a class="item" href="#/kelas/${c.id}"><span><b>${esc(c.name)}</b><br><span class="meta">${c.members.length} murid${user.isSuper ? ` · ${esc(schoolOf(c.schoolId))}` : ""}</span></span><span aria-hidden="true">›</span></a>`).join("") || `<div class="card"><p>Belum ada kelas. Buat satu dengan menempel nama murid dari Excel atau WhatsApp.</p></div>`}</div>
    <p style="margin-top:1rem"><a class="btn primary" href="#/kelas/baru">Buat kelas</a></p>
  </div></main>`;
  return { title: "Kelas", html };
}

// Nomor murid dikunci di server: murid lama mempertahankan nomornya, murid baru diberi nomor berikutnya.
export async function classEdit({ user, params, query }) {
  const isNew = params.id === "baru";
  const next = query.get("lanjut") || "";
  const existing = isNew ? null : await store.getClass(params.id);
  if (!isNew && !existing) return { html: `${header(user, "kelas")}<main class="page"><div class="narrow"><h1 class="page-title">Kelas tidak ditemukan</h1><p style="margin-top:1rem"><a class="btn" href="#/kelas">Ke daftar kelas</a></p></div></main>` };
  const [schools, users, assigned] = await Promise.all([
    user.isSuper ? store.schools() : [], user.isAdmin ? store.adminUsers() : [], user.isAdmin && !isNew ? store.classTeachers(existing.id) : []]);
  const gurus = users.filter((u) => u.kind === "guru");
  const chosen = new Set(assigned);
  let members = existing ? existing.members.map((m) => ({ no: m.no, name: m.name, g: m.g || "" })) : [];
  const html = `${header(user, "kelas")}<main class="page"><div class="narrow">
    <a class="back" href="${next ? "#" + next : "#/kelas"}">← Kembali</a>
    <h1 class="page-title">${existing ? "Ubah kelas" : "Buat daftar kelas"}</h1>
    ${user.isSuper ? (isNew
      ? `<label class="field"><span>Sekolah</span><select id="c-school" class="btn">${schools.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></label>`
      : `<p class="muted">Sekolah: ${esc(schools.find((s) => s.id === existing.schoolId)?.name || "-")}</p>`) : ""}
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
    ${existing ? `<p class="muted small" style="margin-top:.6rem">Nomor di sebelah kiri tetap untuk murid yang sudah ada, supaya jawaban di sesi lama tidak tertukar.</p>` : ""}
    ${user.isAdmin ? `<h2 class="sec-h">Guru pemegang kelas</h2>
    <p class="muted">Guru yang dicentang bisa melihat kelas ini, mengubah daftarnya, dan membuat sesi asesmen untuknya.</p>
    <div class="chips" id="c-teachers" style="margin-top:.7rem"></div>` : ""}
    <p class="err" id="c-err" role="alert"></p>
    <div class="rowflex" style="margin-top:1rem"><button class="btn primary" id="c-save">${next ? "Simpan dan lanjutkan" : "Simpan kelas"}</button>${existing ? `<button class="btn danger" id="c-del">Hapus kelas</button>` : ""}</div>
  </div></main>`;
  return {
    title: existing ? existing.name : "Buat kelas", html,
    mount(root) {
      const box = $("#c-members", root);
      const school = () => existing?.schoolId || (user.isSuper ? $("#c-school", root).value : user.schoolId);
      const drawTeachers = () => {
        if (!user.isAdmin) return;
        const list = gurus.filter((g) => g.schoolId === school());
        $("#c-teachers", root).innerHTML = list.map((g) => `<label><input type="checkbox" value="${g.id}"${chosen.has(g.id) ? " checked" : ""}><span>${esc(g.name || g.username)}</span></label>`).join("") || `<p class="muted">Belum ada akun guru di sekolah ini.</p>`;
      };
      $("#c-teachers", root)?.addEventListener("change", (e) => { e.target.checked ? chosen.add(e.target.value) : chosen.delete(e.target.value); });
      $("#c-school", root)?.addEventListener("change", () => { chosen.clear(); drawTeachers(); });

      const draw = () => {
        box.innerHTML = members.map((m, i) => `<div class="member" data-i="${i}"><span class="no">${m.no ?? "•"}</span><input type="text" value="${esc(m.name)}" aria-label="Nama murid ${i + 1}"><span class="lp" role="group" aria-label="Jenis kelamin"><button type="button" data-g="L" aria-pressed="${m.g === "L"}">L</button><button type="button" data-g="P" aria-pressed="${m.g === "P"}">P</button></span><button type="button" class="x" aria-label="Hapus ${esc(m.name)}">×</button></div>`).join("") || `<p class="muted">Belum ada nama. Tempel daftar di atas atau tambah satu per satu.</p>`;
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
        members.push(...found.map((m) => ({ no: null, ...m }))); $("#c-paste", root).value = ""; draw(); toast(`${found.length} nama ditambahkan`);
      });
      $("#c-add", root).addEventListener("click", () => { members.push({ no: null, name: "", g: "" }); draw(); $$(".member input", box).pop()?.focus(); });
      $("#c-save", root).addEventListener("click", async (e) => {
        const name = $("#c-name", root).value.trim(), err = $("#c-err", root);
        const clean = members.map((m) => ({ no: m.no, name: m.name.trim(), g: m.g })).filter((m) => m.name);
        if (!name) { err.textContent = "Isi nama kelas."; $("#c-name", root).focus(); return; }
        if (clean.length < 3) { err.textContent = "Daftar kelas perlu minimal 3 murid."; return; }
        const teachers = user.isAdmin ? gurus.filter((g) => g.schoolId === school() && chosen.has(g.id)).map((g) => g.id) : null;
        e.currentTarget.disabled = true; err.textContent = "";
        try {
          const r = await store.saveClass({ id: existing?.id, schoolId: school(), name, members: clean, teachers });
          toast("Kelas disimpan"); go(next ? `${next}?kelas=${r.id}` : "/kelas");
        } catch (ex) { err.textContent = ex.message; e.currentTarget.disabled = false; }
      });
      $("#c-del", root)?.addEventListener("click", async () => {
        if (!confirm(`Hapus ${existing.name}? Sesi yang sudah berjalan tidak ikut terhapus.`)) return;
        try { await store.deleteClass(existing.id); toast("Kelas dihapus"); go("/kelas"); } catch (ex) { toast(ex.message); }
      });
      drawTeachers(); draw();
    },
  };
}

/* ---------------- Mulai sesi ---------------- */
const ymd = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
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
    ${list.length ? `<div class="chips" role="radiogroup" aria-label="Kelas">${list.map((c) => `<label><input type="radio" name="kelas" value="${c.id}"${c.id === pre ? " checked" : ""}><span>${esc(c.name)} (${c.members.length})</span></label>`).join("")}</div>
      <p style="margin-top:.7rem"><a class="btn sm" href="#/kelas/baru?lanjut=/mulai/${a.id}">+ Tambah kelas lain</a></p>`
      : `<div class="card"><p>Belum ada kelas. Tempel daftar nama murid dulu, lalu kembali ke sini.</p></div><p style="margin-top:.7rem"><a class="btn primary" href="#/kelas/baru?lanjut=/mulai/${a.id}">Buat daftar kelas</a></p>`}
    <h2 class="sec-h">${socio ? "Pertanyaan apa yang diajukan?" : "Isi angket"}</h2>
    ${socio ? SOCIO_VARIANTS.map((v, i) => `<label class="opt"><input type="radio" name="variant" value="${v.id}"${i === 0 ? " checked" : ""}><span class="t">${v.name}</span><span class="d">${v.desc}</span><ol>${v.questions.map((q) => `<li>${esc(q.text)}</li>`).join("")}</ol></label>`).join("")
      : `<div class="card"><p>${itemCount(a.id, {})} butir, satu butir per layar. Murid membuka link dari Anda, memilih namanya, lalu mengetuk jawaban yang paling sesuai. Kira-kira 5 menit.</p></div>`}
    <h2 class="sec-h">Batas pengisian</h2>
    <div class="seg" role="radiogroup" aria-label="Batas pengisian">${DEADLINES.map(([d, t]) => `<label><input type="radio" name="days" value="${d}"${d === 14 ? " checked" : ""}><span>${t}</span></label>`).join("")}<label><input type="radio" name="days" value="custom"><span>Pilih tanggal</span></label></div>
    <label class="field hide" id="st-custom" style="margin-top:.8rem;max-width:260px"><span>Ditutup pada tanggal</span><input type="date" id="st-date" min="${ymd(Date.now() + 86400000)}" max="${ymd(Date.now() + 90 * 86400000)}"><span class="hint">Ditutup pukul 23.59 pada tanggal itu. Maksimal 90 hari dari sekarang.</span></label>
    <p class="muted small" id="st-until" style="margin-top:.6rem"></p>
    <p class="err" id="st-err" role="alert"></p>
    <button class="btn primary block" id="st-go"${list.length ? "" : " disabled"}>Mulai sesi</button>
  </div></main>`;
  return {
    title: "Mulai " + a.name, html,
    mount(root) {
      const deadline = () => {
        const v = $('input[name="days"]:checked', root).value;
        if (v !== "custom") return { days: Number(v), at: Date.now() + Number(v) * 86400000 };
        const d = $("#st-date", root).value;
        return d ? { until: new Date(d + "T23:59:00").toISOString(), at: new Date(d + "T23:59:00").getTime() } : null;
      };
      const until = () => {
        $("#st-custom", root).classList.toggle("hide", $('input[name="days"]:checked', root).value !== "custom");
        const dl = deadline();
        $("#st-until", root).textContent = dl ? `Pengisian ditutup otomatis ${fmtDate(dl.at, true)}. Anda bisa menutupnya lebih awal.` : "Pilih tanggal penutupan.";
      };
      $("#st-date", root).addEventListener("input", until);
      $$('input[name="days"]', root).forEach((r) => r.addEventListener("change", until)); until();
      $("#st-go", root).addEventListener("click", async (e) => {
        const classId = $('input[name="kelas"]:checked', root)?.value;
        if (!classId) { $("#st-err", root).textContent = "Pilih kelas lebih dulu."; return; }
        const config = socio ? (() => { const v = SOCIO_VARIANTS.find((x) => x.id === $('input[name="variant"]:checked', root).value); return { variant: v.id, maxPick: 3, questions: v.questions }; })() : {};
        const dl = deadline();
        if (!dl) { $("#st-err", root).textContent = "Pilih tanggal penutupan."; return; }
        if (dl.at <= Date.now()) { $("#st-err", root).textContent = "Tanggal penutupan harus di masa depan."; return; }
        $("#st-err", root).textContent = "";
        e.currentTarget.disabled = true;
        try { const s = await store.createSession({ classId, type: a.id, config, days: dl.days, until: dl.until }); toast("Sesi dibuat"); go(`/sesi/${s.id}`); }
        catch (ex) { $("#st-err", root).textContent = ex.message; e.currentTarget.disabled = false; }
      });
    },
  };
}

/* ---------------- Halaman sesi: pantau jawaban ---------------- */
export async function session({ user, params }) {
  const s = await store.getSession(params.id);
  if (!s) return { html: `${header(user, "dasbor")}<main class="page"><div class="narrow"><h1 class="page-title">Sesi tidak ditemukan</h1><p style="margin-top:1rem"><a class="btn" href="#/dasbor">Ke dasbor</a></p></div></main>` };
  const a = getAssessment(s.type), open = isOpen(s), total = s.roster.length;
  const res = await store.listResponses(s.id);
  const done = new Set(res.map((r) => r.no));
  const waiting = s.roster.filter((m) => !done.has(m.no));
  const link = studentLink(s.code);
  const waText = `Halo, mohon isi angket ${a.name.toLowerCase()} untuk ${s.className}. Buka link ini, pilih namamu, lalu jawab pertanyaannya (sekitar 5 menit).\n${link}`;
  const html = `${header(user, "dasbor")}<main class="page"><div class="narrow">
    <a class="back" href="#/dasbor">← Dasbor</a>
    <h1 class="page-title">${esc(s.className)}</h1>
    <p class="page-sub">${esc(a.name)}. ${open ? `Dibuka sampai ${fmtDate(s.closesAt, true)}.` : "Pengisian sudah ditutup."}</p>
    ${open ? `<div class="sharebox" style="margin-top:1.4rem">
      <b style="font-weight:500">Kirim link ini ke murid</b>
      <div class="url" id="ss-url">${esc(link)}</div>
      <a class="btn primary block" href="https://wa.me/?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener">Kirim lewat WhatsApp</a>
      <button class="btn white block" id="ss-share">Bagikan lewat aplikasi lain</button>
      <button class="btn white block" id="ss-copy">Salin link</button>
      <button class="btn white block" id="ss-qr">Tampilkan kode QR</button>
      <div id="ss-qrbox" class="hide" style="text-align:center;margin-top:.8rem"></div>
    </div>` : ""}
    <h2 class="sec-h">Jawaban</h2>
    <p><span class="big-num" id="ss-n">${done.size}</span> <span class="muted">dari ${total} murid sudah mengisi</span></p>
    <div class="progress" style="margin:.7rem 0 1rem" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done.size}"><i id="ss-bar" style="width:${(done.size / total) * 100}%"></i></div>
    <a class="btn primary block" href="#/sesi/${s.id}/hasil"${done.size ? "" : ' aria-disabled="true" tabindex="-1" style="pointer-events:none"'}>Lihat hasil</a>
    <button class="btn block" id="ss-refresh" style="margin-top:.6rem">Perbarui</button>${open ? `<p class="muted small" style="margin-top:.5rem">Angka ini diperbarui sendiri. Halaman ini boleh ditutup; murid tetap bisa mengisi.</p>` : ""}
    ${waiting.length ? `<details class="card" style="margin-top:1rem"><summary style="cursor:pointer;font-weight:500">Belum mengisi (${waiting.length})</summary><p class="muted" style="margin-top:.6rem">${esc(waiting.map((m) => m.name).join(", "))}</p></details>` : ""}
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
      $("#ss-qr", root)?.addEventListener("click", async (e) => {
        const box = $("#ss-qrbox", root);
        if (!box.classList.contains("hide")) { box.classList.add("hide"); e.currentTarget.textContent = "Tampilkan kode QR"; return; }
        try {
          if (!box.innerHTML) {
            const QR = await import("https://esm.sh/qrcode@1.5.4");
            const url = await (QR.default || QR).toDataURL(link, { width: 360, margin: 1 });
            box.innerHTML = `<img src="${url}" alt="Kode QR untuk link angket" style="width:100%;max-width:300px;background:#fff;border-radius:12px;padding:8px"><p class="muted small" style="margin-top:.4rem">Tampilkan di layar kelas. Murid memindainya dengan kamera HP.</p>`;
          }
          box.classList.remove("hide"); e.currentTarget.textContent = "Sembunyikan kode QR";
        } catch { toast("Kode QR tidak bisa dibuat. Periksa koneksi internet."); }
      });
      // Angka jawaban diperbarui sendiri selama halaman terbuka.
      if (open) {
        const timer = setInterval(async () => {
          const n = $("#ss-n", root); if (!n || !document.body.contains(n)) { clearInterval(timer); return; }
          if (document.hidden) return;
          try { const c = (await store.listResponses(s.id)).length; n.textContent = c; $("#ss-bar", root).style.width = (c / total) * 100 + "%"; } catch { /* coba lagi nanti */ }
        }, 15000);
      }
      $("#ss-refresh", root).addEventListener("click", () => ctx.reload());
      $("#ss-toggle", root).addEventListener("click", async () => { await store.setClosed(s.id, open); toast(open ? "Pengisian ditutup" : "Pengisian dibuka lagi"); ctx.reload(); });
      $("#ss-del", root).addEventListener("click", async () => {
        if (!confirm("Hapus sesi ini beserta semua jawabannya? Tindakan ini tidak bisa dibatalkan.")) return;
        await store.deleteSession(s.id); toast("Sesi dihapus"); go("/dasbor");
      });
    },
  };
}

/* ---------------- Ganti kata sandi ---------------- */
const pwForm = (id, label) => `<form id="${id}" novalidate>
  <label class="field"><span>Kata sandi saat ini</span><input type="password" name="old" autocomplete="current-password" required></label>
  <label class="field"><span>Kata sandi baru</span><input type="password" name="pw" autocomplete="new-password" required><span class="hint">Minimal 6 karakter. Pilih yang hanya Anda yang tahu.</span></label>
  <label class="field"><span>Ulangi kata sandi baru</span><input type="password" name="pw2" autocomplete="new-password" required></label>
  <p class="err" role="alert"></p>
  <button class="btn primary">${label}</button>
</form>`;

function bindPwForm(form, onDone) {
  const err = form.querySelector(".err"), btn = form.querySelector("button");
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); err.textContent = "";
    if (form.pw.value.length < 6) { err.textContent = "Kata sandi baru minimal 6 karakter."; return; }
    if (form.pw.value !== form.pw2.value) { err.textContent = "Pengulangan kata sandi tidak sama."; return; }
    btn.disabled = true;
    try { await store.changePassword(form.old.value, form.pw.value); toast("Kata sandi diganti"); form.reset(); onDone(); }
    catch (ex) { err.textContent = ex.message; }
    btn.disabled = false;
  });
}

export function changePassword({ user }) {
  return {
    title: "Ganti kata sandi",
    html: `${header(user, "akun")}<main class="page"><div class="narrow" style="max-width:460px">
      <h1 class="page-title">Ganti kata sandi</h1>
      <p class="page-sub">${user.mustChange ? "Kata sandi dari admin hanya untuk masuk pertama kali. Buat kata sandi baru sebelum melanjutkan." : "Kata sandi baru berlaku mulai sekarang."}</p>
      ${pwForm("pw", user.mustChange ? "Simpan dan lanjut" : "Ganti kata sandi")}
      <p style="margin-top:1.2rem"><button class="linkbtn" id="pw-out">Keluar</button></p>
    </div></main>`,
    mount(root) {
      bindPwForm($("#pw", root), () => go(homePath(user)));
      $("#pw-out", root).addEventListener("click", async () => { await store.signOut(); go("/masuk"); });
    },
  };
}

/* ---------------- Akun ---------------- */
const KIND = { admin: "Admin", guru: "Guru", siswa: "Siswa" };

export function account({ user }) {
  const html = `${header(user, "akun")}<main class="page"><div class="narrow" style="max-width:460px">
    <h1 class="page-title">Pengaturan akun</h1>
    <p class="page-sub">${esc(user.name || user.username)}. Nama akun ${esc(user.username)}.</p>
    <h2 class="sec-h">Ganti kata sandi</h2>
    ${pwForm("pw", "Ganti kata sandi")}
  </div></main>`;
  return {
    title: "Pengaturan akun", html,
    mount(root) { bindPwForm($("#pw", root), () => {}); },
  };
}

/* ---------------- Admin ---------------- */
// Admin sekolah mengelola akun di sekolahnya sendiri. Admin pusat (tanpa sekolah) mengelola semua sekolah.
export async function admin({ user }) {
  const [d, schools] = await Promise.all([store.admin(), store.schools()]);
  let users = await store.adminUsers();
  const sup = user.isSuper;
  const schoolName = (id) => schools.find((s) => s.id === id)?.name || "-";
  const schoolOpts = (withAll) => (withAll ? `<option value="">Semua sekolah (admin pusat)</option>` : "") + schools.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("");

  const html = `${header(user, "admin")}<main class="page"><div class="wrap">
    <h1 class="page-title">Dasbor admin</h1>
    <p class="page-sub">${sup ? "Admin pusat: semua sekolah." : `Sekolah: ${esc(d.scope || "-")}.`} Guru bisa mendaftar sendiri. Di sini Anda juga bisa membuatkan akun guru atau admin.</p>
    <div class="kv" style="margin-top:1.4rem">
      <div class="card"><div class="k">Akun</div><div class="v">${d.totals.users}</div></div>
      <div class="card"><div class="k">Daftar kelas</div><div class="v">${d.totals.classes}</div></div>
      <div class="card"><div class="k">Sesi asesmen</div><div class="v">${d.totals.sessions}</div></div>
      <div class="card"><div class="k">Jawaban murid</div><div class="v">${d.totals.responses}</div></div>
    </div>

    <h2 class="sec-h">Akun</h2>
    <details class="card" id="add" style="margin-bottom:1rem"><summary style="cursor:pointer;font-weight:500">Tambah satu akun</summary>
      <form id="add-form" novalidate style="margin-top:.8rem">
        <div class="field"><span class="flabel" id="k-l">Jenis akun</span><div class="chips" role="radiogroup" aria-labelledby="k-l">
          <label><input type="radio" name="kind" value="guru" checked><span>Guru</span></label>
          <label><input type="radio" name="kind" value="admin"><span>Admin</span></label></div></div>
        ${sup ? `<label class="field" id="w-school"><span>Sekolah</span><select name="fschool" class="btn"></select></label>` : ""}
        <label class="field"><span>Nama lengkap</span><input type="text" name="fname" autocomplete="off"></label>
        <label class="field" id="w-title"><span>Peran di sekolah (opsional)</span><input type="text" name="ftitle" placeholder="Misalnya: Guru BK" autocomplete="off"></label>
        <label class="field"><span>Nama akun</span><input type="text" name="fuser" autocomplete="off" autocapitalize="none" spellcheck="false"><span class="hint">Huruf kecil, angka, titik, garis bawah, atau strip. Tidak boleh sama dengan akun lain.</span></label>
        <label class="field"><span>Kata sandi awal</span><div class="rowflex" style="gap:.5rem"><input type="text" name="fpass" autocomplete="off" spellcheck="false" style="flex:1"><button type="button" class="btn sm" id="f-rand">Acak</button></div><span class="hint">Pemilik akun diminta menggantinya saat masuk pertama.</span></label>
        <p class="err" id="add-err" role="alert"></p>
        <button class="btn primary">Buat akun</button>
      </form>
      <div id="add-result" style="margin-top:1rem"></div>
    </details>
    <div class="rowflex" style="margin-bottom:.8rem;flex-wrap:wrap">
      <input type="search" id="u-q" class="btn sm" placeholder="Cari nama atau nama akun" style="text-align:left;cursor:text;min-width:14rem" aria-label="Cari akun">
      ${sup ? `<select id="u-school" class="btn sm" aria-label="Sekolah"><option value="">Semua sekolah</option>${schoolOpts(false)}</select>` : ""}
      <select id="u-kind" class="btn sm" aria-label="Jenis akun"><option value="">Semua jenis</option><option value="guru">Guru</option><option value="admin">Admin</option></select>
      <span class="muted small" id="u-count"></span>
    </div>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>Nama akun</th><th>Nama</th><th>Jenis</th><th>Sekolah</th><th>Kata sandi</th><th>Aksi</th></tr></thead><tbody id="u-body"></tbody></table></div>
    <p class="muted small" style="margin-top:.6rem">Kata sandi tampil hanya selama pemilik belum menggantinya. Setelah diganti, admin tidak bisa lagi melihatnya, tetapi bisa mengatur ulang bila lupa.</p>

    ${sup ? `<h2 class="sec-h">Sekolah</h2>
    <div class="stack" id="sch">${schools.map((s) => `<div class="rowflex"><input type="text" class="btn sm" value="${esc(s.name)}" data-id="${s.id}" aria-label="Nama sekolah" style="text-align:left;cursor:text"><button class="btn sm" data-act="save-school" data-id="${s.id}">Simpan</button></div>`).join("")}
      <div class="rowflex"><input type="text" class="btn sm" id="sch-new" placeholder="Nama sekolah baru" style="text-align:left;cursor:text"><button class="btn sm" data-act="add-school">Tambah sekolah</button></div></div>` : ""}

    <h2 class="sec-h">Sesi asesmen</h2>
    ${d.sessions.length ? `<div class="tblwrap"><table class="tbl"><thead><tr><th>Kelas</th><th>Asesmen</th>${sup ? "<th>Sekolah</th>" : ""}<th>Guru</th><th class="num">Mengisi</th><th>Status</th><th>Dibuat</th></tr></thead>
      <tbody>${d.sessions.map((s) => `<tr><td>${esc(s.className)}</td><td>${esc(getAssessment(s.type)?.name || s.type)}</td>${sup ? `<td>${esc(s.school || "-")}</td>` : ""}<td>${esc(s.owner || "-")}</td><td class="num">${s.filled} / ${s.total}</td><td><span class="badge${s.open ? "" : " closed"}">${s.open ? "Dibuka" : "Ditutup"}</span></td><td>${fmtShort(s.createdAt)}</td></tr>`).join("")}</tbody></table></div>`
      : `<div class="card"><p>Belum ada sesi asesmen.</p></div>`}
  </div></main>`;

  return {
    title: "Dasbor admin", html,
    mount(root, ctx) {
      const form = $("#add-form", root), err = $("#add-err", root);
      const LIMIT = 300;

      /* ----- tabel akun ----- */
      const row = (u) => {
        const detail = u.kind === "siswa" ? "Akun murid versi lama, tidak dipakai lagi" : u.title;
        const pw = u.password
          ? `<code data-pw>••••••••</code> <button class="linkbtn" data-act="show">Lihat</button> <button class="linkbtn" data-act="copy">Salin</button>`
          : `<span class="muted small">Sudah diganti pemilik</span>`;
        return `<tr data-id="${u.id}"><td>${esc(u.username)}</td><td>${esc(u.name || "-")}${detail ? `<br><span class="meta">${esc(detail)}</span>` : ""}</td><td>${KIND[u.kind]}${u.kind === "admin" && !u.schoolId ? " pusat" : ""}</td><td>${esc(u.school || "Semua")}</td><td>${pw}</td><td style="white-space:nowrap"><button class="btn sm" data-act="reset">Atur ulang</button> <button class="btn sm danger" data-act="del">Hapus</button></td></tr>`;
      };
      const drawTable = () => {
        const q = $("#u-q", root).value.trim().toLowerCase(), sc = $("#u-school", root)?.value || "", kd = $("#u-kind", root).value;
        const list = users.filter((u) => (!q || `${u.name} ${u.username}`.toLowerCase().includes(q)) && (!sc || u.schoolId === sc) && (!kd || u.kind === kd));
        $("#u-body", root).innerHTML = list.slice(0, LIMIT).map(row).join("") || `<tr><td colspan="6" class="muted">Tidak ada akun yang cocok.</td></tr>`;
        $("#u-count", root).textContent = list.length > LIMIT ? `Menampilkan ${LIMIT} dari ${list.length}. Persempit pencarian.` : `${list.length} akun`;
      };
      const refresh = async () => { users = await store.adminUsers(); drawTable(); };
      ["input", "change"].forEach((ev) => { $("#u-q", root).addEventListener(ev, drawTable); $("#u-school", root)?.addEventListener(ev, drawTable); $("#u-kind", root).addEventListener(ev, drawTable); });

      $("#u-body", root).addEventListener("click", async (e) => {
        const b = e.target.closest("[data-act]"); if (!b) return;
        const tr = b.closest("tr"), u = users.find((x) => x.id === tr.dataset.id); if (!u) return;
        try {
          if (b.dataset.act === "show") {
            const code = $("[data-pw]", tr), hidden = code.textContent.startsWith("•");
            code.textContent = hidden ? u.password : "••••••••"; b.textContent = hidden ? "Sembunyikan" : "Lihat";
          } else if (b.dataset.act === "copy") {
            const text = `Nama akun: ${u.username}\nKata sandi: ${u.password}`;
            try { await navigator.clipboard.writeText(text); toast("Nama akun dan kata sandi disalin"); } catch { prompt("Salin teks ini:", text); }
          } else if (b.dataset.act === "reset") {
            const pw = prompt(`Kata sandi baru untuk ${u.name || u.username} (minimal 6 karakter):`, genPassword());
            if (!pw) return;
            await store.adminSetPassword(u.id, pw); toast("Kata sandi diatur ulang. Pemilik diminta menggantinya saat masuk."); await refresh();
          } else if (b.dataset.act === "del") {
            if (!confirm(`Hapus akun ${u.username} (${u.name})? Akun tidak bisa dipakai masuk lagi.${u.kind !== "siswa" ? " Sesi miliknya dipindahkan ke akun Anda; kelasnya tetap ada." : ""}`)) return;
            await store.adminDeleteUser(u.id); toast("Akun dihapus"); await refresh();
          }
        } catch (ex) { toast(ex.message); }
      });

      /* ----- form tambah akun ----- */
      let userTouched = false;
      const kind = () => form.kind.value;
      const syncName = () => { if (!userTouched) form.fuser.value = suggestUsername(form.fname.value); };
      const syncKind = () => {
        const k = kind();
        $("#w-title", root).classList.toggle("hide", k !== "guru");
        if (form.fschool) form.fschool.innerHTML = schoolOpts(k === "admin");
      };
      form.querySelectorAll('input[name="kind"]').forEach((r) => r.addEventListener("change", syncKind));
      form.fname.addEventListener("input", syncName);
      form.fuser.addEventListener("input", () => { userTouched = true; });
      $("#f-rand", root).addEventListener("click", () => { form.fpass.value = genPassword(); });
      form.fpass.value = genPassword();
      syncKind();

      form.addEventListener("submit", async (e) => {
        e.preventDefault(); err.textContent = "";
        const k = kind();
        const payload = { kind: k, username: form.fuser.value.trim(), password: form.fpass.value, name: form.fname.value.trim(), title: form.ftitle.value.trim(),
          schoolId: sup ? form.fschool.value || null : null };
        if (!payload.name) { err.textContent = "Isi nama lengkap."; return; }
        if (!payload.username) { err.textContent = "Isi nama akun."; return; }
        if (sup && k === "guru" && !payload.schoolId) { err.textContent = "Pilih sekolah."; return; }
        const btn = form.querySelector(".btn.primary"); btn.disabled = true;
        try {
          const r = await store.adminCreateUser(payload);
          $("#add-result", root).innerHTML = `<div class="card sky"><b style="font-weight:500">Akun dibuat untuk ${esc(r.name)}</b><p style="margin-top:.4rem">Nama akun: <code>${esc(r.username)}</code><br>Kata sandi: <code>${esc(r.password)}</code></p><p class="muted small" style="margin-top:.4rem">Bagikan kepada pemiliknya. Mereka diminta mengganti kata sandi saat masuk pertama.</p></div>`;
          form.fpass.value = genPassword(); userTouched = false; form.fname.value = ""; form.fuser.value = ""; form.ftitle.value = "";
          await refresh();
        } catch (ex) { err.textContent = ex.message; }
        btn.disabled = false;
      });

      /* ----- sekolah (admin pusat) ----- */
      $("#sch", root)?.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-act]"); if (!b) return;
        try {
          if (b.dataset.act === "save-school") {
            const name = $(`input[data-id="${b.dataset.id}"]`, root).value.trim(); if (!name) { toast("Isi nama sekolah"); return; }
            await store.saveSchool({ id: b.dataset.id, name }); toast("Nama sekolah disimpan"); ctx.reload();
          } else if (b.dataset.act === "add-school") {
            const name = $("#sch-new", root).value.trim(); if (!name) { toast("Isi nama sekolah"); return; }
            await store.saveSchool({ name }); toast("Sekolah ditambahkan"); ctx.reload();
          }
        } catch (ex) { toast(ex.message); }
      });

      drawTable();
    },
  };
}
