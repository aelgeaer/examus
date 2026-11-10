// Lapisan data Examus. Dua adaptor dengan antarmuka yang sama:
//  - lokal    : localStorage di browser ini (tanpa server, untuk mencoba)
//  - supabase : database + login sungguhan (aktif bila config.js diisi)
import { CONFIG } from "./config.js";
import { uid, makeCode, sha256 } from "./util.js";
import { SAMPLE_CLASS, SOCIO_VARIANTS, sampleSocioResponses, sampleGeneric } from "./data.js";

const DAY = 86400000;
const isOpen = (s) => !s.closed && Date.now() < new Date(s.closesAt).getTime();
const sampleConfig = (type) => (type === "sosiometri" ? { variant: "ringkas", maxPick: 3, questions: SOCIO_VARIANTS[0].questions } : {});
const sampleAnswers = (type) => (type === "sosiometri" ? sampleSocioResponses() : sampleGeneric(type));

/* ------------------------------------------------------------------ */
/* Adaptor lokal                                                       */
/* ------------------------------------------------------------------ */
function makeLocal() {
  const KEY = "examus:v1";
  const ADMIN = { email: "admin@examus.local", hash: "bf3260efedf65c716d52ae36a4a5da0fe0f8c954096007f0898df19cc77f0b3d" };
  const load = () => {
    let db;
    try { db = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { db = null; }
    db ||= { users: [], classes: [], sessions: [], responses: [], me: null };
    if (!db.users.some((u) => u.email === ADMIN.email)) {
      db.users.push({ id: "admin", email: ADMIN.email, hash: ADMIN.hash, name: "Admin Examus", role: "Admin", school: "", city: "", isAdmin: true, onboarded: true, createdAt: new Date().toISOString() });
    }
    return db;
  };
  const save = (db) => localStorage.setItem(KEY, JSON.stringify(db));
  const hashOf = (email, pw) => sha256("examus|" + email.toLowerCase().trim() + "|" + pw);
  const pub = (u) => u && { id: u.id, email: u.email, name: u.name || "", role: u.role || "", school: u.school || "", city: u.city || "", isAdmin: !!u.isAdmin, onboarded: !!u.onboarded, letterhead: u.letterhead || "" };
  const need = (db) => { const u = db.users.find((x) => x.id === db.me); if (!u) throw new Error("Sesi masuk berakhir. Masuk lagi."); return u; };
  const withCount = (db, s) => ({ ...s, filledCount: db.responses.filter((r) => r.sessionId === s.id).length });

  return {
    mode: "lokal",
    async me() { const db = load(); return pub(db.users.find((u) => u.id === db.me)); },
    async signIn(email, pw) {
      const db = load(); email = email.toLowerCase().trim();
      const u = db.users.find((x) => x.email === email);
      if (!u || u.hash !== (await hashOf(email, pw))) throw new Error("Email atau kata sandi tidak cocok.");
      db.me = u.id; save(db); return pub(u);
    },
    async signUp(email, pw) {
      const db = load(); email = email.toLowerCase().trim();
      if (db.users.some((x) => x.email === email)) throw new Error("Email ini sudah terdaftar. Pilih Masuk.");
      const u = { id: uid(), email, hash: await hashOf(email, pw), name: "", onboarded: false, createdAt: new Date().toISOString() };
      db.users.push(u); db.me = u.id; save(db); return pub(u);
    },
    async signOut() { const db = load(); db.me = null; save(db); },
    async updateProfile(patch) {
      const db = load(); const u = need(db);
      for (const k of ["name", "role", "school", "city", "onboarded", "letterhead"]) if (k in patch) u[k] = patch[k];
      save(db); return pub(u);
    },
    async listClasses() { const db = load(); const u = need(db); return db.classes.filter((c) => c.owner === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
    async getClass(id) { const db = load(); const u = need(db); return db.classes.find((c) => c.id === id && c.owner === u.id) || null; },
    async saveClass({ id, name, members }) {
      const db = load(); const u = need(db);
      let c = id && db.classes.find((x) => x.id === id && x.owner === u.id);
      if (c) { c.name = name; c.members = members; }
      else { c = { id: uid(), owner: u.id, name, members, createdAt: new Date().toISOString() }; db.classes.push(c); }
      save(db); return c;
    },
    async deleteClass(id) { const db = load(); const u = need(db); db.classes = db.classes.filter((c) => !(c.id === id && c.owner === u.id)); save(db); },
    async listSessions() { const db = load(); const u = need(db); return db.sessions.filter((s) => s.owner === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((s) => withCount(db, s)); },
    async getSession(id) { const db = load(); const u = need(db); const s = db.sessions.find((x) => x.id === id && (x.owner === u.id || u.isAdmin)); return s ? withCount(db, s) : null; },
    async createSession({ classId, type, config, days }) {
      const db = load(); const u = need(db);
      const c = db.classes.find((x) => x.id === classId && x.owner === u.id);
      if (!c) throw new Error("Daftar kelas tidak ditemukan.");
      const s = { id: uid(), owner: u.id, classId, className: c.name, code: makeCode(), type, config, roster: c.members, closesAt: new Date(Date.now() + days * DAY).toISOString(), closed: false, createdAt: new Date().toISOString() };
      db.sessions.push(s); save(db); return s;
    },
    async setClosed(id, closed) { const db = load(); const u = need(db); const s = db.sessions.find((x) => x.id === id && x.owner === u.id); if (s) { s.closed = closed; if (!closed && Date.now() > new Date(s.closesAt)) s.closesAt = new Date(Date.now() + 7 * DAY).toISOString(); save(db); } },
    async deleteSession(id) { const db = load(); const u = need(db); db.sessions = db.sessions.filter((s) => !(s.id === id && s.owner === u.id)); db.responses = db.responses.filter((r) => r.sessionId !== id); save(db); },
    async listResponses(sessionId) { const db = load(); need(db); return db.responses.filter((r) => r.sessionId === sessionId).map((r) => ({ no: r.no, answers: r.answers, createdAt: r.createdAt })); },
    async publicSession(code) {
      const db = load(); const s = db.sessions.find((x) => x.code === code);
      if (!s) return null;
      return { code, type: s.type, className: s.className, config: s.config, roster: s.roster.map((m) => ({ no: m.no, name: m.name })), filled: db.responses.filter((r) => r.sessionId === s.id).map((r) => r.no), open: isOpen(s) };
    },
    async submit(code, no, answers) {
      const db = load(); const s = db.sessions.find((x) => x.code === code);
      if (!s) throw new Error("Link tidak ditemukan.");
      if (!isOpen(s)) throw new Error("Pengisian sudah ditutup.");
      if (!s.roster.some((m) => m.no === no)) throw new Error("Nama tidak ada di daftar kelas.");
      if (db.responses.some((r) => r.sessionId === s.id && r.no === no)) throw new Error("Nama ini sudah mengisi.");
      db.responses.push({ id: uid(), sessionId: s.id, no, answers, createdAt: new Date().toISOString() }); save(db);
    },
    async addSample(type) {
      const u0 = need(load());
      let c = (await this.listClasses()).find((x) => x.name === SAMPLE_CLASS.name);
      if (!c) c = await this.saveClass({ name: SAMPLE_CLASS.name, members: SAMPLE_CLASS.members });
      const s = await this.createSession({ classId: c.id, type, config: sampleConfig(type), days: 14 });
      const db = load();
      for (const r of sampleAnswers(type)) db.responses.push({ id: uid(), sessionId: s.id, no: r.no, answers: r.answers, createdAt: new Date().toISOString() });
      save(db); void u0; return s;
    },
    async admin() {
      const db = load(); const u = need(db);
      if (!u.isAdmin) throw new Error("Halaman ini hanya untuk admin.");
      const emailOf = (id) => db.users.find((x) => x.id === id)?.email || "-";
      return {
        totals: { users: db.users.length, classes: db.classes.length, sessions: db.sessions.length, responses: db.responses.length },
        users: db.users.map((x) => ({ email: x.email, name: x.name, role: x.role, school: x.school, city: x.city, isAdmin: !!x.isAdmin, createdAt: x.createdAt, sessions: db.sessions.filter((s) => s.owner === x.id).length })),
        sessions: db.sessions.map((s) => ({ id: s.id, className: s.className, type: s.type, owner: emailOf(s.owner), total: s.roster.length, filled: db.responses.filter((r) => r.sessionId === s.id).length, createdAt: s.createdAt, open: isOpen(s) })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      };
    },
  };
}

/* ------------------------------------------------------------------ */
/* Adaptor Supabase (skema di supabase/schema.sql)                     */
/* ------------------------------------------------------------------ */
async function makeSupabase() {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  const MSG = [
    [/Invalid login credentials/i, "Email atau kata sandi tidak cocok."],
    [/already registered/i, "Email ini sudah terdaftar. Pilih Masuk."],
    [/Email not confirmed/i, "Email belum dikonfirmasi. Buka link di kotak masuk Anda."],
    [/at least 6 characters/i, "Kata sandi minimal 6 karakter."],
  ];
  const fail = (error) => { const m = error.message || String(error); throw new Error((MSG.find(([re]) => re.test(m)) || [0, m])[1]); };
  const must = ({ data, error }) => { if (error) fail(error); return data; };
  const prof = (p) => p && { id: p.id, email: p.email, name: p.name || "", role: p.role || "", school: p.school || "", city: p.city || "", isAdmin: !!p.is_admin, onboarded: !!p.onboarded, letterhead: p.letterhead || "" };
  const sess = (s) => s && { id: s.id, classId: s.class_id, className: s.class_name, code: s.code, type: s.type, config: s.config, roster: s.roster, closesAt: s.closes_at, closed: s.closed, createdAt: s.created_at, filledCount: s.responses?.[0]?.count ?? 0 };
  const cls = (c) => c && { id: c.id, name: c.name, members: c.members, createdAt: c.created_at };
  const userId = async () => { const { data } = await sb.auth.getSession(); if (!data.session) throw new Error("Sesi masuk berakhir. Masuk lagi."); return data.session.user.id; };

  return {
    mode: "supabase",
    async me() {
      const { data } = await sb.auth.getSession();
      if (!data.session) return null;
      return prof(must(await sb.from("profiles").select("*").eq("id", data.session.user.id).maybeSingle())) || { id: data.session.user.id, email: data.session.user.email, name: "", onboarded: false };
    },
    async signIn(email, pw) { must(await sb.auth.signInWithPassword({ email, password: pw })); return this.me(); },
    async signUp(email, pw) {
      const data = must(await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: location.origin + location.pathname } }));
      if (!data.session) throw new Error("Akun dibuat. Buka email Anda dan klik link konfirmasi, lalu masuk.");
      return this.me();
    },
    async signOut() { await sb.auth.signOut(); },
    async updateProfile(patch) {
      const row = {};
      for (const k of ["name", "role", "school", "city", "onboarded", "letterhead"]) if (k in patch) row[k] = patch[k];
      return prof(must(await sb.from("profiles").update(row).eq("id", await userId()).select().single()));
    },
    async listClasses() { return must(await sb.from("classes").select("*").eq("owner", await userId()).order("created_at", { ascending: false })).map(cls); },
    async getClass(id) { return cls(must(await sb.from("classes").select("*").eq("id", id).maybeSingle())); },
    async saveClass({ id, name, members }) {
      if (id) return cls(must(await sb.from("classes").update({ name, members }).eq("id", id).select().single()));
      return cls(must(await sb.from("classes").insert({ name, members }).select().single()));
    },
    async deleteClass(id) { must(await sb.from("classes").delete().eq("id", id)); },
    async listSessions() { return must(await sb.from("sessions").select("*, responses(count)").eq("owner", await userId()).order("created_at", { ascending: false })).map(sess); },
    async getSession(id) { return sess(must(await sb.from("sessions").select("*, responses(count)").eq("id", id).maybeSingle())); },
    async createSession({ classId, type, config, days }) {
      const c = await this.getClass(classId);
      if (!c) throw new Error("Daftar kelas tidak ditemukan.");
      return sess(must(await sb.from("sessions").insert({ class_id: classId, class_name: c.name, code: makeCode(), type, config, roster: c.members, closes_at: new Date(Date.now() + days * DAY).toISOString() }).select().single()));
    },
    async setClosed(id, closed) {
      const row = { closed };
      if (!closed) row.closes_at = new Date(Date.now() + 7 * DAY).toISOString();
      must(await sb.from("sessions").update(row).eq("id", id));
    },
    async deleteSession(id) { must(await sb.from("sessions").delete().eq("id", id)); },
    async listResponses(sessionId) { return must(await sb.from("responses").select("member_no, answers, created_at").eq("session_id", sessionId)).map((r) => ({ no: r.member_no, answers: r.answers, createdAt: r.created_at })); },
    async publicSession(code) { return must(await sb.rpc("session_public", { p_code: code })); },
    async submit(code, no, answers) { must(await sb.rpc("submit_response", { p_code: code, p_no: no, p_answers: answers })); },
    async addSample(type) {
      let c = (await this.listClasses()).find((x) => x.name === SAMPLE_CLASS.name);
      if (!c) c = await this.saveClass({ name: SAMPLE_CLASS.name, members: SAMPLE_CLASS.members });
      const s = await this.createSession({ classId: c.id, type, config: sampleConfig(type), days: 14 });
      for (const r of sampleAnswers(type)) await this.submit(s.code, r.no, r.answers);
      return s;
    },
    async admin() { return must(await sb.rpc("admin_overview")); },
  };
}

export const store = CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY ? await makeSupabase() : makeLocal();
export { isOpen };
