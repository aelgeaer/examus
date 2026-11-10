import { esc, firstName } from "./util.js";

const INK = "#0c2340";
const WEIGHTS = [3, 2, 1, 1, 1];

/* Menghitung indeks sosiometri dari pilihan murid.
   members: [{no,name,g}], picks: {no: [no, no, ...]} (berurutan), filled: Set nomor yang sudah mengisi */
export function analyze(members, picks, filled) {
  const nos = new Set(members.map((m) => m.no));
  const clean = {};
  for (const m of members) {
    const seen = new Set();
    clean[m.no] = (picks[m.no] || []).map(Number).filter((x) => nos.has(x) && x !== m.no && !seen.has(x) && seen.add(x));
  }
  const rows = members.map((m) => ({ ...m, count: 0, score: 0, picks: clean[m.no], pickedBy: [], filled: filled.has(m.no) }));
  const byNo = new Map(rows.map((r) => [r.no, r]));
  for (const r of rows) r.picks.forEach((b, i) => { const t = byNo.get(b); t.count++; t.score += WEIGHTS[i] || 1; t.pickedBy.push(r.no); });
  const N = members.length;
  const mutual = [];
  for (const r of rows) for (const b of r.picks) if (r.no < b && clean[b].includes(r.no)) mutual.push([r.no, b]);
  const mset = new Set(mutual.map(([a, b]) => a + "-" + b));
  for (const r of rows) {
    r.index = N > 1 ? r.count / (N - 1) : 0;
    r.mutualWith = r.picks.filter((b) => mset.has(Math.min(r.no, b) + "-" + Math.max(r.no, b)));
    r.status = r.count === 0 ? "Belum dipilih" : r.index >= 0.5 ? "Paling banyak dipilih" : r.index >= 0.2 ? "Sering dipilih" : "Dipilih beberapa teman";
  }
  const maxCount = Math.max(0, ...rows.map((r) => r.count));
  const top = rows.filter((r) => r.count === maxCount && maxCount >= 2);
  return {
    rows, byNo, mutual, N, maxCount,
    star: top.length === 1 ? top[0] : null,
    isolates: rows.filter((r) => r.count === 0),
    unfilled: rows.filter((r) => !r.filled),
    oneWay: rows.filter((r) => r.filled && r.picks.length > 0 && r.mutualWith.length === 0),
    isMutual: (a, b) => mset.has(Math.min(a, b) + "-" + Math.max(a, b)),
  };
}

function layout(an) {
  const { rows, star, mutual, byNo } = an;
  const others = rows.filter((r) => r !== star);
  // Lingkaran ditentukan oleh peringkat: sekitar 20% teratas di lingkaran 1, 30% berikutnya di lingkaran 2, sisanya di lingkaran 3.
  const ranked = others.filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
  const ringByCount = new Map();
  ranked.forEach((r, i) => { if (!ringByCount.has(r.count)) { const f = i / ranked.length; ringByCount.set(r.count, f < 0.2 ? 1 : f < 0.5 ? 2 : 3); } });
  const ringOf = (r) => (r.count === 0 ? 4 : ringByCount.get(r.count));
  // Urutan sudut: kelompok yang saling memilih diletakkan berdekatan.
  const adj = new Map(others.map((r) => [r.no, []]));
  for (const [a, b] of mutual) if (adj.has(a) && adj.has(b)) { adj.get(a).push(b); adj.get(b).push(a); }
  const seen = new Set(), comps = [];
  for (const r of others) {
    if (seen.has(r.no) || adj.get(r.no).length === 0) continue;
    const comp = [], stack = [r.no];
    while (stack.length) { const x = stack.pop(); if (seen.has(x)) continue; seen.add(x); comp.push(x); for (const y of adj.get(x)) if (!seen.has(y)) stack.push(y); }
    comps.push(comp);
  }
  comps.sort((a, b) => b.length - a.length || a[0] - b[0]);
  const order = comps.flat();
  for (const r of others) {
    if (seen.has(r.no)) continue;
    const anchor = r.picks.find((p) => order.includes(p));
    if (anchor != null) order.splice(order.indexOf(anchor) + 1, 0, r.no); else order.push(r.no);
    seen.add(r.no);
  }
  const M = order.length || 1;
  const nodeR = Math.max(13, Math.min(22, 500 / Math.max(M, 1)));
  const RAD = [0, 178, 275, 362, 438];
  const pos = new Map();
  if (star) pos.set(star.no, { x: 500, y: 500, ring: 0 });
  const perRing = {};
  order.forEach((no, i) => {
    const ring = ringOf(byNo.get(no));
    (perRing[ring] ||= []).push({ no, ang: (i * 2 * Math.PI) / M });
  });
  for (const key of Object.keys(perRing)) {
    const ring = Number(key), list = perRing[key], r0 = RAD[ring], n = list.length;
    const minGap = (2 * nodeR + 14) / r0;
    const crowded = n * minGap > 2 * Math.PI;
    if (crowded) list.forEach((it, i) => (it.ang = list[0].ang + (i * 2 * Math.PI) / n));
    else if (n > 1) {
      // Geser simbol yang terlalu rapat sampai jaraknya cukup, tanpa mengubah urutannya.
      for (let pass = 0; pass < 60; pass++) {
        let moved = false;
        for (let i = 0; i < n; i++) {
          const a = list[i], b = list[(i + 1) % n];
          let gap = b.ang - a.ang + (i === n - 1 ? 2 * Math.PI : 0);
          if (gap < minGap - 1e-4) { const d = (minGap - gap) / 2; a.ang -= d; b.ang += d; moved = true; }
        }
        if (!moved) break;
      }
    }
    list.forEach((it, i) => {
      const r = crowded ? r0 + (i % 2 ? 1 : -1) * (ring === 4 ? 14 : 24) : r0;
      const ang = it.ang - Math.PI / 2;
      pos.set(it.no, { x: 500 + r * Math.cos(ang), y: 500 + r * Math.sin(ang), ring });
    });
  }
  return { pos, nodeR };
}

function edgePath(p1, p2, R, arrow, isCenter) {
  const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
  let cx, cy;
  const dx = p2.x - p1.x, dy = p2.y - p1.y, dist = Math.hypot(dx, dy) || 1;
  if (isCenter) { cx = mx + (-dy / dist) * dist * 0.12; cy = my + (dx / dist) * dist * 0.12; }
  else { cx = mx + (500 - mx) * 0.18; cy = my + (500 - my) * 0.18; }
  const cut = (p, gap) => { const vx = cx - p.x, vy = cy - p.y, l = Math.hypot(vx, vy) || 1; return { x: p.x + (vx / l) * gap, y: p.y + (vy / l) * gap }; };
  const s = cut(p1, R + 3), e = cut(p2, R + (arrow ? 9 : 3));
  const f = (v) => v.toFixed(1);
  return `M${f(s.x)} ${f(s.y)}Q${f(cx)} ${f(cy)} ${f(e.x)} ${f(e.y)}`;
}

let seq = 0;
export function sociogramSVG(members, an, { names = false } = {}) {
  const id = "sg" + ++seq;
  const { pos, nodeR: R } = layout(an);
  const edges = [];
  for (const r of an.rows) {
    r.picks.forEach((b, i) => {
      const p1 = pos.get(r.no), p2 = pos.get(b);
      if (!p1 || !p2) return;
      const center = p1.ring === 0 || p2.ring === 0;
      if (an.isMutual(r.no, b)) {
        if (r.no > b) return;
        edges.push(`<path class="edge" data-a="${r.no}" data-b="${b}" data-m="1" d="${edgePath(p1, p2, R, false, center)}" stroke="${INK}" stroke-width="4.5" opacity=".85"/>`);
      } else {
        edges.push(`<path class="edge" data-a="${r.no}" data-b="${b}" d="${edgePath(p1, p2, R, true, center)}" stroke="${INK}" stroke-width="${i === 0 ? 2.4 : 1.2}" opacity="${i === 0 ? 0.7 : 0.42}" marker-end="url(#${id}-arr)"/>`);
      }
    });
  }
  const fs = (R * 0.82).toFixed(1);
  const nodes = an.rows.map((r) => {
    const p = pos.get(r.no);
    const fill = !r.filled ? "#e3e9ef" : an.star === r ? "#ffcf8f" : "#ffffff";
    const dash = r.filled ? "" : ' stroke-dasharray="5 4"';
    const shape = r.g === "L"
      ? `<rect class="shape" x="${-R}" y="${-R}" width="${2 * R}" height="${2 * R}" rx="${(R * 0.34).toFixed(1)}" fill="${fill}" stroke="${INK}" stroke-width="3"${dash}/>`
      : `<circle class="shape" r="${R}" fill="${fill}" stroke="${INK}" stroke-width="3"${dash}/>`;
    const label = `${r.no}. ${r.name}, dipilih ${r.count} kali${r.filled ? "" : ", belum mengisi"}`;
    return `<g class="node" data-no="${r.no}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})" role="button" tabindex="0" aria-pressed="false" aria-label="${esc(label)}">${shape}<text dy=".36em" text-anchor="middle" font-size="${fs}" font-weight="500" fill="${INK}" pointer-events="none">${r.no}</text><text class="label" y="${R + 15}" text-anchor="middle" font-size="15" fill="${INK}" stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round" pointer-events="none">${esc(firstName(r.name))}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" font-family="Onest, system-ui, sans-serif" role="group" aria-label="Sosiogram ${an.N} murid. Yang paling sering dipilih berada di tengah.">
<defs><marker id="${id}-arr" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="13" markerHeight="13" orient="auto"><path d="M0 1L10 5L0 9Z" fill="${INK}"/></marker></defs>
<circle cx="500" cy="500" r="476" fill="#cfe6fb"/><circle cx="500" cy="500" r="402" fill="#e6f2fd"/><circle cx="500" cy="500" r="320" fill="#cfe6fb"/><circle cx="500" cy="500" r="228" fill="#e6f2fd"/><circle cx="500" cy="500" r="122" fill="#ffffff"/>
<g fill="none" stroke-linecap="round">${edges.join("")}</g>${nodes}</svg>`;
}

export const LEGEND = `<figcaption class="sg-legend">
<span><svg viewBox="0 0 20 20" width="16" height="16"><rect x="2" y="2" width="16" height="16" rx="4" fill="#fff" stroke="${INK}" stroke-width="2"/></svg>Laki-laki</span>
<span><svg viewBox="0 0 20 20" width="16" height="16"><circle cx="10" cy="10" r="8" fill="#fff" stroke="${INK}" stroke-width="2"/></svg>Perempuan</span>
<span><svg viewBox="0 0 34 12" width="30" height="11"><path d="M2 6H32" stroke="${INK}" stroke-width="4.5"/></svg>Saling memilih</span>
<span><svg viewBox="0 0 34 12" width="30" height="11"><path d="M2 6H25" stroke="${INK}" stroke-width="2.4"/><path d="M24 1L33 6L24 11Z" fill="${INK}"/></svg>Pilihan pertama</span>
<span><svg viewBox="0 0 34 12" width="30" height="11"><path d="M2 6H25" stroke="${INK}" stroke-width="1.2"/><path d="M24 1L33 6L24 11Z" fill="${INK}"/></svg>Pilihan lain</span>
<span><svg viewBox="0 0 20 20" width="16" height="16"><circle cx="10" cy="10" r="8" fill="#ffcf8f" stroke="${INK}" stroke-width="2"/></svg>Paling banyak dipilih</span>
<span><svg viewBox="0 0 20 20" width="16" height="16"><circle cx="10" cy="10" r="8" fill="#e3e9ef" stroke="${INK}" stroke-width="2" stroke-dasharray="4 3"/></svg>Belum mengisi</span>
</figcaption>`;

const list = (an, nos) => nos.map((n) => firstName(an.byNo.get(n).name)).join(", ");

export function describe(an, row) {
  if (!row) {
    const iso = an.isolates;
    if (!iso.length) return `Semua murid dipilih oleh setidaknya satu teman. Ketuk satu murid untuk melihat pilihannya.`;
    return `Belum dipilih siapa pun: <strong>${esc(iso.map((r) => firstName(r.name)).join(", "))}</strong>. Mereka sebaiknya ditemui lebih dulu.`;
  }
  const a = row.picks.length ? `memilih ${esc(list(an, row.picks))}` : row.filled ? "tidak memilih siapa pun" : "belum mengisi";
  const b = row.pickedBy.length ? `dipilih oleh ${esc(list(an, row.pickedBy))}` : "belum dipilih siapa pun";
  const c = row.mutualWith.length ? ` Saling memilih dengan ${esc(list(an, row.mutualWith))}.` : "";
  return `<strong>${esc(row.name)}</strong> ${a}; ${b}.${c}`;
}

/* Memasang sosiogram interaktif ke dalam elemen. */
export function mountSociogram(el, members, an, { onFocus, legend = true, names = false } = {}) {
  el.innerHTML = `<figure class="sg${names ? " names" : ""}">${sociogramSVG(members, an)}${legend ? LEGEND : ""}</figure>`;
  const fig = el.firstElementChild;
  let current = null;
  const setFocus = (no) => {
    current = no === current ? null : no;
    fig.classList.toggle("focused", current != null);
    fig.querySelectorAll(".hot").forEach((x) => x.classList.remove("hot"));
    fig.querySelectorAll(".node").forEach((x) => x.setAttribute("aria-pressed", String(Number(x.dataset.no) === current)));
    if (current != null) {
      const hot = new Set([current]);
      fig.querySelectorAll(".edge").forEach((e) => {
        const a = Number(e.dataset.a), b = Number(e.dataset.b);
        if (a === current || b === current) { e.classList.add("hot"); hot.add(a); hot.add(b); }
      });
      fig.querySelectorAll(".node").forEach((x) => hot.has(Number(x.dataset.no)) && x.classList.add("hot"));
    }
    onFocus && onFocus(current != null ? an.byNo.get(current) : null);
  };
  fig.addEventListener("click", (ev) => {
    const node = ev.target.closest(".node");
    if (node) setFocus(Number(node.dataset.no)); else if (current != null) setFocus(current);
  });
  fig.addEventListener("keydown", (ev) => {
    const node = ev.target.closest(".node");
    if (node && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); setFocus(Number(node.dataset.no)); }
  });
  return { fig, clear: () => current != null && setFocus(current), toggleNames: (on) => fig.classList.toggle("names", on) };
}

export async function svgToPngBlob(svgEl, size = 1600) {
  const clone = svgEl.cloneNode(true);
  clone.querySelectorAll(".label").forEach((t) => (t.style.display = "block"));
  clone.setAttribute("width", size); clone.setAttribute("height", size);
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const c = document.createElement("canvas"); c.width = c.height = size;
  const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size); ctx.drawImage(img, 0, 0, size, size);
  return new Promise((res) => c.toBlob(res, "image/png"));
}
