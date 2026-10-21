// ===== SKH Solutions — Student Portal =====
// Data comes from the server (server.js) through js/db.js.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const subjectById = (id) => SUBJECTS.find((s) => s.id === id);

let STUDENT, TESTS, TASKS, ATT = {};
const myTeacher = (sid) => teacherAt(sid, STUDENT.campus, STUDENT.level);
const teacherName = (sid) => myTeacher(sid).name;

function loadStudent(id) {
  const base = STUDENTS[id];
  STUDENT = { id, ...base, first: base.name.split(" ")[0], initials: base.name.split(" ").map((w) => w[0]).join("") };
  const rec = DB.student(id);
  TESTS = [...rec.tests].sort((a, b) => a.d.localeCompare(b.d));
  TASKS = rec.tasks;
  ATT = rec.att;
}

const pct = (t) => Math.round((t.m / t.o) * 100);
const grade = (p) => (p >= 90 ? "A*" : p >= 80 ? "A" : p >= 70 ? "B" : p >= 60 ? "C" : p >= 50 ? "D" : "E");
const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

let toastTimer;
const toast = (msg) => {
  const t = $("#toast"); t.textContent = msg; t.classList.add("is-show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("is-show"), 2400);
};

// ================= LOGIN =================
$("#pwToggle").addEventListener("click", (e) => {
  const pw = $("#spw"); const show = pw.type === "password";
  pw.type = show ? "text" : "password"; e.target.textContent = show ? "Hide" : "Show";
});
// ----- Student / Parent sign-in -----
let loginRole = "student";
const isParent = () => DB.me && DB.me.role === "parent";
$("#whoToggle").addEventListener("click", (e) => {
  const b = e.target.closest("[data-who]"); if (!b) return;
  loginRole = b.dataset.who;
  $$("#whoToggle button").forEach((x) => { x.classList.toggle("is-on", x === b); x.setAttribute("aria-selected", x === b); });
  const parent = loginRole === "parent";
  $(".login__sub").textContent = parent ? "See your child's attendance, marks, fees and teacher remarks." : "Sign in to view your classes, marks and attendance.";
  $(".login__note").textContent = parent ? "Use your child's Student ID and the parent password given by SKH." : "Your Student ID and password are given by SKH at admission.";
  $("#spw").placeholder = parent ? "Parent password" : "Password";
  $("#loginBtnText").textContent = parent ? "Sign in as Parent" : "Sign in to Portal";
  $("#loginErr").hidden = true;
});
const loginError = (msg) => {
  const err = $("#loginErr");
  err.textContent = msg; err.hidden = false;
  $("#loginForm").classList.remove("shake"); void $("#loginForm").offsetWidth; $("#loginForm").classList.add("shake");
};
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("#sid").value.trim(), pw = $("#spw").value;
  if (!id || !pw) return loginError("Enter your Student ID and password.");
  $("#loginErr").hidden = true;
  const btn = $("#loginBtn");
  btn.classList.add("is-loading"); btn.disabled = true;
  try {
    const me = await DB.login(loginRole, id, pw);
    await DB.load();
    $("#login").classList.add("is-leaving");
    setTimeout(() => { enterApp(me.id); $("#spw").value = ""; }, 450);
  } catch (x) {
    loginError(x.message);
  } finally {
    btn.classList.remove("is-loading"); btn.disabled = false;
  }
});
function enterApp(id) {
  document.body.classList.toggle("is-parent", isParent());
  loadStudent(id);
  $("#login").hidden = true;
  $("#app").hidden = false;
  document.body.classList.add("in-app");
  initApp();
  if (DB.me && DB.me.mustChange) setTimeout(() => passwordDialog({ forced: true }).then((ok) => ok && toast("✓ Password changed")), 700);
}
$("#logout").addEventListener("click", async () => {
  await DB.logout();
  STUDENT = null;
  document.body.classList.remove("is-parent");
  show("dash");
  $("#app").hidden = true;
  $("#login").hidden = false;
  $("#login").classList.remove("is-leaving");
  document.body.classList.remove("in-app");
  toast("You have been logged out");
});
watchSaves($("#syncChip"), (m) => toast(m));
// parents can look but not change anything
(() => {
  const _save = DB.save;
  DB.save = function () { if (isParent()) return Promise.resolve(true); return _save.apply(DB, arguments); };
})();

// ================= APP =================
let navBuilt = false;
function initApp() {
  const h = new Date().getHours();
  $("#hello").textContent = isParent()
    ? `${h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"} — viewing ${STUDENT.first}'s progress 👪`
    : (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening") + ", " + STUDENT.first + " 👋";
  if (isParent()) { const c = $("#syncChip"); c.textContent = "👪 Parent view · read-only"; c.className = "demo-chip sync-chip is-busy"; }
  $("#userAv").textContent = STUDENT.initials;
  $("#userName").textContent = STUDENT.name;
  $("#userMeta").textContent = isParent() ? `Parent view · ${STUDENT.level}` : `${STUDENT.level} · ${STUDENT.campus}`;
  $("#examMsg").textContent = `Keep going, ${STUDENT.first} — consistency wins. ✦`;
  $("#ttMeta").textContent = `${STUDENT.campus} campus · ${STUDENT.level} · Section ${STUDENT.section}`;
  if (!navBuilt) { navBuilt = true; buildNav(); }
  calMonth = [new Date().getFullYear(), new Date().getMonth()]; taskFilter = "all";
  $$("#taskTabs button").forEach((x, i) => x.classList.toggle("is-active", i === 0));
  renderKPIs();
  renderBars();
  renderToday();
  renderNotices();
  renderExam();
  renderTimetable();
  renderMarks();
  renderCalendar();
  renderTasks();
  renderProfile();
  renderRemarks();
}

// ----- navigation (sidebar + mobile bottom bar) -----
const TITLES = { profile: "My Profile", dash: "Dashboard", time: "Timetable", marks: "Results", attend: "Attendance", tasks: "Assignments", notice: "Notices" };
function buildNav() {
  $("#bottomNav").innerHTML = $$("#sideNav button").map((b) => `<button data-view="${b.dataset.view}" class="${b.classList.contains("is-active") ? "is-active" : ""}">${b.querySelector("svg").outerHTML}<span>${b.querySelector("span").textContent}</span></button>`).join("");
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-view], [data-go]");
    if (b) show(b.dataset.view || b.dataset.go);
  });
}
function show(v) {
  $$("[data-view]").forEach((b) => b.classList.toggle("is-active", b.dataset.view === v));
  $$(".view").forEach((s) => s.classList.toggle("is-active", s.dataset.v === v));
  $("#viewTitle").textContent = TITLES[v];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ----- KPIs -----
function attendanceStats() {
  const all = Object.values(ATT).flatMap((m) => Object.values(m));
  const p = all.filter((x) => x === "p").length, l = all.filter((x) => x === "l").length, a = all.filter((x) => x === "a").length;
  return { p, l, a, rate: p + l + a ? Math.round(((p + l) / (p + l + a)) * 100) : 100 };
}
function renderKPIs() {
  const avg = TESTS.length ? Math.round(TESTS.reduce((s, t) => s + pct(t), 0) / TESTS.length) : 0;
  const pending = TASKS.filter((t) => !t.done).length;
  const k = [
    { l: "Attendance", v: attendanceStats().rate + "%", sub: attendanceStats().p + attendanceStats().l + attendanceStats().a ? "This term" : "Not marked yet", icon: "✓" },
    { l: "Average score", v: TESTS.length ? avg + "%" : "—", sub: TESTS.length ? `Grade ${grade(avg)} overall` : "No tests yet", icon: "★" },
    { l: "Classes / week", v: countWeeklyClasses(), sub: STUDENT.subjects.length + " subjects", icon: "◷" },
    { l: "Pending tasks", v: pending, sub: pending ? "Due this week" : "All done!", icon: "✎", id: "kpiPending" },
  ];
  $("#kpis").innerHTML = k.map((x, i) => `
    <div class="kpi" style="--d:${i * 80}ms">
      <span class="kpi__icon">${x.icon}</span>
      <small>${x.l}</small>
      <strong ${x.id ? `id="${x.id}"` : ""}>${x.v}</strong>
      <em>${x.sub}</em>
    </div>`).join("");
}

// ----- Bar chart (latest test per subject, single series) -----
function renderBars() {
  const latest = TESTS.slice(-6);
  if (!latest.length) { $("#bars").innerHTML = `<div class="empty-state"><b>No test results yet</b>Your scores appear here as soon as a teacher enters them.</div>`; return; }
  $("#bars").innerHTML = `
    <div class="bars__grid">${[100, 75, 50, 25, 0].map((g) => `<span data-g="${g}"></span>`).join("")}</div>
    <div class="bars__cols">${latest.map((t, i) => {
      const p = pct(t);
      return `<div class="bar" tabindex="0" style="--h:${p}; --d:${i * 90}ms">
        <div class="bar__fill"><span class="bar__tip"><b>${t.t}</b>${subjectById(t.s).name} · ${t.m}/${t.o} (${p}%)</span></div>
        <small>${subjectById(t.s).sym}<br><i>${fmt(t.d)}</i></small>
      </div>`;
    }).join("")}</div>`;
  requestAnimationFrame(() => $("#bars").classList.add("is-in"));
}

// ----- Today's classes -----
const DAY_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function myGrid() {
  const real = TIMETABLES[`${STUDENT.campus}|${STUDENT.level}`];
  if (real) { // the campus timetable set by SKH, showing only this student's subjects
    const g = {};
    DAYS.forEach((d) => (g[d] = SLOTS.map((slot, si) => { const sid = (real[d] || [])[si]; return sid && STUDENT.subjects.includes(sid) ? { subject: sid, slot } : null; })));
    return g;
  }
  // spread the student's subjects across the week (sample schedule)
  const subs = STUDENT.subjects;
  const g = {};
  const seed = parseInt(STUDENT.id.slice(-2), 10);
  let k = seed % subs.length;
  DAYS.forEach((d, di) => g[d] = SLOTS.map((slot, si) => {
    const free = subs.length <= 4 ? (di + si + seed) % 3 === 2 : (di * 3 + si + seed) % 6 === 5;
    if (free) return null;
    return { subject: subs[k++ % subs.length], slot };
  }));
  return g;
}
function countWeeklyClasses() { const g = myGrid(); return DAYS.reduce((n, d) => n + g[d].filter(Boolean).length, 0); }
function renderToday() {
  let day = DAY_KEYS[new Date().getDay()];
  let label = "Today";
  if (day === "Sun") { day = "Mon"; label = "Tomorrow (Mon)"; }
  $("#todayName").textContent = label;
  const list = myGrid()[day] || [];
  $("#todayList").innerHTML = list.map((c) => c ? `
    <li class="cls cls--${subjectById(c.subject).cat}">
      <b>${subjectById(c.subject).sym}</b>
      <div><strong>${subjectById(c.subject).name}</strong><small>${teacherName(c.subject)}</small></div>
      <time>${c.slot.split(" – ")[0]}</time>
    </li>` : "").join("") || `<li class="empty">No classes today 🎉</li>`;
}

// ----- Notices -----
function renderNotices() {
  const mine = DB.noticesFor(STUDENT.id);
  const who = (n) => (TEACHERS[n.by] ? ` · ${TEACHERS[n.by].name}` : "");
  const item = (n) => `<li class="notice"><span class="notice__tag">${n.tag}</span><div><strong>${n.t}</strong><p>${n.body}</p><small class="notice__by">${who(n).slice(3)}</small></div><time>${fmt(n.d)}</time></li>`;
  $("#notices").innerHTML = mine.map(item).join("") || `<li class="empty">No notices yet.</li>`;
  $("#miniNotices").innerHTML = mine.slice(0, 3).map(item).join("") || `<li class="empty">No notices yet.</li>`;
}

// ----- Exam countdown -----
function renderExam() {
  const exam = new Date("2027-04-26T09:00:00+05:00"), start = new Date("2026-08-01T00:00:00+05:00");
  const days = Math.max(0, Math.ceil((exam - new Date()) / 864e5));
  $("#examDays").textContent = days;
  $("#examBar").style.width = Math.min(100, ((new Date() - start) / (exam - start)) * 100) + "%";
}

// ----- Timetable -----
function renderTimetable() {
  const g = myGrid();
  const today = DAY_KEYS[new Date().getDay()];
  let html = `<div class="tt__corner"></div>` + DAYS.map((d) => `<div class="tt__day ${d === today ? "is-today" : ""}">${d}${d === today ? "<small>Today</small>" : ""}</div>`).join("");
  SLOTS.forEach((slot, si) => {
    html += `<div class="tt__time">${slot.replace(" – ", "<br>")}</div>`;
    DAYS.forEach((d) => {
      const c = g[d][si];
      if (!c) { html += `<div class="tt__cell tt__cell--free"><span>Free</span></div>`; return; }
      const s = subjectById(c.subject);
      html += `<div class="tt__cell tt__cell--${s.cat}"><b>${s.sym}</b><strong>${s.name}</strong><small>${teacherName(s.id)}</small></div>`;
    });
  });
  $("#pTimetable").innerHTML = html;
}

// ----- Results -----
function renderMarks() {
  $("#subjectAvgs").innerHTML = STUDENT.subjects.map((sid) => {
    const ts = TESTS.filter((t) => t.s === sid);
    const avg = Math.round(ts.reduce((s, t) => s + pct(t), 0) / ts.length);
    if (!ts.length) return "";
    const trend = pct(ts[ts.length - 1]) - pct(ts[0]);
    const s = subjectById(sid);
    return `<div class="savg savg--${s.cat}">
      <div class="savg__top"><b>${s.sym}</b><span>${s.name}</span></div>
      <div class="ring" style="--p:${avg}"><strong>${avg}%</strong></div>
      <small class="${trend >= 0 ? "up" : "down"}">${trend >= 0 ? "▲" : "▼"} ${Math.abs(trend)}% since first test</small>
    </div>`;
  }).join("");
  if (!TESTS.length) $("#subjectAvgs").innerHTML = `<div class="panel empty-state"><b>No results yet</b>Marks from your teachers will show up here.</div>`;
  $("#marksFilter").innerHTML = `<option value="">All subjects</option>` + STUDENT.subjects.map((s) => `<option value="${s}">${subjectById(s).name}</option>`).join("");
  const draw = () => {
    const f = $("#marksFilter").value;
    $("#marksBody").innerHTML = [...TESTS].reverse().filter((t) => !f || t.s === f).map((t) => {
      const p = pct(t);
      return `<tr>
        <td><strong>${t.t}</strong></td>
        <td><span class="sub-pill sub-pill--${subjectById(t.s).cat}">${subjectById(t.s).name}</span></td>
        <td>${fmt(t.d)}</td>
        <td><div class="score"><div class="score__bar"><i style="width:${p}%"></i></div><span>${t.m}/${t.o}</span></div></td>
        <td><span class="grade">${grade(p)}</span></td>
      </tr>`;
    }).join("") || `<tr><td colspan="5" class="empty">No tests yet.</td></tr>`;
  };
  $("#marksFilter").onchange = draw;
  draw();
}

// ----- Attendance calendar -----
// p = present, a = absent, l = late, h = holiday/no class (Sundays are off)
let calMonth = [2026, 8];
function renderCalendar() {
  const [y, m] = calMonth;
  const key = `${y}-${m}`;
  $("#calTitle").textContent = new Date(y, m, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const first = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
  const days = new Date(y, m + 1, 0).getDate();
  const labels = { p: "Present", a: "Absent", l: "Late", h: "Holiday / No class" };
  let html = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<span class="cal__dow">${d}</span>`).join("");
  html += `<span></span>`.repeat(first);
  for (let d = 1; d <= days; d++) {
    const st = (ATT[key] || {})[d];
    html += `<span class="cal__d ${st ? "st--" + st : "is-future"}" ${st ? `title="${d} — ${labels[st]}"` : ""}>${d}${st && st !== "p" && st !== "h" ? `<i>${st === "a" ? "✕" : "!"}</i>` : ""}</span>`;
  }
  $("#cal").innerHTML = html;
  const j = new Date(STUDENT.joined || Date.now()), n = new Date();
  $("#calPrev").disabled = y * 12 + m <= Math.min(j.getFullYear() * 12 + j.getMonth(), n.getFullYear() * 12 + n.getMonth() - 1);
  $("#calNext").disabled = y * 12 + m >= n.getFullYear() * 12 + n.getMonth();

  const s = attendanceStats();
  $("#attendSum").innerHTML = `
    <div class="ring ring--big" style="--p:${s.rate}"><strong>${s.rate}%</strong><small>Attendance</small></div>
    <ul class="att-list">
      <li><i class="st st--p"></i>Present<b>${s.p} days</b></li>
      <li><i class="st st--l"></i>Late<b>${s.l} days</b></li>
      <li><i class="st st--a"></i>Absent<b>${s.a} days</b></li>
    </ul>
    <p class="att-note">${!(s.p + s.l + s.a) ? "Attendance appears here once your teachers start marking it." : s.rate >= 90 ? "Excellent attendance — keep it up! ✦" : "Try to attend every class to stay on track."}</p>`;
}
const shiftMonth = (k) => { const d = new Date(calMonth[0], calMonth[1] + k, 1); calMonth = [d.getFullYear(), d.getMonth()]; renderCalendar(); };
$("#calPrev").addEventListener("click", () => shiftMonth(-1));
$("#calNext").addEventListener("click", () => shiftMonth(1));

// ----- Assignments -----
let taskFilter = "all";
function renderTasks() {
  const now = new Date();
  const list = TASKS.filter((t) => taskFilter === "all" || (taskFilter === "done" ? t.done : !t.done));
  $("#tasks").innerHTML = list.map((t) => {
    const s = subjectById(t.s);
    const daysLeft = Math.ceil((new Date(t.due) - now) / 864e5);
    const due = t.done ? "Submitted" : daysLeft < 0 ? `Overdue by ${-daysLeft} day${daysLeft === -1 ? "" : "s"}` : daysLeft === 0 ? "Due today" : `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
    return `<article class="task ${t.done ? "is-done" : ""} ${!t.done && daysLeft <= 1 ? "is-urgent" : ""}">
      <div class="task__sub task__sub--${s.cat}">${s.sym}</div>
      <div class="task__body">
        <strong>${t.t}</strong>
        <small>${s.name} · ${teacherName(s.id)} · ${fmt(t.due)}</small>
      </div>
      <span class="task__due">${due}</span>
      <button class="task__btn" data-task="${t.id}">${t.done ? "Undo" : "Mark submitted"}</button>
    </article>`;
  }).join("") || `<p class="empty">${TASKS.length ? "Nothing here 🎉" : "No assignments yet — your teachers' assignments will appear here."}</p>`;
  const pending = TASKS.filter((t) => !t.done).length;
  $("#taskCount").textContent = pending;
  $("#taskCount").hidden = !pending;
  const k = $("#kpiPending"); if (k) k.textContent = pending;
}
$("#tasks").addEventListener("click", (e) => {
  const b = e.target.closest("[data-task]"); if (!b || isParent()) return;
  const t = TASKS.find((x) => String(x.id) === b.dataset.task);
  t.done = !t.done;
  t.doneAt = t.done ? Date.now() : null;
  DB.save();
  toast(t.done ? "✓ Assignment marked as submitted" : "Assignment moved back to pending");
  renderTasks();
});
$("#taskTabs").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  $$("#taskTabs button").forEach((x) => x.classList.toggle("is-active", x === b));
  taskFilter = b.dataset.f; renderTasks();
});

// ---------- Light / dark theme ----------
(() => {
  const btn = document.getElementById("themeToggle");
  if (btn) btn.setAttribute("aria-checked", document.documentElement.dataset.theme === "dark");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("skh-theme", next); } catch (e) {} btn.setAttribute("aria-checked", next === "dark");
  });
})();

// ----- Profile -----
function renderProfile() {
  const st = STUDENT;
  setTimeout(() => { const q = $("#myQR"); if (q) q.innerHTML = QR.svg("SKH:" + st.id, 6); }, 0);
  $("#profileView").innerHTML = `
    <div class="prof-hero">
      <div class="prof-av">${st.initials}</div>
      <div>
        <p class="kicker">Student Profile</p>
        <h2>${st.name}</h2>
        <div class="prof-tags"><span>${st.id}</span><span>${st.level}</span><span>Section ${st.section}</span><span>${st.campus} campus</span></div>
        <div class="acct-row"><button class="btn btn--gold btn--sm prof-report" data-report>📄 Monthly progress report (PDF)</button><button class="btn btn--outline btn--sm" data-changepw>🔒 Change ${isParent() ? "parent " : ""}password</button></div>
      </div>
    </div>
    <div class="prof-grid">
      <div class="panel">
        <div class="panel__head"><h3>Details</h3></div>
        <dl class="prof-dl">
          <div><dt>Student ID</dt><dd>${st.id}</dd></div>
          <div><dt>Level</dt><dd>${st.level}</dd></div>
          <div><dt>Section</dt><dd>${st.section}</dd></div>
          <div><dt>Campus</dt><dd>${st.campus}<small>${CAMPUS_ADDR[st.campus]}</small></dd></div>
          <div><dt>Guardian</dt><dd>${escP(st.guardian || "—")}${st.phone ? `<small>${escP(st.phone)}</small>` : ""}</dd></div>
          <div><dt>Enrolled since</dt><dd>${new Date(st.joined).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</dd></div>
        </dl>
      </div>
      <div class="panel qr-card">
        <div class="panel__head"><h3>Attendance QR</h3><span>Show at the door</span></div>
        <div class="qr-card__body">
          <div class="qr-card__code" id="myQR"></div>
          <div>
            <p>Your teacher scans this code to mark you <b>present</b> — no roll call needed. Keep it on your phone or print it on the back of your ID card.</p>
            <div class="acct-row"><button class="btn btn--gold btn--sm" data-qr-dl>⬇ Download QR</button><button class="btn btn--outline btn--sm" data-qr-print>🖨 Print card</button></div>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel__head"><h3>My subjects & teachers</h3><span>${st.subjects.length} subjects</span></div>
        <ul class="my-subs">${st.subjects.map((sid) => { const s = subjectById(sid); const t = myTeacher(sid); return `
          <li class="cls cls--${s.cat}"><b>${s.sym}</b><div><strong>${s.name}</strong><small>${t.name}</small></div><time>${s.code.split(" · ")[st.level === "O Level" ? 0 : s.code.includes("·") ? 1 : 0]}</time></li>`; }).join("")}</ul>
      </div>
    </div>`;
}

// ----- Teacher remarks (shown on dashboard + profile) -----
function renderRemarks() {
  const list = (DB.student(STUDENT.id).remarks || []).slice().sort((a, b) => b.at - a.at);
  const html = list.map((r) => `<li class="remark"><span class="remark__av">${(TEACHERS[r.by] || {}).initials || "T"}</span><div><strong>${(TEACHERS[r.by] || {}).name || "Teacher"} <em>${subjectById(r.s) ? subjectById(r.s).name : ""}</em></strong><p>${r.text}</p></div><time>${fmt(new Date(r.at))}</time></li>`).join("");
  const box = $("#remarksBox");
  if (box) box.innerHTML = html || `<li class="empty">No remarks from teachers yet.</li>`;
}

// ----- Live updates: when a teacher saves something, refresh this portal -----
onDBChange(() => {
  if (!STUDENT || $("#app").hidden) return;
  const view = ($(".view.is-active") || {}).dataset;
  loadStudent(STUDENT.id);
  initApp();
  if (view) show(view.v);
  toast("🔄 New update from SKH");
});



// =====================================================
//  PLANNER — one section per chosen subject:
//  monthly plan, weekly plan, to-do list and an Excel-style checklist
// =====================================================
TITLES.planner = "My Planner";
let plActive = null;
const PLAN_START = new Date(2026, 8, 1);               // plan runs from September 2026
const PLAN_EXAM = new Date("2027-04-26T09:00:00+05:00"); // to the May/June series
const CONF = { "": "—", low: "🔴 Low", mid: "🟡 Medium", high: "🟢 High" };
const CHECK_COLS = [["n", "Notes read"], ["w", "Worksheet"], ["p", "Past papers"], ["r", "Revised"]];
const escP = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const mondayOf = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };

// ----- syllabus helpers (official Cambridge content, per student level) -----
const plSyl = (sid) => syllabusFor(sid, STUDENT.level) || { code: "", topics: [] };
const plKey = (sid) => `${sid}|${LEVEL_KEY[STUDENT.level] || "O"}`;
const plItems = (sid) => plSyl(sid).topics.flatMap((t, ti) => t.s.map((sub, si) => ({ ti, si, topic: t.t, sub, key: `${ti}.${si}` })));

function planMonths(sid) {
  const items = plItems(sid);
  const months = [];
  for (let d = new Date(PLAN_START); d <= PLAN_EXAM; d.setMonth(d.getMonth() + 1)) months.push(new Date(d));
  const teach = months.length - 1; // last month = full revision
  return months.map((m, i) => {
    const slice = i < teach ? items.filter((_, k) => Math.floor((k * teach) / items.length) === i) : [];
    const groups = [];
    slice.forEach((it) => { let g = groups.find((x) => x.topic === it.topic); if (!g) groups.push((g = { topic: it.topic, subs: [] })); g.subs.push(it.sub); });
    return {
      key: `${m.getFullYear()}-${m.getMonth()}`,
      label: m.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
      groups: i < teach ? groups : [{ topic: "Full revision & timed past papers", subs: ["Timed past papers", "Mark schemes & examiner reports", "Redo weak topics"] }],
      current: m.getFullYear() === new Date().getFullYear() && m.getMonth() === new Date().getMonth(),
    };
  });
}
function planWeeks(sid) {
  const items = plItems(sid);
  const start = mondayOf(PLAN_START), exam = mondayOf(PLAN_EXAM);
  const total = Math.round((exam - start) / 6048e5), teachWeeks = Math.max(1, total - 4);
  const thisMon = mondayOf(new Date());
  return [0, 1, 2, 3].map((k) => {
    const mon = new Date(thisMon); mon.setDate(mon.getDate() + k * 7);
    const wi = Math.round((mon - start) / 6048e5);
    const end = new Date(mon); end.setDate(end.getDate() + 6);
    const revision = wi >= teachWeeks;
    const slice = revision ? [] : items.filter((_, n) => Math.floor((n * teachWeeks) / items.length) === wi);
    const topic = revision ? "Revision & past papers" : [...new Set(slice.map((x) => x.topic))].join(" · ") || "Catch-up & practice";
    const tasks = revision
      ? ["Timed past paper", "Mark with the mark scheme", "Redo weak questions"]
      : [...slice.map((x) => `Learn: ${x.sub}`), `Topical past-paper questions: ${slice.length ? slice[slice.length - 1].topic : "recent topics"}`];
    return { key: isoDayP(mon), label: `${mon.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`, topic, tasks, current: k === 0 };
  });
}
const isoDayP = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function checkProgress(p, sid) {
  const items = plItems(sid), c = p.check[plKey(sid)] || {};
  const total = items.length * CHECK_COLS.length;
  const done = items.reduce((n, it) => n + CHECK_COLS.filter(([k]) => (c[it.key] || {})[k]).length, 0);
  return total ? Math.round((done / total) * 100) : 0;
}

function renderPlanner() {
  const p = DB.planner(STUDENT.id);
  if (!p.subjects.includes(plActive)) plActive = p.subjects[0] || null;

  $("#plTabs").innerHTML = p.subjects.map((sid) => {
    const s = subjectById(sid);
    return `<button class="pl-tab pl-tab--${s.cat} ${sid === plActive ? "is-active" : ""}" data-pl="${sid}" role="tab"><b>${s.sym}</b>${s.name}<em>${checkProgress(p, sid)}%</em></button>`;
  }).join("");

  const offered = SUBJECTS.filter((s) => s.levels.includes(STUDENT.level));
  $("#plPicker").innerHTML = `
    <div class="panel__head"><h3>Choose planner subjects</h3><span>Your enrolled subjects are marked ★</span></div>
    <div class="pl-pick">${offered.map((s) => `<button class="pl-pick__btn ${p.subjects.includes(s.id) ? "is-on" : ""}" data-plpick="${s.id}"><b>${s.sym}</b>${s.name}${STUDENT.subjects.includes(s.id) ? " ★" : ""}</button>`).join("")}</div>
    <div class="pl-pick__actions"><button class="link-btn" data-plall>+ Add all my enrolled subjects</button><button class="btn btn--gold btn--sm" data-pldone>Done</button></div>`;

  const body = $("#plBody");
  if (!plActive) {
    $("#plPicker").hidden = false;
    body.innerHTML = `<div class="panel pl-empty"><div class="pl-empty__icon">🗓️</div><h3>Build your study planner</h3><p>Choose the subjects you want to plan — each one gets its own monthly plan, weekly plan, to-do list and a checklist of the full Cambridge syllabus.</p></div>`;
    return;
  }
  const s = subjectById(plActive), sid = plActive, pk = plKey(sid), syl = plSyl(sid), items = plItems(sid);
  p.months[pk] = p.months[pk] || {}; p.weeks[pk] = p.weeks[pk] || {}; p.todos[sid] = p.todos[sid] || []; p.check[pk] = p.check[pk] || {};
  const months = planMonths(sid), weeks = planWeeks(sid), chk = p.check[pk];
  const todos = p.todos[sid].slice().sort((a, b) => a.done - b.done || (a.due || "9").localeCompare(b.due || "9"));
  const monthsDone = months.filter((m) => p.months[pk][m.key]).length;
  const prog = checkProgress(p, sid);
  const q = (plSearch || "").toLowerCase();

  body.innerHTML = `
    <div class="pl-hero pl-hero--${s.cat}">
      <div class="pl-hero__sym">${s.sym}</div>
      <div class="pl-hero__txt"><p class="kicker">Planner · Cambridge ${syl.code}</p><h2>${s.name}</h2><span>${STUDENT.level} · ${teacherName(sid)} · ${syl.topics.length} topics · ${items.length} sub-topics</span></div>
      <div class="pl-hero__stats">
        <div><strong>${prog}%</strong><small>Syllabus</small></div>
        <div><strong>${monthsDone}/${months.length}</strong><small>Months done</small></div>
        <div><strong>${todos.filter((t) => !t.done).length}</strong><small>To-dos left</small></div>
      </div>
    </div>

    <div class="pl-grid">
      <div class="panel">
        <div class="panel__head"><h3>Weekly planner</h3><span>Next 4 weeks</span></div>
        <div class="pl-weeks">${weeks.map((w) => {
          const done = w.tasks.filter((_, i) => p.weeks[pk][`${w.key}|${i}`]).length;
          return `<div class="pl-week ${w.current ? "is-current" : ""}">
            <div class="pl-week__head"><strong>${w.current ? "This week" : w.label}</strong><small>${w.current ? w.label : ""}</small><em>${done}/${w.tasks.length}</em></div>
            <p class="pl-week__topic">${escP(w.topic)}</p>
            ${w.tasks.map((t, i) => `<label class="pl-chk"><input type="checkbox" data-wk="${w.key}|${i}" ${p.weeks[pk][`${w.key}|${i}`] ? "checked" : ""}><span>${escP(t)}</span></label>`).join("")}
          </div>`;
        }).join("")}</div>
      </div>

      <div class="panel">
        <div class="panel__head"><h3>To-do list</h3><span>${todos.filter((t) => t.done).length}/${todos.length} done</span></div>
        <form class="pl-todo-form" id="plTodoForm">
          <input id="plTodoText" type="text" placeholder="Add a task — e.g. Redo Q4 from 2023 paper" maxlength="120" aria-label="New task">
          <input id="plTodoDue" type="date" aria-label="Due date">
          <button class="btn btn--gold btn--sm" type="submit">Add</button>
        </form>
        <ul class="pl-todos">${todos.map((t) => {
          const over = !t.done && t.due && t.due < isoDayP(new Date());
          return `<li class="${t.done ? "is-done" : ""}"><label class="pl-chk"><input type="checkbox" data-todo="${t.id}" ${t.done ? "checked" : ""}><span>${escP(t.t)}</span></label>${t.due ? `<time class="${over ? "over" : ""}">${fmt(t.due)}</time>` : ""}<button class="pl-del" data-todo-del="${t.id}" aria-label="Delete task">✕</button></li>`;
        }).join("") || `<li class="empty">No tasks yet — add your first one above.</li>`}</ul>
      </div>
    </div>

    <div class="panel">
      <div class="panel__head"><h3>Monthly planner</h3><span>From September to the May/June exams</span></div>
      <div class="pl-months">${months.map((m) => `
        <div class="pl-month ${m.current ? "is-current" : ""} ${p.months[pk][m.key] ? "is-done" : ""}">
          <label class="pl-month__head"><strong>${m.label}</strong><input type="checkbox" data-mo="${m.key}" ${p.months[pk][m.key] ? "checked" : ""} aria-label="Mark ${m.label} done"></label>
          ${m.current ? `<span class="pl-now">Now</span>` : ""}
          ${m.groups.map((g) => `<details class="pl-mg"><summary>${escP(g.topic)} <em>${g.subs.length}</em></summary><ul>${g.subs.map((x) => `<li>${escP(x)}</li>`).join("")}</ul></details>`).join("") || `<p class="pl-mg__none">Catch-up month</p>`}
        </div>`).join("")}
      </div>
    </div>

    <div class="panel">
      <div class="panel__head"><h3>Syllabus checklist <small class="pl-code">Cambridge ${syl.code}</small></h3>
        <div class="head-actions">
          <input class="pl-search" id="plSearch" type="search" placeholder="Search sub-topics…" value="${escP(plSearch || "")}" aria-label="Search sub-topics">
          <span class="pl-prog"><i style="width:${prog}%"></i></span><b class="pl-prog__n">${prog}%</b>
          <button class="btn btn--outline btn--sm" id="plExport">⬇ Download for Excel</button>
        </div>
      </div>
      <div class="sheet-wrap">
        <table class="sheet">
          <thead><tr><th class="sheet__n">#</th><th>Sub-topic</th>${CHECK_COLS.map(([, l]) => `<th>${l}</th>`).join("")}<th>Confidence</th><th class="sheet__note">My notes</th></tr></thead>
          <tbody>${syl.topics.map((t, ti) => {
            const subs = t.s.map((sub, si) => ({ sub, key: `${ti}.${si}`, n: `${ti + 1}.${si + 1}` })).filter((x) => !q || x.sub.toLowerCase().includes(q) || t.t.toLowerCase().includes(q));
            if (!subs.length) return "";
            const tDone = t.s.reduce((n, _, si) => n + CHECK_COLS.filter(([k]) => (chk[`${ti}.${si}`] || {})[k]).length, 0);
            const tPct = Math.round((tDone / (t.s.length * CHECK_COLS.length)) * 100);
            return `<tr class="sheet__topic-row"><td class="sheet__n">${ti + 1}</td><td colspan="${CHECK_COLS.length + 3}"><strong>${escP(t.t)}</strong><span class="sheet__tp"><i style="width:${tPct}%"></i></span><em>${tPct}%</em></td></tr>` +
              subs.map((x) => {
                const row = chk[x.key] || {};
                const full = CHECK_COLS.every(([k]) => row[k]);
                return `<tr class="${full ? "is-full" : ""}">
                  <td class="sheet__n">${x.n}</td>
                  <td class="sheet__topic">${escP(x.sub)}</td>
                  ${CHECK_COLS.map(([k, l]) => `<td class="sheet__c"><input type="checkbox" data-ck="${x.key}|${k}" ${row[k] ? "checked" : ""} aria-label="${l}: ${escP(x.sub)}"></td>`).join("")}
                  <td><select data-conf="${x.key}" class="conf" aria-label="Confidence: ${escP(x.sub)}">${Object.entries(CONF).map(([v, l]) => `<option value="${v}" ${(row.c || "") === v ? "selected" : ""}>${l}</option>`).join("")}</select></td>
                  <td class="sheet__note"><input type="text" data-note="${x.key}" value="${escP(row.note || "")}" placeholder="…" maxlength="80" aria-label="Notes: ${escP(x.sub)}"></td>
                </tr>`;
              }).join("");
          }).join("") || `<tr><td colspan="${CHECK_COLS.length + 4}" class="empty">No sub-topics match "${escP(plSearch)}".</td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
}
let plSearch = "";

// ----- planner events -----
const plSave = (msg) => { DB.save(); renderPlanner(); if (msg) toast(msg); };
$("#plTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-pl]"); if (b) { plActive = b.dataset.pl; plSearch = ""; renderPlanner(); } });
$("#plEdit").addEventListener("click", () => { $("#plPicker").hidden = !$("#plPicker").hidden; });
$("#plPicker").addEventListener("click", (e) => {
  const p = DB.planner(STUDENT.id);
  const b = e.target.closest("[data-plpick]");
  if (b) {
    const id = b.dataset.plpick;
    if (p.subjects.includes(id)) p.subjects = p.subjects.filter((x) => x !== id);
    else { p.subjects.push(id); plActive = id; }
    plSave();
    $("#plPicker").hidden = false;
  }
  if (e.target.closest("[data-plall]")) { STUDENT.subjects.forEach((id) => { if (!p.subjects.includes(id)) p.subjects.push(id); }); plSave("✓ All your subjects added"); $("#plPicker").hidden = false; }
  if (e.target.closest("[data-pldone]")) $("#plPicker").hidden = true;
});
$("#plBody").addEventListener("change", (e) => {
  if (isParent()) { renderPlanner(); return; }
  const p = DB.planner(STUDENT.id), sid = plActive, pk = plKey(sid), t = e.target;
  if (t.dataset.wk) { p.weeks[pk][t.dataset.wk] = t.checked; plSave(); }
  else if (t.dataset.mo) { p.months[pk][t.dataset.mo] = t.checked; plSave(t.checked ? "✓ Month completed — great work!" : ""); }
  else if (t.dataset.todo) { const x = p.todos[sid].find((y) => y.id === t.dataset.todo); x.done = t.checked; plSave(); }
  else if (t.dataset.ck) { const [i, k] = t.dataset.ck.split("|"); (p.check[pk][i] = p.check[pk][i] || {})[k] = t.checked; plSave(); }
  else if (t.dataset.conf) { (p.check[pk][t.dataset.conf] = p.check[pk][t.dataset.conf] || {}).c = t.value; plSave(); }
  else if (t.dataset.note !== undefined) { (p.check[pk][t.dataset.note] = p.check[pk][t.dataset.note] || {}).note = t.value.trim(); DB.save(); toast("✓ Note saved"); }
});
$("#plBody").addEventListener("input", (e) => {
  if (e.target.id !== "plSearch") return;
  plSearch = e.target.value;
  const pos = e.target.selectionStart;
  renderPlanner();
  const el = $("#plSearch"); el.focus(); el.setSelectionRange(pos, pos);
});
$("#plBody").addEventListener("submit", (e) => {
  if (e.target.id !== "plTodoForm") return;
  e.preventDefault();
  const text = $("#plTodoText").value.trim();
  if (!text) { toast("Type a task first"); return; }
  DB.planner(STUDENT.id).todos[plActive].push({ id: Math.random().toString(36).slice(2, 9), t: text, due: $("#plTodoDue").value || "", done: false });
  plSave("✓ Task added");
  setTimeout(() => $("#plTodoText") && $("#plTodoText").focus(), 50);
});
$("#plBody").addEventListener("click", (e) => {
  const d = e.target.closest("[data-todo-del]");
  if (d) { const p = DB.planner(STUDENT.id); p.todos[plActive] = p.todos[plActive].filter((x) => x.id !== d.dataset.todoDel); plSave("Task deleted"); }
  if (e.target.closest("#plExport")) exportChecklist();
});
// Download the checklist as a CSV file that opens in Excel
function exportChecklist() {
  const p = DB.planner(STUDENT.id), sid = plActive, s = subjectById(sid), syl = plSyl(sid), chk = p.check[plKey(sid)] || {};
  const rows = [["#", "Topic", "Sub-topic", ...CHECK_COLS.map(([, l]) => l), "Confidence", "My notes"]];
  syl.topics.forEach((t, ti) => t.s.forEach((sub, si) => {
    const r = chk[`${ti}.${si}`] || {};
    rows.push([`${ti + 1}.${si + 1}`, t.t, sub, ...CHECK_COLS.map(([k]) => (r[k] ? "Yes" : "No")), r.c ? CONF[r.c].replace(/^\S+\s/, "") : "", r.note || ""]);
  }));
  const csv = "\ufeff" + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `${STUDENT.first}-${s.name.replace(/\s+/g, "-")}-${syl.code}-checklist.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  toast("⬇ Checklist downloaded — open it in Excel");
}

// render planner with the rest of the app, and handle links like portal.html#planner / ?add=ma
const _initApp = initApp;
initApp = function () {
  _initApp();
  const add = new URLSearchParams(location.search).get("add");
  if (add && SUBJECTS.find((s) => s.id === add)) {
    if (DB.addPlannerSubject(STUDENT.id, add)) toast(`✓ ${subjectById(add).name} planner added`);
    plActive = add;
    history.replaceState(null, "", location.pathname + "#planner");
  }
  renderPlanner();
  if (location.hash === "#planner") show("planner");
};



// =====================================================
//  FEES + MONTHLY REPORT
// =====================================================
TITLES.fees = "Fees";
const money = (n) => "Rs " + Number(n).toLocaleString("en-PK");
function renderFees() {
  const rec = DB.student(STUDENT.id);
  const fees = rec.fees || [];
  const due = fees.find((f) => f.status === "due");
  const paid = fees.filter((f) => f.status === "paid");
  const per = DB.FEE_PER_SUBJECT[STUDENT.level] || 0;
  const monthName = (m) => new Date(m + "-01").toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const banner = $("#feeBanner");
  banner.hidden = !due;
  if (due) banner.innerHTML = `💳 <b>${monthName(due.month)} fee due</b> — ${money(due.amount)} by ${fmt(due.due)} <button class="link-btn" data-view="fees">View & download voucher →</button>`;

  $("#feesView").innerHTML = `
    <div class="fee-top">
      <div class="fee-card ${due ? "fee-card--due" : ""}">
        <small>${due ? "Amount due" : "All clear"}</small>
        <strong>${due ? money(due.amount) : "Rs 0"}</strong>
        <span>${due ? `${monthName(due.month)} · due ${fmt(due.due)}` : "No pending fees 🎉"}</span>
        ${due ? `<button class="btn btn--gold btn--sm" data-voucher="${due.id}">⬇ Download voucher</button>` : ""}
      </div>
      <div class="fee-card"><small>Paid this term</small><strong>${money(paid.reduce((n, f) => n + f.amount, 0))}</strong><span>${paid.length} month${paid.length === 1 ? "" : "s"} paid</span></div>
      <div class="fee-card"><small>Monthly fee</small><strong>${money(per * STUDENT.subjects.length)}</strong><span>${STUDENT.subjects.length} subjects × ${money(per)}</span></div>
    </div>
    <div class="panel">
      <div class="panel__head"><h3>Fee history</h3><span>${STUDENT.level} · ${STUDENT.campus} campus</span></div>
      <div class="table-wrap">
        <table class="marks fee-table">
          <thead><tr><th>Month</th><th>Voucher no.</th><th>Amount</th><th>Due date</th><th>Status</th><th></th></tr></thead>
          <tbody>${fees.length ? "" : `<tr><td colspan="6" class="empty">No fee records yet.</td></tr>`}${fees.map((f) => `<tr>
            <td><strong>${monthName(f.month)}</strong></td>
            <td>${f.id}</td>
            <td>${money(f.amount)}</td>
            <td>${fmt(f.due)}</td>
            <td><span class="fee-st fee-st--${f.status}">${f.status === "paid" ? `✓ Paid ${fmt(f.paidOn)}` : f.status === "due" ? "Due" : "Upcoming"}</span></td>
            <td>${f.status !== "upcoming" ? `<button class="link-btn" data-voucher="${f.id}">${f.status === "paid" ? "Receipt" : "Voucher"} ⬇</button>` : ""}</td>
          </tr>`).join("")}</tbody>
        </table>
      </div>
    </div>
    <div class="panel fee-how">
      <div class="panel__head"><h3>How to pay</h3></div>
      <ol>
        <li>Download the voucher and print it (3 copies on one page).</li>
        <li>Pay ${DB.settings.bank ? `at <b>${escP(DB.settings.bank)}</b>` : "at the bank or the campus front desk"} before the due date — a late fee of ${money(DB.settings.lateFee || 0)} applies after it.</li>
        <li>Keep the student copy; your portal shows “Paid” once SKH receives it.</li>
      </ol>
    </div>`;
}
document.addEventListener("click", (e) => {
  const v = e.target.closest("[data-voucher]");
  if (v && STUDENT) printFeeVoucher(STUDENT.id, v.dataset.voucher);
  if (e.target.closest("#dashReport, [data-report]") && STUDENT) printStudentReport(STUDENT.id);
  if (e.target.closest("[data-changepw]")) passwordDialog().then((ok) => ok && toast("✓ Password changed"));
  if (e.target.closest("[data-qr-dl]") && STUDENT) downloadQR();
  if (e.target.closest("[data-qr-print]") && STUDENT) printQRCard();
});
(() => {
  const _init = initApp;
  initApp = function () { _init(); renderFees(); };
})();

// ----- Stay signed in (server session cookie, 12 hours) -----
(async () => {
  try { sessionStorage.removeItem("skh-student"); localStorage.removeItem("skh-student"); } catch (e) {}
  try {
    const me = await DB.whoami();
    if (!me || (me.role !== "student" && me.role !== "parent")) {
      if (me) $("#loginErr").hidden = true;
      return;
    }
    await DB.load();
    enterApp(me.id);
  } catch (x) {
    loginError(x.message);
  }
})();

// ----- Attendance QR: download as PNG / print an ID-card sized slip -----
function downloadQR() {
  const svg = QR.svg("SKH:" + STUDENT.id, 12);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height + 60;
    const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0);
    x.fillStyle = "#041033"; x.font = "bold 22px sans-serif"; x.textAlign = "center";
    x.fillText(`${STUDENT.name} · ${STUDENT.id}`, c.width / 2, img.height + 32);
    const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = `${STUDENT.id}-attendance-QR.png`;
    document.body.appendChild(a); a.click(); a.remove();
    toast("⬇ QR code downloaded");
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function printQRCard() {
  const st = STUDENT;
  openPrintable(`${st.name} — Attendance card`, `
    <div style="width:86mm;border:1.5px solid #072062;border-radius:4mm;padding:5mm;margin:10mm auto;text-align:center;font-family:sans-serif">
      <div style="font-weight:800;color:#072062;font-size:14pt">SKH Solutions</div>
      <div style="font-size:8pt;color:#555;margin-bottom:3mm">Student attendance card</div>
      <div style="width:44mm;margin:0 auto">${QR.svg("SKH:" + st.id, 6).replace("<svg ", '<svg style="width:100%;height:auto" ')}</div>
      <div style="font-weight:700;font-size:12pt;margin-top:2mm">${escP(st.name)}</div>
      <div style="font-size:9pt;color:#333">${st.id} · ${st.level} · ${escP(st.campus)}</div>
    </div>`);
}
