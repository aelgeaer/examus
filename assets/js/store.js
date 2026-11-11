// Lapisan data Examus: Supabase (database + login). Skema ada di supabase/schema.sql.
// Login memakai nama akun + kata sandi. Di balik layar nama akun dijadikan email
// "<nama akun>@<USERNAME_DOMAIN>" karena Supabase Auth mensyaratkan email.
import { CONFIG } from "./config.js";
import { SAMPLE_CLASS, SOCIO_VARIANTS, sampleSocioResponses, sampleGeneric } from "./data.js";
import { INSTR, sampleInstr } from "./instruments.js";

const DAY = 86400000;
const isOpen = (s) => !s.closed && Date.now() < new Date(s.closesAt).getTime();
const SAMPLE_SET = SOCIO_VARIANTS.find((v) => v.id === "simpel");
const INSTR_CFG = { "minat-karier": { scale: 5 }, emosi: { variant: "phq9" }, akpd: { jenjang: "smp", n: 60, ver: 2 }, aman: { n: 40 } };
const sampleConfig = (type) => (type === "sosiometri" ? { variant: SAMPLE_SET.id, name: SAMPLE_SET.name, maxPick: SAMPLE_SET.maxPick, reasons: true, questions: SAMPLE_SET.questions } : INSTR_CFG[type] || {});
const sampleAnswers = (type) => (type === "sosiometri" ? sampleSocioResponses(SAMPLE_SET.questions) : INSTR[type] && type !== "gaya-belajar" ? sampleInstr(type, sampleConfig(type), SAMPLE_CLASS.members) : sampleGeneric(type));

export const configured = Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);

async function makeSupabase() {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  const MSG = [
    [/Invalid login credentials/i, "Nama akun atau kata sandi tidak cocok."],
    [/at least 6 characters/i, "Kata sandi minimal 6 karakter."],
    [/Failed to fetch|NetworkError/i, "Tidak bisa terhubung ke server. Periksa koneksi internet Anda."],
  ];
  const fail = (error) => { const m = error.message || String(error); throw new Error((MSG.find(([re]) => re.test(m)) || [0, m])[1]); };
  const must = ({ data, error }) => { if (error) fail(error); return data; };
  const emailOf = (username) => `${String(username).trim().toLowerCase()}@${CONFIG.USERNAME_DOMAIN}`;

  // role = peran di sekolah (Guru BK dst.), kind = jenis akun (admin / guru / siswa).
  const prof = (p) => p && {
    id: p.id, username: p.username, kind: p.kind, isAdmin: p.kind === "admin", isSuper: p.kind === "admin" && !p.school_id,
    name: (p.name || "").toLocaleUpperCase("id-ID"), role: p.title || "", school: p.schools?.name || "", schoolId: p.school_id || null,
    onboarded: !!p.onboarded, mustChange: !!p.must_change, classId: p.class_id || null, memberNo: p.member_no ?? null,
  };
  const sess = (s) => s && { id: s.id, classId: s.class_id, className: s.class_name, code: s.code, type: s.type, config: s.config, roster: s.roster, closesAt: s.closes_at, closed: s.closed, createdAt: s.created_at, filledCount: s.responses?.[0]?.count ?? 0 };
  const cls = (c) => c && { id: c.id, name: c.name, members: c.members, schoolId: c.school_id, createdAt: c.created_at };
  const userId = async () => { const { data } = await sb.auth.getSession(); if (!data.session) throw new Error("Sesi masuk berakhir. Masuk lagi."); return data.session.user.id; };
  const PROFILE = "*, schools(name)";

  return {
    mode: "supabase",
    async me() {
      const { data } = await sb.auth.getSession();
      if (!data.session) return null;
      const p = must(await sb.from("profiles").select(PROFILE).eq("id", data.session.user.id).maybeSingle());
      if (!p) { await sb.auth.signOut(); return null; }   // akun sudah dihapus admin
      if (p.kind === "siswa") { await sb.auth.signOut(); return null; }   // akun murid versi lama tidak dipakai lagi
      return prof(p);
    },
    async signIn(username, pw) {
      must(await sb.auth.signInWithPassword({ email: emailOf(username), password: pw }));
      const u = await this.me();
      if (!u) throw new Error("Murid tidak perlu masuk. Buka link angket yang dibagikan gurumu.");
      return u;
    },
    // Guru mendaftar sendiri, lalu langsung masuk.
    async publicSchools() { return must(await sb.rpc("public_schools")); },
    async register({ username, password, name, schoolId }) {
      must(await sb.rpc("register_teacher", { p_username: username, p_password: password, p_name: String(name || "").trim().toLocaleUpperCase("id-ID"), p_school: schoolId }));
      return this.signIn(username, password);
    },
    async signOut() { await sb.auth.signOut(); },
    async changePassword(oldPw, newPw) { must(await sb.rpc("change_my_password", { p_old: oldPw, p_new: newPw })); },
    async updateProfile(patch) {
      const map = { name: "name", role: "title", onboarded: "onboarded" };
      const row = {};
      for (const [k, col] of Object.entries(map)) if (k in patch) row[col] = k === "name" ? String(patch[k] || "").trim().toLocaleUpperCase("id-ID") : patch[k];
      return prof(must(await sb.from("profiles").update(row).eq("id", await userId()).select(PROFILE).single()));
    },

    // Aturan akses database menentukan isinya: guru melihat kelas yang ia buat atau pegang,
    // admin semua kelas di sekolahnya. Menyimpan dan menghapus lewat fungsi server.
    async listClasses() { return must(await sb.from("classes").select("*").order("name")).map(cls); },
    async getClass(id) { return cls(must(await sb.from("classes").select("*").eq("id", id).maybeSingle())); },
    async saveClass({ id, schoolId, name, members, teachers }) {
      return must(await sb.rpc("save_class", { p_id: id || null, p_name: name, p_members: members, p_school: schoolId || null, p_teachers: teachers ?? null }));
    },
    async deleteClass(id) { must(await sb.rpc("delete_class", { p_id: id })); },
    async classTeachers(classId) { return must(await sb.from("class_teachers").select("teacher_id").eq("class_id", classId)).map((r) => r.teacher_id); },

    async listSessions() { return must(await sb.from("sessions").select("*, responses(count)").eq("owner", await userId()).order("created_at", { ascending: false })).map(sess); },
    async getSession(id) { return sess(must(await sb.from("sessions").select("*, responses(count)").eq("id", id).maybeSingle())); },
    async createSession({ classId, type, config, days, until }) {
      return sess(must(await sb.rpc("create_session", { p_class: classId, p_type: type, p_config: config, p_days: days || 14, p_until: until || null })));
    },
    async setClosed(id, closed) {
      const row = { closed };
      if (!closed) row.closes_at = new Date(Date.now() + 7 * DAY).toISOString();
      must(await sb.from("sessions").update(row).eq("id", id));
    },
    async deleteSession(id) { must(await sb.from("sessions").delete().eq("id", id)); },
    async listResponses(sessionId) { return must(await sb.from("responses").select("member_no, answers, created_at").eq("session_id", sessionId)).map((r) => ({ no: r.member_no, answers: r.answers, createdAt: r.created_at })); },
    async addSample(type) {
      return sess(must(await sb.rpc("create_sample", {
        p_type: type, p_config: sampleConfig(type), p_class_name: SAMPLE_CLASS.name, p_members: SAMPLE_CLASS.members,
        p_rows: sampleAnswers(type).map((r) => ({ no: r.no, answers: r.answers })),
      })));
    },

    // Angket sosiometri buatan guru (hanya pemiliknya yang bisa melihat dan mengubah).
    async listQuestionnaires() { return must(await sb.from("questionnaires").select("id, name, config, created_at").eq("owner", await userId()).order("created_at", { ascending: false })); },
    async getQuestionnaire(id) { return must(await sb.from("questionnaires").select("id, name, config").eq("id", id).maybeSingle()); },
    async saveQuestionnaire({ id, name, config }) {
      if (id) return must(await sb.from("questionnaires").update({ name, config }).eq("id", id).select("id").single());
      return must(await sb.from("questionnaires").insert({ name, config }).select("id").single());
    },
    async deleteQuestionnaire(id) { must(await sb.from("questionnaires").delete().eq("id", id)); },

    // Murid (lewat link, tanpa akun)
    async publicSession(code) { return must(await sb.rpc("session_public", { p_code: code })); },
    async submit(code, no, answers) { must(await sb.rpc("submit_response", { p_code: code, p_no: no, p_answers: answers })); },

    // Admin
    async admin() { return must(await sb.rpc("admin_overview")); },
    async adminUsers() { return must(await sb.rpc("admin_users")); },
    async adminClasses() { return this.listClasses(); },
    async adminCreateUser(u) {
      return must(await sb.rpc("admin_create_user", { p_username: u.username, p_password: u.password, p_name: String(u.name || "").trim().toLocaleUpperCase("id-ID"), p_kind: u.kind, p_school: u.schoolId || null, p_title: u.title || null, p_class: null, p_member: null }));
    },
    async adminSetPassword(id, pw) { must(await sb.rpc("admin_set_password", { p_user: id, p_password: pw })); },
    async adminDeleteUser(id) { must(await sb.rpc("admin_delete_user", { p_user: id })); },
    async schools() { return must(await sb.from("schools").select("id, name").order("name")); },
    async saveSchool({ id, name }) {
      if (id) must(await sb.from("schools").update({ name }).eq("id", id));
      else must(await sb.from("schools").insert({ name }));
    },
  };
}

export const store = configured ? await makeSupabase() : null;
export { isOpen };
