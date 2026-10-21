// =====================================================================
//  SKH Solutions — portal UX layer (portal.html + teacher.html, loaded last)
//  App shell, Ctrl/Cmd+K palette, view transitions, dashboard charts,
//  sortable tables, confirm dialog, QR feedback. Purely additive: it wraps
//  the existing global functions (show, initApp) and never renames markup.
// =====================================================================
(() => {
  const q = (s, el = document) => el.querySelector(s);
  const qa = (s, el = document) => [...el.querySelectorAll(s)];
  const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
  const calm = () => mqReduce.matches;
  const canVT = () => typeof document.startViewTransition === "function" && !calm();
  const isTeacher = document.body.classList.contains("teacher-body");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  if (typeof document.startViewTransition === "function") document.documentElement.classList.add("vt-capable");
  const ICON_SEARCH = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`;
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const inApp = () => q("#app") && !q("#app").hidden;

  // ---------- Views: animated with the View Transitions API ----------
  const activeView = () => (q(".view.is-active") || { dataset: {} }).dataset.v;
  if (typeof show === "function") {
    const orig = show;
    // eslint-disable-next-line no-global-assign
    show = function (v) {
      const from = activeView();
      if (!canVT() || from === v || !inApp()) { orig(v); syncTabs(); return; }
      document.startViewTransition(() => { orig(v); syncTabs(); });
    };
  }

  // ---------- Sidebar: ⌘K search + collapse (desktop) ----------
  const side = q(".side");
  if (side) {
    const logo = q(".logo", side);
    logo.insertAdjacentHTML("afterend", `<button type="button" class="side-search" data-cmdk>${ICON_SEARCH}<span>Search or jump to…</span><kbd>${mac ? "⌘" : "Ctrl"} K</kbd></button>`);
    const coll = document.createElement("button");
    coll.type = "button"; coll.className = "side-collapse";
    coll.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg><span>Collapse</span>`;
    const foot = q(".side__foot", side) || q("#logout", side);
    foot.before(coll);
    const setMini = (on) => {
      document.body.classList.toggle("side-mini", on);
      coll.setAttribute("aria-label", on ? "Expand sidebar" : "Collapse sidebar");
      coll.setAttribute("aria-expanded", String(!on));
      qa(".side__nav button, .side__logout", side).forEach((b) => { const t = (q("span", b) || {}).textContent; if (t) b.setAttribute("title", t); });
      store.set("skh-side", on ? "mini" : "full");
    };
    setMini(store.get("skh-side") === "mini");
    coll.addEventListener("click", () => {
      const go = () => setMini(!document.body.classList.contains("side-mini"));
      canVT() ? document.startViewTransition(go) : go();
    });
  }
  // top-bar search button (phones)
  const topRight = q(".top__right");
  if (topRight) topRight.insertAdjacentHTML("afterbegin", `<button type="button" class="top-cmd" data-cmdk aria-label="Search or jump to a page">${ICON_SEARCH}</button>`);

  // ---------- Bottom tab bar (phones): 4 shortcuts + More ----------
  const TAB_VIEWS = isTeacher ? ["dash", "classes", "marks", "attend"] : ["dash", "time", "marks", "attend"];
  function syncTabs() {
    const bn = q("#bottomNav"); if (!bn || !bn.children.length) return;
    qa("button[data-view]", bn).forEach((b) => b.classList.toggle("is-tab", TAB_VIEWS.includes(b.dataset.view)));
    let more = q(".tab-more", bn);
    if (!more) {
      bn.insertAdjacentHTML("beforeend", `<button type="button" class="tab-more" data-cmdk aria-label="More pages"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg><span>More</span></button>`);
      more = q(".tab-more", bn);
    }
    more.classList.toggle("is-active", !TAB_VIEWS.includes(activeView()));
  }

  // ---------- Command palette (Ctrl/Cmd + K) ----------
  let cmdk = null, items = [], sel = 0;
  const navItems = () => qa("#sideNav button[data-view]").filter((b) => !b.classList.contains("admin-only") || document.body.classList.contains("is-admin")).map((b) => ({
    group: "Go to", label: (q("span", b) || b).textContent.trim(), icon: (q("svg", b) || {}).outerHTML || "", hint: b.classList.contains("is-active") ? "Current" : "", run: () => show(b.dataset.view),
  }));
  const actionItems = () => {
    const a = [];
    const ic = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
    if (q("#dashReport") && !isTeacher) a.push({ group: "Actions", label: "Download monthly report (PDF)", icon: ic('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'), run: () => q("#dashReport").click() });
    if (q("#themeToggle")) a.push({ group: "Actions", label: document.documentElement.dataset.theme === "dark" ? "Switch to light mode" : "Switch to dark mode", icon: ic('<path d="M20.5 14.2A8.6 8.6 0 1 1 10.4 3.6a6.8 6.8 0 0 0 10.1 10.6z"/>'), run: () => q("#themeToggle").click() });
    if (q("#changePw")) a.push({ group: "Actions", label: "Change password", icon: ic('<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>'), run: () => q("#changePw").click() });
    if (side) a.push({ group: "Actions", label: document.body.classList.contains("side-mini") ? "Expand sidebar" : "Collapse sidebar", icon: ic('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>'), run: () => q(".side-collapse").click() });
    a.push({ group: "Links", label: "Open the SKH website", icon: ic('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>'), run: () => (location.href = "index.html") });
    if (q("#logout")) a.push({ group: "Links", label: "Log out", icon: ic('<path d="M15 4h4v16h-4M10 16l4-4-4-4M14 12H3"/>'), run: () => q("#logout").click() });
    return a;
  };
  const renderList = (term) => {
    const t = term.trim().toLowerCase();
    const all = [...navItems(), ...actionItems()];
    items = t ? all.filter((i) => i.label.toLowerCase().includes(t) || t.split(/\s+/).every((w) => i.label.toLowerCase().includes(w))) : all;
    sel = Math.min(sel, Math.max(0, items.length - 1));
    const list = q(".cmdk__list", cmdk);
    if (!items.length) { list.innerHTML = `<li class="cmdk__empty">No page or action matches “${esc(term)}”.</li>`; return; }
    let g = "", html = "";
    items.forEach((i, k) => {
      if (i.group !== g) { g = i.group; html += `<li class="cmdk__group" role="presentation">${g}</li>`; }
      html += `<li class="cmdk__item" role="option" id="cmdk-${k}" data-k="${k}" aria-selected="${k === sel}">${i.icon}<span>${esc(i.label)}</span>${i.hint ? `<small>${i.hint}</small>` : ""}</li>`;
    });
    list.innerHTML = html;
    q("input", cmdk).setAttribute("aria-activedescendant", "cmdk-" + sel);
  };
  const move = (d) => {
    if (!items.length) return;
    sel = (sel + d + items.length) % items.length;
    qa(".cmdk__item", cmdk).forEach((li) => li.setAttribute("aria-selected", +li.dataset.k === sel));
    const cur = q(`#cmdk-${sel}`, cmdk); if (cur) cur.scrollIntoView({ block: "nearest" });
    q("input", cmdk).setAttribute("aria-activedescendant", "cmdk-" + sel);
  };
  let lastFocus = null;
  const closeCmdk = () => {
    if (!cmdk) return;
    const el = cmdk; cmdk = null; el.classList.remove("is-open");
    setTimeout(() => el.remove(), calm() ? 0 : 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };
  const runSel = () => { const i = items[sel]; if (!i) return; closeCmdk(); setTimeout(i.run, 10); };
  const openCmdk = () => {
    if (cmdk || !inApp()) return;
    lastFocus = document.activeElement; sel = 0;
    cmdk = document.createElement("div");
    cmdk.className = "cmdk";
    cmdk.innerHTML = `<div class="cmdk__box" role="dialog" aria-modal="true" aria-label="Search pages and actions">
      <label class="cmdk__search">${ICON_SEARCH}<span class="sr-only">Search</span><input type="text" role="combobox" aria-expanded="true" aria-controls="cmdkList" aria-autocomplete="list" placeholder="Search pages and actions…" autocomplete="off" spellcheck="false"></label>
      <ul class="cmdk__list" id="cmdkList" role="listbox"></ul>
      <div class="cmdk__foot"><span><kbd>↑</kbd> <kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span><span><kbd>Esc</kbd> to close</span></div></div>`;
    document.body.appendChild(cmdk);
    const input = q("input", cmdk);
    renderList("");
    requestAnimationFrame(() => cmdk && cmdk.classList.add("is-open"));
    input.focus();
    input.addEventListener("input", () => { sel = 0; renderList(input.value); });
    cmdk.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") { e.preventDefault(); runSel(); }
      else if (e.key === "Escape") { e.preventDefault(); closeCmdk(); }
      else if (e.key === "Tab") { e.preventDefault(); input.focus(); }
    });
    cmdk.addEventListener("click", (e) => {
      const li = e.target.closest(".cmdk__item");
      if (li) { sel = +li.dataset.k; runSel(); }
      else if (!e.target.closest(".cmdk__box")) closeCmdk();
    });
    cmdk.addEventListener("mousemove", (e) => { const li = e.target.closest(".cmdk__item"); if (li && +li.dataset.k !== sel) { sel = +li.dataset.k; move(0); } });
  };
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { if (!inApp()) return; e.preventDefault(); cmdk ? closeCmdk() : openCmdk(); }
  });
  document.addEventListener("click", (e) => { if (e.target.closest("[data-cmdk]")) { e.preventDefault(); openCmdk(); } });

  // ---------- Charts (vanilla SVG) ----------
  const spark = (vals) => {
    if (!vals || vals.length < 2) return "";
    const max = Math.max(...vals, 1), min = Math.min(...vals, 0), r = max - min || 1;
    const pts = vals.map((v, i) => [(i / (vals.length - 1)) * 100, 28 - ((v - min) / r) * 24]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    return `<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path class="spark__area" d="${d} L100 30 L0 30 Z"/><path class="spark__line" d="${d}" vector-effect="non-scaling-stroke"/></svg>`;
  };
  const tick = (el) => {
    const m = /^(\d+)(%?)$/.exec(el.textContent.trim()); if (!m || calm()) return;
    const to = +m[1], suf = m[2], t0 = performance.now(), dur = 700;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + suf; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const fmtD = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  function trendChart(tests) {
    if (tests.length < 2) return `<div class="empty-state"><b>Not enough tests yet</b>Your trend line appears after your second test.</div>`;
    const W = 600, H = 240, L = 34, R = 12, T = 14, B = 34;
    const pcts = tests.map((t) => Math.round((t.m / t.o) * 100));
    const x = (i) => L + (i / (tests.length - 1)) * (W - L - R), y = (v) => T + (1 - v / 100) * (H - T - B);
    const pts = pcts.map((v, i) => [x(i), y(v)]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const every = Math.ceil(tests.length / 8);
    const sub = (id) => (typeof subjectById === "function" && subjectById(id)) || { sym: id, name: id };
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Line chart of your test scores over time, from ${pcts[0]}% to ${pcts[pcts.length - 1]}%">
      <defs><linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#12aef0" stop-opacity=".28"/><stop offset="1" stop-color="#12aef0" stop-opacity="0"/></linearGradient></defs>
      <g class="grid">${[0, 25, 50, 75, 100].map((g) => `<line x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}"/><text x="${L - 8}" y="${y(g) + 4}" text-anchor="end">${g}</text>`).join("")}</g>
      <path class="area" d="${d} L${pts[pts.length - 1][0]} ${y(0)} L${pts[0][0]} ${y(0)} Z"/>
      <path class="line" d="${d}" style="--len:${Math.ceil(len)}"/>
      ${pts.map((p, i) => `<circle class="dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="5" style="--i:${i}" tabindex="0" data-tip-html="${esc(`<b>${tests[i].t}</b><br>${sub(tests[i].s).name} · ${tests[i].m}/${tests[i].o} (${pcts[i]}%) · ${fmtD(tests[i].d)}`)}" aria-label="${esc(`${tests[i].t}, ${sub(tests[i].s).name}, ${pcts[i]} percent, ${fmtD(tests[i].d)}`)}"/>`).join("")}
      ${pts.map((p, i) => (i % every === 0 || i === pts.length - 1) ? `<text class="xl" x="${p[0].toFixed(1)}" y="${H - 10}" text-anchor="middle">${esc(sub(tests[i].s).sym)}</text>` : "").join("")}
    </svg><div class="trend__tip" aria-hidden="true"></div>`;
  }
  function bindTrend(box) {
    const tip = q(".trend__tip", box); if (!tip) return;
    const showTip = (dot) => {
      const r = box.getBoundingClientRect(), c = dot.getBoundingClientRect();
      tip.innerHTML = dot.getAttribute("data-tip-html");
      tip.style.left = Math.min(r.width - 70, Math.max(70, c.left - r.left + c.width / 2)) + "px";
      tip.style.top = c.top - r.top + "px"; tip.classList.add("is-on");
    };
    box.addEventListener("pointerover", (e) => { if (e.target.classList.contains("dot")) showTip(e.target); });
    box.addEventListener("pointerout", (e) => { if (e.target.classList.contains("dot")) tip.classList.remove("is-on"); });
    box.addEventListener("focusin", (e) => { if (e.target.classList.contains("dot")) showTip(e.target); });
    box.addEventListener("focusout", () => tip.classList.remove("is-on"));
  }
  function heatmap(att, joined) {
    const since = joined ? Math.ceil((Date.now() - new Date(joined)) / 6048e5) + 1 : 16;
    const weeks = Math.max(8, Math.min(16, since || 16)), today = new Date(); today.setHours(0, 0, 0, 0);
    const mon = new Date(today); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7) - (weeks - 1) * 7);
    const names = { p: "Present", l: "Late", a: "Absent", h: "No class" };
    let cells = "";
    for (let w = 0; w < weeks; w++) for (let d = 0; d < 6; d++) {
      const dt = new Date(mon); dt.setDate(mon.getDate() + w * 7 + d);
      const st = (att[`${dt.getFullYear()}-${dt.getMonth()}`] || {})[dt.getDate()];
      const cls = dt > today ? "f" : st === "p" || st === "l" || st === "a" ? st : "";
      cells += `<i class="${cls}" title="${fmtD(dt)} — ${dt > today ? "Upcoming" : names[st] || "Not marked"}"></i>`;
    }
    return `<div class="heat" role="img" aria-label="Attendance over the last ${weeks} weeks">
      <div class="heat__days" aria-hidden="true"><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span></div>
      <div class="heat__grid">${cells}</div>
      <div class="heat__legend"><span><i style="background:#22c55e"></i>Present</span><span><i style="background:#f59e0b"></i>Late</span><span><i style="background:#ef4444"></i>Absent</span><span><i style="background:var(--surface-3)"></i>No class / not marked</span></div></div>`;
  }
  const weekRates = (att, n = 8) => {
    const out = [], today = new Date();
    for (let w = n - 1; w >= 0; w--) {
      let p = 0, all = 0;
      for (let d = 0; d < 7; d++) {
        const dt = new Date(today); dt.setDate(today.getDate() - w * 7 - d);
        const st = (att[`${dt.getFullYear()}-${dt.getMonth()}`] || {})[dt.getDate()];
        if (st === "p" || st === "l") { p++; all++; } else if (st === "a") all++;
      }
      if (all) out.push(Math.round((p / all) * 100));
    }
    return out;
  };

  function enhanceStudentDash() {
    if (isTeacher || typeof STUDENT === "undefined" || !STUDENT) return;
    const kpis = qa("#kpis .kpi");
    if (kpis[0]) kpis[0].insertAdjacentHTML("beforeend", spark(weekRates(ATT)));
    if (kpis[1]) kpis[1].insertAdjacentHTML("beforeend", spark(TESTS.slice(-8).map((t) => Math.round((t.m / t.o) * 100))));
    qa("#kpis .kpi strong").forEach(tick);
    const old = q(".dash-extra"); if (old) old.remove();
    const pending = TASKS.filter((t) => !t.done).sort((a, b) => String(a.due).localeCompare(String(b.due))).slice(0, 4);
    const now = new Date();
    const dueLabel = (t) => { const d = Math.ceil((new Date(t.due) - now) / 864e5); return d < 0 ? `Overdue ${-d}d` : d === 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d} days`; };
    const sub = (id) => subjectById(id) || { sym: "?", name: id };
    const pc = TESTS.map((t) => Math.round((t.m / t.o) * 100));
    const stat = (l, v) => `<div><small>${l}</small><strong>${v}</strong></div>`;
    const strip = pc.length ? `<div class="trend-stats">${stat("Latest", pc[pc.length - 1] + "%")}${stat("Best", Math.max(...pc) + "%")}${stat("Average", Math.round(pc.reduce((a, b) => a + b, 0) / pc.length) + "%")}${stat("Since first test", (pc[pc.length - 1] - pc[0] >= 0 ? "▲ " : "▼ ") + Math.abs(pc[pc.length - 1] - pc[0]) + "%")}</div>` : "";
    const html = `<div class="dash-extra">
      <div class="panel panel--trend">
        <div class="panel__head"><h3>Marks trend</h3><span>Every test, oldest → newest (%)</span></div>
        <div class="trend">${trendChart(TESTS)}</div>
        ${strip}
      </div>
      <div class="dash-extra__stack">
      <div class="panel">
        <div class="panel__head"><h3>Coming up</h3><button class="link-btn" data-go="tasks">All assignments</button></div>
        ${pending.length ? `<ul class="upnext">${pending.map((t) => `<li><b>${esc(sub(t.s).sym)}</b><div><strong>${esc(t.t)}</strong><small>${esc(sub(t.s).name)} · ${fmtD(t.due)}</small></div><em class="${Math.ceil((new Date(t.due) - now) / 864e5) > 2 ? "ok" : ""}">${dueLabel(t)}</em></li>`).join("")}</ul>` : `<div class="empty-state"><b>All caught up</b>No pending assignments right now.</div>`}
      </div>
      <div class="panel">
        <div class="panel__head"><h3>Attendance</h3><button class="link-btn" data-go="attend">Calendar</button></div>
        ${heatmap(ATT, STUDENT.joined)}
      </div>
      </div>
    </div>`;
    const grid = q(".view[data-v='dash'] .dash-grid");
    if (grid) { grid.insertAdjacentHTML("beforebegin", html); bindTrend(q(".dash-extra .trend")); }
  }
  let classesOpen = false;
  function enhanceTeacherDash() {
    if (!isTeacher) return;
    qa("#kpis .kpi strong").forEach(tick);
    const cards = q("#classCards"); if (!cards) return;
    const n = cards.children.length, old = q(".class-more"); if (old) old.remove();
    cards.classList.toggle("is-clamped", n > 6 && !classesOpen);
    if (n > 6) {
      cards.insertAdjacentHTML("afterend", `<button type="button" class="btn btn--outline btn--sm class-more" aria-expanded="${classesOpen}">${classesOpen ? "Show fewer classes" : `Show all ${n} classes`}</button>`);
      q(".class-more").addEventListener("click", () => { classesOpen = !classesOpen; enhanceTeacherDash(); });
    }
  }

  // ---------- wrap initApp: runs on login and on every live update ----------
  if (typeof initApp === "function") {
    const origInit = initApp;
    // eslint-disable-next-line no-global-assign
    initApp = function () {
      const r = origInit.apply(this, arguments);
      try { syncTabs(); enhanceStudentDash(); enhanceTeacherDash(); labelTables(); } catch (e) { console.warn("[app-ux]", e); }
      return r;
    };
  }

  // ---------- Parent read-only banner ----------
  const views = q(".views");
  if (views && !isTeacher) views.insertAdjacentHTML("afterbegin", `<div class="ro-banner" role="note"><span aria-hidden="true">👪</span><span><b>Parent view · read-only.</b> You can see everything your child sees; only SKH and your child can make changes.</span></div>`);

  // ---------- Tables: labels for phone cards + sortable columns ----------
  const numOf = (s) => { const f = /(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/.exec(s); if (f) return +f[1] / +f[2]; const n = /^-?[\d,.]+%?$/.test(s.trim()) ? parseFloat(s.replace(/,/g, "")) : NaN; return n; };
  const dateOf = (s) => { const t = Date.parse(s + (/\d{4}/.test(s) ? "" : " " + new Date().getFullYear())); return isNaN(t) ? NaN : t; };
  function labelTables() {
    qa("table").forEach((tb) => {
      const ths = qa("thead th", tb); if (!ths.length) return;
      const heads = ths.map((th) => th.textContent.trim());
      qa("tbody tr", tb).forEach((tr) => qa(":scope > td", tr).forEach((td, i) => { if (heads[i] && !td.hasAttribute("data-label")) td.setAttribute("data-label", heads[i]); }));
      const rows = qa("tbody tr", tb);
      const sortable = rows.length > 2 && !q("tbody input, tbody select, tbody textarea", tb) && !q("td[colspan]", tb);
      ths.forEach((th) => { if (sortable && th.textContent.trim()) { th.setAttribute("data-sortable", ""); th.tabIndex = 0; th.setAttribute("aria-sort", th.dataset.sort === "asc" ? "ascending" : th.dataset.sort === "desc" ? "descending" : "none"); } });
    });
  }
  const sortBy = (th) => {
    const tb = th.closest("table"), body = q("tbody", tb), idx = [...th.parentElement.children].indexOf(th);
    const dir = th.dataset.sort === "asc" ? "desc" : "asc";
    qa("th", tb).forEach((x) => { delete x.dataset.sort; if (x.hasAttribute("data-sortable")) x.setAttribute("aria-sort", "none"); });
    th.dataset.sort = dir; th.setAttribute("aria-sort", dir === "asc" ? "ascending" : "descending");
    const rows = qa(":scope > tr", body);
    const val = (tr) => (tr.children[idx] || {}).textContent || "";
    const sample = rows.map(val);
    const allNum = sample.every((s) => !isNaN(numOf(s))), allDate = !allNum && sample.every((s) => !isNaN(dateOf(s)));
    const key = (s) => (allNum ? numOf(s) : allDate ? dateOf(s) : s.toLowerCase());
    const sorted = rows.slice().sort((a, b) => { const x = key(val(a)), y = key(val(b)); return (x > y ? 1 : x < y ? -1 : 0) * (dir === "asc" ? 1 : -1); });
    const apply = () => sorted.forEach((r) => body.appendChild(r));
    if (canVT() && rows.length <= 40) {
      rows.forEach((r, i) => (r.style.viewTransitionName = "row-" + i));
      document.startViewTransition(apply).finished.finally(() => rows.forEach((r) => (r.style.viewTransitionName = "")));
    } else apply();
  };
  document.addEventListener("click", (e) => { const th = e.target.closest("th[data-sortable]"); if (th) sortBy(th); });
  document.addEventListener("keydown", (e) => { const th = e.target.closest && e.target.closest("th[data-sortable]"); if (th && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); sortBy(th); } });
  let lt = 0;
  new MutationObserver(() => { if (!lt) lt = requestAnimationFrame(() => { lt = 0; labelTables(); }); }).observe(q(".views") || document.body, { childList: true, subtree: true });

  // ---------- Confirm dialog for every "click twice to confirm" button ----------
  const before = new WeakMap();
  document.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b && !b.dataset.armed) before.set(b, b.innerHTML); }, true);
  let dlgOpen = false;
  const confirmDlg = (btn) => {
    if (dlgOpen) return; dlgOpen = true;
    const prevHTML = before.get(btn) || btn.innerHTML;
    const tmp = document.createElement("div"); tmp.innerHTML = prevHTML;
    let label = tmp.textContent.trim();
    const iconOnly = !/[a-z]{3}/i.test(label);
    const ctx = btn.closest("tr, li, article, .panel");
    const what = iconOnly ? "Delete this item" : label;
    const destructive = iconOnly || /delete|remove|reset|restore|replace|clear/i.test(label);
    const lastFocusEl = document.activeElement;
    const d = document.createElement("div");
    d.className = "ds-dialog";
    d.innerHTML = `<div class="ds-dialog__box" role="alertdialog" aria-modal="true" aria-labelledby="dsDlgT" aria-describedby="dsDlgD">
      <div class="ds-dialog__icon" aria-hidden="true">${destructive ? "!" : "?"}</div>
      <h3 id="dsDlgT">${esc(what)}?</h3>
      <p id="dsDlgD">${destructive ? "This can’t be undone." : "Please confirm to continue."}${ctx && q("strong, b, h3", ctx) && iconOnly ? ` <br><b>${esc(q("strong, b, h3", ctx).textContent.trim().slice(0, 80))}</b>` : ""}</p>
      <div class="ds-dialog__actions"><button type="button" class="btn btn--outline btn--sm" data-no>Cancel</button><button type="button" class="btn btn--sm ${destructive ? "btn--destructive" : "btn--gold"}" data-yes>${esc(iconOnly ? "Delete" : label.replace(/\?$/, ""))}</button></div></div>`;
    document.body.appendChild(d);
    requestAnimationFrame(() => d.classList.add("is-open"));
    const yes = q("[data-yes]", d), no = q("[data-no]", d);
    no.focus();
    const close = (ok) => {
      d.classList.remove("is-open"); setTimeout(() => d.remove(), 200); dlgOpen = false;
      if (ok) { if (document.contains(btn) && btn.dataset.armed) btn.click(); }
      else if (document.contains(btn)) { delete btn.dataset.armed; btn.classList.remove("is-armed"); btn.innerHTML = prevHTML; }
      if (lastFocusEl && document.contains(lastFocusEl)) lastFocusEl.focus({ preventScroll: true });
    };
    yes.addEventListener("click", () => close(true));
    no.addEventListener("click", () => close(false));
    d.addEventListener("click", (e) => { if (e.target === d) close(false); });
    d.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(false); }
      if (e.key === "Tab") { e.preventDefault(); (document.activeElement === yes ? no : yes).focus(); }
    });
  };
  new MutationObserver((muts) => muts.forEach((m) => {
    if (m.attributeName === "data-armed" && m.oldValue === null && m.target.dataset.armed && m.target.tagName === "BUTTON") confirmDlg(m.target);
  })).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-armed"], attributeOldValue: true });

  // ---------- QR scanner: scan line + success / fail flash ----------
  const scan = q("#qrScan"), log = q("#qrLog");
  if (scan && log) {
    new MutationObserver((muts) => {
      const li = muts.flatMap((m) => [...m.addedNodes]).find((n) => n.tagName === "LI"); if (!li) return;
      scan.classList.remove("is-ok", "is-bad"); void scan.offsetWidth;
      scan.classList.add(li.classList.contains("ok") ? "is-ok" : "is-bad");
      if (navigator.vibrate) try { navigator.vibrate(li.classList.contains("ok") ? 30 : [40, 60, 40]); } catch (e) {}
      setTimeout(() => scan.classList.remove("is-ok", "is-bad"), 700);
    }).observe(log, { childList: true });
    const cam = q("#qrCam");
    if (cam) new ResizeObserver(() => cam.style.setProperty("--scan-h", Math.max(40, cam.clientHeight * .78) + "px")).observe(cam);
  }

  // ---------- theme-color follows the theme ----------
  const meta = q('meta[name="theme-color"]:not([media])');
  const syncMeta = () => { if (meta) meta.content = document.documentElement.dataset.theme === "dark" ? "#041033" : "#072062"; };
  new MutationObserver(syncMeta).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  syncMeta();
})();
