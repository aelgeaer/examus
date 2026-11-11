// Perhitungan dan gambar gaya belajar, dipakai halaman murid (hasil pribadi) dan laporan guru.
import { GAYA_ITEMS, VAK, VAK_STUDENT } from "./data.js";

export const VAK_COLOR = { V: "#ffcf8f", A: "#9ccbf3", K: "#1565b8" };

// Ringkasan satu murid. Kombinasi bila dua gaya teratas selisih paling banyak 2 jawaban,
// seimbang bila ketiganya selisih paling banyak 1 jawaban.
export function gayaProfile(answers) {
  const c = { V: 0, A: 0, K: 0 }; GAYA_ITEMS.forEach((_, i) => answers?.[i] in c && c[answers[i]]++);
  const total = c.V + c.A + c.K || 1;
  const order = Object.keys(c).sort((a, b) => c[b] - c[a]);
  const even = c[order[0]] - c[order[2]] <= 1;
  const combo = !even && c[order[0]] - c[order[1]] <= 2;
  const top = even ? [] : combo ? [order[0], order[1]] : [order[0]];
  const pct = Object.fromEntries(order.map((k) => [k, Math.round((c[k] / total) * 100)]));
  const title = even ? "Seimbang" : top.map((k) => VAK[k]).join("–");
  const desc = even ? "Kamu nyaman belajar lewat melihat, mendengar, dan bergerak sekaligus."
    : combo ? `Kamu paling nyaman belajar lewat ${VAK_STUDENT[top[0]].verb}, juga lewat ${VAK_STUDENT[top[1]].verb}.`
    : `Kamu paling nyaman belajar lewat ${VAK_STUDENT[top[0]].verb}.`;
  return { c, pct, order, top, even, combo, title, desc, group: even ? "S" : top[0], tips: (even ? order : top).flatMap((k) => VAK_STUDENT[k].tips).slice(0, 4) };
}

// Donat tiga warna; c = jumlah per gaya (boleh jumlah satu murid atau seluruh kelas).
export function donut(c, label = "Perbandingan gaya belajar") {
  const total = c.V + c.A + c.K || 1, R = 100, cx = 120, cy = 120; let a0 = -Math.PI / 2;
  const arcs = ["V", "A", "K"].filter((k) => c[k] > 0).map((k) => {
    const a1 = a0 + (c[k] / total) * 2 * Math.PI, large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (a) => [cx + R * Math.cos(a), cy + R * Math.sin(a)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1); a0 = a1;
    return c[k] === total ? `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${VAK_COLOR[k]}"/>` : `<path d="M${cx} ${cy} L${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} Z" fill="${VAK_COLOR[k]}" stroke="#fff" stroke-width="3"/>`;
  }).join("");
  return `<svg class="donut" viewBox="0 0 240 240" role="img" aria-label="${label}"><circle cx="120" cy="120" r="116" fill="#cfe6fb"/>${arcs}<circle cx="120" cy="120" r="34" fill="#0c2340"/></svg>`;
}
