// ===== SKH Solutions — Teacher Portal =====
// Teachers can only see and edit the students in their own classes
// (their subject, at the campuses they teach). The founder is an admin.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const sub = (id) => SUBJECTS.find((s) => s.id === id);
const pct = (m, o) => Math.round((m / o) * 100);
const grade = (p) => (p >= 90 ? "A*" : p >= 80 ? "A" : p >= 70 ? "B" : p >= 60 ? "C" : p >= 50 ? "D" : "E");
const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const initials = (name) => name.replace(/^(Sir|Miss|Mr\.|Mrs\.)\s/, "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const todayISO = () => isoDay(new Date());

// Staff IDs: SKH-T-101, SKH-T-102 … in the order teachers appear in data.js (same as the server)
const STAFF = {};
Object.keys(TEACHERS).forEach((id) => (STAFF[id] = staffIdOf(id)));

let ME = null;           // logged-in teacher id
let CLASSES = [];        // this teacher's classes
let current = null;      // selected class key
const isAdmin = () => ADMINS.includes(ME);

let toastTimer;
const toast = (msg) => {
  const t = $("#toast"); t.textContent = msg; t.classList.add("is-show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("is-show"), 2600);
};

// ================= LOGIN =================
$("#pwToggle").addEventListener("click", (e) => {
  const pw = $("#tpw"); const showIt = pw.type === "password";
  pw.type = showIt ? "text" : "password"; e.target.textContent = showIt ? "Hide" : "Show";
});

const loginError = (msg) => {
  const err = $("#loginErr");
  err.textContent = msg; err.hidden = false;
  $("#loginForm").classList.remove("shake"); void $("#loginForm").offsetWidth; $("#loginForm").classList.add("shake");
};
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("#tid").value.trim(), pw = $("#tpw").value;
  if (!id || !pw) return loginError("Enter your Staff ID and password.");
  $("#loginErr").hidden = true;
  const btn = $("#loginBtn"); btn.classList.add("is-loading"); btn.disabled = true;
  try {
    const me = await DB.login("teacher", id, pw);
    await DB.load();
    $("#login").classList.add("is-leaving");
    setTimeout(() => {
      enterApp(me);
      $("#tpw").value = "";
      const n = new Set(CLASSES.flatMap((c) => c.students)).size;
      toast(isAdmin() ? `Admin access · ${n} students across ${CLASSES.length} classes` : n ? `You can manage ${n} students in ${CLASSES.length} classes` : "No students in your classes yet");
    }, 450);
  } catch (x) {
    loginError(x.message);
  } finally {
    btn.classList.remove("is-loading"); btn.disabled = false;
  }
});
function enterApp(me) {
  ME = me.id;
  document.body.classList.toggle("is-admin", me.role === "admin");
  $("#login").hidden = true; $("#app").hidden = false;
  initApp();
  if (me.mustChange) setTimeout(() => passwordDialog({ forced: true }).then((ok) => ok && toast("✓ Password changed")), 800);
}

$("#logout").addEventListener("click", async () => {
  await DB.logout();
  ME = null; show("dash"); closeDrawer();
  document.body.classList.remove("is-admin");
  $("#app").hidden = true; $("#login").hidden = false; $("#login").classList.remove("is-leaving");
  toast("You have been logged out");
});
$("#changePw").addEventListener("click", () => passwordDialog().then((ok) => ok && toast("✓ Password changed")));
watchSaves($("#syncChip"), (m) => toast(m));
// two-click confirm without browser dialogs
function confirmInline(btn, msg) {
  if (btn.dataset.armed) { delete btn.dataset.armed; btn.querySelector("span").textContent = btn.dataset.label; return true; }
  btn.dataset.armed = "1"; btn.dataset.label = btn.querySelector("span").textContent;
  btn.querySelector("span").textContent = msg;
  setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.querySelector("span").textContent = btn.dataset.label; } }, 3000);
  return false;
}

// ================= APP SHELL =================
const TITLES = { dash: "Dashboard", classes: "My Students", marks: "Enter Marks", attend: "Attendance", tasks: "Assignments", notice: "Notices" };
let navBuilt = false;

function initApp() {
  const t = TEACHERS[ME];
  CLASSES = DB.classesOf(ME);
  if (!CLASSES.find((c) => c.key === current)) current = CLASSES[0] ? CLASSES[0].key : null;
  const h = new Date().getHours();
  $("#hello").textContent = `${h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"}, ${t.name} 👋`;
  $("#userAv").textContent = t.initials;
  $("#userName").textContent = t.name;
  $("#userMeta").textContent = `${STAFF[ME]} · ${isAdmin() ? "Founder · Admin" : sub(t.subjects[0]).name}`;
  $("#roleChip").textContent = isAdmin() ? "Admin access" : "Teacher";
  if (!navBuilt) { navBuilt = true; buildNav(); }
  fillClassSelects();
  renderAll();
}
function renderAll() {
  renderDash(); renderRoster(); renderMarksEntry(); renderTests(); renderAttendance(); renderTasks(); renderNotices();
}

function buildNav() {
  $("#bottomNav").innerHTML = $$("#sideNav button").map((b) => `<button data-view="${b.dataset.view}" class="${b.classList.contains("is-active") ? "is-active" : ""} ${b.classList.contains("admin-only") ? "admin-only" : ""}">${b.querySelector("svg").outerHTML}<span>${b.querySelector("span").textContent}</span></button>`).join("");
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-view]");
    if (b) show(b.dataset.view);
  });
}
function show(v) {
  $$("[data-view]").forEach((b) => b.classList.toggle("is-active", b.dataset.view === v));
  $$(".view").forEach((s) => s.classList.toggle("is-active", s.dataset.v === v));
  $("#viewTitle").textContent = TITLES[v];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ----- class selectors (shared across views) -----
const classLabel = (c) => `${sub(c.subject).name} · ${c.level} · ${c.campus} (${c.students.length})`;
function fillClassSelects() {
  const groups = {};
  CLASSES.forEach((c) => (groups[sub(c.subject).name] = groups[sub(c.subject).name] || []).push(c));
  const html = Object.entries(groups).map(([name, list]) =>
    `<optgroup label="${name}">${list.map((c) => `<option value="${c.key}">${classLabel(c)}</option>`).join("")}</optgroup>`).join("");
  $$(".class-select").forEach((s) => { s.innerHTML = html || `<option value="">No classes</option>`; s.value = current || ""; });
}
document.addEventListener("change", (e) => {
  if (!e.target.classList.contains("class-select")) return;
  current = e.target.value;
  $$(".class-select").forEach((s) => (s.value = current));
  renderRoster(); renderMarksEntry(); renderTests(); renderAttendance(); renderTasks();
});
const cls = () => CLASSES.find((c) => c.key === current);
const openClass = (key, view) => { current = key; $$(".class-select").forEach((s) => (s.value = key)); renderAll(); show(view); };

// ----- per-student stats for a subject -----
function statsFor(sid, subject) {
  const rec = DB.student(sid);
  const tests = rec.tests.filter((t) => t.s === subject).sort((a, b) => a.d.localeCompare(b.d));
  const avg = tests.length ? Math.round(tests.reduce((s, t) => s + pct(t.m, t.o), 0) / tests.length) : null;
  const all = Object.values(rec.att).flatMap((m) => Object.values(m));
  const p = all.filter((x) => x === "p" || x === "l").length, a = all.filter((x) => x === "a").length;
  const att = p + a ? Math.round((p / (p + a)) * 100) : 100;
  const pending = rec.tasks.filter((t) => t.s === subject && !t.done).length;
  return { tests, avg, last: tests[tests.length - 1], att, pending };
}

// ================= DASHBOARD =================
function renderDash() {
  const studentIds = [...new Set(CLASSES.flatMap((c) => c.students))];
  const pairs = CLASSES.flatMap((c) => c.students.map((s) => [s, c.subject]));
  const avgs = pairs.map(([s, subj]) => statsFor(s, subj).avg).filter((x) => x !== null);
  const classAvg = avgs.length ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : 0;
  const pending = pairs.reduce((n, [s, subj]) => n + statsFor(s, subj).pending, 0);
  const k = [
    { l: isAdmin() ? "All students" : "My students", v: studentIds.length, sub: `${CLASSES.length} classes`, icon: "👥" },
    { l: "Class average", v: classAvg + "%", sub: `Grade ${grade(classAvg)}`, icon: "★" },
    { l: "Pending work", v: pending, sub: "Assignments not submitted", icon: "✎" },
    { l: "Attendance today", v: attendanceTodayDone() + "/" + CLASSES.length, sub: "Classes marked", icon: "✓" },
  ];
  $("#kpis").innerHTML = k.map((x, i) => `<div class="kpi" style="--d:${i * 80}ms"><span class="kpi__icon">${x.icon}</span><small>${x.l}</small><strong>${x.v}</strong><em>${x.sub}</em></div>`).join("");

  $("#classCount").textContent = `${CLASSES.length} classes`;
  $("#classCards").innerHTML = CLASSES.map((c) => {
    const s = sub(c.subject);
    const av = c.students.map((id) => statsFor(id, c.subject).avg).filter((x) => x !== null);
    const a = av.length ? Math.round(av.reduce((x, y) => x + y, 0) / av.length) : 0;
    const marked = isClassMarked(c, todayISO());
    return `<article class="class-card class-card--${s.cat}">
      <div class="class-card__top"><b>${s.sym}</b><div><strong>${s.name}</strong><small>${c.level} · ${c.campus}</small></div></div>
      <div class="class-card__stats">
        <span><em>${c.students.length}</em>students</span>
        <span><em>${a}%</em>average</span>
        <span class="${marked ? "ok" : "warn"}"><em>${marked ? "✓" : "!"}</em>${marked ? "marked today" : "attendance due"}</span>
      </div>
      <div class="class-card__actions">
        <button data-open="${c.key}" data-to="classes">Students</button>
        <button data-open="${c.key}" data-to="marks">Marks</button>
        <button data-open="${c.key}" data-to="attend">Attendance</button>
      </div>
    </article>`;
  }).join("") || `<div class="empty-state"><b>No classes yet</b>${isAdmin() ? "Enrol students in <em>Manage Students</em> — their classes appear here automatically." : "When the admin enrols students in your subject at your campuses, your classes appear here."}</div>`;

  // needs attention
  const low = pairs.map(([s, subj]) => ({ s, subj, st: statsFor(s, subj) })).filter((x) => x.st.avg !== null && x.st.avg < 70).sort((a, b) => a.st.avg - b.st.avg).slice(0, 6);
  $("#attention").innerHTML = low.map((x) => `<li><button data-student="${x.s}" data-subject="${x.subj}">
      <span class="av">${initials(STUDENTS[x.s].name)}</span>
      <div><strong>${STUDENTS[x.s].name}</strong><small>${sub(x.subj).name} · ${STUDENTS[x.s].campus}</small></div>
      <em class="pill-low">${x.st.avg}%</em></button></li>`).join("") || `<li class="empty">Everyone is above 70% — great work! ✦</li>`;

  // activity
  const log = DB.state.log.filter((l) => isAdmin() || l.by === ME).slice(0, 8);
  $("#activityScope").textContent = isAdmin() ? "All teachers" : "Your changes";
  $("#activity").innerHTML = log.map((l) => `<li><span class="dot"></span><div><p>${isAdmin() && l.by !== ME ? `<b>${esc((TEACHERS[l.by] || {}).name || l.by)}</b> ` : ""}${esc(l.text)}</p><small>${timeAgo(l.at)}</small></div></li>`).join("") || `<li class="empty">No changes yet. Enter marks or attendance to see them here.</li>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-open]"); if (b) openClass(b.dataset.open, b.dataset.to);
  const s = e.target.closest("[data-student]"); if (s) openStudent(s.dataset.student, s.dataset.subject);
});
const timeAgo = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : fmt(t); };

// ================= MY STUDENTS (roster) =================
function renderRoster() {
  const c = cls(); if (!c) { $("#rosterBody").innerHTML = ""; return; }
  $("#rosterTitle").textContent = `${sub(c.subject).name} · ${c.level} · ${c.campus}`;
  const q = ($("#rosterSearch").value || "").trim().toLowerCase();
  $("#rosterBody").innerHTML = c.students.filter((id) => !q || id.toLowerCase().includes(q) || STUDENTS[id].name.toLowerCase().includes(q)).map((id) => {
    const st = STUDENTS[id], x = statsFor(id, c.subject);
    return `<tr class="roster__row" data-student="${id}" data-subject="${c.subject}" tabindex="0">
      <td><div class="who"><span class="av">${initials(st.name)}</span><div><strong>${st.name}</strong><small>${id}</small></div></div></td>
      <td>${st.section}</td>
      <td><span class="pill ${x.att >= 90 ? "pill--good" : x.att >= 75 ? "pill--mid" : "pill--bad"}">${x.att}%</span></td>
      <td>${x.avg === null ? "—" : `<div class="score"><div class="score__bar"><i style="width:${x.avg}%"></i></div><span>${x.avg}%</span></div>`}</td>
      <td>${x.last ? `${x.last.m}/${x.last.o} <small class="muted">${esc(x.last.t)}</small>` : "—"}</td>
      <td>${x.pending ? `<span class="pill pill--mid">${x.pending} pending</span>` : `<span class="pill pill--good">All done</span>`}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="6" class="empty">No students found.</td></tr>`;
}
$("#rosterSearch").addEventListener("input", renderRoster);
document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.classList && e.target.classList.contains("roster__row")) e.target.click(); });

// ----- Student record drawer -----
const modal = $("#sModal");
let drawer = null; // { id, subject }
function openStudent(id, subject) {
  if (!DB.canEdit(ME, id, subject)) { toast("You can only open students from your own classes"); return; }
  drawer = { id, subject };
  renderDrawer();
  modal.classList.add("is-open"); modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeDrawer() { modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; drawer = null; }
$$("[data-close]", modal).forEach((b) => b.addEventListener("click", closeDrawer));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("is-open")) closeDrawer(); });

function renderDrawer() {
  const { id, subject } = drawer;
  const st = STUDENTS[id], s = sub(subject), x = statsFor(id, subject), rec = DB.student(id);
  $("#sTag").textContent = `${s.name} · editable by you`;
  const remarks = (rec.remarks || []).filter((r) => r.s === subject).sort((a, b) => b.at - a.at);
  $("#sBody").innerHTML = `
    <div class="m-teacher">
      <div class="m-teacher__photo"><span>${initials(st.name)}</span></div>
      <div>
        <p class="kicker">${st.level} · Section ${st.section}</p>
        <h3 id="sTitle">${st.name}</h3>
        <div class="m-levels"><span>${id}</span><span>${st.campus}</span><span>Guardian: ${st.guardian}</span></div>
      </div>
    </div>
    <div class="m-facts">
      <div><small>${s.name} average</small><strong>${x.avg === null ? "—" : x.avg + "% · " + grade(x.avg)}</strong></div>
      <div><small>Attendance</small><strong>${x.att}%</strong></div>
      <div><small>Pending work</small><strong>${x.pending}</strong></div>
    </div>

    <h4 class="m-h">${s.name} marks</h4>
    <div class="d-tests">${x.tests.map((t) => `
      <div class="d-test" data-tid="${t.id}">
        <div><strong>${esc(t.t)}</strong><small>${fmt(t.d)}</small></div>
        <input type="number" min="0" max="${t.o}" value="${t.m}" aria-label="Marks for ${esc(t.t)}"><span>/ ${t.o}</span>
        <button class="d-del" data-del-test="${t.id}" aria-label="Delete test">✕</button>
      </div>`).join("") || `<p class="d-empty">No ${s.name} tests yet.</p>`}
    </div>
    ${x.tests.length ? `<button class="btn btn--gold btn--sm" id="dSaveMarks">Save marks</button>` : ""}

    <h4 class="m-h">Remarks for ${st.name.split(" ")[0]}</h4>
    <div class="d-remark">
      <textarea id="dRemark" rows="3" placeholder="Write a remark — the student sees it on their dashboard"></textarea>
      <button class="btn btn--gold btn--sm" id="dAddRemark">Add remark</button>
    </div>
    <ul class="d-remarks">${remarks.map((r) => `<li><p>${esc(r.text)}</p><small>${esc((TEACHERS[r.by] || {}).name || "Teacher")} · ${fmt(r.at)}</small></li>`).join("") || `<li class="d-empty">No remarks yet.</li>`}</ul>`;

  const saveBtn = $("#dSaveMarks");
  if (saveBtn) saveBtn.addEventListener("click", () => {
    let changed = 0;
    $$(".d-test", $("#sBody")).forEach((row) => {
      const t = rec.tests.find((x) => x.id === row.dataset.tid);
      const v = Math.max(0, Math.min(t.o, Number(row.querySelector("input").value)));
      if (t && v !== t.m) { t.m = v; t.by = ME; changed++; }
    });
    if (!changed) { toast("No changes to save"); return; }
    DB.addLog(ME, `updated ${changed} mark${changed > 1 ? "s" : ""} for ${st.name} (${s.name})`);
    DB.save(); renderAll(); renderDrawer(); toast(`✓ Marks saved for ${st.name}`);
  });
  $$("[data-del-test]", $("#sBody")).forEach((b) => b.addEventListener("click", () => {
    if (!confirmInlineBtn(b)) return;
    const i = rec.tests.findIndex((x) => x.id === b.dataset.delTest);
    const [t] = rec.tests.splice(i, 1);
    DB.addLog(ME, `deleted "${t.t}" for ${st.name}`);
    DB.save(); renderAll(); renderDrawer(); toast("Test deleted");
  }));
  $("#dAddRemark").addEventListener("click", () => {
    const text = $("#dRemark").value.trim();
    if (!text) { toast("Write a remark first"); return; }
    (rec.remarks = rec.remarks || []).push({ by: ME, s: subject, text, at: Date.now() });
    DB.addLog(ME, `added a remark for ${st.name}`);
    DB.save(); renderDrawer(); renderDash(); toast(`✓ Remark sent to ${st.name}`);
  });
}
function confirmInlineBtn(btn) {
  if (btn.dataset.armed) return true;
  btn.dataset.armed = "1"; btn.textContent = "Delete?"; btn.classList.add("is-armed");
  setTimeout(() => { delete btn.dataset.armed; btn.textContent = "✕"; btn.classList.remove("is-armed"); }, 2500);
  return false;
}

// ================= ENTER MARKS =================
function renderMarksEntry() {
  const c = cls(); if (!c) return;
  if (!$("#mDate").value) $("#mDate").value = todayISO();
  $("#mGrid").innerHTML = `<div class="entry-head"><span>Student</span><span>Marks</span></div>` + c.students.map((id) => `
    <label class="entry-row">
      <span class="who"><span class="av">${initials(STUDENTS[id].name)}</span><span><strong>${STUDENTS[id].name}</strong><small>${id}</small></span></span>
      <span class="entry-input"><input type="number" min="0" data-sid="${id}" placeholder="—"><em>/ <span class="outOf">${$("#mOut").value || 50}</span></em></span>
    </label>`).join("");
  $("#mHint").textContent = `${c.students.length} students · leave blank if absent`;
}
$("#mOut").addEventListener("input", () => $$(".outOf").forEach((s) => (s.textContent = $("#mOut").value || "?")));
$("#mSave").addEventListener("click", () => {
  const c = cls(); if (!c) return;
  const name = $("#mName").value.trim(), date = $("#mDate").value, out = Number($("#mOut").value);
  if (!name) { toast("Enter a test name"); $("#mName").focus(); return; }
  if (!date) { toast("Choose a date"); return; }
  if (!(out > 0)) { toast("'Out of' must be more than 0"); return; }
  const entries = $$("#mGrid input").filter((i) => i.value !== "");
  if (!entries.length) { toast("Enter at least one student's marks"); return; }
  const bad = entries.find((i) => Number(i.value) < 0 || Number(i.value) > out);
  if (bad) { bad.classList.add("is-invalid"); toast(`Marks must be between 0 and ${out}`); return; }
  const gid = uid();
  entries.forEach((i) => {
    DB.student(i.dataset.sid).tests.push({ id: `${gid}-${i.dataset.sid}`, gid, t: name, s: c.subject, d: date, m: Number(i.value), o: out, by: ME });
  });
  DB.addLog(ME, `entered "${name}" marks for ${entries.length} students (${sub(c.subject).name}, ${c.campus})`);
  DB.save();
  $("#mName").value = "";
  renderAll();
  toast(`✓ Marks saved — ${entries.length} students can see them now`);
});

// previous tests grouped by name
function renderTests() {
  const c = cls(); if (!c) return;
  const groups = {};
  c.students.forEach((id) => DB.student(id).tests.filter((t) => t.s === c.subject).forEach((t) => {
    (groups[t.t] = groups[t.t] || { name: t.t, d: t.d, rows: [] }).rows.push({ id, t });
    if (t.d > groups[t.t].d) groups[t.t].d = t.d;
  }));
  const list = Object.values(groups).sort((a, b) => b.d.localeCompare(a.d));
  $("#mList").innerHTML = list.map((g, gi) => {
    const avg = Math.round(g.rows.reduce((s, r) => s + pct(r.t.m, r.t.o), 0) / g.rows.length);
    return `<details class="test-group" data-g="${gi}">
      <summary><strong>${esc(g.name)}</strong><span>${fmt(g.d)}</span><span>${g.rows.length} students</span><span class="pill ${avg >= 80 ? "pill--good" : avg >= 65 ? "pill--mid" : "pill--bad"}">avg ${avg}%</span></summary>
      <div class="test-group__body">
        ${g.rows.map((r) => `<div class="d-test" data-sid="${r.id}" data-tid="${r.t.id}">
          <div><strong>${STUDENTS[r.id].name}</strong><small>${r.id}</small></div>
          <input type="number" min="0" max="${r.t.o}" value="${r.t.m}"><span>/ ${r.t.o}</span></div>`).join("")}
        <div class="form-actions">
          <button class="btn btn--gold btn--sm" data-save-group="${gi}">Save changes</button>
          <button class="btn btn--outline btn--sm btn--danger" data-del-group="${gi}">Delete test</button>
        </div>
      </div>
    </details>`;
  }).join("") || `<p class="empty">No tests yet for this class.</p>`;

  $$("[data-save-group]").forEach((b) => b.addEventListener("click", () => {
    const g = list[+b.dataset.saveGroup]; let changed = 0;
    $$(".d-test", b.closest(".test-group")).forEach((row) => {
      const t = DB.student(row.dataset.sid).tests.find((x) => x.id === row.dataset.tid);
      const v = Math.max(0, Math.min(t.o, Number(row.querySelector("input").value)));
      if (v !== t.m) { t.m = v; t.by = ME; changed++; }
    });
    if (!changed) { toast("No changes to save"); return; }
    DB.addLog(ME, `edited "${g.name}" marks (${changed} change${changed > 1 ? "s" : ""})`);
    DB.save(); renderAll(); toast("✓ Changes saved");
  }));
  $$("[data-del-group]").forEach((b) => b.addEventListener("click", () => {
    if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Click again to delete"; setTimeout(() => { delete b.dataset.armed; b.textContent = "Delete test"; }, 3000); return; }
    const g = list[+b.dataset.delGroup];
    g.rows.forEach((r) => { const rec = DB.student(r.id); rec.tests = rec.tests.filter((x) => x.id !== r.t.id); });
    DB.addLog(ME, `deleted test "${g.name}" (${sub(c.subject).name}, ${c.campus})`);
    DB.save(); renderAll(); toast("Test deleted");
  }));
}

// ================= ATTENDANCE =================
const attKey = (iso) => { const [y, m, d] = iso.split("-").map(Number); return [`${y}-${m - 1}`, d]; };
function isClassMarked(c, iso) {
  const [k, d] = attKey(iso);
  return c.students.every((id) => (DB.student(id).att[k] || {})[d]);
}
function attendanceTodayDone() { return CLASSES.filter((c) => isClassMarked(c, todayISO())).length; }

let draftAtt = {};
function renderAttendance() {
  const c = cls(); if (!c) return;
  if (!$("#aDate").value) $("#aDate").value = todayISO();
  const iso = $("#aDate").value;
  const [k, d] = attKey(iso);
  const dt = new Date(iso + "T12:00:00");
  $("#aTitle").textContent = `${sub(c.subject).name} · ${c.level} · ${c.campus} — ${dt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`;
  const warn = $("#aWarn");
  warn.hidden = !(dt.getDay() === 0 || iso > todayISO());
  warn.textContent = dt.getDay() === 0 ? "This is a Sunday — normally no classes." : "This date is in the future.";
  draftAtt = {};
  c.students.forEach((id) => (draftAtt[id] = (DB.student(id).att[k] || {})[d] || ""));
  drawAttRows(c);
  $("#aHint").textContent = isClassMarked(c, iso) ? "✓ Already marked — saving will update it" : "Not marked yet";
}
function drawAttRows(c) {
  $("#aGrid").innerHTML = c.students.map((id) => {
    const v = draftAtt[id];
    return `<div class="att-row">
      <span class="who"><span class="av">${initials(STUDENTS[id].name)}</span><span><strong>${STUDENTS[id].name}</strong><small>${id}</small></span></span>
      <div class="seg" role="group" aria-label="Attendance for ${STUDENTS[id].name}">
        ${[["p", "Present"], ["l", "Late"], ["a", "Absent"]].map(([code, label]) => `<button class="seg__btn seg--${code} ${v === code ? "is-on" : ""}" data-att="${id}" data-code="${code}">${label}</button>`).join("")}
      </div>
    </div>`;
  }).join("");
}
$("#aGrid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-att]"); if (!b) return;
  draftAtt[b.dataset.att] = b.dataset.code; drawAttRows(cls());
});
$("#aAll").addEventListener("click", () => { Object.keys(draftAtt).forEach((id) => (draftAtt[id] = "p")); drawAttRows(cls()); });
$("#aDate").addEventListener("change", renderAttendance);
$("#aSave").addEventListener("click", () => {
  const c = cls(); const iso = $("#aDate").value; const [k, d] = attKey(iso);
  const missing = Object.values(draftAtt).filter((v) => !v).length;
  if (missing) { toast(`Mark all students first (${missing} left)`); return; }
  Object.entries(draftAtt).forEach(([id, v]) => { const a = DB.student(id).att; (a[k] = a[k] || {})[d] = v; });
  const absent = Object.values(draftAtt).filter((v) => v === "a").length;
  DB.addLog(ME, `took attendance for ${sub(c.subject).name} ${c.level}, ${c.campus} on ${fmt(iso)} (${absent} absent)`);
  DB.save(); renderAll(); toast("✓ Attendance saved");
});

// ================= ASSIGNMENTS =================
function renderTasks() {
  const c = cls(); if (!c) return;
  if (!$("#kDue").value) { const d = new Date(); d.setDate(d.getDate() + 3); $("#kDue").value = isoDay(d); }
  const groups = {};
  c.students.forEach((id) => DB.student(id).tasks.filter((t) => t.s === c.subject).forEach((t) => {
    const g = (groups[t.gid || t.id] = groups[t.gid || t.id] || { gid: t.gid || t.id, t: t.t, due: t.due, rows: [] });
    g.rows.push({ id, done: t.done });
  }));
  const list = Object.values(groups).sort((a, b) => b.due.localeCompare(a.due));
  $("#kList").innerHTML = list.map((g) => {
    const done = g.rows.filter((r) => r.done).length;
    const over = g.due < todayISO();
    return `<article class="asg">
      <div class="asg__head">
        <div><strong>${esc(g.t)}</strong><small>Due ${fmt(g.due)}${over ? " · closed" : ""}</small></div>
        <div class="asg__prog"><div class="score__bar"><i style="width:${Math.round((done / g.rows.length) * 100)}%"></i></div><span>${done}/${g.rows.length} submitted</span></div>
        <button class="d-del" data-del-task="${g.gid}" aria-label="Delete assignment">✕</button>
      </div>
      <div class="asg__who">${g.rows.map((r) => `<span class="${r.done ? "is-done" : ""}">${r.done ? "✓" : "○"} ${STUDENTS[r.id].name}</span>`).join("")}</div>
    </article>`;
  }).join("") || `<p class="empty">No assignments yet for this class.</p>`;
  $$("[data-del-task]").forEach((b) => b.addEventListener("click", () => {
    if (!confirmInlineBtn(b)) return;
    c.students.forEach((id) => { const rec = DB.student(id); rec.tasks = rec.tasks.filter((t) => (t.gid || t.id) !== b.dataset.delTask || t.s !== c.subject); });
    DB.addLog(ME, `removed an assignment (${sub(c.subject).name}, ${c.campus})`);
    DB.save(); renderAll(); toast("Assignment removed");
  }));
}
$("#kAdd").addEventListener("click", () => {
  const c = cls(); const title = $("#kTitle").value.trim(); const due = $("#kDue").value;
  if (!title) { toast("Enter an assignment title"); $("#kTitle").focus(); return; }
  if (!due) { toast("Choose a due date"); return; }
  const gid = uid();
  c.students.forEach((id) => DB.student(id).tasks.push({ id: `${gid}-${id}`, gid, t: title, s: c.subject, due, done: false, by: ME }));
  DB.addLog(ME, `set "${title}" for ${c.students.length} students (${sub(c.subject).name}, ${c.campus})`);
  DB.save(); $("#kTitle").value = ""; renderAll();
  toast(`✓ Assigned to ${c.students.length} students`);
});

// ================= NOTICES =================
function renderNotices() {
  const opts = [];
  if (isAdmin()) opts.push(`<option value='${JSON.stringify({ type: "all" })}'>Everyone — all campuses</option>`);
  const campuses = [...new Set(CLASSES.map((c) => c.campus))];
  if (isAdmin()) campuses.forEach((cp) => opts.push(`<option value='${JSON.stringify({ type: "campus", campus: cp })}'>All students at ${cp}</option>`));
  CLASSES.forEach((c) => opts.push(`<option value='${JSON.stringify({ type: "class", subject: c.subject, level: c.level, campus: c.campus })}'>${classLabel(c)}</option>`));
  $("#nTo").innerHTML = opts.join("");
  const mine = DB.state.notices.filter((n) => isAdmin() || n.by === ME).sort((a, b) => b.d.localeCompare(a.d));
  $("#nListTitle").textContent = isAdmin() ? "All notices" : "Your notices";
  const audience = (to) => to.type === "all" ? "Everyone" : to.type === "campus" ? `${to.campus} campus` : `${sub(to.subject).name} · ${to.level} · ${to.campus}`;
  $("#nList").innerHTML = mine.map((n) => `<li class="notice">
      <span class="notice__tag">${esc(n.tag)}</span>
      <div><strong>${esc(n.t)}</strong><p>${esc(n.body)}</p><small class="notice__by">To: ${audience(n.to || { type: "all" })} · by ${TEACHERS[n.by] ? TEACHERS[n.by].name : "Admin"}</small></div>
      <div class="notice__side"><time>${fmt(n.d)}</time>${isAdmin() || n.by === ME ? `<button class="d-del" data-del-notice="${n.id}" aria-label="Delete notice">✕</button>` : ""}</div>
    </li>`).join("") || `<li class="empty">You haven't posted any notices yet.</li>`;
  $$("[data-del-notice]").forEach((b) => b.addEventListener("click", () => {
    if (!confirmInlineBtn(b)) return;
    DB.state.notices = DB.state.notices.filter((n) => n.id !== b.dataset.delNotice);
    DB.save(); renderNotices(); toast("Notice deleted");
  }));
}
$("#nPost").addEventListener("click", () => {
  const t = $("#nTitle").value.trim(), body = $("#nBody").value.trim();
  if (!t || !body) { toast("Add a title and a message"); return; }
  if (!$("#nTo").value) { toast("You have no classes to post to yet"); return; }
  const to = JSON.parse($("#nTo").value);
  DB.state.notices.unshift({ id: uid(), t, body, tag: $("#nTag").value, d: todayISO(), to, by: ME });
  DB.save(); $("#nTitle").value = ""; $("#nBody").value = ""; renderNotices(); renderDash();
  toast("✓ Notice posted to students");
});

// ================= live sync + theme =================
onDBChange(() => {
  if (!ME) return;
  CLASSES = DB.classesOf(ME);
  if (!CLASSES.find((c) => c.key === current)) current = CLASSES[0] ? CLASSES[0].key : null;
  // keep anything the teacher is typing in the marks / attendance forms
  const typed = Object.fromEntries($$("#mGrid input").map((i) => [i.dataset.sid, i.value]));
  const att = { ...draftAtt };
  fillClassSelects(); renderAll();
  $$("#mGrid input").forEach((i) => { if (typed[i.dataset.sid]) i.value = typed[i.dataset.sid]; });
  Object.keys(att).forEach((id) => { if (att[id] && id in draftAtt) draftAtt[id] = att[id]; });
  if (cls()) drawAttRows(cls());
  if (drawer && STUDENTS[drawer.id]) renderDrawer(); else if (drawer) closeDrawer();
});
(() => {
  const btn = $("#themeToggle");
  if (btn) btn.setAttribute("aria-checked", document.documentElement.dataset.theme === "dark");
  btn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("skh-theme", next); } catch (e) {} btn.setAttribute("aria-checked", next === "dark");
  });
})();

// =====================================================
//  SYLLABUS PROGRESS (read from students' planners)
// =====================================================
TITLES.syllabus = "Syllabus Progress";
function renderSyllabus() {
  const c = cls(); if (!c) return;
  const s = sub(c.subject);
  const rows = c.students.map((id) => ({ id, st: STUDENTS[id], pr: DB.syllabusProgress(id, c.subject) })).filter((r) => r.pr);
  if (!rows.length) { $("#syTop").innerHTML = `<div class="panel empty">No syllabus found for this class.</div>`; return; }
  const avg = Math.round(rows.reduce((n, r) => n + r.pr.pct, 0) / rows.length);
  const behind = rows.filter((r) => r.pr.pct < 15).length;
  // expected progress: share of the plan period (Sep → Apr) that has passed
  const start = new Date(2026, 8, 1), end = new Date(2027, 3, 1);
  const expected = Math.max(0, Math.min(100, Math.round(((new Date() - start) / (end - start)) * 100)));
  $("#syTop").innerHTML = `
    <div class="kpis">
      <div class="kpi"><span class="kpi__icon">📘</span><small>Class average</small><strong>${avg}%</strong><em>of the ${s.name} syllabus</em></div>
      <div class="kpi"><span class="kpi__icon">🎯</span><small>Expected by now</small><strong>${expected}%</strong><em>on the Sep → Apr plan</em></div>
      <div class="kpi"><span class="kpi__icon">⚠️</span><small>Falling behind</small><strong>${behind}</strong><em>below 15% progress</em></div>
      <div class="kpi"><span class="kpi__icon">🧾</span><small>Syllabus</small><strong style="font-size:1.6rem">${rows[0].pr.code}</strong><em>${rows[0].pr.topics.length} topics · ${rows[0].pr.subs} sub-topics</em></div>
    </div>`;
  $("#syCode").textContent = `Cambridge ${rows[0].pr.code} · ${c.level} · ${c.campus}`;

  $("#syStudents").innerHTML = rows.sort((a, b) => a.pr.pct - b.pr.pct).map((r) => `
    <tr>
      <td><div class="who"><span class="av">${initials(r.st.name)}</span><div><strong>${r.st.name}</strong><small>${r.id}</small></div></div></td>
      <td><div class="score"><div class="score__bar"><i style="width:${r.pr.pct}%"></i></div><span>${r.pr.pct}%</span></div>${r.pr.pct < expected - 5 ? `<small class="bad">behind plan</small>` : `<small class="ok">on track</small>`}</td>
      <td>${r.pr.done}/${r.pr.subs}</td>
      <td>${r.pr.low.length ? `<span class="pill pill--bad">${r.pr.low.length}</span>` : `<span class="pill pill--good">0</span>`}</td>
      <td><div class="sy-act"><button class="link-btn" data-nudge="${r.id}">Send reminder</button><button class="link-btn" data-student="${r.id}" data-subject="${c.subject}">Open</button></div></td>
    </tr>`).join("");

  // weakest sub-topics across the class
  const count = {};
  rows.forEach((r) => r.pr.low.forEach((l) => { const k = `${l.topic}||${l.sub}`; count[k] = (count[k] || 0) + 1; }));
  const weak = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 8);
  $("#syWeak").innerHTML = weak.map(([k, n]) => { const [topic, subt] = k.split("||"); return `<li><div><strong>${esc(subt)}</strong><small>${esc(topic)}</small></div><em>${n} student${n > 1 ? "s" : ""}</em></li>`; }).join("") || `<li class="empty">No low-confidence topics marked yet.</li>`;

  // topic heat grid: rows = topics, cells = students
  const topics = rows[0].pr.topics.map((t) => t.t);
  $("#syHeat").innerHTML = `<div class="heat" style="grid-template-columns: minmax(180px, 1.4fr) repeat(${rows.length}, minmax(56px, 1fr)) 70px">
      <div class="heat__h">Topic</div>${rows.map((r) => `<div class="heat__h" title="${r.st.name}">${r.st.name.split(" ")[0]}</div>`).join("")}<div class="heat__h">Avg</div>
      ${topics.map((t, ti) => {
        const vals = rows.map((r) => r.pr.topics[ti].pct);
        const a = Math.round(vals.reduce((x, y) => x + y, 0) / vals.length);
        return `<div class="heat__t">${ti + 1}. ${esc(t)}</div>${vals.map((v) => `<div class="heat__c ${v >= 45 ? "hi" : "lo"}" style="--v:${v}" title="${v}%">${v}%</div>`).join("")}<div class="heat__c heat__avg ${a >= 45 ? "hi" : "lo"}" style="--v:${a}">${a}%</div>`;
      }).join("")}
    </div>
    <p class="heat__legend"><span style="--v:0"></span>0% <span style="--v:50"></span>50% <span style="--v:100"></span>100% complete</p>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-nudge]"); if (!b) return;
  const c = cls(), id = b.dataset.nudge, pr = DB.syllabusProgress(id, c.subject);
  const rec = DB.student(id);
  (rec.remarks = rec.remarks || []).push({ by: ME, s: c.subject, at: Date.now(), text: `Please keep your ${sub(c.subject).name} planner up to date — you're at ${pr.pct}% of the syllabus. Aim to finish the current topic this week.` });
  DB.addLog(ME, `sent a syllabus reminder to ${STUDENTS[id].name}`);
  DB.save(); toast(`✓ Reminder sent to ${STUDENTS[id].name}`);
  b.textContent = "Sent ✓"; b.disabled = true;
});
(() => {
  const _all = renderAll;
  renderAll = function () { _all(); renderSyllabus(); };
  document.addEventListener("change", (e) => { if (e.target.classList.contains("class-select")) renderSyllabus(); });
})();

// report button inside the student record drawer
(() => {
  const _d = renderDrawer;
  renderDrawer = function () {
    _d();
    const { id } = drawer;
    $("#sBody").insertAdjacentHTML("beforeend", `<div class="d-report"><button class="btn btn--gold btn--sm" data-rpt="${id}">📄 Download progress report (PDF)</button></div>`);
  };
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-rpt]"); if (b) printStudentReport(b.dataset.rpt); });
})();

// ----- Stay signed in (server session cookie, 12 hours) -----
(async () => {
  try {
    const me = await DB.whoami();
    if (!me || me.role === "student") return;
    await DB.load();
    enterApp(me);
  } catch (x) {
    loginError(x.message);
  }
})();
