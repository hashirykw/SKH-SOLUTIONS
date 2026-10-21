// ===== SKH Solutions — Hall of Fame + Timetable =====

// ---------------- Timetable ----------------
(() => {
  const campusSel = $("#ttCampus");
  const levelSel = $("#ttLevel");
  const subjSel = $("#ttSubject");
  campusSel.innerHTML = CAMPUSES.map((c) => `<option>${c}</option>`).join("");
  levelSel.innerHTML = Object.keys(LEVEL_SUBJECTS).map((l) => `<option>${l}</option>`).join("");

  const fillSubjects = () => {
    const keep = subjSel.value;
    subjSel.innerHTML = `<option value="">All subjects</option>` +
      LEVEL_SUBJECTS[levelSel.value].map((id) => `<option value="${id}">${subjectById(id).name}</option>`).join("");
    if ([...subjSel.options].some((o) => o.value === keep)) subjSel.value = keep;
  };

  const today = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];

  const render = () => {
    const grid = sampleTimetable(campusSel.value, levelSel.value);
    const real = TIMETABLES[`${campusSel.value}|${levelSel.value}`];
    const note = document.getElementById("ttNote");
    if (note) note.textContent = real ? `Current ${levelSel.value} timetable at ${campusSel.value} · updated by SKH` : "Typical weekly schedule · exact timings confirmed at admission";
    const only = subjSel.value;
    let html = `<div class="tt__corner"></div>` +
      DAYS.map((d) => `<div class="tt__day ${d === today ? "is-today" : ""}">${d}${d === today ? "<small>Today</small>" : ""}</div>`).join("");
    SLOTS.forEach((slot, si) => {
      html += `<div class="tt__time">${slot.replace(" – ", "<br>")}</div>`;
      DAYS.forEach((d) => {
        const c = grid[d][si];
        if (!c) { html += `<div class="tt__cell tt__cell--free"><span>Free</span></div>`; return; }
        const sub = subjectById(c.subject);
        const t = teacherAt(sub.id, campusSel.value, levelSel.value);
        const dim = only && only !== c.subject ? "is-dim" : "";
        const hit = only && only === c.subject ? "is-hit" : "";
        html += `
          <button class="tt__cell tt__cell--${sub.cat} ${dim} ${hit}" data-subject="${sub.id}" aria-label="${sub.name}, ${d} ${slot}">
            <b>${sub.sym}</b>
            <strong>${sub.name}</strong>
            <small>${t.name}</small>
          </button>`;
      });
    });
    const el = $("#ttGrid");
    el.innerHTML = html;
    el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap");
  };

  fillSubjects();
  render();
  campusSel.addEventListener("change", render);
  levelSel.addEventListener("change", () => { fillSubjects(); render(); });
  subjSel.addEventListener("change", render);
  $("#ttGrid").addEventListener("click", (e) => {
    const c = e.target.closest("[data-subject]");
    if (c) showSubject(c.dataset.subject);
  });
})();

// ---------------- Study material (all subjects) ----------------
(() => {
  let active = "ma";
  const tabs = $("#studyTabs");
  tabs.innerHTML = SUBJECTS.map((s) => `<button class="stab-s stab-s--${s.cat} ${s.id === active ? "is-active" : ""}" data-study="${s.id}" role="tab"><b>${s.sym}</b>${s.name}</button>`).join("");

  const colors = { science: ["#1a5fe0", "#12aef0"], commerce: ["#2f6e12", "#5cb82e"], humanities: ["#8a0f4c", "#e6187e"] };
  const render = () => {
    const s = subjectById(active);
    const m = materialFor(active);
    $("#studyPanel").innerHTML = `
      <div class="study__head">
        <div class="study__sym study__sym--${s.cat}">${s.sym}</div>
        <div>
          <h3>${s.name}</h3>
          <p>${s.levels.join(" · ")} · Cambridge ${s.code}</p>
        </div>
      </div>
      <ul class="study__list">${m.items.map(([icon, title, desc]) => `
        <li><b>${icon}</b><span><strong>${title}</strong>${desc}</span></li>`).join("")}
      </ul>
      <div class="study__actions">
        <a class="btn btn--gold btn--sm" target="_blank" rel="noopener" href="https://wa.me/923367647647?text=${encodeURIComponent(`Assalam-o-Alaikum, I'd like to know about SKH ${s.name} study material.`)}">Ask about ${s.name} material</a>
        <button class="btn btn--outline btn--sm" data-st-plan="${s.id}">🗓️ Add to my planner</button>
        <button class="btn btn--outline btn--sm" data-st-subject="${s.id}">View teachers</button>
      </div>`;
    const [c1, c2] = colors[s.cat];
    const covers = [[s.name, "Topical Notes", "All chapters"], [s.name, "Past Papers", "With mark schemes"], [s.name, "Worksheets", "Class tests"], ["SKH", "Monthly Planner", s.name]];
    const grads = [`linear-gradient(160deg, ${c2}, ${c1})`, "linear-gradient(160deg, #12aef0, #0a5fb0)", `linear-gradient(160deg, ${c1}, #041033)`, "linear-gradient(160deg, #1a5fe0, #072062)"];
    const el = $("#studyBooks");
    el.innerHTML = covers.map(([a, b, c], i) => `<div class="book b${i + 1}" style="background:${grads[i]}"><span>${a}</span><strong>${b}</strong><small>${c}</small></div>`).join("");
    [$("#studyPanel"), el].forEach((x) => { x.classList.remove("swap"); void x.offsetWidth; x.classList.add("swap"); });
  };
  tabs.addEventListener("click", (e) => {
    const b = e.target.closest("[data-study]"); if (!b) return;
    active = b.dataset.study;
    $$("[data-study]", tabs).forEach((x) => x.classList.toggle("is-active", x === b));
    render();
  });
  $("#studyPanel").addEventListener("click", (e) => {
    const t = e.target.closest("[data-st-teacher]"); if (t) showTeacher(t.dataset.stTeacher);
    const s = e.target.closest("[data-st-subject]"); if (s) showSubject(s.dataset.stSubject);
    const pl = e.target.closest("[data-st-plan]"); if (pl) addToPlanner(pl.dataset.stPlan);
  });
  render();
})();

// ---------------- Add a subject to the logged-in student's planner ----------------
async function addToPlanner(subjectId) {
  const name = subjectById(subjectId).name;
  let me = null;
  try { me = await DB.whoami(); } catch (e) {}
  if (!me || me.role !== "student") {
    toast(`Log in to the Student Portal to add a ${name} planner…`);
    setTimeout(() => (location.href = `portal.html?add=${subjectId}`), 1200);
    return;
  }
  try {
    const r = await api("POST", "/api/me/planner", { subject: subjectId });
    toast(r.added ? `✓ ${name} planner added to ${me.name.split(" ")[0]}'s portal — opening…` : `${name} is already in your planner — opening…`);
    setTimeout(() => (location.href = "portal.html#planner"), 1300);
  } catch (e) { toast(e.message); }
}
