import { esc, $, $$, fmtShort, go, toast } from "./util.js";
import { store } from "./store.js";
import { ASSESSMENTS, ICONS, SAMPLE_CLASS, SAMPLE_SOCIO, SOCIO_VARIANTS, POSTS, getPost } from "./data.js";
import { analyze, mountSociogram, describe } from "./sociogram.js";

export function header(user, active = "") {
  const on = (k) => (k === active ? ' class="on"' : "");
  const nav = user
    ? `<a href="#/dasbor"${on("dasbor")}>Dasbor</a><a href="#/kelas"${on("kelas")}>Kelas</a><a href="#/akun"${on("akun")}>Akun</a>${user.isAdmin ? `<a href="#/admin"${on("admin")}>Admin</a>` : ""}`
    : `<a href="#/blog"${on("blog")}>Blog</a><a class="pill" href="#/masuk">Masuk</a>`;
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
  ["Apakah murid perlu membuat akun?", "Tidak. Murid membuka link, memilih namanya di daftar kelas, lalu menjawab. Tidak ada kata sandi dan tidak ada aplikasi yang perlu dipasang."],
  ["Siapa yang bisa melihat hasilnya?", "Hanya guru yang membuat sesi. Murid tidak melihat jawaban teman maupun hasil kelas."],
  ["Apakah hasilnya sebuah diagnosis?", "Bukan. Examus adalah alat pemetaan dan skrining awal. Hasilnya membantu pertimbangan profesional Anda dan tidak menggantikan pemeriksaan klinis oleh psikolog."],
  ["Seperti apa bentuk laporannya?", "Ringkasan kelas, sosiogram, tabel per murid, dan saran tindak lanjut. Laporan bisa dicetak ke PDF dengan kop sekolah, diunduh sebagai CSV untuk Excel, atau disimpan sebagai gambar."],
  ["Bagaimana cara mulai?", "Buat akun dengan email, tempel daftar kelas, pilih asesmen, lalu bagikan link ke grup kelas. Anda juga bisa mencoba dulu dengan kelas contoh yang sudah berisi jawaban."],
];

export function landing({ user }) {
  const cta = user ? "#/dasbor" : "#/masuk";
  const html = `
  <div class="hero">
    ${header(user)}
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <h1>Asesmen psikologi kelas, selesai dalam satu jam pelajaran.</h1>
        <p class="lead">Examus membantu guru BK dan psikolog sekolah menjalankan sosiometri, angket gaya belajar, minat karier, dan kebutuhan siswa. Murid mengisi dari HP tanpa akun. Anda menerima peta kelas dan rekap yang siap dicetak.</p>
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
        <h3>Tempel daftar nama</h3><p>Salin dari Excel atau WhatsApp. Nomor urut dan L/P dikenali otomatis.</p></li>
      <li><div class="tile t2"><div class="mock" aria-hidden="true">
            <div class="url">examus/#/s/k7Qm2xTn9a</div><div class="fake-btn">Kirim lewat WhatsApp</div>
          </div></div>
        <h3>Kirim satu link</h3><p>Bagikan ke grup kelas. Murid memilih namanya lalu menjawab dari HP, tanpa akun.</p></li>
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
    <div><h2>Coba dengan satu kelas dulu.</h2><p>Buat akun, tempel daftar nama, dan kirim link ke grup kelas. Laporan pertama Anda bisa jadi hari ini.</p><a class="btn white" href="${cta}">Buat sesi pertama</a></div>
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
    <h2>Pemakaian</h2><ul><li>Examus dipakai oleh pendidik dan tenaga profesional sekolah untuk keperluan layanan bimbingan dan pembelajaran.</li><li>Anda memakai Examus dengan izin sekolah dan memberi tahu murid serta orang tua tentang tujuan asesmen, sesuai aturan sekolah Anda.</li><li>Link pengisian hanya dibagikan kepada murid di kelas yang bersangkutan.</li></ul>
    <h2>Hasil asesmen</h2><ul><li>Hasil Examus adalah bahan pertimbangan, bukan diagnosis, bukan dasar hukuman, dan tidak menentukan nilai atau masa depan murid.</li><li>Laporan perorangan dan sosiogram bersifat rahasia dan hanya untuk guru yang berwenang.</li></ul>
    <h2>Tanggung jawab</h2><p>Anda bertanggung jawab atas keakuratan daftar kelas yang dimasukkan dan atas cara hasil asesmen digunakan di sekolah.</p>` },
  privasi: { title: "Kebijakan privasi", body: `
    <p>Halaman ini menjelaskan data apa yang disimpan Examus dan untuk apa.</p>
    <h2>Data yang disimpan</h2><ul><li>Akun guru: email, nama, peran, nama sekolah, dan kota.</li><li>Daftar kelas: nama murid dan jenis kelamin (L/P).</li><li>Jawaban murid atas angket yang Anda jalankan.</li></ul>
    <p>Examus tidak meminta tanggal lahir, alamat, nomor telepon, atau foto murid.</p>
    <h2>Pemakaian data</h2><ul><li>Data murid hanya dipakai untuk menyusun laporan bagi guru yang membuat sesi.</li><li>Data tidak dijual dan tidak dipakai untuk iklan.</li><li>Anda dapat menghapus sesi dan daftar kelas kapan saja; jawaban di dalamnya ikut terhapus.</li></ul>
    <h2>Penyimpanan</h2><p>Dalam mode percobaan, seluruh data tersimpan di browser perangkat Anda. Bila situs dihubungkan ke database, data tersimpan di database tersebut dan hanya dapat dibaca oleh akun pemiliknya.</p>` },
};
export function legal({ user, params }) {
  const d = LEGAL[params.doc];
  return { title: d.title, html: `${header(user)}<main class="page"><div class="narrow"><h1 class="page-title">${d.title}</h1><div class="prose" style="margin-top:1.4rem">${d.body}</div></div></main>${footer()}` };
}

export function notFound({ user }) {
  return { title: "Halaman tidak ditemukan", html: `${header(user)}<main class="page"><div class="narrow"><h1 class="page-title">Halaman tidak ditemukan</h1><p class="page-sub">Alamat ini tidak ada di Examus.</p><p style="margin-top:1.4rem"><a class="btn primary" href="#/">Ke beranda</a></p></div></main>` };
}

/* ---------------- Masuk / daftar ---------------- */
export function login({ user, query }) {
  const next = query.get("lanjut") || "";
  const html = `${header(null)}<main class="page"><div class="narrow" style="max-width:460px">
    <h1 class="page-title" id="lg-title">Masuk</h1>
    <p class="page-sub" id="lg-sub">Masuk untuk membuka dasbor Anda.</p>
    <form id="lg" novalidate>
      <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" required></label>
      <label class="field"><span>Kata sandi</span><input type="password" name="pw" autocomplete="current-password" minlength="6" required><span class="hint">Minimal 6 karakter.</span></label>
      <p class="err" id="lg-err" role="alert"></p>
      <button class="btn primary block" id="lg-go">Masuk</button>
    </form>
    <p style="margin-top:1.2rem"><span id="lg-alt">Belum punya akun?</span> <button class="linkbtn" id="lg-switch">Buat akun</button></p>
    ${store.mode === "lokal" ? `<p class="notice" style="margin-top:1.4rem">Mode percobaan: akun dan data tersimpan di browser ini saja.</p>` : ""}
    <p class="muted small" style="margin-top:1.2rem">Dengan masuk, Anda menyetujui <a href="#/syarat">Syarat penggunaan</a> dan <a href="#/privasi">Kebijakan privasi</a> Examus.</p>
  </div></main>`;
  return {
    title: "Masuk",
    html,
    mount(root) {
      if (user) { go(user.onboarded ? "/dasbor" : "/kenalan"); return; }
      let signup = false;
      const form = $("#lg", root), err = $("#lg-err", root), btn = $("#lg-go", root);
      $("#lg-switch", root).addEventListener("click", () => {
        signup = !signup; err.textContent = "";
        $("#lg-title", root).textContent = signup ? "Buat akun" : "Masuk";
        $("#lg-sub", root).textContent = signup ? "Daftar dengan email. Kurang dari satu menit." : "Masuk untuk membuka dasbor Anda.";
        btn.textContent = signup ? "Buat akun" : "Masuk";
        $("#lg-alt", root).textContent = signup ? "Sudah punya akun?" : "Belum punya akun?";
        $("#lg-switch", root).textContent = signup ? "Masuk" : "Buat akun";
        form.pw.autocomplete = signup ? "new-password" : "current-password";
      });
      form.addEventListener("submit", async (e) => {
        e.preventDefault(); err.textContent = "";
        const email = form.email.value.trim(), pw = form.pw.value;
        if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = "Tulis alamat email yang lengkap, misalnya nama@sekolah.sch.id."; return; }
        if (pw.length < 6) { err.textContent = "Kata sandi minimal 6 karakter."; return; }
        btn.disabled = true;
        try {
          const u = signup ? await store.signUp(email, pw) : await store.signIn(email, pw);
          toast(signup ? "Akun dibuat" : "Berhasil masuk");
          go(!u.onboarded ? "/kenalan" : next || (u.isAdmin ? "/admin" : "/dasbor"));
        } catch (ex) { err.textContent = ex.message; }
        btn.disabled = false;
      });
    },
  };
}
