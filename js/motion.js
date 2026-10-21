// =====================================================================
//  SKH Solutions — site motion + UX layer (index.html, loaded last)
//  Progressive enhancement only: every feature checks for its elements
//  and degrades to the original behaviour. Respects reduced motion.
// =====================================================================
(() => {
  const q = (s, el = document) => el.querySelector(s);
  const qa = (s, el = document) => [...el.querySelectorAll(s)];
  const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
  const calm = () => mqReduce.matches;
  const canVT = () => typeof document.startViewTransition === "function" && !calm();
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const vt = (fn) => (canVT() ? document.startViewTransition(fn) : (fn(), null));

  try { sessionStorage.setItem("skh-seen", "1"); } catch (e) {}

  // ---------- Hero: aurora mesh + grain, paused while off-screen ----------
  const hero = q(".hero");
  if (hero) {
    const bg = q(".hero__bg", hero);
    if (bg && !q(".aurora", bg)) {
      bg.insertAdjacentHTML("afterbegin", `<div class="aurora" aria-hidden="true"><i></i><i></i><i></i><i></i></div>`);
      bg.insertAdjacentHTML("beforeend", `<div class="hero-grain" aria-hidden="true"></div>`);
    }
    new IntersectionObserver(([e]) => hero.classList.toggle("is-offscreen", !e.isIntersecting)).observe(hero);
    // primary hero CTA is the one warm accent on the page
    const main = q(".hero__actions .btn--gold"); if (main) main.classList.add("btn--cta");
  }
  ["#nav .nav__cta", "#enrolForm [type=submit]", ".countdown .btn--gold"].forEach((s) => { const b = q(s); if (b) b.classList.add("btn--cta"); });

  // ---------- Magnetic CTAs (desktop pointers only; translate only) ----------
  const magnets = qa(".hero__actions .btn, .nav__cta, .countdown .btn, #enrolForm .btn");
  magnets.forEach((b) => {
    let raf = 0;
    b.addEventListener("pointermove", (e) => {
      if (!fine.matches || calm()) return;
      const r = b.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { b.classList.add("is-magnetic"); b.style.setProperty("--mx", (x * 6).toFixed(1) + "px"); b.style.setProperty("--my", (y * 5).toFixed(1) + "px"); });
    });
    b.addEventListener("pointerleave", () => { cancelAnimationFrame(raf); b.style.setProperty("--mx", "0px"); b.style.setProperty("--my", "0px"); });
  });

  // ---------- Mobile menu: lock scroll, focus, Esc to close ----------
  const nav = q("#nav"), toggle = q("#menuToggle");
  if (nav && toggle) {
    new MutationObserver(() => {
      const open = nav.classList.contains("is-open");
      document.body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (open) setTimeout(() => { const a = q("a", nav); if (a) a.focus({ preventScroll: true }); }, 60);
    }).observe(nav, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { toggle.click(); toggle.focus(); }
    });
  }

  // ---------- View-transition wrapper for existing controls ----------
  // Re-dispatches the original event inside startViewTransition so the
  // original handlers in script.js / extras.js still do the work.
  const passing = new WeakSet();
  const wrapVT = (root, type, match) => {
    if (!root) return;
    root.addEventListener(type, (e) => {
      const t = e.target.closest ? e.target.closest(match) : null;
      if (!t || !root.contains(t) || passing.has(e) || !canVT()) return;
      e.stopPropagation(); if (type === "click") e.preventDefault();
      vt(() => {
        const ev = type === "click" ? new MouseEvent("click", { bubbles: true, cancelable: true }) : new Event(type, { bubbles: true });
        passing.add(ev); t.dispatchEvent(ev);
      });
    }, true);
  };
  wrapVT(q(".tt-controls"), "change", "select");
  wrapVT(q("#campusList"), "click", "button");
  wrapVT(q("#campusLv"), "click", "button");

  // ---------- Faculty: department + subject + campus filter with animated reflow ----------
  const grid = q("#facultyGrid"), tabs = q("#deptTabs");
  if (grid && tabs && typeof TEACHERS !== "undefined") {
    const cards = qa(".teacher", grid);
    cards.forEach((c) => (c.style.viewTransitionName = "t-" + c.dataset.teacher));
    const subs = SUBJECTS.slice().sort((a, b) => a.name.localeCompare(b.name));
    tabs.insertAdjacentHTML("afterend", `
      <div class="fac-tools reveal">
        <label>Subject <select id="facSubject" aria-label="Filter teachers by subject"><option value="">All subjects</option>${subs.map((s) => `<option value="${s.id}">${s.name}</option>`).join("")}</select></label>
        <label>Campus <select id="facCampus" aria-label="Filter teachers by campus"><option value="">All campuses</option>${CAMPUSES.map((c) => `<option>${c}</option>`).join("")}</select></label>
        <p class="fac-tools__count" aria-live="polite"><b id="facCount">${cards.length}</b> teachers</p>
        <button type="button" class="fac-tools__reset" id="facReset" hidden>Clear filters</button>
      </div>`);
    const atCampus = (campus) => {
      const set = new Set();
      SUBJECTS.forEach((s) => s.levels.forEach((lv) => { try { set.add(teacherAt(s.id, campus, lv).id); } catch (e) {} }));
      return set;
    };
    let dept = "all";
    const apply = () => {
      const sub = q("#facSubject").value, campus = q("#facCampus").value;
      const here = campus ? atCampus(campus) : null;
      let n = 0;
      cards.forEach((c) => {
        const t = TEACHERS[c.dataset.teacher];
        const ok = (dept === "all" || c.dataset.cat === dept) && (!sub || t.subjects.includes(sub)) && (!here || here.has(c.dataset.teacher));
        c.hidden = !ok; if (ok) n++;
      });
      q("#facCount").textContent = n;
      q("#facReset").hidden = !(sub || campus || dept !== "all");
      let empty = q(".fac-empty", grid);
      if (!n && !empty) grid.insertAdjacentHTML("beforeend", `<p class="fac-empty">No teacher matches these filters yet — <b>call 0336 7647647</b> and admissions will help.</p>`);
      if (n && empty) empty.remove();
    };
    // take over the department tabs (same buttons, same classes) so all three filters combine
    tabs.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-d]"); if (!b) return;
      e.stopPropagation();
      vt(() => { dept = b.dataset.d; qa("button", tabs).forEach((x) => { x.classList.toggle("is-active", x === b); x.setAttribute("aria-pressed", x === b); }); apply(); });
    }, true);
    ["#facSubject", "#facCampus"].forEach((s) => q(s).addEventListener("change", () => vt(apply)));
    q("#facReset").addEventListener("click", () => vt(() => {
      dept = "all"; q("#facSubject").value = ""; q("#facCampus").value = "";
      qa("button", tabs).forEach((x) => x.classList.toggle("is-active", x.dataset.d === "all")); apply();
    }));
    qa("button", tabs).forEach((x) => x.setAttribute("aria-pressed", x.classList.contains("is-active")));
    // phones: show 9 teachers first, then "Show all"
    grid.classList.add("is-clamped");
    grid.insertAdjacentHTML("afterend", `<button type="button" class="btn btn--outline btn--sm fac-more" aria-expanded="false">Show all teachers</button>`);
    const more = q(".fac-more");
    const syncMore = () => { const n = cards.filter((c) => !c.hidden).length; more.hidden = n <= 9 || !grid.classList.contains("is-clamped"); more.textContent = `Show all ${n} teachers`; };
    more.addEventListener("click", () => { grid.classList.remove("is-clamped"); more.setAttribute("aria-expanded", "true"); syncMore(); });
    new MutationObserver(syncMore).observe(grid, { attributes: true, subtree: true, attributeFilter: ["hidden"] });
    syncMore();
    const note = q(".faculty__note"); if (note) note.textContent = "Click a teacher to view their full profile · campus assignments are confirmed at admission";

    // teacher card → modal morph
    let lastCard = null;
    grid.addEventListener("click", (e) => { lastCard = e.target.closest(".teacher"); }, true);
    grid.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") lastCard = e.target.closest(".teacher"); }, true);
    if (typeof showTeacher === "function") {
      const orig = showTeacher;
      // eslint-disable-next-line no-global-assign
      showTeacher = function (id) {
        const modalOpen = q("#modal") && q("#modal").classList.contains("is-open");
        const card = lastCard && lastCard.dataset.teacher === id && !modalOpen ? lastCard : null;
        lastCard = null;
        if (!card || !canVT()) return orig.apply(this, arguments);
        const frame = q(".teacher__frame", card), self = this, args = arguments;
        const name = card.style.viewTransitionName;
        card.style.viewTransitionName = "none";
        frame.style.viewTransitionName = "teacher-photo";
        const t = document.startViewTransition(() => {
          frame.style.viewTransitionName = "";
          orig.apply(self, args);
          const ph = q(".m-teacher__photo"); if (ph) ph.style.viewTransitionName = "teacher-photo";
        });
        t.finished.finally(() => { const ph = q(".m-teacher__photo"); if (ph) ph.style.viewTransitionName = ""; card.style.viewTransitionName = name; });
      };
    }
  }

  // ---------- How to join: pinned scrollytelling (desktop, motion OK) ----------
  const join = q("#join");
  if (join) {
    const steps = qa(".step", join), head = q(".section__head", join);
    head.insertAdjacentHTML("beforeend", `<div class="join__rail" aria-hidden="true"><div class="join__count"><span id="joinN">01</span><small>/ 0${steps.length}</small></div><div class="join__bar"><i></i></div></div>`);
    const bar = q(".join__bar i", join), num = q("#joinN");
    const mq = matchMedia("(min-width: 1024px)");
    let raf = 0, on = false;
    const tick = () => {
      raf = 0;
      const r = join.getBoundingClientRect(), span = r.height - innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / (span || 1)));
      const cur = Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999));
      bar.style.setProperty("--p", ((cur + 1) / steps.length).toFixed(3));
      num.textContent = String(cur + 1).padStart(2, "0");
      steps.forEach((s, i) => { s.classList.toggle("is-current", i === cur); s.classList.toggle("is-past", i < cur); });
    };
    const onScroll = () => { if (on && !raf) raf = requestAnimationFrame(tick); };
    const setup = () => {
      on = mq.matches && !calm();
      join.classList.toggle("is-scrolly", on);
      if (!on) steps.forEach((s) => s.classList.remove("is-current", "is-past")); else tick();
    };
    setup(); mq.addEventListener("change", setup); mqReduce.addEventListener("change", setup);
    addEventListener("scroll", onScroll, { passive: true });
  }

  // ---------- Admissions: multi-step form ----------
  const form = q("#enrolForm");
  if (form) {
    const msg = q("#formMsg"), submit = q("[type=submit]", form);
    const rows = qa(":scope > .form__row", form), fields = qa(":scope > .field", form), picked = q("#picked");
    const mk = (i, legend, nodes, navHTML) => {
      const fs = document.createElement("fieldset");
      fs.className = "form-step"; fs.dataset.step = i;
      fs.innerHTML = `<legend>${legend}</legend>`;
      nodes.forEach((n) => n && fs.appendChild(n));
      fs.insertAdjacentHTML("beforeend", `<div class="form-step__nav">${navHTML}</div>`);
      return fs;
    };
    const s1 = mk(0, "About the student", [rows[0]], `<button type="button" class="btn btn--gold btn--cta" data-next>Continue <span class="btn__arrow">→</span></button>`);
    const s2 = mk(1, "What would you like to study?", [rows[1], fields[0], picked, fields[1]], `<button type="button" class="btn btn--outline" data-back>Back</button><button type="button" class="btn btn--gold btn--cta" data-next>Review <span class="btn__arrow">→</span></button>`);
    const s3 = mk(2, "Check and send", [], `<button type="button" class="btn btn--outline" data-back>Back</button>`);
    s3.insertBefore(Object.assign(document.createElement("dl"), { className: "form-review", id: "formReview" }), s3.querySelector(".form-step__nav"));
    q(".form-step__nav", s3).appendChild(submit);
    const prog = document.createElement("div");
    prog.className = "form-progress";
    prog.innerHTML = `<ol class="form-progress__steps">${["Student", "Study plan", "Send"].map((t, i) => `<li data-i="${i}"><i>${i + 1}</i><span>${t}</span></li>`).join("")}</ol><div class="form-progress__bar" role="progressbar" aria-label="Enquiry progress" aria-valuemin="1" aria-valuemax="3" aria-valuenow="1"><i></i></div>`;
    form.prepend(prog);
    msg.before(s1, s2, s3);
    const steps = [s1, s2, s3];
    qa(".field input, .field select", form).forEach((f) => { if (!q(".field__err", f.parentElement)) f.parentElement.insertAdjacentHTML("beforeend", `<span class="field__err" id="err-${f.id}" aria-live="polite"></span>`); f.setAttribute("aria-describedby", "err-" + f.id); });

    const label = (f) => (q(`label[for="${f.id}"]`, form) || {}).textContent || "This field";
    const check = (f, show = true) => {
      let err = "";
      const v = f.value.trim();
      if (f.required && !v) err = f.tagName === "SELECT" ? `Please choose a ${label(f).toLowerCase().replace("preferred ", "")}.` : `Please enter the ${label(f).toLowerCase()}.`;
      else if (f.id === "f-phone" && v && v.replace(/\D/g, "").length < 10) err = "Enter a full mobile number, e.g. 0336 7647647.";
      else if (f.id === "f-name" && v && v.length < 2) err = "Please enter the full name.";
      if (show) {
        f.classList.toggle("is-invalid", !!err);
        f.setAttribute("aria-invalid", !!err);
        f.parentElement.classList.toggle("is-valid", !err && !!v);
        const box = q(".field__err", f.parentElement); if (box) box.textContent = err;
      }
      return !err;
    };
    qa(".field input, .field select", form).forEach((f) => {
      f.addEventListener("blur", () => { if (f.value.trim() || f.classList.contains("is-invalid")) check(f); });
      f.addEventListener("input", () => { if (f.classList.contains("is-invalid")) check(f); });
      f.addEventListener("change", () => { if (f.tagName === "SELECT") check(f); });
    });

    let cur = 0;
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const review = () => {
      const rowsR = [["Student", "f-name", 0], ["Phone", "f-phone", 0], ["Level", "f-level", 1], ["Campus", "f-campus", 1], ["Subjects", "f-subjects", 1], ["Preferred teacher", "f-teacher", 1]];
      q("#formReview").innerHTML = rowsR.map(([k, id, st]) => `<div><dt>${k}</dt><dd>${esc(q("#" + id).value.trim() || "—")}<button type="button" data-edit="${st}" aria-label="Edit ${k}">Edit</button></dd></div>`).join("");
    };
    const go = (i, focus = true) => {
      cur = i;
      steps.forEach((s, k) => (s.hidden = k !== i));
      qa(".form-progress__steps li", form).forEach((li, k) => { li.classList.toggle("is-current", k === i); li.classList.toggle("is-done", k < i); li.querySelector("i").textContent = k < i ? "✓" : k + 1; });
      q(".form-progress__bar", form).style.setProperty("--p", ((i + 1) / 3).toFixed(3));
      q(".form-progress__bar", form).setAttribute("aria-valuenow", i + 1);
      if (i === 2) review();
      if (focus) { const f = q("input, select, button", steps[i]); if (f) f.focus({ preventScroll: true }); }
    };
    const stepOk = (i) => {
      const bad = qa("input, select", steps[i]).filter((f) => !check(f));
      if (bad.length) { bad[0].focus(); return false; }
      return true;
    };
    form.addEventListener("click", (e) => {
      if (e.target.closest("[data-next]")) { if (stepOk(cur)) go(cur + 1); }
      else if (e.target.closest("[data-back]")) go(cur - 1);
      else if (e.target.closest("[data-edit]")) go(+e.target.closest("[data-edit]").dataset.edit);
      else if (e.target.closest("[data-again]")) { form.classList.remove("is-done"); msg.textContent = ""; msg.className = "form__msg"; const d = q(".form-done", form); if (d) d.remove(); qa(".field", form).forEach((x) => x.classList.remove("is-valid")); go(0); }
    });
    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && cur < 2 && e.target.matches("input")) { e.preventDefault(); if (stepOk(cur)) go(cur + 1); }
    });
    form.addEventListener("submit", (e) => { if (cur < 2) { e.preventDefault(); e.stopImmediatePropagation(); if (stepOk(cur)) go(cur + 1); } }, true);
    // react to the original submit handler's result
    new MutationObserver(() => {
      if (msg.classList.contains("is-error")) {
        const bad = q(".is-invalid", form);
        if (bad) { const st = bad.closest(".form-step"); go(+st.dataset.step, false); check(bad); bad.focus(); }
      } else if (msg.classList.contains("is-success") && !form.classList.contains("is-done")) {
        form.classList.add("is-done");
        msg.insertAdjacentHTML("beforebegin", `<div class="form-done"><svg viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="38"/><path d="M26 43l11 11 21-23"/></svg><h3>Enquiry sent</h3></div>`);
        msg.insertAdjacentHTML("afterend", ``);
        if (!q("[data-again]", form)) msg.insertAdjacentHTML("afterend", `<button type="button" class="btn btn--outline btn--sm form-again" data-again>Send another enquiry</button>`);
        confetti();
      }
    }).observe(msg, { attributes: true, attributeFilter: ["class"], childList: true });
    go(0, false);
  }

  // light confetti — 70 pieces, ~1.4s, canvas, skipped for reduced motion
  function confetti() {
    if (calm()) return;
    const c = document.createElement("canvas"); c.className = "confetti"; document.body.appendChild(c);
    const dpr = Math.min(2, devicePixelRatio || 1); c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    const x = c.getContext("2d"); x.scale(dpr, dpr);
    const box = (q("#enrolForm") || document.body).getBoundingClientRect();
    const cols = ["#12aef0", "#6ad4ff", "#ffb224", "#2563eb", "#e6187e", "#5cb82e"];
    const P = Array.from({ length: 70 }, () => ({ x: box.left + box.width / 2, y: box.top + 80, vx: (Math.random() - .5) * 9, vy: -Math.random() * 9 - 4, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3, w: 6 + Math.random() * 5, h: 4 + Math.random() * 4, c: cols[(Math.random() * cols.length) | 0] }));
    const t0 = performance.now();
    const step = (t) => {
      const k = (t - t0) / 1400; x.clearRect(0, 0, innerWidth, innerHeight);
      if (k >= 1) { c.remove(); return; }
      P.forEach((p) => { p.vy += .32; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.globalAlpha = 1 - k * k; x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore(); });
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
})();
