// =====================================================================
//  SKH Solutions — backend server (temporary / local)
//
//  Run:   node server.js          then open  http://localhost:3000
//  Needs: Node.js 18 or newer. No npm install — uses only built-in modules.
//
//  • Serves the website (index.html, portal.html, teacher.html …)
//  • Saves everything in data/db.json
//  • Logins with hashed passwords + HttpOnly session cookies
//  • Each role only sees / edits what it is allowed to:
//      student → own record          teacher → students in own classes
//      admin (Sir Khurram) → everything, plus admissions, students, fees
// =====================================================================
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const vm = require("vm");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
// On a hosting service, point DATA_DIR at a persistent disk (e.g. /var/data)
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const SESS_FILE = path.join(DATA_DIR, "sessions.json");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const CRED_FILE = process.env.DATA_DIR ? path.join(DATA_DIR, "CREDENTIALS.txt") : path.join(ROOT, "CREDENTIALS.txt");
const BEHIND_PROXY = !!process.env.RENDER || !!process.env.RAILWAY_ENVIRONMENT || process.env.TRUST_PROXY === "1";

// ---------- load shared website data (teachers, subjects, campuses) ----------
// Re-loaded whenever the admin edits teacher profiles / timetables, so edits apply everywhere.
const DATA_SRC = fs.readFileSync(path.join(ROOT, "js", "data.js"), "utf8");
let TEACHERS, SUBJECTS, CAMPUSES, teacherAt, staffIdOf;
function loadShared() {
  const ctx = vm.runInNewContext(DATA_SRC + "\n;({ TEACHERS, SUBJECTS, CAMPUSES, teacherAt, staffIdOf, applyContent });", {});
  if (db && db.content) ctx.applyContent(JSON.parse(JSON.stringify(db.content)));
  ({ TEACHERS, SUBJECTS, CAMPUSES, teacherAt, staffIdOf } = ctx);
}
let db;
loadShared();
const TEACHER_IDS = Object.keys(TEACHERS);
const STAFF_ID = Object.fromEntries(TEACHER_IDS.map((id) => [id, staffIdOf(id)]));
const ADMINS = ["khurram"];
const LEVELS = ["O Level", "AS Level", "A2 Level"];

// ---------- helpers ----------
const now = () => Date.now();
const uid = (n = 8) => crypto.randomBytes(n).toString("base64url").slice(0, n);
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hashPw = (pw, salt = crypto.randomBytes(16).toString("hex")) => ({ salt, hash: crypto.scryptSync(pw, salt, 64).toString("hex") });
const checkPw = (pw, rec) => rec && crypto.timingSafeEqual(Buffer.from(crypto.scryptSync(pw, rec.salt, 64).toString("hex"), "hex"), Buffer.from(rec.hash, "hex"));
const newPassword = () => {
  const a = "abcdefghjkmnpqrstuvwxyz", d = "23456789";
  let s = ""; for (let i = 0; i < 6; i++) s += a[crypto.randomInt(a.length)];
  return s + d[crypto.randomInt(d.length)] + d[crypto.randomInt(d.length)];
};
const clean = (v, max = 300) => String(v ?? "").trim().slice(0, max);

// ---------- database (JSON file) ----------
function saveDB() {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, DB_FILE);
}
function loadDB() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    // teachers added to js/data.js later get a login too
    upgradeDB();
    const added = TEACHER_IDS.filter((id) => !db.teachers[id]).map((id) => {
      const pw = newPassword(); db.teachers[id] = { auth: hashPw(pw), mustChange: true };
      return `${STAFF_ID[id].padEnd(11)} ${pw.padEnd(10)} ${TEACHERS[id].name}  (NEW)`;
    });
    if (added.length) {
      saveDB();
      fs.appendFileSync(CRED_FILE, ["", "", "NEW TEACHERS ADDED " + new Date().toLocaleString(), ...added, ""].join("\r\n"));
      console.log(`\n  ${added.length} new teacher login(s) added to CREDENTIALS.txt\n`);
    }
    return;
  }
  // First run: create teacher accounts with random passwords
  const creds = [];
  const teachers = {};
  TEACHER_IDS.forEach((id) => {
    const pw = ADMINS.includes(id) && process.env.SKH_ADMIN_PASSWORD ? process.env.SKH_ADMIN_PASSWORD : newPassword();
    teachers[id] = { auth: hashPw(pw), mustChange: true };
    creds.push(`${STAFF_ID[id].padEnd(11)} ${pw.padEnd(10)} ${TEACHERS[id].name}${ADMINS.includes(id) ? "  (ADMIN)" : ""}`);
  });
  db = {
    v: 2, created: now(),
    settings: { fees: { "O Level": 5500, "AS Level": 7500, "A2 Level": 8000 }, lateFee: 500, dueDay: 10, bank: "" },
    seq: 100, teachers, students: {}, notices: [], log: [], enquiries: [], results: [], testimonials: [],
  };
  upgradeDB();
  saveDB();
  fs.writeFileSync(CRED_FILE, [
    "SKH SOLUTIONS — FIRST LOGIN DETAILS (created " + new Date().toLocaleString() + ")",
    "Teacher Portal: http://localhost:3000/teacher.html",
    "Everyone is asked to change their password after the first login.",
    "Keep this file private. Delete it once passwords have been changed.",
    "", "STAFF ID    PASSWORD   NAME", ...creds, "",
    "Students are created by the admin (Sir Khurram) in Teacher Portal → Manage Students.",
  ].join("\r\n"));
  console.log("\n  First run: teacher logins written to CREDENTIALS.txt\n");
  if (process.env.DATA_DIR) console.log("  Admin login: SKH-T-101 / " + (process.env.SKH_ADMIN_PASSWORD ? "(the SKH_ADMIN_PASSWORD you set)" : creds[0].split(/\s+/)[1]) + "\n");
}

// add fields introduced after the first version (so old data files keep working)
function upgradeDB() {
  db.content = db.content || {};
  db.content.teachers = db.content.teachers || {};
  db.content.timetable = db.content.timetable || {};
  db.content.news = db.content.news || [];
  db.results = db.results || [];
  db.testimonials = db.testimonials || [];
  db.settings.campuses = db.settings.campuses || {};
  CAMPUSES.forEach((c) => { db.settings.campuses[c] = Object.assign({ phone: "0336 7647647", timings: "", map: "" }, db.settings.campuses[c] || {}); });
}

// ---------- fees ----------
function makeFees(st, fromDate = new Date()) {
  const amount = st.subjects.length * db.settings.fees[st.level];
  const fees = [];
  for (let i = 0; i < 6; i++) {
    const m = new Date(fromDate.getFullYear(), fromDate.getMonth() + i, 1);
    const mm = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    fees.push({ id: `F-${st.id.slice(-4)}-${mm.replace("-", "")}`, month: mm, amount, due: isoDay(new Date(m.getFullYear(), m.getMonth(), db.settings.dueDay)), status: "upcoming", paidOn: null });
  }
  return fees;
}
function refreshFeeStatus(rec) {
  const today = isoDay(new Date());
  (rec.fees || []).forEach((f) => {
    if (f.status === "paid") return;
    f.status = `${f.month}-01` <= today ? "due" : "upcoming";
  });
}

// ---------- access rules ----------
const studentProfile = (s) => ({ id: s.id, name: s.name, level: s.level, campus: s.campus, section: s.section, guardian: s.guardian, phone: s.phone, subjects: s.subjects, joined: s.joined });
const teachesStudent = (tid, s) => ADMINS.includes(tid) || s.subjects.some((sub) => teacherAt(sub, s.campus, s.level).id === tid);
const teachesSubject = (tid, s, sub) => ADMINS.includes(tid) || (s.subjects.includes(sub) && teacherAt(sub, s.campus, s.level).id === tid);
function noticesFor(s) {
  return db.notices.filter((n) => {
    const to = n.to || { type: "all" };
    if (to.type === "all") return true;
    if (to.type === "campus") return to.campus === s.campus;
    if (to.type === "class") return to.campus === s.campus && s.subjects.includes(to.subject) && (!to.level || to.level === s.level);
    return false;
  });
}
function recordFor(s, full) {
  refreshFeeStatus(s);
  const r = { profile: studentProfile(s), tests: s.tests, tasks: s.tasks, att: s.att, remarks: s.remarks, planner: s.planner };
  if (full) r.fees = s.fees;
  return r;
}

// ---------- sessions ----------
// Sessions are saved to data/sessions.json so people stay logged in when the server restarts.
// Only a SHA-256 hash of each cookie is stored.
const tokenKey = (t) => crypto.createHash("sha256").update(t).digest("hex");
let sessTimer = null, sessDue = 0;
function persistSessions(delay = 800) {
  if (sessTimer && sessDue <= now() + delay) return; // a save is already coming soon enough
  clearTimeout(sessTimer); sessDue = now() + delay;
  sessTimer = setTimeout(() => {
    sessTimer = null;
    try {
      const obj = {}; const t = now();
      for (const [k, v] of sessions) if (v.exp > t) obj[k] = v;
      fs.writeFileSync(SESS_FILE + ".tmp", JSON.stringify(obj)); fs.renameSync(SESS_FILE + ".tmp", SESS_FILE);
    } catch (e) {}
  }, delay);
}
class SessionStore extends Map {
  set(k, v) { super.set(k, v); persistSessions(); return this; }
  delete(k) { const r = super.delete(k); if (r) persistSessions(); return r; }
}
const sessions = new SessionStore(); // tokenHash -> { role, id, exp }
function loadSessions() {
  try {
    const obj = JSON.parse(fs.readFileSync(SESS_FILE, "utf8"));
    Object.entries(obj).forEach(([k, v]) => { if (v && v.exp > now()) Map.prototype.set.call(sessions, k, v); });
  } catch (e) {}
}
const SESSION_MS = 12 * 3600e3;
function getSession(req) {
  const m = /(?:^|;\s*)skh_sid=([^;]+)/.exec(req.headers.cookie || "");
  if (!m) return null;
  const key = tokenKey(m[1]);
  const s = sessions.get(key);
  if (!s || s.exp < now()) { sessions.delete(key); return null; }
  s.exp = now() + SESSION_MS; persistSessions(30000);
  return { ...s, token: key };
}
function whoAmI(sess) {
  if (!sess) return null;
  if (sess.role === "student") {
    const s = db.students[sess.id]; if (!s) return null;
    return { role: "student", id: s.id, name: s.name, mustChange: !!s.mustChange };
  }
  if (sess.role === "parent") {
    const s = db.students[sess.id]; if (!s) return null;
    return { role: "parent", id: s.id, name: s.guardian || `Parent of ${s.name}`, studentName: s.name, mustChange: !!s.parentMustChange };
  }
  const t = TEACHERS[sess.id]; if (!t) return null;
  return { role: ADMINS.includes(sess.id) ? "admin" : "teacher", id: sess.id, staffId: STAFF_ID[sess.id], name: t.name, mustChange: !!db.teachers[sess.id].mustChange };
}

// ---------- live updates (Server-Sent Events) ----------
const listeners = new Set();
let reqClient = ""; // browser tab that made the current change (it already has the new data)
function broadcast() { const d = JSON.stringify({ by: reqClient, at: now() }); for (const res of listeners) { try { res.write(`event: change\ndata: ${d}\n\n`); } catch (e) {} } }
function changed(logBy, logText) {
  if (logBy && logText) { db.log.unshift({ by: logBy, text: logText, at: now() }); db.log = db.log.slice(0, 200); }
  saveDB(); broadcast();
}

// ---------- http plumbing ----------
const isHttps = (req) => req.headers["x-forwarded-proto"] === "https" || !!(req.socket && req.socket.encrypted);
function send(res, code, obj, headers = {}) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(obj));
}
function body(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    const limit = req.url.startsWith("/api/admin/restore") ? 60e6 : 2e6;
    req.on("data", (c) => { data += c; if (data.length > limit) { reject(new Error("too large")); req.destroy(); } });
    req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(new Error("bad json")); } });
  });
}
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "application/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".webp": "image/webp" };
function serveStatic(req, res, urlPath) {
  let p = decodeURIComponent(urlPath.split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.normalize(path.join(ROOT, p));
  const blocked = !file.startsWith(ROOT) || /[\\/](data|node_modules)[\\/]/.test(file.slice(ROOT.length)) ||
    /(server\.js|CREDENTIALS\.txt|package\.json|render\.yaml|\.bat|\.zip)$/i.test(file) || path.basename(file).startsWith(".");
  if (blocked) { res.writeHead(403); return res.end("Forbidden"); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
    fs.createReadStream(file).pipe(res);
  });
}

// ---------- API ----------
const routes = [];
const route = (method, pattern, handler) => routes.push({ method, re: new RegExp("^" + pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$"), handler });
const need = (sess, ...roles) => { if (!sess) throw { code: 401, error: "Please log in" }; const me = whoAmI(sess); if (!me || (roles.length && !roles.includes(me.role))) throw { code: 403, error: "Not allowed" }; return me; };

// login / logout / me
const loginFails = new Map();
route("POST", "/api/login", async (req, res, sess, b) => {
  const key = (BEHIND_PROXY && String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()) || req.socket.remoteAddress;
  const f = loginFails.get(key) || { n: 0, t: 0 };
  if (f.n >= 8 && now() - f.t < 5 * 60e3) return send(res, 429, { error: "Too many attempts. Try again in a few minutes." });
  const q = clean(b.id, 60).toLowerCase(), pw = String(b.password || "");
  let role = null, id = null, auth = null;
  if (b.role === "student" || b.role === "parent") {
    const s = Object.values(db.students).find((x) => x.id.toLowerCase() === q);
    if (s) { role = b.role; id = s.id; auth = b.role === "parent" ? s.parentAuth : s.auth; }
  } else {
    const tid = TEACHER_IDS.find((t) => STAFF_ID[t].toLowerCase() === q || t === q || TEACHERS[t].name.toLowerCase() === q);
    if (tid) { role = "teacher"; id = tid; auth = db.teachers[tid].auth; }
  }
  if (!auth || !checkPw(pw, auth)) {
    loginFails.set(key, { n: f.n + 1, t: now() });
    return send(res, 401, { error: b.role === "student" ? "Student ID or password is incorrect." : b.role === "parent" ? "Student ID or parent password is incorrect." : "Staff ID or password is incorrect." });
  }
  loginFails.delete(key);
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(tokenKey(token), { role, id, exp: now() + SESSION_MS });
  send(res, 200, { me: whoAmI({ role, id }) }, { "Set-Cookie": `skh_sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MS / 1000}${isHttps(req) ? "; Secure" : ""}` });
});
route("POST", "/api/logout", async (req, res, sess) => {
  if (sess) sessions.delete(sess.token);
  send(res, 200, { ok: true }, { "Set-Cookie": "skh_sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0" });
});
route("GET", "/api/me", async (req, res, sess) => send(res, 200, { me: whoAmI(sess) }));
route("POST", "/api/me/password", async (req, res, sess, b) => {
  const me = need(sess);
  const rec = me.role === "student" || me.role === "parent" ? db.students[me.id] : db.teachers[me.id];
  const key = me.role === "parent" ? "parentAuth" : "auth";
  if (!checkPw(String(b.old || ""), rec[key])) return send(res, 400, { error: "Current password is incorrect." });
  const pw = String(b.new || "");
  if (pw.length < 8) return send(res, 400, { error: "New password must be at least 8 characters." });
  rec[key] = hashPw(pw);
  if (me.role === "parent") rec.parentMustChange = false; else rec.mustChange = false;
  changed(); send(res, 200, { ok: true });
});

// everything the logged-in user may see
route("GET", "/api/state", async (req, res, sess) => {
  const me = need(sess);
  const out = { me, settings: db.settings, students: {}, notices: [], log: [] };
  if (me.role === "student" || me.role === "parent") {
    const s = db.students[me.id];
    out.students[s.id] = recordFor(s, true);
    out.notices = noticesFor(s);
  } else {
    Object.values(db.students).forEach((s) => { if (teachesStudent(me.id, s)) out.students[s.id] = recordFor(s, me.role === "admin"); });
    out.notices = db.notices;
    out.log = db.log.filter((l) => me.role === "admin" || l.by === me.id).slice(0, 60);
    if (me.role === "admin") {
      out.enquiries = db.enquiries;
      out.results = db.results; out.testimonials = db.testimonials;
      out.parentAccounts = Object.fromEntries(Object.values(db.students).map((s) => [s.id, { set: !!s.parentAuth, mustChange: !!s.parentMustChange }]));
      out.teacherAccounts = Object.fromEntries(TEACHER_IDS.map((t) => [t, { staffId: STAFF_ID[t], mustChange: !!db.teachers[t].mustChange }]));
    }
  }
  send(res, 200, out);
});

// update one student's record (fields allowed depend on role)
route("PUT", "/api/students/:id", async (req, res, sess, b, p) => {
  const me = need(sess);
  const s = db.students[p.id];
  if (!s) return send(res, 404, { error: "Student not found" });
  if (me.role === "parent") throw { code: 403, error: "The parent view is read-only" };
  if (me.role === "student") {
    if (me.id !== s.id) throw { code: 403, error: "Not allowed" };
    if (b.planner && typeof b.planner === "object") s.planner = b.planner;
    if (Array.isArray(b.tasks)) {
      const done = new Map(b.tasks.map((t) => [t.id, !!t.done]));
      s.tasks.forEach((t) => { if (done.has(t.id)) { t.done = done.get(t.id); t.doneAt = t.done ? now() : null; } });
    }
    changed(); return send(res, 200, { ok: true });
  }
  // teacher / admin
  if (!teachesStudent(me.id, s)) throw { code: 403, error: "This student is not in your classes" };
  const mine = (x) => teachesSubject(me.id, s, x.s);
  const mergeArr = (key) => {
    if (!Array.isArray(b[key])) return;
    const incoming = b[key].filter((x) => x && typeof x === "object" && mine(x));
    s[key] = [...s[key].filter((x) => !mine(x)), ...incoming]; // teachers may only change their own subject's entries
  };
  mergeArr("tests"); mergeArr("tasks"); mergeArr("remarks");
  if (b.att && typeof b.att === "object") // merge day by day so two teachers never overwrite each other
    Object.entries(b.att).forEach(([m, days]) => { if (days && typeof days === "object") s.att[m] = { ...(s.att[m] || {}), ...days }; });
  changed(); send(res, 200, { ok: true });
});

// student adds a subject to their planner from the website
route("POST", "/api/me/planner", async (req, res, sess, b) => {
  const me = need(sess, "student");
  const s = db.students[me.id];
  const sub = SUBJECTS.find((x) => x.id === b.subject);
  if (!sub) return send(res, 400, { error: "Unknown subject" });
  s.planner = s.planner || { subjects: [], months: {}, weeks: {}, todos: {}, check: {} };
  const added = !s.planner.subjects.includes(sub.id);
  if (added) s.planner.subjects.push(sub.id);
  changed(); send(res, 200, { added });
});

// notices + activity log
route("POST", "/api/notices", async (req, res, sess, b) => {
  const me = need(sess, "teacher", "admin");
  const to = b.to || {};
  if (me.role !== "admin" && to.type !== "class") throw { code: 403, error: "Teachers can post to their own classes only" };
  const n = { id: uid(), t: clean(b.t, 120), body: clean(b.body, 1000), tag: clean(b.tag, 20) || "Class", d: isoDay(new Date()), to, by: me.id };
  if (!n.t || !n.body) return send(res, 400, { error: "Title and message are required" });
  db.notices.unshift(n);
  changed(me.id, `posted a notice: "${n.t}"`); send(res, 200, { notice: n });
});
route("DELETE", "/api/notices/:id", async (req, res, sess, b, p) => {
  const me = need(sess, "teacher", "admin");
  const n = db.notices.find((x) => x.id === p.id);
  if (!n) return send(res, 404, { error: "Not found" });
  if (me.role !== "admin" && n.by !== me.id) throw { code: 403, error: "Not allowed" };
  db.notices = db.notices.filter((x) => x.id !== p.id);
  changed(me.id, "deleted a notice"); send(res, 200, { ok: true });
});
route("POST", "/api/log", async (req, res, sess, b) => {
  const me = need(sess, "teacher", "admin");
  changed(me.id, clean(b.text, 200)); send(res, 200, { ok: true });
});

// public: admission enquiry from the website form
route("POST", "/api/enquiries", async (req, res, sess, b) => {
  const e = { id: uid(), name: clean(b.name, 80), phone: clean(b.phone, 30), level: clean(b.level, 30), campus: clean(b.campus, 40), subjects: clean(b.subjects, 300), teacher: clean(b.teacher, 400), at: now(), status: "new" };
  if (!e.name || e.phone.replace(/\D/g, "").length < 10) return send(res, 400, { error: "Name and a valid phone number are required" });
  db.enquiries.unshift(e);
  changed(); send(res, 200, { ok: true });
});

// ----- admin -----
route("PATCH", "/api/admin/enquiries/:id", async (req, res, sess, b, p) => {
  const me = need(sess, "admin");
  const e = db.enquiries.find((x) => x.id === p.id); if (!e) return send(res, 404, { error: "Not found" });
  if (["new", "contacted", "enrolled", "closed"].includes(b.status)) e.status = b.status;
  if (b.note !== undefined) e.note = clean(b.note, 300);
  changed(me.id, `marked enquiry from ${e.name} as ${e.status}`); send(res, 200, { ok: true });
});
function validateStudent(b) {
  const st = {
    name: clean(b.name, 80), level: b.level, campus: b.campus, section: clean(b.section, 12),
    guardian: clean(b.guardian, 80), phone: clean(b.phone, 30),
    subjects: Array.isArray(b.subjects) ? [...new Set(b.subjects)].filter((x) => SUBJECTS.find((s) => s.id === x && s.levels.includes(b.level))) : [],
  };
  if (!st.name) throw { code: 400, error: "Student name is required" };
  if (!LEVELS.includes(st.level)) throw { code: 400, error: "Choose a level" };
  if (!CAMPUSES.includes(st.campus)) throw { code: 400, error: "Choose a campus" };
  if (!st.subjects.length) throw { code: 400, error: "Choose at least one subject" };
  return st;
}
route("POST", "/api/admin/students", async (req, res, sess, b) => {
  const me = need(sess, "admin");
  const st = validateStudent(b);
  db.seq += 1;
  const id = `SKH-${new Date().getFullYear()}-${String(db.seq).padStart(4, "0")}`;
  const pw = newPassword(), ppw = newPassword();
  const rec = { id, ...st, joined: isoDay(new Date()), auth: hashPw(pw), mustChange: true, parentAuth: hashPw(ppw), parentMustChange: true, tests: [], tasks: [], att: {}, remarks: [], planner: { subjects: [...st.subjects], months: {}, weeks: {}, todos: {}, check: {} } };
  rec.fees = makeFees(rec);
  db.students[id] = rec;
  if (b.enquiryId) { const e = db.enquiries.find((x) => x.id === b.enquiryId); if (e) { e.status = "enrolled"; e.studentId = id; } }
  changed(me.id, `enrolled ${st.name} (${id}) at ${st.campus}`);
  send(res, 200, { id, password: pw, parentPassword: ppw });
});
route("PUT", "/api/admin/students/:id", async (req, res, sess, b, p) => {
  const me = need(sess, "admin");
  const s = db.students[p.id]; if (!s) return send(res, 404, { error: "Not found" });
  const st = validateStudent(b);
  const feeChange = st.level !== s.level || st.subjects.join() !== s.subjects.join();
  Object.assign(s, st);
  if (feeChange) s.fees.forEach((f) => { if (f.status !== "paid") f.amount = s.subjects.length * db.settings.fees[s.level]; });
  changed(me.id, `updated ${s.name}'s details`); send(res, 200, { ok: true });
});
route("DELETE", "/api/admin/students/:id", async (req, res, sess, b, p) => {
  const me = need(sess, "admin");
  const s = db.students[p.id]; if (!s) return send(res, 404, { error: "Not found" });
  delete db.students[p.id];
  for (const [t, x] of sessions) if (x.id === p.id) sessions.delete(t);
  changed(me.id, `removed student ${s.name} (${s.id})`); send(res, 200, { ok: true });
});
route("POST", "/api/admin/students/:id/reset-password", async (req, res, sess, b, p) => {
  const me = need(sess, "admin");
  const s = db.students[p.id]; if (!s) return send(res, 404, { error: "Not found" });
  const pw = newPassword();
  if (b.who === "parent") { s.parentAuth = hashPw(pw); s.parentMustChange = true; }
  else { s.auth = hashPw(pw); s.mustChange = true; }
  for (const [t, x] of sessions) if (x.id === p.id && x.role === (b.who === "parent" ? "parent" : "student")) sessions.delete(t);
  changed(me.id, `reset the ${b.who === "parent" ? "parent" : "student"} password for ${s.name}`); send(res, 200, { password: pw });
});
route("POST", "/api/admin/teachers/:id/reset-password", async (req, res, sess, b, p) => {
  const me = need(sess, "admin");
  if (!db.teachers[p.id]) return send(res, 404, { error: "Not found" });
  const pw = newPassword(); db.teachers[p.id].auth = hashPw(pw); db.teachers[p.id].mustChange = true;
  changed(me.id, `reset password for ${TEACHERS[p.id].name}`); send(res, 200, { password: pw });
});
route("POST", "/api/admin/fees/:sid/:fid", async (req, res, sess, b, p) => {
  const me = need(sess, "admin");
  const s = db.students[p.sid]; const f = s && s.fees.find((x) => x.id === p.fid);
  if (!f) return send(res, 404, { error: "Not found" });
  if (b.status === "paid") { f.status = "paid"; f.paidOn = isoDay(new Date()); }
  else { f.status = "due"; f.paidOn = null; refreshFeeStatus(s); }
  changed(me.id, `marked ${s.name}'s ${f.month} fee as ${f.status}`); send(res, 200, { ok: true });
});
route("PUT", "/api/admin/settings", async (req, res, sess, b) => {
  const me = need(sess, "admin");
  LEVELS.forEach((l) => { const v = Number(b.fees && b.fees[l]); if (v >= 0) db.settings.fees[l] = Math.round(v); });
  if (Number(b.lateFee) >= 0) db.settings.lateFee = Math.round(Number(b.lateFee));
  if (b.bank !== undefined) db.settings.bank = clean(b.bank, 200);
  // update unpaid fees to the new rates
  Object.values(db.students).forEach((s) => s.fees.forEach((f) => { if (f.status !== "paid") f.amount = s.subjects.length * db.settings.fees[s.level]; }));
  changed(me.id, "updated fee settings"); send(res, 200, { settings: db.settings });
});

// ----- public website data (campus details, results, testimonials) -----
route("GET", "/api/public", async (req, res) => {
  send(res, 200, { campuses: db.settings.campuses, results: db.results, testimonials: db.testimonials.filter((t) => t.consent) });
});
route("PUT", "/api/admin/campuses", async (req, res, sess, b) => {
  const me = need(sess, "admin");
  CAMPUSES.forEach((c) => {
    const x = (b.campuses || {})[c]; if (!x) return;
    db.settings.campuses[c] = { phone: clean(x.phone, 40), timings: clean(x.timings, 200), map: clean(x.map, 500) };
  });
  changed(me.id, "updated campus details on the website"); send(res, 200, { ok: true });
});
route("POST", "/api/admin/results", async (req, res, sess, b) => {
  const me = need(sess, "admin");
  const r = { id: uid(), name: clean(b.name, 60), subject: clean(b.subject, 40), level: clean(b.level, 20), grade: clean(b.grade, 6), year: clean(b.year, 12), campus: clean(b.campus, 40) };
  if (!r.name || !r.grade || !r.subject) return send(res, 400, { error: "Name, subject and grade are required" });
  db.results.unshift(r); changed(me.id, `added a result: ${r.name} — ${r.grade}`); send(res, 200, { result: r });
});
route("DELETE", "/api/admin/results/:id", async (req, res, sess, b, p) => {
  const me = need(sess, "admin");
  db.results = db.results.filter((x) => x.id !== p.id); changed(me.id, "removed a result"); send(res, 200, { ok: true });
});
route("POST", "/api/admin/testimonials", async (req, res, sess, b) => {
  const me = need(sess, "admin");
  const t = { id: uid(), name: clean(b.name, 60), role: clean(b.role, 80), text: clean(b.text, 600), consent: !!b.consent, at: now() };
  if (!t.name || !t.text) return send(res, 400, { error: "Name and testimonial text are required" });
  if (!t.consent) return send(res, 400, { error: "Only publish a testimonial the person has agreed to share" });
  db.testimonials.unshift(t); changed(me.id, `added a testimonial from ${t.name}`); send(res, 200, { testimonial: t });
});
route("DELETE", "/api/admin/testimonials/:id", async (req, res, sess, b, p) => {
  const me = need(sess, "admin");
  db.testimonials = db.testimonials.filter((x) => x.id !== p.id); changed(me.id, "removed a testimonial"); send(res, 200, { ok: true });
});

// ----- admin-editable content: teacher profiles, timetables, news -----
function contentChanged(by, text) { loadShared(); changed(by, text); }
route("GET", "/api/content", async (req, res) => send(res, 200, db.content));
route("PUT", "/api/admin/teachers/:id/profile", async (req, res, sess, b, p) => {
  const me = need(sess, "admin");
  if (!TEACHERS[p.id]) return send(res, 404, { error: "Teacher not found" });
  if (b.reset) { delete db.content.teachers[p.id]; contentChanged(me.id, `reset ${TEACHERS[p.id].name}'s profile`); return send(res, 200, { ok: true }); }
  const lines = (v, n) => (Array.isArray(v) ? v : String(v || "").split("\n")).map((x) => clean(x, 200)).filter(Boolean).slice(0, n);
  const o = {
    title: clean(b.title, 80), bio: clean(b.bio, 1200), timings: clean(b.timings, 160),
    facts: lines(b.facts, 8).map((l) => { const i = l.indexOf(":"); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ["", l]; }).filter(([k, v]) => v),
    approach: lines(b.approach, 8),
    levels: (Array.isArray(b.levels) ? b.levels : []).filter((l) => LEVELS.includes(l)),
    campusList: (Array.isArray(b.campusList) ? b.campusList : []).filter((c) => CAMPUSES.includes(c)),
  };
  db.content.teachers[p.id] = o;
  contentChanged(me.id, `updated ${TEACHERS[p.id].name}'s profile`); send(res, 200, { ok: true });
});
route("PUT", "/api/admin/timetable", async (req, res, sess, b) => {
  const me = need(sess, "admin");
  const [campus, level] = String(b.key || "").split("|");
  if (!CAMPUSES.includes(campus) || !LEVELS.includes(level)) return send(res, 400, { error: "Choose a campus and level" });
  if (!b.grid) delete db.content.timetable[b.key];
  else {
    const grid = {};
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((d) => { grid[d] = [0, 1, 2].map((i) => { const v = (b.grid[d] || [])[i]; return SUBJECTS.find((x) => x.id === v) ? v : null; }); });
    db.content.timetable[b.key] = grid;
  }
  contentChanged(me.id, `${b.grid ? "updated" : "reset"} the ${level} timetable at ${campus}`); send(res, 200, { ok: true });
});
route("PUT", "/api/admin/news", async (req, res, sess, b) => {
  const me = need(sess, "admin");
  db.content.news = (Array.isArray(b.news) ? b.news : []).slice(0, 12).map((n) => ({
    id: clean(n.id, 20) || uid(), tag: clean(n.tag, 24), title: clean(n.title, 120), text: clean(n.text, 400),
    link: /^https?:\/\//.test(n.link || "") ? clean(n.link, 400) : "",
  })).filter((n) => n.title);
  contentChanged(me.id, "updated the website news"); send(res, 200, { ok: true });
});

// ----- backups -----
const backupName = (d = new Date()) => `db-${isoDay(d)}.json`;
function dailyBackup() {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const f = path.join(BACKUP_DIR, backupName());
    if (!fs.existsSync(f) && fs.existsSync(DB_FILE)) fs.copyFileSync(DB_FILE, f);
    const daily = fs.readdirSync(BACKUP_DIR).filter((x) => /^db-\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort();
    daily.slice(0, Math.max(0, daily.length - 30)).forEach((x) => fs.unlinkSync(path.join(BACKUP_DIR, x))); // keep 30 days
    const other = fs.readdirSync(BACKUP_DIR).filter((x) => x.startsWith("before-restore-")).sort();
    other.slice(0, Math.max(0, other.length - 10)).forEach((x) => fs.unlinkSync(path.join(BACKUP_DIR, x)));
  } catch (e) { console.error("Backup failed:", e.message); }
}
function listBackups() {
  try {
    return fs.readdirSync(BACKUP_DIR).filter((x) => x.endsWith(".json")).map((name) => {
      const st = fs.statSync(path.join(BACKUP_DIR, name)); return { name, size: st.size, at: st.mtimeMs };
    }).sort((a, b) => b.at - a.at);
  } catch (e) { return []; }
}
function restoreFrom(obj, me) {
  if (!obj || typeof obj !== "object" || !obj.students || !obj.teachers || !obj.settings) throw { code: 400, error: "That file is not an SKH backup" };
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.copyFileSync(DB_FILE, path.join(BACKUP_DIR, `before-restore-${new Date().toISOString().replace(/[:.]/g, "-")}.json`));
  db = obj; upgradeDB();
  TEACHER_IDS.forEach((id) => { if (!db.teachers[id]) db.teachers[id] = { auth: hashPw(newPassword()), mustChange: true }; });
  loadShared();
  changed(me.id, "restored the data from a backup");
}
route("GET", "/api/admin/backups", async (req, res, sess) => { need(sess, "admin"); send(res, 200, { backups: listBackups(), dataDir: DATA_DIR }); });
route("GET", "/api/admin/backup", async (req, res, sess) => {
  need(sess, "admin");
  res.writeHead(200, { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="SKH-backup-${isoDay(new Date())}.json"`, "Cache-Control": "no-store" });
  res.end(JSON.stringify(db, null, 1));
});
route("POST", "/api/admin/restore", async (req, res, sess, b) => {
  const me = need(sess, "admin");
  restoreFrom(b, me); send(res, 200, { ok: true });
});
route("POST", "/api/admin/backups/:name/restore", async (req, res, sess, b, p) => {
  const me = need(sess, "admin");
  const f = path.join(BACKUP_DIR, path.basename(p.name));
  if (!fs.existsSync(f)) return send(res, 404, { error: "Backup not found" });
  restoreFrom(JSON.parse(fs.readFileSync(f, "utf8")), me); send(res, 200, { ok: true });
});

// ---------- server ----------
loadDB();
loadShared();       // apply the admin's saved teacher profiles / timetables
loadSessions();     // people stay logged in across restarts
dailyBackup(); setInterval(dailyBackup, 3600e3);
const server = http.createServer(async (req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/api/content.js") { // loaded by every page right after js/data.js
    res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-cache" });
    return res.end(`applyContent(${JSON.stringify(db.content).replace(/</g, "\\u003c")});`);
  }
  if (!url.startsWith("/api/")) return serveStatic(req, res, req.url);
  const sess = getSession(req);
  if (url === "/api/events" && req.method === "GET") {
    if (!sess) { res.writeHead(401); return res.end(); }
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.write("retry: 3000\n\n");
    listeners.add(res);
    const ping = setInterval(() => res.write(": ping\n\n"), 25000);
    req.on("close", () => { clearInterval(ping); listeners.delete(res); });
    return;
  }
  for (const r of routes) {
    if (r.method !== req.method) continue;
    const m = r.re.exec(url); if (!m) continue;
    try {
      const b = ["POST", "PUT", "PATCH"].includes(req.method) ? await body(req) : {};
      reqClient = clean(req.headers["x-client"], 40);
      return await r.handler(req, res, sess, b, m.groups || {});
    } catch (e) {
      if (e && typeof e.code === "number") return send(res, e.code, { error: e.error });
      console.error(e); return send(res, 500, { error: "Server error" });
    }
  }
  send(res, 404, { error: "Unknown API route" });
});
server.listen(PORT, "0.0.0.0", () => {
  console.log("  ─────────────────────────────────────────────");
  console.log("   SKH Solutions server is running");
  console.log(`   Website:        http://localhost:${PORT}`);
  console.log(`   Student Portal: http://localhost:${PORT}/portal.html`);
  console.log(`   Teacher Portal: http://localhost:${PORT}/teacher.html`);
  const lan = Object.values(require("os").networkInterfaces()).flat().filter((n) => n && n.family === "IPv4" && !n.internal).map((n) => n.address);
  lan.forEach((ip) => console.log(`   Phones/iPads on the same Wi-Fi: http://${ip}:${PORT}`));
  console.log("   Data file:      data/db.json");
  console.log("   Press Ctrl + C to stop");
  console.log("  ─────────────────────────────────────────────");
});
