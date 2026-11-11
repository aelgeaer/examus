// Grafik kecil berbasis SVG.
import { esc } from "./util.js";

// Radar heksagon untuk enam bidang RIASEC (atau enam nilai apa pun).
// vals: { key: 0..1 }, keys: urutan sudut searah jarum jam mulai dari atas.
export function radar(vals, keys, labels, { bold = [], avg = null, size = 320, showLabels = true } = {}) {
  const pad = showLabels ? 90 : 14, W = size + pad * 2, H = size + (showLabels ? 70 : 28), cx = W / 2, cy = H / 2, R = size / 2 - 10;
  const pt = (i, f) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / keys.length; return [cx + R * f * Math.cos(a), cy + R * f * Math.sin(a)]; };
  const poly = (f) => keys.map((_, i) => pt(i, typeof f === "function" ? f(i) : f).map((v) => v.toFixed(1)).join(",")).join(" ");
  const grid = [1, 2 / 3, 1 / 3].map((f, j) => `<polygon points="${poly(f)}" fill="${j === 0 ? "#cfe6fb" : "none"}" stroke="#9ccbf3" stroke-width="1.2"/>`).join("");
  const spokes = keys.map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#9ccbf3" stroke-width="1"/>`; }).join("");
  const val = (v) => Math.max(0.04, Math.min(1, v || 0));
  const shape = `<polygon points="${poly((i) => val(vals[keys[i]]))}" fill="rgba(21,101,184,.28)" stroke="#1565b8" stroke-width="3" stroke-linejoin="round"/>`;
  const avgShape = avg ? `<polygon points="${poly((i) => val(avg[keys[i]]))}" fill="none" stroke="#0c2340" stroke-width="1.6" stroke-dasharray="5 4"/>` : "";
  const text = showLabels ? keys.map((k, i) => {
    const [x, y] = pt(i, 1.14), anchor = Math.abs(x - cx) < 4 ? "middle" : x > cx ? "start" : "end";
    return `<text x="${x.toFixed(1)}" y="${(y + (y < cy - 4 ? -2 : y > cy + 4 ? 14 : 5)).toFixed(1)}" text-anchor="${anchor}" font-size="15" fill="${bold.includes(k) ? "#0c2340" : "#47607c"}" font-weight="${bold.includes(k) ? 600 : 400}">${esc(labels[k])}</text>`;
  }).join("") : "";
  return `<svg class="radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik minat: ${keys.map((k) => `${labels[k]} ${Math.round((vals[k] || 0) * 100)}%`).join(", ")}">${grid}${spokes}${avgShape}${shape}${text}</svg>`;
}
