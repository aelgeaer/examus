import { esc, $, $$, fmtShort, go, toast, homePath, suggestUsername } from "./util.js";
import { store } from "./store.js";
import { ASSESSMENTS, ICONS, SAMPLE_CLASS, SAMPLE_SOCIO, SOCIO_VARIANTS, POSTS, getPost } from "./data.js";
import { analyze, mountSociogram, describe } from "./sociogram.js";

export function header(user, active = "") {
  const on = (k) => (k === active ? ' class="on"' : "");
  const links = !user
    ? `<a href="#/blog"${on("blog")}>Blog</a><a href="#/daftar"${on("daftar")}>Daftar</a><a class="pill" href="#/masuk">Masuk</a>`
    : user.isSuper
        ? `<a href="#/admin"${on("admin")}>Admin</a><a href="#/kelas"${on("kelas")}>Kelas</a>`
        : `<a href="#/dasbor"${on("dasbor")}>Dasbor</a><a href="#/kelas"${on("kelas")}>Kelas</a>${user.isAdmin ? `<a href="#/admin"${on("admin")}>Admin</a>` : ""}`;
  const menu = user ? `<details class="usermenu"><summary aria-label="Menu akun"><span class="avatar" aria-hidden="true">${esc((user.name || user.username || "?").trim().charAt(0).toUpperCase())}</span><span class="who"><b>${esc(user.name || user.username)}</b><span>${esc(user.username)}</span></span><span class="caret" aria-hidden="true">▾</span></summary>
      <div class="menu" role="menu"><a role="menuitem" href="#/akun"${on("akun")}>Pengaturan akun</a><button type="button" role="menuitem" data-logout>Keluar</button></div></details>` : "";
  const nav = links + menu;
  return `<header class="site-header wrap">
    <a class="lockup" href="#/" aria-label="Examus by prepod, beranda"><img src="assets/img/logo.svg" alt="" width="40" height="40"><span class="words"><span class="name">Examus</span><span class="by">by prepod</span></span></a>
    <nav aria-label="Utama">${nav}</nav>
  </header>`;
}

export function footer() {
  return `<footer class="site-footer"><div class="wrap">
    <a class="lockup" href="#/"><img src="assets/img/logo.svg" alt="" width="40" height="40"><span class="words"><span class="name">Examus</span><span class="by">by prepod</span></span></a>
    <nav class="links" aria-label="Tautan">
      <a href="#/">Beranda</a><a href="#/blog">Blog</a><a href="#/masuk">Masuk</a><a href="#/syarat">Syarat penggunaan</a><a href="#/privasi">Kebijakan privasi</a>
    </nav>
    <div class="row"><span>Asesmen psikologi untuk sekolah</span><span>© 2026 prepod</span></div>
  </div></footer>`;
}

/* ---------------- Beranda ---------------- */
const FAQ = [
  ["Untuk siapa Examus?", "Untuk guru BK, psikolog sekolah, wali kelas, dan guru mata pelajaran dari SD sampai SMA/SMK yang ingin mengenali muridnya sebelum merencanakan layanan atau pembelajaran."],
  ["Apakah murid perlu membuat akun?", "Tidak. Anda membagikan link sesi, misalnya lewat grup WhatsApp kelas. Murid membuka link, memilih namanya dari daftar kelas, lalu menjawab dari HP. Satu nama hanya bisa mengisi satu kali, dan tidak ada aplikasi yang perlu dipasang."],
  ["Siapa yang bisa melihat hasilnya?", "Hanya guru yang membuat sesi (dan admin sekolahnya). Murid tidak melihat jawaban teman maupun hasil kelas, dan data tiap sekolah terpisah dari sekolah lain."],
  ["Apakah hasilnya sebuah diagnosis?", "Bukan. Examus adalah alat pemetaan dan skrining awal. Hasilnya membantu pertimbangan profesional Anda dan tidak menggantikan pemeriksaan klinis oleh psikolog."],
  ["Seperti apa bentuk laporannya?", "Ringkasan kelas, sosiogram, tabel per murid, dan saran tindak lanjut. Laporan bisa dicetak ke PDF dengan kop sekolah, diunduh sebagai CSV untuk Excel, atau disimpan sebagai gambar."],
  ["Bagaimana cara mulai?", "Daftar dengan nama lengkap dan sekolah Anda (atau minta admin sekolah membuatkan akun). Tempel daftar nama murid dari Excel atau WhatsApp, pilih asesmen, lalu bagikan linknya ke murid. Anda juga bisa mencoba dulu dengan kelas contoh yang sudah berisi jawaban."],
];

export function landing({ user }) {
  const cta = user ? "#" + homePath(user) : "#/daftar";
  const html = `
  <div class="hero">
    ${header(user)}
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <h1>Asesmen psikologi kelas, selesai dalam satu jam pelajaran.</h1>
        <p class="lead">Examus membantu guru BK dan psikolog sekolah menjalankan sosiometri, angket gaya belajar, minat karier, dan kebutuhan siswa. Murid cukup membuka link dari Anda dan mengisi dari HP, tanpa akun. Anda menerima peta kelas dan rekap yang siap dicetak.</p>
        <div class="actions"><a class="btn primary" href="${cta}">Buat sesi pertama</a><button class="btn white" data-scroll="cara">Lihat cara kerjanya</button></div>
        <p class="for">Untuk guru BK, psikolog sekolah, dan wali kelas.</p>
      </div>
      <div class="hero-demo" id="demo">
        <div class="demo-tabs" role="tablist" aria-label="Pertanyaan contoh">
          <button role="tab" data-q="belajar" aria-selected="true">Kelompok belajar</button>
          <button role="tab" data-q="sosial" aria-selected="false">Teman istirahat</button>
        </div>
        <p class="demo-q" id="demo-q"></p>
        <div id="demo-sg"></div>
        <div class="demo-foot">
          <div class="readout" id="demo-read" aria-live="polite"></div>
          <button class="btn dark sm" id="demo-names" aria-pressed="false">Tampilkan nama</button>
        </div>
      </div>
    </div>
  </div>

  <section class="section statement"><div class="wrap">
    <p>Mengenal tiga puluh murid satu per satu butuh waktu berbulan-bulan. Examus memberi gambaran awalnya dalam sehari, tanpa kertas dan tanpa rekap manual.</p>
  </div></section>

  <section class="section steps" id="cara" aria-labelledby="cara-h"><div class="wrap">
    <h2 id="cara-h">Tiga langkah, tanpa kertas.</h2>
    <ol>
      <li><div class="tile t1"><div class="mock" aria-hidden="true">
            <div class="row"><span>1&nbsp; Arya Wibowo</span><span class="tag">L</span></div>
            <div class="row"><span>2&nbsp; Bella Kusuma</span><span class="tag">P</span></div>
            <div class="row"><span>3&nbsp; Cahya Ningrum</span><span class="tag">P</span></div>
          </div></div>
        <h3>Tempel daftar kelas</h3><p>Salin daftar nama dari Excel atau WhatsApp. Nomor urut dan tanda L/P dikenali otomatis.</p></li>
      <li><div class="tile t2"><div class="mock" aria-hidden="true">
            <div class="url">Angket Kelas 8C</div><div class="fake-btn">Mulai mengisi</div>
          </div></div>
        <h3>Bagikan link</h3><p>Kirim link ke grup WhatsApp kelas. Murid memilih namanya dan menjawab dari HP, tanpa akun.</p></li>
      <li><div class="tile t3"><div class="mock" aria-hidden="true">
            <div class="bar" style="width:86%"></div><div class="bar" style="width:58%"></div><div class="bar" style="width:34%"></div>
          </div></div>
        <h3>Buka laporannya</h3><p>Peta kelas, tabel per murid, dan saran tindak lanjut. Cetak ke PDF atau unduh untuk Excel.</p></li>
    </ol>
  </div></section>

  <section class="section catalogue" id="asesmen" aria-labelledby="cat-h"><div class="wrap">
    <h2 id="cat-h">Asesmen yang tersedia.</h2>
    <ul>${ASSESSMENTS.map((a) => `<li class="cat ${a.tone}">${ICONS[a.id]}<span class="nm">${esc(a.name)}</span><p>${esc(a.long)}</p>${a.ready ? "" : '<span class="soon">Segera hadir</span>'}<span class="who">${esc(a.who)}</span></li>`).join("")}</ul>
  </div></section>

  <section class="section faq" aria-labelledby="faq-h"><div class="wrap">
    <h2 id="faq-h">Pertanyaan yang sering muncul.</h2>
    <div class="answers">${FAQ.map(([q, a]) => `<details name="faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>
  </div></section>

  <section class="section closing"><div class="wrap"><div class="closing-card">
    <div><h2>Coba dengan satu kelas dulu.</h2><p>Daftar dengan nama dan sekolah Anda, tempel daftar kelas, lalu bagikan linknya ke grup kelas. Pantau dari HP sampai semua murid selesai.</p><a class="btn white" href="${cta}">Buat sesi pertama</a></div>
    <div class="closing-rings" aria-hidden="true"></div>
  </div></div></section>
  ${footer()}`;

  return {
    html,
    mount(root) {
      const members = SAMPLE_CLASS.members;
      const filled = new Set(Object.keys(SAMPLE_SOCIO.belajar).map(Number));
      const qs = Object.fromEntries(SOCIO_VARIANTS[0].questions.map((q) => [q.id, q]));
      let names = false, sg;
      const show = (qid) => {
        const an = analyze(members, SAMPLE_SOCIO[qid], filled);
        $("#demo-q", root).textContent = qs[qid].text;
        const read = $("#demo-read", root);
        sg = mountSociogram($("#demo-sg", root), members, an, { legend: false, names, onFocus: (row) => (read.innerHTML = describe(an, row)) });
        read.innerHTML = describe(an, null);
      };
      $$(".demo-tabs button", root).forEach((b) => b.addEventListener("click", () => {
        $$(".demo-tabs button", root).forEach((x) => x.setAttribute("aria-selected", String(x === b)));
        show(b.dataset.q);
      }));
      $("#demo-names", root).addEventListener("click", (e) => {
        names = !names; sg.toggleNames(names);
        e.currentTarget.setAttribute("aria-pressed", String(names));
        e.currentTarget.textContent = names ? "Sembunyikan nama" : "Tampilkan nama";
      });
      show("belajar");
    },
  };
}

/* ---------------- Blog ---------------- */
export function blog({ user }) {
  return {
    html: `${header(user, "blog")}<main class="page"><div class="narrow">
      <h1 class="page-title">Blog</h1>
      <p class="page-sub">Panduan singkat untuk guru BK, psikolog sekolah, dan wali kelas: memetakan pertemanan, membaca hasil angket, dan menindaklanjutinya.</p>
      <div class="blog-list">${POSTS.map((p) => `<a class="post-card" href="#/blog/${p.slug}"><div><h3>${esc(p.title)}</h3><p>${esc(p.excerpt)}</p><div class="meta">${fmtShort(p.date)}, ${p.minutes} menit baca</div></div><div class="art" aria-hidden="true">${ICONS[p.icon]}</div></a>`).join("")}</div>
    </div></main>${footer()}`,
  };
}

export function post({ user, params }) {
  const p = getPost(params.slug);
  if (!p) return notFound({ user });
  return {
    title: p.title,
    html: `${header(user, "blog")}<main class="page"><article class="narrow">
      <a class="back" href="#/blog">← Semua artikel</a>
      <h1 class="page-title">${esc(p.title)}</h1>
      <p class="muted small" style="margin-top:.8rem">${fmtShort(p.date)}, ${p.minutes} menit baca</p>
      <div class="prose" style="margin-top:1.6rem">${p.body}</div>
      <div class="card sky" style="margin-top:2.4rem"><div class="spread"><b style="font-weight:500">Ingin mencobanya di kelas Anda?</b><a class="btn primary sm" href="${user ? "#/dasbor" : "#/masuk"}">Buat sesi pertama</a></div></div>
    </article></main>${footer()}`,
  };
}

/* ---------------- Syarat & privasi ---------------- */
const LEGAL = {
  syarat: { title: "Syarat penggunaan", body: `
    <p>Dengan memakai Examus, Anda menyetujui hal-hal berikut.</p>
    <h2>Pemakaian</h2><ul><li>Examus dipakai oleh pendidik dan tenaga profesional sekolah untuk keperluan layanan bimbingan dan pembelajaran.</li><li>Anda memakai Examus dengan izin sekolah dan memberi tahu murid serta orang tua tentang tujuan asesmen, sesuai aturan sekolah Anda.</li><li>Nama akun dan kata sandi hanya dipakai oleh pemiliknya dan tidak dibagikan kepada orang lain.</li><li>Link sesi hanya dibagikan kepada murid di kelas yang bersangkutan.</li></ul>
    <h2>Hasil asesmen</h2><ul><li>Hasil Examus adalah bahan pertimbangan, bukan diagnosis, bukan dasar hukuman, dan tidak menentukan nilai atau masa depan murid.</li><li>Laporan perorangan dan sosiogram bersifat rahasia dan hanya untuk guru yang berwenang.</li></ul>
    <h2>Tanggung jawab</h2><p>Guru bertanggung jawab atas keakuratan daftar kelas yang dimasukkan dan atas cara hasil asesmen digunakan di sekolah.</p>` },
  privasi: { title: "Kebijakan privasi", body: `
    <p>Halaman ini menjelaskan data apa yang disimpan Examus dan untuk apa.</p>
    <h2>Data yang disimpan</h2><ul><li>Akun guru dan admin: nama akun, nama, sekolah, dan peran di sekolah. Murid tidak membuat akun.</li><li>Kata sandi disimpan terenkripsi. Bila akun dibuat oleh admin, kata sandi awalnya bisa dilihat admin sekolah sampai pemilik menggantinya.</li><li>Daftar kelas: nama murid dan jenis kelamin (L/P).</li><li>Jawaban murid atas angket yang Anda jalankan.</li></ul>
    <p>Examus tidak meminta tanggal lahir, alamat, nomor telepon, atau foto murid.</p>
    <h2>Pemakaian data</h2><ul><li>Data murid hanya dipakai untuk menyusun laporan bagi guru yang membuat sesi.</li><li>Data tidak dijual dan tidak dipakai untuk iklan.</li><li>Guru dapat menghapus kelas dan sesi miliknya kapan saja; jawaban di dalam sesi ikut terhapus bersama sesinya.</li></ul>
    <h2>Penyimpanan</h2><p>Data tersimpan di database dan dipisahkan per sekolah: akun sebuah sekolah tidak dapat membaca data sekolah lain. Daftar kelas hanya dapat dibaca guru yang memegangnya dan admin sekolah yang bersangkutan. Sesi dan jawaban hanya dapat dibaca guru pembuatnya dan admin sekolah tersebut. Orang yang membuka link sesi melihat nama kelas dan daftar nama murid di kelas itu supaya murid bisa memilih namanya, tetapi tidak bisa melihat jawaban siapa pun.</p>` },
};
export function legal({ user, params }) {
  const d = LEGAL[params.doc];
  return { title: d.title, html: `${header(user)}<main class="page"><div class="narrow"><h1 class="page-title">${d.title}</h1><div class="prose" style="margin-top:1.4rem">${d.body}</div></div></main>${footer()}` };
}

export function notFound({ user }) {
  return { title: "Halaman tidak ditemukan", html: `${header(user)}<main class="page"><div class="narrow"><h1 class="page-title">Halaman tidak ditemukan</h1><p class="page-sub">Alamat ini tidak ada di Examus.</p><p style="margin-top:1.4rem"><a class="btn primary" href="#/">Ke beranda</a></p></div></main>` };
}

/* ---------------- Masuk ---------------- */
// Guru mendaftar sendiri di /daftar, atau dibuatkan akun oleh admin sekolah. Murid tidak masuk.
export function login({ user, query }) {
  const next = query.get("lanjut") || "";
  const html = `${header(null, "masuk")}<main class="page"><div class="narrow" style="max-width:460px">
    <h1 class="page-title">Masuk</h1>
    <p class="page-sub">Untuk guru dan admin sekolah.</p>
    <form id="lg" novalidate>
      <label class="field"><span>Nama akun</span><input type="text" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required></label>
      <label class="field"><span>Kata sandi</span><input type="password" name="pw" autocomplete="current-password" required></label>
      <p class="err" id="lg-err" role="alert"></p>
      <button class="btn primary block" id="lg-go">Masuk</button>
    </form>
    <p style="margin-top:1.2rem">Belum punya akun? <a href="#/daftar">Daftar sebagai guru</a></p>
    <p class="muted small" style="margin-top:.8rem">Lupa kata sandi? Hubungi admin sekolah Anda untuk mengaturnya ulang. Murid tidak perlu masuk: cukup buka link angket dari guru.</p>
    <p class="muted small" style="margin-top:.8rem">Dengan masuk, Anda menyetujui <a href="#/syarat">Syarat penggunaan</a> dan <a href="#/privasi">Kebijakan privasi</a> Examus.</p>
  </div></main>`;
  return {
    title: "Masuk",
    html,
    mount(root) {
      if (user) { go(user.mustChange ? "/ganti-sandi" : homePath(user)); return; }
      const form = $("#lg", root), err = $("#lg-err", root), btn = $("#lg-go", root);
      form.addEventListener("submit", async (e) => {
        e.preventDefault(); err.textContent = "";
        const username = form.username.value.trim(), pw = form.pw.value;
        if (!username || !pw) { err.textContent = "Isi nama akun dan kata sandi."; return; }
        btn.disabled = true;
        try {
          const u = await store.signIn(username, pw);
          toast("Berhasil masuk");
          go(u.mustChange ? "/ganti-sandi" : next && !next.startsWith("/masuk") ? next : homePath(u));
        } catch (ex) { err.textContent = ex.message; }
        btn.disabled = false;
      });
    },
  };
}

/* ---------------- Daftar (guru) ---------------- */
export async function register({ user }) {
  if (user) { go(homePath(user)); return { html: "" }; }
  const schools = await store.publicSchools();
  const html = `${header(null, "daftar")}<main class="page"><div class="narrow" style="max-width:460px">
    <h1 class="page-title">Daftar sebagai guru</h1>
    <p class="page-sub">Cukup nama dan sekolah Anda. Setelah itu Anda bisa langsung membuat kelas dan membagikan angket ke murid.</p>
    <form id="rg" novalidate>
      <label class="field"><span>Nama lengkap</span><input type="text" name="name" autocomplete="name" required><span class="hint">Boleh dengan gelar. Tampil di laporan yang dicetak.</span></label>
      <label class="field"><span>Sekolah</span><select name="school" class="btn" style="width:100%;text-align:left" required><option value="">Pilih sekolah</option>${schools.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></label>
      <label class="field"><span>Nama akun</span><input type="text" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required><span class="hint">Dipakai untuk masuk. Huruf kecil, angka, titik, garis bawah, atau strip.</span></label>
      <label class="field"><span>Kata sandi</span><input type="password" name="pw" autocomplete="new-password" required><span class="hint">Minimal 6 karakter.</span></label>
      <p class="err" id="rg-err" role="alert"></p>
      <button class="btn primary block" id="rg-go">Daftar</button>
    </form>
    <p style="margin-top:1.2rem">Sudah punya akun? <a href="#/masuk">Masuk</a></p>
  </div></main>`;
  return {
    title: "Daftar",
    html,
    mount(root) {
      const form = $("#rg", root), err = $("#rg-err", root), btn = $("#rg-go", root);
      let touched = false;
      form.name.addEventListener("input", () => { if (!touched) form.username.value = suggestUsername(form.name.value); });
      form.username.addEventListener("input", () => { touched = true; });
      form.addEventListener("submit", async (e) => {
        e.preventDefault(); err.textContent = "";
        const data = { name: form.name.value.trim(), schoolId: form.school.value, username: form.username.value.trim().toLowerCase(), password: form.pw.value };
        if (!data.name) { err.textContent = "Isi nama lengkap Anda."; form.name.focus(); return; }
        if (!data.schoolId) { err.textContent = "Pilih sekolah Anda."; return; }
        if (!/^[a-z0-9._-]{3,30}$/.test(data.username)) { err.textContent = "Nama akun 3 sampai 30 karakter: huruf kecil, angka, titik, garis bawah, atau strip."; form.username.focus(); return; }
        if (data.password.length < 6) { err.textContent = "Kata sandi minimal 6 karakter."; form.pw.focus(); return; }
        btn.disabled = true;
        try { await store.register(data); toast("Akun dibuat"); go("/kenalan"); }
        catch (ex) { err.textContent = ex.message; btn.disabled = false; }
      });
    },
  };
}
