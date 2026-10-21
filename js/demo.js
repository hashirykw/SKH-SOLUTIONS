// =====================================================================
//  SKH Solutions — DEMO MODE
//  When the site is opened without the server (double-clicking the HTML
//  files, or uploaded to a static host like Netlify/GitHub Pages), this
//  file pretends to be server.js inside the browser:
//   • sample students, teachers, marks, fees … are created automatically
//   • everything is saved in this browser only (localStorage)
//   • logins: see the "Demo accounts" box on each login page
//  With the real server (START-SERVER.bat) this file does nothing.
// =====================================================================
(function () {
  // ---------- are we running without the real server? ----------
  let demo = location.protocol === "file:" || /[?&]demo\b/.test(location.search);
  if (!demo) {
    try {
      const x = new XMLHttpRequest();
      x.open("GET", "api/me", false); x.send();
      demo = !(x.status === 200 && /^\s*\{/.test(x.responseText));
    } catch (e) { demo = true; }
  }
  if (!demo) { document.write('<script src="api/content.js"><\/script>'); return; }
  window.SKH_DEMO = true;

  // ---------- helpers ----------
  const KEY = "skh-demo-db-v1", SKEY = "skh-demo-session";
  const now = () => Date.now();
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const rid = (n = 8) => Math.random().toString(36).slice(2, 2 + n);
  const clean = (v, max = 300) => String(v ?? "").trim().slice(0, max);
  const newPw = () => { const a = "abcdefghjkmnpqrstuvwxyz"; let s = ""; for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]; return s + (2 + Math.floor(Math.random() * 8)) + (2 + Math.floor(Math.random() * 8)); };
  const LEVELS = ["O Level", "AS Level", "A2 Level"];
  const ADMINS = ["khurram"];
  const TEACHER_IDS = Object.keys(TEACHERS);
  const STAFF_ID = Object.fromEntries(TEACHER_IDS.map((id) => [id, staffIdOf(id)]));
  const seedRand = (s) => () => ((s = (s * 9301 + 49297) % 233280) / 233280);

  // ---------- sample data ----------
  const PEOPLE = [
    ["Ayaan Ahmed", "O Level", "Gulshan", "O-B", "Mr. Tariq Ahmed", ["ma", "ph", "ch", "en", "ur", "is", "ps"]],
    ["Hira Qureshi", "O Level", "PECHS (Girls)", "O-A", "Mrs. Amna Qureshi", ["ma", "bi", "ch", "ph", "en", "ur", "is", "ps"]],
    ["Zain Ali", "AS Level", "Defence", "AS-D", "Mr. Faisal Ali", ["ac", "ec", "bs", "ma"]],
    ["Maryam Javed", "AS Level", "Gulshan", "AS-A", "Mr. Javed Iqbal", ["bi", "ch", "ph"]],
    ["Usman Tariq", "A2 Level", "Bahadurabad", "A2-B", "Mr. Tariq Mehmood", ["ma", "ph", "cs"]],
    ["Fatima Noor", "O Level", "Jauhar", "O-C", "Mr. Noor Hassan", ["ma", "en", "ur", "is", "ps", "ac", "ec", "bs"]],
    ["Saad Malik", "AS Level", "Jauhar", "AS-B", "Mr. Adnan Malik", ["ma", "ph", "cs", "lw"]],
    ["Areeba Siddiqui", "A2 Level", "North", "A2-A", "Mrs. Sana Siddiqui", ["py", "so", "en"]],
  ];
  const TEST_NAMES = ["Monthly Test", "Topical Quiz", "Past Paper Practice"];
  function seed() {
    const today = new Date(), y = today.getFullYear();
    const db = {
      v: 2, demo: true, created: now(),
      settings: { fees: { "O Level": 5500, "AS Level": 7500, "A2 Level": 8000 }, lateFee: 500, dueDay: 10, bank: "Any branch / SKH front desk", campuses: {} },
      seq: 100, teachers: {}, students: {}, notices: [], log: [], enquiries: [], results: [], testimonials: [],
      content: { teachers: {}, timetable: {}, news: [] },
    };
    CAMPUSES.forEach((c) => (db.settings.campuses[c] = { phone: "0336 7647647", timings: "", map: "" }));
    TEACHER_IDS.forEach((id) => (db.teachers[id] = { pw: ADMINS.includes(id) ? "admin1234" : "teach1234", mustChange: false }));
    const start = new Date(y, today.getMonth() - 1, 1); // classes started last month
    PEOPLE.forEach(([name, level, campus, section, guardian, subjects], i) => {
      db.seq += 1;
      const id = `SKH-${y}-${String(db.seq).padStart(4, "0")}`, r = seedRand(i * 97 + 13), skill = 0.62 + r() * 0.3;
      const s = { id, name, level, campus, section, guardian, phone: `0300 12345${String(60 + i)}`, subjects, joined: iso(start), pw: "demo1234", ppw: "parent1234", mustChange: false, parentMustChange: false, tests: [], tasks: [], att: {}, remarks: [] };
      // marks
      subjects.forEach((sid, k) => {
        for (let t = 0; t < 2; t++) {
          const d = new Date(start.getFullYear(), start.getMonth(), 8 + t * 18 + k);
          if (d >= today) continue;
          const m = Math.max(18, Math.min(50, Math.round(50 * (skill + (r() - 0.5) * 0.25))));
          s.tests.push({ id: `${id}-t${k}${t}`, gid: `demo-${sid}-${t}`, t: `${TEST_NAMES[t]} ${t ? "2" : "1"}`, s: sid, d: iso(d), m, o: 50, by: teacherAt(sid, campus, level).id });
        }
      });
      // assignments
      subjects.slice(0, 3).forEach((sid, k) => {
        const due = new Date(today); due.setDate(today.getDate() + [-4, 2, 5][k]);
        s.tasks.push({ id: `${id}-k${k}`, gid: `demo-task-${sid}`, t: ["Topical past-paper questions", "Worksheet 3", "Revision notes"][k], s: sid, due: iso(due), done: k === 0, by: teacherAt(sid, campus, level).id });
      });
      // attendance (month keys are "year-monthIndex")
      for (let mo = start; mo <= today; mo = new Date(mo.getFullYear(), mo.getMonth() + 1, 1)) {
        const key = `${mo.getFullYear()}-${mo.getMonth()}`; s.att[key] = {};
        const days = new Date(mo.getFullYear(), mo.getMonth() + 1, 0).getDate();
        for (let d = 1; d <= days; d++) {
          const dt = new Date(mo.getFullYear(), mo.getMonth(), d);
          if (iso(dt) >= iso(today)) break;
          if (dt.getDay() === 0) { s.att[key][d] = "h"; continue; }
          const x = r(); s.att[key][d] = x < 0.05 ? "a" : x < 0.11 ? "l" : "p";
        }
      }
      // teacher remark
      const rs = subjects[0], rt = teacherAt(rs, campus, level);
      s.remarks.push({ by: rt.id, s: rs, text: skill > 0.8 ? "Excellent work this month — keep practising past papers." : "Good effort. Please revise the last two topics and redo the test corrections.", at: now() - 3 * 864e5 });
      // planner with some progress
      const lk = { "O Level": "O", "AS Level": "AS", "A2 Level": "A2" }[level];
      s.planner = { subjects: [...subjects], months: {}, weeks: {}, todos: {}, check: {} };
      subjects.forEach((sid) => {
        const c = (s.planner.check[`${sid}|${lk}`] = {});
        const n = 2 + Math.floor(r() * 6);
        for (let k = 0; k < n; k++) c[`${Math.floor(k / 4)}.${k % 4}`] = { n: true, w: r() > 0.3, p: r() > 0.5, r: r() > 0.7, c: r() < 0.2 ? "low" : r() < 0.6 ? "mid" : "high" };
      });
      // fees: 6 months from the start month; last month paid
      const amount = subjects.length * db.settings.fees[level];
      s.fees = [];
      for (let k = 0; k < 6; k++) {
        const m = new Date(start.getFullYear(), start.getMonth() + k, 1), mm = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
        const paid = k === 0 || (k === 1 && i % 3 !== 0);
        s.fees.push({ id: `F-${id.slice(-4)}-${mm.replace("-", "")}`, month: mm, amount, due: iso(new Date(m.getFullYear(), m.getMonth(), 10)), status: paid ? "paid" : "upcoming", paidOn: paid ? iso(new Date(m.getFullYear(), m.getMonth(), 4 + i)) : null });
      }
      db.students[id] = s;
    });
    const d0 = (k) => { const d = new Date(); d.setDate(d.getDate() - k); return iso(d); };
    db.notices = [
      { id: rid(), t: "Monthly tests next week", body: "Monthly assessments for all subjects start next Monday. Check your timetable.", tag: "Exams", d: d0(1), to: { type: "all" }, by: "khurram" },
      { id: rid(), t: "Parent–teacher meeting", body: "Parents are invited to discuss progress with subject teachers this Saturday.", tag: "Event", d: d0(4), to: { type: "all" }, by: "khurram" },
      { id: rid(), t: "Extra Physics practical session", body: "An additional practical-skills session will be held on Saturday.", tag: "Class", d: d0(6), to: { type: "class", subject: "ph", level: "AS Level", campus: "Gulshan" }, by: teacherAt("ph", "Gulshan", "AS Level").id },
    ];
    db.enquiries = [
      { id: rid(), name: "Hamza Rehman", phone: "0321 1234567", level: "O Level", campus: "Gulshan", subjects: "Physics, Maths, Chemistry", teacher: "", at: now() - 5 * 3600e3, status: "new" },
      { id: rid(), name: "Ali Raza", phone: "0333 7654321", level: "AS Level", campus: "Jauhar", subjects: "Accounting, Economics", teacher: "", at: now() - 2 * 864e5, status: "contacted", note: "Will visit on Saturday" },
    ];
    db.log = [
      { by: "khurram", text: "enrolled Ayaan Ahmed at Gulshan", at: now() - 20 * 864e5 },
      { by: teacherAt("ma", "Gulshan", "O Level").id, text: 'entered "Monthly Test 1" marks (Mathematics, Gulshan)', at: now() - 9 * 864e5 },
    ];
    return db;
  }

  // ---------- storage ----------
  let db;
  const load = () => { try { db = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { db = null; } if (!db || !db.demo) { db = seed(); save(); } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  const session = () => { try { return JSON.parse(localStorage.getItem(SKEY) || "null"); } catch (e) { return null; } };
  const setSession = (s) => { try { s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY); } catch (e) {} };
  load();
  applyContent(db.content); // the admin's saved teacher profiles / timetables / news

  // ---------- same rules as server.js ----------
  const whoAmI = (s) => {
    if (!s) return null;
    if (s.role === "student" || s.role === "parent") {
      const st = db.students[s.id]; if (!st) return null;
      return s.role === "student" ? { role: "student", id: st.id, name: st.name, mustChange: !!st.mustChange }
        : { role: "parent", id: st.id, name: st.guardian || `Parent of ${st.name}`, studentName: st.name, mustChange: !!st.parentMustChange };
    }
    if (!TEACHERS[s.id] || !db.teachers[s.id]) return null;
    return { role: ADMINS.includes(s.id) ? "admin" : "teacher", id: s.id, staffId: STAFF_ID[s.id], name: TEACHERS[s.id].name, mustChange: !!db.teachers[s.id].mustChange };
  };
  const profile = (s) => ({ id: s.id, name: s.name, level: s.level, campus: s.campus, section: s.section, guardian: s.guardian, phone: s.phone, subjects: s.subjects, joined: s.joined });
  const teachesStudent = (tid, s) => ADMINS.includes(tid) || s.subjects.some((x) => teacherAt(x, s.campus, s.level).id === tid);
  const teachesSubject = (tid, s, x) => ADMINS.includes(tid) || (s.subjects.includes(x) && teacherAt(x, s.campus, s.level).id === tid);
  const refreshFees = (s) => { const t = iso(new Date()); (s.fees || []).forEach((f) => { if (f.status !== "paid") f.status = `${f.month}-01` <= t ? "due" : "upcoming"; }); };
  const recordFor = (s, full) => { refreshFees(s); const r = { profile: profile(s), tests: s.tests, tasks: s.tasks, att: s.att, remarks: s.remarks, planner: s.planner }; if (full) r.fees = s.fees; return r; };
  const noticesFor = (s) => db.notices.filter((n) => { const to = n.to || { type: "all" }; return to.type === "all" || (to.type === "campus" && to.campus === s.campus) || (to.type === "class" && to.campus === s.campus && s.subjects.includes(to.subject) && (!to.level || to.level === s.level)); });
  const log = (by, text) => { if (by && text) { db.log.unshift({ by, text, at: now() }); db.log = db.log.slice(0, 200); } };
  const E = (code, error) => { throw { code, error }; };
  const need = (...roles) => { const me = whoAmI(session()); if (!me) E(401, "Please log in"); if (roles.length && !roles.includes(me.role)) E(403, "Not allowed"); return me; };
  function validateStudent(b) {
    const st = { name: clean(b.name, 80), level: b.level, campus: b.campus, section: clean(b.section, 12), guardian: clean(b.guardian, 80), phone: clean(b.phone, 30),
      subjects: Array.isArray(b.subjects) ? [...new Set(b.subjects)].filter((x) => SUBJECTS.find((s) => s.id === x && s.levels.includes(b.level))) : [] };
    if (!st.name) E(400, "Student name is required");
    if (!LEVELS.includes(st.level)) E(400, "Choose a level");
    if (!CAMPUSES.includes(st.campus)) E(400, "Choose a campus");
    if (!st.subjects.length) E(400, "Choose at least one subject");
    return st;
  }
  const makeFees = (st) => { const f = [], t = new Date(); for (let i = 0; i < 6; i++) { const m = new Date(t.getFullYear(), t.getMonth() + i, 1), mm = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`; f.push({ id: `F-${st.id.slice(-4)}-${mm.replace("-", "")}`, month: mm, amount: st.subjects.length * db.settings.fees[st.level], due: iso(new Date(m.getFullYear(), m.getMonth(), db.settings.dueDay)), status: "upcoming", paidOn: null }); } return f; };

  // ---------- routes ----------
  const R = [];
  const route = (m, p, h) => R.push({ m, re: new RegExp("^" + p.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$"), h });
  route("POST", "/api/login", (b) => {
    const q = clean(b.id, 60).toLowerCase(), pw = String(b.password || "");
    let role = null, id = null, ok = false;
    if (b.role === "student" || b.role === "parent") {
      const s = Object.values(db.students).find((x) => x.id.toLowerCase() === q);
      if (s) { role = b.role; id = s.id; ok = pw === (b.role === "parent" ? s.ppw : s.pw); }
    } else {
      const tid = TEACHER_IDS.find((t) => STAFF_ID[t].toLowerCase() === q || t === q || TEACHERS[t].name.toLowerCase() === q);
      if (tid) { role = "teacher"; id = tid; ok = pw === db.teachers[tid].pw; }
    }
    if (!ok) E(401, b.role === "student" ? "Student ID or password is incorrect." : b.role === "parent" ? "Student ID or parent password is incorrect." : "Staff ID or password is incorrect.");
    setSession({ role, id }); return { me: whoAmI({ role, id }) };
  });
  route("POST", "/api/logout", () => { setSession(null); return { ok: true }; });
  route("GET", "/api/me", () => ({ me: whoAmI(session()) }));
  route("POST", "/api/me/password", (b) => {
    const me = need(), rec = me.role === "student" || me.role === "parent" ? db.students[me.id] : db.teachers[me.id];
    const k = me.role === "parent" ? "ppw" : "pw";
    if (String(b.old || "") !== rec[k]) E(400, "Current password is incorrect.");
    if (String(b.new || "").length < 8) E(400, "New password must be at least 8 characters.");
    rec[k] = String(b.new); if (me.role === "parent") rec.parentMustChange = false; else rec.mustChange = false;
    return { ok: true };
  });
  route("GET", "/api/state", () => {
    const me = need(), out = { me, settings: db.settings, students: {}, notices: [], log: [] };
    if (me.role === "student" || me.role === "parent") { const s = db.students[me.id]; out.students[s.id] = recordFor(s, true); out.notices = noticesFor(s); }
    else {
      Object.values(db.students).forEach((s) => { if (teachesStudent(me.id, s)) out.students[s.id] = recordFor(s, me.role === "admin"); });
      out.notices = db.notices; out.log = db.log.filter((l) => me.role === "admin" || l.by === me.id).slice(0, 60);
      if (me.role === "admin") {
        out.enquiries = db.enquiries; out.results = db.results; out.testimonials = db.testimonials;
        out.parentAccounts = Object.fromEntries(Object.values(db.students).map((s) => [s.id, { set: !!s.ppw, mustChange: !!s.parentMustChange }]));
        out.teacherAccounts = Object.fromEntries(TEACHER_IDS.map((t) => [t, { staffId: STAFF_ID[t], mustChange: !!db.teachers[t].mustChange }]));
      }
    }
    return JSON.parse(JSON.stringify(out));
  });
  route("PUT", "/api/students/:id", (b, p) => {
    const me = need(), s = db.students[p.id]; if (!s) E(404, "Student not found");
    if (me.role === "parent") E(403, "The parent view is read-only");
    if (me.role === "student") {
      if (me.id !== s.id) E(403, "Not allowed");
      if (b.planner && typeof b.planner === "object") s.planner = b.planner;
      if (Array.isArray(b.tasks)) { const d = new Map(b.tasks.map((t) => [t.id, !!t.done])); s.tasks.forEach((t) => { if (d.has(t.id)) { t.done = d.get(t.id); t.doneAt = t.done ? now() : null; } }); }
      return { ok: true };
    }
    if (!teachesStudent(me.id, s)) E(403, "This student is not in your classes");
    const mine = (x) => teachesSubject(me.id, s, x.s);
    ["tests", "tasks", "remarks"].forEach((k) => { if (Array.isArray(b[k])) s[k] = [...s[k].filter((x) => !mine(x)), ...b[k].filter((x) => x && typeof x === "object" && mine(x))]; });
    if (b.att && typeof b.att === "object") Object.entries(b.att).forEach(([m, days]) => { if (days && typeof days === "object") s.att[m] = { ...(s.att[m] || {}), ...days }; });
    return { ok: true };
  });
  route("POST", "/api/me/planner", (b) => {
    const me = need("student"), s = db.students[me.id];
    if (!SUBJECTS.find((x) => x.id === b.subject)) E(400, "Unknown subject");
    const added = !s.planner.subjects.includes(b.subject); if (added) s.planner.subjects.push(b.subject);
    return { added };
  });
  route("POST", "/api/notices", (b) => {
    const me = need("teacher", "admin"), to = b.to || {};
    if (me.role !== "admin" && to.type !== "class") E(403, "Teachers can post to their own classes only");
    const n = { id: rid(), t: clean(b.t, 120), body: clean(b.body, 1000), tag: clean(b.tag, 20) || "Class", d: iso(new Date()), to, by: me.id };
    if (!n.t || !n.body) E(400, "Title and message are required");
    db.notices.unshift(n); log(me.id, `posted a notice: "${n.t}"`); return { notice: n };
  });
  route("DELETE", "/api/notices/:id", (b, p) => {
    const me = need("teacher", "admin"), n = db.notices.find((x) => x.id === p.id); if (!n) E(404, "Not found");
    if (me.role !== "admin" && n.by !== me.id) E(403, "Not allowed");
    db.notices = db.notices.filter((x) => x.id !== p.id); log(me.id, "deleted a notice"); return { ok: true };
  });
  route("POST", "/api/log", (b) => { const me = need("teacher", "admin"); log(me.id, clean(b.text, 200)); return { ok: true }; });
  route("POST", "/api/enquiries", (b) => {
    const e = { id: rid(), name: clean(b.name, 80), phone: clean(b.phone, 30), level: clean(b.level, 30), campus: clean(b.campus, 40), subjects: clean(b.subjects, 300), teacher: clean(b.teacher, 400), at: now(), status: "new" };
    if (!e.name || e.phone.replace(/\D/g, "").length < 10) E(400, "Name and a valid phone number are required");
    db.enquiries.unshift(e); return { ok: true };
  });
  route("PATCH", "/api/admin/enquiries/:id", (b, p) => {
    const me = need("admin"), e = db.enquiries.find((x) => x.id === p.id); if (!e) E(404, "Not found");
    if (["new", "contacted", "enrolled", "closed"].includes(b.status)) e.status = b.status;
    if (b.note !== undefined) e.note = clean(b.note, 300);
    log(me.id, `marked enquiry from ${e.name} as ${e.status}`); return { ok: true };
  });
  route("POST", "/api/admin/students", (b) => {
    const me = need("admin"), st = validateStudent(b); db.seq += 1;
    const id = `SKH-${new Date().getFullYear()}-${String(db.seq).padStart(4, "0")}`, pw = newPw(), ppw = newPw();
    const rec = { id, ...st, joined: iso(new Date()), pw, ppw, mustChange: true, parentMustChange: true, tests: [], tasks: [], att: {}, remarks: [], planner: { subjects: [...st.subjects], months: {}, weeks: {}, todos: {}, check: {} } };
    rec.fees = makeFees(rec); db.students[id] = rec;
    if (b.enquiryId) { const e = db.enquiries.find((x) => x.id === b.enquiryId); if (e) { e.status = "enrolled"; e.studentId = id; } }
    log(me.id, `enrolled ${st.name} (${id}) at ${st.campus}`); return { id, password: pw, parentPassword: ppw };
  });
  route("PUT", "/api/admin/students/:id", (b, p) => {
    const me = need("admin"), s = db.students[p.id]; if (!s) E(404, "Not found");
    const st = validateStudent(b), fc = st.level !== s.level || st.subjects.join() !== s.subjects.join();
    Object.assign(s, st); if (fc) s.fees.forEach((f) => { if (f.status !== "paid") f.amount = s.subjects.length * db.settings.fees[s.level]; });
    log(me.id, `updated ${s.name}'s details`); return { ok: true };
  });
  route("DELETE", "/api/admin/students/:id", (b, p) => { const me = need("admin"), s = db.students[p.id]; if (!s) E(404, "Not found"); delete db.students[p.id]; log(me.id, `removed student ${s.name} (${s.id})`); return { ok: true }; });
  route("POST", "/api/admin/students/:id/reset-password", (b, p) => {
    const me = need("admin"), s = db.students[p.id]; if (!s) E(404, "Not found"); const pw = newPw();
    if (b.who === "parent") { s.ppw = pw; s.parentMustChange = true; } else { s.pw = pw; s.mustChange = true; }
    log(me.id, `reset the ${b.who === "parent" ? "parent" : "student"} password for ${s.name}`); return { password: pw };
  });
  route("POST", "/api/admin/teachers/:id/reset-password", (b, p) => { const me = need("admin"); if (!db.teachers[p.id]) E(404, "Not found"); const pw = newPw(); db.teachers[p.id] = { pw, mustChange: true }; log(me.id, `reset password for ${TEACHERS[p.id].name}`); return { password: pw }; });
  route("POST", "/api/admin/fees/:sid/:fid", (b, p) => {
    const me = need("admin"), s = db.students[p.sid], f = s && s.fees.find((x) => x.id === p.fid); if (!f) E(404, "Not found");
    if (b.status === "paid") { f.status = "paid"; f.paidOn = iso(new Date()); } else { f.status = "due"; f.paidOn = null; refreshFees(s); }
    log(me.id, `marked ${s.name}'s ${f.month} fee as ${f.status}`); return { ok: true };
  });
  route("PUT", "/api/admin/settings", (b) => {
    const me = need("admin");
    LEVELS.forEach((l) => { const v = Number(b.fees && b.fees[l]); if (v >= 0) db.settings.fees[l] = Math.round(v); });
    if (Number(b.lateFee) >= 0) db.settings.lateFee = Math.round(Number(b.lateFee));
    if (b.bank !== undefined) db.settings.bank = clean(b.bank, 200);
    Object.values(db.students).forEach((s) => s.fees.forEach((f) => { if (f.status !== "paid") f.amount = s.subjects.length * db.settings.fees[s.level]; }));
    log(me.id, "updated fee settings"); return { settings: db.settings };
  });
  route("GET", "/api/public", () => ({ campuses: db.settings.campuses, results: db.results, testimonials: db.testimonials.filter((t) => t.consent) }));
  route("PUT", "/api/admin/campuses", (b) => { const me = need("admin"); CAMPUSES.forEach((c) => { const x = (b.campuses || {})[c]; if (x) db.settings.campuses[c] = { phone: clean(x.phone, 40), timings: clean(x.timings, 200), map: clean(x.map, 500) }; }); log(me.id, "updated campus details on the website"); return { ok: true }; });
  route("POST", "/api/admin/results", (b) => { const me = need("admin"), r = { id: rid(), name: clean(b.name, 60), subject: clean(b.subject, 40), level: clean(b.level, 20), grade: clean(b.grade, 6), year: clean(b.year, 12) }; if (!r.name || !r.grade || !r.subject) E(400, "Name, subject and grade are required"); db.results.unshift(r); log(me.id, `added a result: ${r.name} — ${r.grade}`); return { result: r }; });
  route("DELETE", "/api/admin/results/:id", (b, p) => { const me = need("admin"); db.results = db.results.filter((x) => x.id !== p.id); log(me.id, "removed a result"); return { ok: true }; });
  route("POST", "/api/admin/testimonials", (b) => { const me = need("admin"), t = { id: rid(), name: clean(b.name, 60), role: clean(b.role, 80), text: clean(b.text, 600), consent: !!b.consent, at: now() }; if (!t.name || !t.text) E(400, "Name and testimonial text are required"); if (!t.consent) E(400, "Only publish a testimonial the person has agreed to share"); db.testimonials.unshift(t); log(me.id, `added a testimonial from ${t.name}`); return { testimonial: t }; });
  route("DELETE", "/api/admin/testimonials/:id", (b, p) => { const me = need("admin"); db.testimonials = db.testimonials.filter((x) => x.id !== p.id); log(me.id, "removed a testimonial"); return { ok: true }; });
  route("GET", "/api/content", () => JSON.parse(JSON.stringify(db.content)));
  route("PUT", "/api/admin/teachers/:id/profile", (b, p) => {
    const me = need("admin"); if (!TEACHERS[p.id]) E(404, "Teacher not found");
    if (b.reset) { delete db.content.teachers[p.id]; log(me.id, `reset ${TEACHERS[p.id].name}'s profile`); return { ok: true }; }
    const lines = (v, n) => (Array.isArray(v) ? v : String(v || "").split("\n")).map((x) => clean(x, 200)).filter(Boolean).slice(0, n);
    db.content.teachers[p.id] = { title: clean(b.title, 80), bio: clean(b.bio, 1200), timings: clean(b.timings, 160),
      facts: lines(b.facts, 8).map((l) => { const i = l.indexOf(":"); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ["", l]; }).filter(([, v]) => v),
      approach: lines(b.approach, 8), levels: (b.levels || []).filter((l) => LEVELS.includes(l)), campusList: (b.campusList || []).filter((c) => CAMPUSES.includes(c)) };
    log(me.id, `updated ${TEACHERS[p.id].name}'s profile`); return { ok: true };
  });
  route("PUT", "/api/admin/timetable", (b) => {
    const me = need("admin"), [campus, level] = String(b.key || "").split("|");
    if (!CAMPUSES.includes(campus) || !LEVELS.includes(level)) E(400, "Choose a campus and level");
    if (!b.grid) delete db.content.timetable[b.key];
    else { const g = {}; DAYS.forEach((d) => (g[d] = [0, 1, 2].map((i) => { const v = (b.grid[d] || [])[i]; return SUBJECTS.find((x) => x.id === v) ? v : null; }))); db.content.timetable[b.key] = g; }
    log(me.id, `${b.grid ? "updated" : "reset"} the ${level} timetable at ${campus}`); return { ok: true };
  });
  route("PUT", "/api/admin/news", (b) => {
    const me = need("admin");
    db.content.news = (Array.isArray(b.news) ? b.news : []).slice(0, 12).map((n) => ({ id: clean(n.id, 20) || rid(), tag: clean(n.tag, 24), title: clean(n.title, 120), text: clean(n.text, 400), link: /^https?:\/\//.test(n.link || "") ? clean(n.link, 400) : "" })).filter((n) => n.title);
    log(me.id, "updated the website news"); return { ok: true };
  });
  route("GET", "/api/admin/backups", () => { need("admin"); return { backups: [], dataDir: "this browser (demo)" }; });
  route("POST", "/api/admin/restore", (b) => {
    const me = need("admin");
    if (!b || !b.students || !b.teachers || !b.settings) E(400, "That file is not an SKH backup");
    db = Object.assign(seed(), b, { demo: true }); log(me.id, "restored the data from a backup"); return { ok: true };
  });

  // ---------- fake fetch / EventSource ----------
  const realFetch = window.fetch.bind(window);
  const reply = (code, obj) => new Response(JSON.stringify(obj), { status: code, headers: { "Content-Type": "application/json" } });
  window.fetch = async function (input, init = {}) {
    const url = typeof input === "string" ? input : input.url;
    const m = /\/?api\/[^?#]*/.exec(url);
    if (!m) return realFetch(input, init);
    const path = "/" + m[0].replace(/^\//, ""), method = (init.method || "GET").toUpperCase();
    let body = {}; try { body = init.body ? JSON.parse(init.body) : {}; } catch (e) {}
    load();
    for (const r of R) {
      if (r.m !== method) continue;
      const mm = r.re.exec(path); if (!mm) continue;
      try {
        const out = r.h(body, mm.groups || {});
        if (method !== "GET") { db._by = (init.headers && (init.headers["X-Client"] || init.headers["x-client"])) || ""; save(); }
        await new Promise((ok) => setTimeout(ok, 80)); // feel like a network
        return reply(200, out);
      } catch (e) { if (e && e.code) return reply(e.code, { error: e.error }); console.error(e); return reply(500, { error: "Demo error" }); }
    }
    return reply(404, { error: "Unknown API route" });
  };
  // live updates between open tabs (e.g. teacher portal ↔ student portal)
  window.EventSource = class {
    constructor() { this.l = []; window.addEventListener("storage", (e) => { if (e.key !== KEY) return; let by = ""; try { by = JSON.parse(e.newValue)._by; } catch (x) {} this.l.forEach((cb) => cb({ data: JSON.stringify({ by, at: now() }) })); }); }
    addEventListener(t, cb) { if (t === "change") this.l.push(cb); }
    close() { this.l = []; }
  };

  // ---------- demo UI: banner, demo accounts, backup download, reset ----------
  const ACCOUNTS = {
    teacher: [["SKH-T-101", "admin1234", "Sir Khurram Hussain", "Admin — sees everything"], [STAFF_ID.babar, "teach1234", "Sir Babar Hussain", "Physics teacher"], [STAFF_ID[teacherAt("ma", "Gulshan", "O Level").id], "teach1234", TEACHERS[teacherAt("ma", "Gulshan", "O Level").id].name, "Maths teacher"]],
    student: Object.values(db.students).slice(0, 4).map((s) => [s.id, "demo1234", s.name, `${s.level} · ${s.campus}`]),
    parent: Object.values(db.students).slice(0, 2).map((s) => [s.id, "parent1234", s.guardian, `Parent of ${s.name.split(" ")[0]}`]),
  };
  document.addEventListener("DOMContentLoaded", () => {
    const css = document.createElement("style");
    css.textContent = `.demo-bar{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:300;display:flex;gap:10px;align-items:center;padding:8px 10px 8px 14px;border-radius:30px;background:#e6187e;color:#fff;font:700 .74rem var(--sans,sans-serif);box-shadow:0 10px 30px -8px rgba(0,0,0,.5);white-space:nowrap}
      .demo-bar button{border:0;border-radius:20px;padding:6px 10px;background:rgba(255,255,255,.2);color:#fff;font:inherit;cursor:pointer}
      .in-app .demo-bar,.app:not([hidden]) ~ .demo-bar{left:auto;right:14px;transform:none}
      @media (max-width:1200px){.in-app .demo-bar,.app:not([hidden]) ~ .demo-bar{bottom:auto;top:8px;right:50%;transform:translateX(50%);padding:5px 6px 5px 10px}.in-app .demo-bar span,.app:not([hidden]) ~ .demo-bar span{display:none}}
      .demo-box{display:grid;gap:8px;padding:14px;border-radius:16px;border:1px dashed #e6187e;background:rgba(230,24,126,.06)}
      .demo-box p{margin:0;font-size:.78rem;font-weight:700;color:#e6187e;letter-spacing:.04em}
      .demo-box div{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
      .demo-box button{text-align:left;padding:8px 10px;border-radius:10px;border:1px solid var(--ivory-2,#ddd);background:var(--surface,#fff);color:var(--heading,#072062);cursor:pointer;font:700 .8rem var(--sans,sans-serif)}
      .demo-box button small{display:block;font-weight:500;color:var(--muted,#667);font-size:.7rem}
      @media (max-width:560px){.demo-bar{font-size:.66rem;gap:6px}}`;
    document.head.appendChild(css);
    const bar = document.createElement("div"); bar.className = "demo-bar";
    bar.innerHTML = `● DEMO<span> · sample data, saved in this browser</span> <button type="button" title="Delete all changes and start again">Reset demo</button>`;
    bar.querySelector("button").onclick = (e) => {
      const b = e.target; if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = "Click to confirm"; setTimeout(() => { delete b.dataset.armed; b.textContent = "Reset demo"; }, 3000); return; }
      localStorage.removeItem(KEY); localStorage.removeItem(SKEY); location.reload();
    };
    document.body.appendChild(bar);
    // demo accounts on the login pages
    const form = document.getElementById("loginForm");
    if (form) {
      const isTeacher = !!document.getElementById("tid");
      const box = document.createElement("div"); box.className = "demo-box";
      const draw = () => {
        const who = isTeacher ? "teacher" : (document.querySelector("#whoToggle .is-on") || {}).dataset?.who || "student";
        box.innerHTML = `<p>DEMO ACCOUNTS — tap one to fill in</p><div>${ACCOUNTS[who].map(([id, pw, n, sub]) => `<button type="button" data-id="${id}" data-pw="${pw}">${n}<small>${sub}</small></button>`).join("")}</div>`;
      };
      draw();
      box.addEventListener("click", (e) => {
        const b = e.target.closest("[data-id]"); if (!b) return;
        document.getElementById(isTeacher ? "tid" : "sid").value = b.dataset.id;
        document.getElementById(isTeacher ? "tpw" : "spw").value = b.dataset.pw;
      });
      const btn = document.getElementById("loginBtn"); btn.insertAdjacentElement("afterend", box);
      const note = document.querySelector(".login__note");
      if (note && isTeacher) note.textContent = "Demo: tap an account above. With the real server, staff logins come from CREDENTIALS.txt.";
      const tg = document.getElementById("whoToggle"); if (tg) tg.addEventListener("click", () => setTimeout(draw, 0));
    }
    // "Download a backup" link → build the file in the browser
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href="api/admin/backup"]'); if (!a) return;
      e.preventDefault(); load();
      const url = URL.createObjectURL(new Blob([JSON.stringify(db, null, 1)], { type: "application/json" }));
      const d = document.createElement("a"); d.href = url; d.download = `SKH-demo-backup-${iso(new Date())}.json`; document.body.appendChild(d); d.click(); d.remove();
    }, true);
  });
})();
