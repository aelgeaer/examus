export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let toastTimer;
export function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));

export function makeCode(len = 10) {
  const abc = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return [...buf].map((n) => abc[n % abc.length]).join("");
}

export async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const fmtDate = (d, withTime = false) => {
  const date = new Date(d);
  const opt = { weekday: "long", day: "numeric", month: "long" };
  let s = date.toLocaleDateString("id-ID", opt);
  if (withTime) s += " pukul " + date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");
  return s;
};
export const fmtShort = (d) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "";

export function download(filename, content, mime = "text/plain") {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function toCSV(rows) {
  const cell = (v) => {
    const s = String(v ?? "");
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
}

/* Membaca daftar nama yang ditempel dari Excel / WhatsApp.
   Mengenali nomor urut di depan dan penanda L/P di kolom mana pun. */
export function parseRoster(text) {
  const out = [];
  for (const raw of String(text || "").split(/\r?\n/)) {
    let line = raw.replace(/ /g, " ").trim();
    if (!line) continue;
    if (/^(no\.?|nomor)?[\s\t;,|]*nama\b/i.test(line)) continue; // baris judul tabel
    let parts = line.split(/\t|;|\s{2,}|,/).map((p) => p.trim()).filter(Boolean);
    let g = "";
    parts = parts.filter((p) => {
      const m = p.match(/^(l|p|laki-?laki|perempuan|pria|wanita|lk|pr)\.?$/i);
      if (m) { g = /^(l|laki|pria|lk)/i.test(p) ? "L" : "P"; return false; }
      return true;
    });
    parts = parts.filter((p) => !/^\d+[.)]?$/.test(p));
    let name = parts.join(" ").replace(/^\d+\s*[.)\-]?\s*/, "").trim();
    const tail = name.match(/^(.*\S)\s+\(?([LlPp])\)?$/);
    if (!g && tail) { name = tail[1]; g = tail[2].toUpperCase(); }
    name = name.replace(/^[-•*]\s*/, "").trim();
    if (!name || /^(no\.?|nama|nama lengkap|nama siswa|l\/p|jk)$/i.test(name)) continue;
    out.push({ name, g });
  }
  return out;
}

export const go = (path) => { location.hash = "#" + path; };

// Halaman awal setelah masuk, sesuai jenis akun.
export const homePath = (user) => (!user ? "/masuk" : user.kind === "siswa" ? "/siswa" : user.isSuper ? "/admin" : "/dasbor");

// Kata sandi acak 8 karakter tanpa huruf yang mudah tertukar (l, i, o, 0, 1).
export function genPassword(len = 8) {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return [...buf].map((n) => abc[n % abc.length]).join("");
}

// Nama akun usulan dari nama lengkap: "Arya Wibowo" -> "arya.wibowo".
export const suggestUsername = (name) => String(name || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, "")).filter(Boolean).slice(0, 2).join(".");
