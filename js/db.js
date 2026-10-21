// ============================================================
//  SKH Solutions — data layer
//  Talks to the server (server.js). Used by the Student Portal,
//  the Teacher Portal and the main website.
//  Every change is saved to data/db.json on the server, and other
//  open portals update live (Server-Sent Events).
// ============================================================

// Filled from the server after login: { "SKH-2026-0101": { name, level, campus, … } }
const STUDENTS = {};

const CAMPUS_ADDR = {
  "Gulshan": "A-292, Block 2, Gulshan-e-Iqbal",
  "Jauhar": "Near Al-Faizan CNG Pump, Block 14, Gulistan-e-Johar",
  "North": "North Nazimabad",
  "Bahadurabad": "371, Siraj-ud-Daula Road, Bahadurabad",
  "PECHS (Girls)": "PECHS — Girls' Campus",
  "Defence": "DHA / Defence",
};

// The founder is an admin and can see every class
const ADMINS = ["khurram"];

const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const uid = () => Math.random().toString(36).slice(2, 9);
const CLIENT_ID = uid() + uid(); // identifies this browser tab to the server

// ---------- small fetch helper ----------
async function api(method, url, body) {
  let r;
  try {
    r = await fetch(url, {
      method, credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Client": CLIENT_ID },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    const err = new Error(location.protocol === "file:"
      ? "Open the site through the server: run START-SERVER.bat, then go to http://localhost:3000"
      : "Can't reach the SKH server. Is it running?");
    err.offline = true; throw err;
  }
  let data = {};
  try { data = await r.json(); } catch (e) {}
  if (!r.ok) { const err = new Error(data.error || `Request failed (${r.status})`); err.status = r.status; throw err; }
  return data;
}

const FIELDS = ["tests", "tasks", "att", "remarks", "planner"];
const emptyPlanner = () => ({ subjects: [], months: {}, weeks: {}, todos: {}, check: {} });

const DB = {
  state: null,    // { me, settings, students:{id:{profile,tests,…}}, notices, log, enquiries?, teacherAccounts? }
  me: null,       // { role: "student"|"teacher"|"admin", id, name, mustChange }
  snap: {},       // last saved copy of each student record (to find what changed)
  noticeIds: new Set(),
  queue: Promise.resolve(),
  onError: null,  // pages set this to show save errors

  get settings() { return (this.state && this.state.settings) || { fees: {}, lateFee: 0, bank: "" }; },
  get FEE_PER_SUBJECT() { return this.settings.fees; },

  // ----- auth -----
  async whoami() {
    try { this.me = (await api("GET", "/api/me")).me; } catch (e) { if (e.offline) throw e; this.me = null; }
    return this.me;
  },
  async login(role, id, password) {
    this.me = (await api("POST", "/api/login", { role, id, password })).me;
    return this.me;
  },
  async logout() {
    try { await api("POST", "/api/logout"); } catch (e) {}
    this.me = null; this.state = null; this.snap = {};
    Object.keys(STUDENTS).forEach((k) => delete STUDENTS[k]);
    stopEvents();
  },
  async changePassword(oldPw, newPw) {
    await api("POST", "/api/me/password", { old: oldPw, new: newPw });
    if (this.me) this.me.mustChange = false;
    if (this.state) this.state.me.mustChange = false;
  },

  // ----- load everything this user may see -----
  async load() {
    await this.queue.catch(() => {}); // let pending saves finish first
    const s = await api("GET", "/api/state");
    this.state = s; this.me = s.me;
    Object.keys(STUDENTS).forEach((k) => delete STUDENTS[k]);
    Object.entries(s.students).forEach(([id, rec]) => {
      STUDENTS[id] = rec.profile;
      rec.planner = Object.assign(emptyPlanner(), rec.planner || {});
      rec.tests = rec.tests || []; rec.tasks = rec.tasks || []; rec.att = rec.att || {}; rec.remarks = rec.remarks || [];
    });
    this.snapshot();
    startEvents();
    return s;
  },
  snapshot() {
    this.snap = {};
    Object.entries(this.state.students).forEach(([id, rec]) => {
      this.snap[id] = Object.fromEntries(FIELDS.map((f) => [f, JSON.stringify(rec[f])]));
    });
    this.noticeIds = new Set(this.state.notices.map((n) => n.id));
  },

  // ----- save: send only what changed since the last save -----
  save() {
    if (!this.state) return Promise.resolve();
    const jobs = [];
    Object.entries(this.state.students).forEach(([id, rec]) => {
      const before = this.snap[id] || (this.snap[id] = {});
      const diff = {};
      FIELDS.forEach((f) => { const j = JSON.stringify(rec[f]); if (j !== before[f]) { diff[f] = rec[f]; before[f] = j; } });
      if (Object.keys(diff).length) jobs.push(() => api("PUT", `/api/students/${encodeURIComponent(id)}`, diff));
    });
    // notices added / removed locally
    const current = this.state.notices;
    current.filter((n) => !this.noticeIds.has(n.id)).forEach((n) => {
      const localId = n.id;
      this.noticeIds.add(localId);
      jobs.push(async () => {
        const r = await api("POST", "/api/notices", { t: n.t, body: n.body, tag: n.tag, to: n.to });
        this.noticeIds.delete(localId); n.id = r.notice.id; this.noticeIds.add(n.id);
      });
    });
    const ids = new Set(current.map((n) => n.id));
    [...this.noticeIds].filter((id) => !ids.has(id)).forEach((id) => {
      this.noticeIds.delete(id);
      jobs.push(() => api("DELETE", `/api/notices/${encodeURIComponent(id)}`));
    });
    if (!jobs.length) return this.queue;
    this.queue = this.queue.catch(() => {}).then(async () => { for (const j of jobs) await j(); return true; })
      .catch(async (e) => {
        if (this.onError) this.onError(e);
        return false; // resolved (not rejected) so callers never see an unhandled error
      });
    return this.queue;
  },

  // ----- helpers used by both portals -----
  student(id) { return this.state.students[id]; },

  // Student planner (one section per chosen subject)
  planner(id) {
    const rec = this.state.students[id];
    rec.planner = rec.planner || emptyPlanner();
    return rec.planner;
  },
  // Syllabus progress for one student + subject (from their planner checklist)
  syllabusProgress(id, subjectId) {
    const st = STUDENTS[id];
    const syl = typeof syllabusFor === "function" ? syllabusFor(subjectId, st.level) : null;
    if (!syl) return null;
    const lk = { "O Level": "O", "AS Level": "AS", "A2 Level": "A2" }[st.level];
    const p = this.planner(id), c = p.check[`${subjectId}|${lk}`] || {};
    const cols = ["n", "w", "p", "r"];
    let ticks = 0, total = 0, done = 0, subs = 0;
    const low = [];
    const topics = syl.topics.map((t, ti) => {
      let tt = 0;
      t.s.forEach((sub, si) => {
        const row = c[`${ti}.${si}`] || {};
        const n = cols.filter((k) => row[k]).length;
        tt += n; ticks += n; subs++;
        if (n === 4) done++;
        if (row.c === "low") low.push({ topic: t.t, sub });
      });
      total += t.s.length * 4;
      return { t: t.t, pct: Math.round((tt / (t.s.length * 4)) * 100) };
    });
    return { code: syl.code, pct: total ? Math.round((ticks / total) * 100) : 0, done, subs, topics, low, started: p.subjects.includes(subjectId) };
  },
  addPlannerSubject(id, subjectId) {
    const p = this.planner(id);
    if (p.subjects.includes(subjectId)) return false;
    p.subjects.push(subjectId); this.save(); return true;
  },

  noticesFor(id) {
    const st = STUDENTS[id];
    return this.state.notices.filter((n) => {
      const to = n.to || { type: "all" };
      if (to.type === "all") return true;
      if (to.type === "campus") return to.campus === st.campus;
      if (to.type === "class") return to.campus === st.campus && st.subjects.includes(to.subject) && (!to.level || to.level === st.level);
      return false;
    }).sort((a, b) => b.d.localeCompare(a.d));
  },

  // classes a teacher is responsible for: subject + campus + level
  classesOf(teacherId) {
    const admin = ADMINS.includes(teacherId);
    const map = {};
    Object.entries(STUDENTS).forEach(([id, st]) => {
      st.subjects.forEach((sid) => {
        if (!admin && teacherAt(sid, st.campus, st.level).id !== teacherId) return;
        const key = `${sid}|${st.campus}|${st.level}`;
        (map[key] = map[key] || { key, subject: sid, campus: st.campus, level: st.level, students: [] }).students.push(id);
      });
    });
    return Object.values(map).sort((a, b) => a.subject.localeCompare(b.subject) || a.campus.localeCompare(b.campus) || a.level.localeCompare(b.level));
  },

  // may this teacher edit this student's record for this subject?
  canEdit(teacherId, studentId, subjectId) {
    if (ADMINS.includes(teacherId)) return true;
    const st = STUDENTS[studentId];
    return !!st && st.subjects.includes(subjectId) && teacherAt(subjectId, st.campus, st.level).id === teacherId;
  },

  addLog(teacherId, text) {
    this.state.log.unshift({ by: teacherId, text, at: Date.now() });
    this.state.log = this.state.log.slice(0, 60);
    this.queue = this.queue.catch(() => {}).then(() => api("POST", "/api/log", { text })).catch(() => {});
  },
};

// ---------- live updates from the server ----------
let _es = null, _esTimer = null;
const _changeCbs = [];
function startEvents() {
  if (_es || typeof EventSource === "undefined") return;
  _es = new EventSource("/api/events");
  _es.addEventListener("change", (e) => {
    let d = {}; try { d = JSON.parse(e.data); } catch (x) {}
    if (d.by === CLIENT_ID || !DB.me) return; // our own change — already on screen
    clearTimeout(_esTimer);
    _esTimer = setTimeout(async () => {
      try { await DB.load(); _changeCbs.forEach((cb) => cb(d)); } catch (err) {}
    }, 200);
  });
}
function stopEvents() { if (_es) { _es.close(); _es = null; } }
// Re-render when someone else (a teacher, the admin, another tab) saves a change
function onDBChange(cb) { _changeCbs.push(cb); }
