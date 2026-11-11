// Deteksi perundungan versi 40 butir: korban, pelaku, saksi, dan iklim sekolah (masing-masing 10).
// Sesi lama (32 butir, tanpa cfg.n = 40) tetap memakai definisi lama di instruments.js.
import { esc } from "./util.js";
import { talk } from "./help.js";

export const PR_N = 40;
export const PR_FREQ = [{ v: 0, t: "Tidak pernah" }, { v: 1, t: "Jarang" }, { v: 2, t: "Kadang-kadang" }, { v: 3, t: "Sering" }, { v: 4, t: "Sangat sering" }];
export const PR_AGREE = [{ v: 3, t: "Sangat sesuai" }, { v: 2, t: "Sesuai" }, { v: 1, t: "Kurang sesuai" }, { v: 0, t: "Tidak sesuai" }];
const ASK_FREQ = "Seberapa sering ini terjadi dalam 3 bulan terakhir?", ASK_AGREE = "Seberapa sesuai ini denganmu?";

// k: korban | pelaku | saksi | iklim. form = bentuk perundungan. serious = ancaman atau kekerasan fisik.
// passive = perilaku saksi yang membiarkan. neg = butir iklim berkode terbalik (skor 3 - jawaban). id = penanda khusus.
const it = (k, text, extra = {}) => ({ k, text, ...extra });
export const PR_ITEMS = [
  // Mengalami (nomor 1-10)
  it("korban", "Ada teman yang mengejek atau menghinaku.", { form: "Ejekan" }),
  it("korban", "Aku diberi julukan yang menyakitkan hati.", { form: "Julukan" }),
  it("korban", "Aku ditertawakan atau dipermalukan di depan orang banyak.", { form: "Dipermalukan" }),
  it("korban", "Teman-teman sengaja menjauhiku atau mengucilkanku.", { form: "Dikucilkan" }),
  it("korban", "Aku sengaja tidak diajak saat ada kegiatan kelompok.", { form: "Tidak diajak" }),
  it("korban", "Ada teman yang mengancam atau menakut-nakutiku.", { form: "Ancaman", serious: true }),
  it("korban", "Aku dipukul, ditendang, didorong, atau disakiti secara fisik.", { form: "Kekerasan fisik", serious: true }),
  it("korban", "Barang-barangku diambil, disembunyikan, atau dirusak dengan sengaja.", { form: "Barang diambil atau dirusak" }),
  it("korban", "Orang menyebarkan gosip atau cerita bohong tentang aku.", { form: "Gosip" }),
  it("korban", "Aku dihina atau dipermalukan lewat HP, media sosial, atau grup chat.", { form: "Perundungan daring" }),
  // Melakukan (11-20)
  it("pelaku", "Aku mengejek atau menghina teman.", { form: "Ejekan" }),
  it("pelaku", "Aku memberi julukan yang menyakitkan kepada teman.", { form: "Julukan" }),
  it("pelaku", "Aku menertawakan atau mempermalukan teman di depan orang lain.", { form: "Dipermalukan" }),
  it("pelaku", "Aku sengaja menjauhi atau mengucilkan teman.", { form: "Dikucilkan" }),
  it("pelaku", "Aku mengajak orang lain agar tidak berteman dengan seseorang.", { form: "Tidak diajak" }),
  it("pelaku", "Aku mengancam atau menakut-nakuti teman.", { form: "Ancaman", serious: true }),
  it("pelaku", "Aku memukul, menendang, mendorong, atau menyakiti teman secara fisik.", { form: "Kekerasan fisik", serious: true }),
  it("pelaku", "Aku mengambil, menyembunyikan, atau merusak barang teman dengan sengaja.", { form: "Barang diambil atau dirusak" }),
  it("pelaku", "Aku menyebarkan gosip atau cerita yang mempermalukan teman.", { form: "Gosip" }),
  it("pelaku", "Aku menghina atau mempermalukan teman lewat HP, media sosial, atau grup chat.", { form: "Perundungan daring" }),
  // Menyaksikan (21-30)
  it("saksi", "Aku melihat teman diejek atau dihina.", { form: "Ejekan" }),
  it("saksi", "Aku melihat teman ditertawakan atau dipermalukan di depan banyak orang.", { form: "Dipermalukan" }),
  it("saksi", "Aku melihat teman sengaja dijauhi atau dikucilkan.", { form: "Dikucilkan" }),
  it("saksi", "Aku melihat teman diancam atau ditakut-takuti.", { form: "Ancaman", serious: true }),
  it("saksi", "Aku melihat teman dipukul, ditendang, atau disakiti secara fisik.", { form: "Kekerasan fisik", serious: true }),
  it("saksi", "Aku melihat barang teman diambil atau dirusak dengan sengaja.", { form: "Barang diambil atau dirusak" }),
  it("saksi", "Aku tahu ada gosip atau cerita bohong yang disebarkan tentang teman.", { form: "Gosip" }),
  it("saksi", "Aku melihat teman dihina di media sosial atau grup chat.", { form: "Perundungan daring" }),
  it("saksi", "Aku ikut tertawa saat ada teman yang sedang dihina.", { passive: true, label: "ikut tertawa" }),
  it("saksi", "Aku diam saja walau tahu ada teman yang sedang dirundung.", { passive: true, label: "diam saja" }),
  // Iklim sekolah (31-40), skala kesesuaian
  it("iklim", "Aku merasa aman saat berada di sekolah.", { id: "aman" }),
  it("iklim", "Teman-teman di kelas menghargai aku."),
  it("iklim", "Aku nyaman menyampaikan pendapat di kelas."),
  it("iklim", "Aku punya teman yang bisa kupercaya."),
  it("iklim", "Ada siswa tertentu yang membuatku takut.", { neg: true, id: "takut" }),
  it("iklim", "Aku takut menjadi bahan ejekan teman.", { neg: true }),
  it("iklim", "Ada tempat di sekolah yang kuhindari karena merasa tidak aman.", { neg: true, id: "hindari" }),
  it("iklim", "Aku tahu kepada siapa aku bisa melapor kalau terjadi perundungan.", { id: "lapor" }),
  it("iklim", "Aku yakin guru BK akan menolongku kalau aku melaporkan perundungan.", { id: "percaya" }),
  it("iklim", "Aku berani menolong teman yang dirundung dengan cara yang aman.", { id: "bela" }),
].map((x) => ({ ...x, options: x.k === "iklim" ? PR_AGREE : PR_FREQ, ask: x.k === "iklim" ? ASK_AGREE : ASK_FREQ }));

const idx = (f) => PR_ITEMS.map((x, i) => [x, i]).filter(([x]) => f(x)).map(([, i]) => i);
export const PR_IDX = {
  korban: idx((x) => x.k === "korban"), pelaku: idx((x) => x.k === "pelaku"), witness: idx((x) => x.k === "saksi" && !x.passive),
  passive: idx((x) => x.passive), iklim: idx((x) => x.k === "iklim"), at: (id) => PR_ITEMS.findIndex((x) => x.id === id),
};
export const PR_FORMS = PR_IDX.korban.map((i) => PR_ITEMS[i].form);

// Klasifikasi mengikuti batas Solberg & Olweus (2003): mengalami atau melakukan perundungan bila setidaknya satu
// bentuk terjadi "kadang-kadang" atau lebih dalam periode pengukuran (kira-kira 2-3 kali sebulan); "jarang" = pantau.
// Ancaman atau kekerasan fisik, walau hanya "jarang", langsung didahulukan (perlu perhatian segera) demi keselamatan. Rasa aman = rata-rata 10 butir iklim (3 butir dibalik), 0-3.
export function prProfile(a) {
  const val = (i) => Number(a?.[i]) || 0, mx = (ids) => Math.max(0, ...ids.map(val));
  const adj = (i) => (PR_ITEMS[i].neg ? 3 - val(i) : val(i));
  const serious = (k) => idx((x) => x.k === k && x.serious).some((i) => val(i) >= 1);
  const sv = (k, form) => val(PR_ITEMS.findIndex((x) => x.k === k && x.form === form));
  const level = (ids, ser) => (ser ? "didahulukan" : mx(ids) >= 2 ? "perlu" : mx(ids) >= 1 ? "pantau" : "");
  const victim = level(PR_IDX.korban, serious("korban"));
  const doerRaw = level(PR_IDX.pelaku, serious("pelaku")), doer = doerRaw === "didahulukan" ? "perlu" : doerRaw;
  const wmax = mx(PR_IDX.witness);
  const safe = PR_IDX.iklim.reduce((t, i) => t + adj(i), 0) / PR_IDX.iklim.length;
  const at = (id) => PR_IDX.at(id);
  return {
    victim, doer, both: ["didahulukan", "perlu"].includes(victim) && doer === "perlu",
    forms: PR_IDX.korban.filter((i) => val(i) >= 2).map((i) => PR_ITEMS[i].form),
    doForms: PR_IDX.pelaku.filter((i) => val(i) >= 2).map((i) => PR_ITEMS[i].form),
    witness: mx(PR_IDX.witness) >= 2, witnessSerious: idx((x) => x.k === "saksi" && x.serious).some((i) => val(i) >= 2),
    passive: mx(PR_IDX.passive) >= 2 ? "perlu" : mx(PR_IDX.passive) >= 1 ? "pantau" : "",
    safe, lowSafe: safe < 1.5, unsafe: adj(at("aman")) <= 1, noReport: adj(at("lapor")) <= 1, noTrust: adj(at("percaya")) <= 1,
    canDefend: adj(at("bela")) >= 2, adj,
    doerSerious: doerRaw === "didahulukan", witLevel: wmax >= 3 ? 2 : wmax >= 2 ? 1 : 0,
    threatened: sv("korban", "Ancaman") >= 1, hurt: sv("korban", "Kekerasan fisik") >= 1, threatens: sv("pelaku", "Ancaman") >= 1, hurts: sv("pelaku", "Kekerasan fisik") >= 1,
    sums: { korban: PR_IDX.korban.reduce((s, i) => s + val(i), 0), pelaku: PR_IDX.pelaku.reduce((s, i) => s + val(i), 0), saksi: [...PR_IDX.witness, ...PR_IDX.passive].reduce((s, i) => s + val(i), 0), iklim: PR_IDX.iklim.reduce((s, i) => s + (3 - adj(i)), 0) },
  };
}

// Hasil murid: empat bentuk pesan, tanpa skor dan tanpa label.
export function amanResult(a, name) {
  const p = prProfile(a);
  const victim = ["didahulukan", "perlu"].includes(p.victim) || (p.unsafe && p.lowSafe);
  const step = (t) => `<div class="gb-step"><p class="small">Langkah kecil</p><p>${t}</p></div>`;
  const eyebrow = `<p class="gb-eyebrow">Terima kasih sudah jujur, ${esc(name)}</p>`;
  if (victim) return `${eyebrow}<h1>Yang kamu alami bukan salahmu.</h1><p class="lead" style="margin-top:.6rem">Kamu berhak merasa aman di sekolah.</p>
    ${step("Ceritakan ke satu orang dewasa yang kamu percaya, minggu ini.")}
    ${talk(true, { cls: "gb-tips pink", title: "Kamu tidak sendirian.", intro: "Kalau kamu merasa tidak aman atau ingin menyakiti diri, bicara sekarang dengan orang dewasa yang kamu percaya." })}
    <p class="muted" style="margin-top:1rem">Gurumu mungkin mengajakmu mengobrol. Itu bukan karena kamu salah.</p>`;
  if (p.doer === "perlu") return `${eyebrow}<h1>Kamu berani mengakuinya.</h1><p class="lead" style="margin-top:.6rem">Kadang kita menyakiti orang lain, sengaja atau tidak. Kamu masih bisa memperbaikinya.</p>
    ${step("Minta maaf kepada teman yang kamu sakiti, atau bicarakan dengan guru BK bagaimana memperbaikinya.")}${talk(false)}
    <p class="muted" style="margin-top:1rem">Gurumu mungkin mengajakmu mengobrol. Tujuannya membantu, bukan menghukum.</p>`;
  if (p.witness || p.passive === "perlu") return `<p class="gb-eyebrow">Terima kasih, ${esc(name)}</p><h1>Kamu pernah melihat teman diganggu.</h1><p class="lead" style="margin-top:.6rem">Kamu bisa membantu tanpa membahayakan dirimu.</p>
    ${step("Temani teman yang diganggu, atau laporkan ke guru. Melapor bukan mengadu, tetapi melindungi.")}${talk(false)}`;
  return `<p class="gb-eyebrow">Terima kasih, ${esc(name)}</p><h1>Terima kasih sudah menjawab.</h1><p class="lead" style="margin-top:.6rem">Sekolah yang aman dibangun bersama. Kalau suatu saat kamu atau temanmu diganggu, ceritakan kepada guru.</p>
    ${step("Kalau melihat teman diganggu, temani dia dan laporkan ke guru.")}${talk(false)}`;
}
