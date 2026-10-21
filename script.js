// ===== SKH Solutions — site interactions =====

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];


// ---------- Render subjects & faculty from data.js ----------
const teacherFor = (id, subj) => TEACHERS[id] ? { id, ...TEACHERS[id] } : null;
const teachersOfSubject = (subj) =>
  subj.teachers.length ? subj.teachers.map((id) => teacherFor(id)) : [{ id: "ph-" + subj.id, ...placeholderTeacher(subj) }];
const subjectById = (id) => SUBJECTS.find((s) => s.id === id);
// teachers of a subject who take classes at this level (e.g. some teach only O Level)
const teachersAtLevel = (subj, level) => {
  const fit = subj.teachers.filter((id) => !level || TEACHERS[id].levels.includes(level) || (level === "A Level" && TEACHERS[id].levels.some((l) => l !== "O Level")));
  return fit.length ? fit : subj.teachers;
};
const getTeacher = (id) => {
  if (TEACHERS[id]) return { id, ...TEACHERS[id] };
  const subj = subjectById(id.replace("ph-", ""));
  return { id, ...placeholderTeacher(subj) };
};

// "O Level", "A Level" or "O / A Level"
const levelLabel = (levels) => {
  const o = levels.includes("O Level"), a = levels.some((l) => l !== "O Level");
  return o && a ? "O / A Level" : o ? "O Level" : "A Level";
};
$("#elements").innerHTML = SUBJECTS.map((s, i) => `
  <li class="el el--${s.cat}" data-cat="${s.cat}" data-id="${s.id}" tabindex="0" role="button"
      data-search="${(s.name + " " + teachersOfSubject(s).map((t) => t.name).join(" ")).toLowerCase()}"
      aria-label="${s.name} — view teachers">
    <small>${String(i + 1).padStart(2, "0")}</small><em class="el__lv">${levelLabel(s.levels)}</em>
    <b>${s.sym}</b><span>${s.name}</span>
  </li>`).join("");

// ---------- Teacher photos ----------
// Put a photo in assets/teachers/ named after the teacher's id (e.g. babar.jpg).
// If there's no photo, the teacher's initials are shown instead.
const teacherPhoto = (id) => ""; // photos turned off — teachers show their initials

const teacherCard = ([id, t]) => {
  const sub = subjectById(t.subjects[0]);
  return `
  <article class="teacher tilt reveal ${t.founder ? "teacher--founder" : ""}" data-teacher="${id}" data-cat="${sub.cat}" tabindex="0" role="button" aria-label="View profile of ${t.name}">
    <div class="teacher__frame teacher__frame--${sub.cat}"><span>${t.initials}</span>${teacherPhoto(id)}<em class="teacher__view">View Profile</em>${t.founder ? `<i class="teacher__crown">Founder</i>` : ""}</div>
    <h3>${t.name}</h3><p>${sub.name}</p>
  </article>`;
};
$("#facultyGrid").innerHTML = Object.entries(TEACHERS).map(teacherCard).join("");

// Department tabs with counts
(() => {
  const cards = $$("#facultyGrid .teacher");
  $$("#deptTabs button").forEach((b) => {
    const d = b.dataset.d;
    b.querySelector("em").textContent = d === "all" ? cards.length : cards.filter((c) => c.dataset.cat === d).length;
    b.addEventListener("click", () => {
      $$("#deptTabs button").forEach((x) => x.classList.toggle("is-active", x === b));
      cards.forEach((c) => {
        const show = d === "all" || c.dataset.cat === d;
        c.hidden = !show;
        if (show) { c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); }
      });
    });
  });
})();

// ---------- Loader, then hero entrance ----------
document.body.classList.add("is-loading");
window.addEventListener("load", () => {
  setTimeout(() => {
    $("#loader").classList.add("is-done");
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
  }, 1400);
});

// ---------- Mobile menu ----------
const menuToggle = $("#menuToggle");
const nav = $("#nav");
const closeMenu = () => {
  nav.classList.remove("is-open");
  menuToggle.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
};
menuToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  menuToggle.classList.toggle("is-open", open);
  menuToggle.setAttribute("aria-expanded", open);
});
$$("a", nav).forEach((a) => a.addEventListener("click", closeMenu));

// ---------- Scroll: header, progress bar, back-to-top ----------
const header = $("#header");
const progress = $("#progress");
const toTop = $("#toTop");
const onScroll = () => {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  header.classList.toggle("is-scrolled", y > 30);
  toTop.classList.toggle("is-visible", y > 700);
  progress.style.width = (y / max) * 100 + "%";
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ---------- Active nav link ----------
const navLinks = $$("a:not(.btn)", nav);
const sectionObserver = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id));
  }),
  { rootMargin: "-45% 0px -50% 0px" }
);
$$("main section[id]").forEach((s) => sectionObserver.observe(s));

// ---------- Reveal on scroll (with stagger for siblings) ----------
const revealObserver = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const siblings = $$(":scope > .reveal", e.target.parentElement);
    const i = Math.max(0, siblings.indexOf(e.target));
    e.target.style.transitionDelay = Math.min(i * 90, 450) + "ms";
    e.target.classList.add("is-visible");
    revealObserver.unobserve(e.target);
  }),
  { threshold: 0.12 }
);
$$(".reveal").forEach((el) => revealObserver.observe(el));

// ---------- Rotating subject word ----------
const rotator = $("#rotator");
const words = ["Mathematics", "Physics", "Chemistry", "Biology", "Accounting", "Economics", "English", "Computer Science"];
let wi = 0;
setInterval(() => {
  rotator.classList.add("is-out");
  setTimeout(() => {
    wi = (wi + 1) % words.length;
    rotator.textContent = words[wi];
    rotator.classList.remove("is-out");
  }, 400);
}, 2400);

// ---------- Count-up numbers ----------
const countObserver = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  const el = e.target, to = +el.dataset.to, start = performance.now(), dur = 1600;
  const tick = (now) => {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  };
  setTimeout(() => requestAnimationFrame(tick), 1800);
  countObserver.unobserve(el);
}), { threshold: 0.5 });
$$(".count").forEach((c) => countObserver.observe(c));

// ---------- Hero parallax (desktop) ----------
const hero = $(".hero");
const fine = matchMedia("(pointer: fine)").matches;
if (fine) {
  hero.addEventListener("mousemove", (e) => {
    const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
    $$(".glyph", hero).forEach((g, i) => (g.style.translate = `${x * (i + 1) * 12}px ${y * (i + 1) * 12}px`));
    $(".emblem", hero).style.translate = `${x * -20}px ${y * -20}px`;
    $$(".float-card", hero).forEach((c, i) => (c.style.translate = `${x * (i + 2) * 10}px ${y * (i + 2) * 10}px`));
  });
}

// ---------- Spotlight cards ----------
$$(".spot").forEach((card) => card.addEventListener("mousemove", (e) => {
  const r = card.getBoundingClientRect();
  card.style.setProperty("--x", e.clientX - r.left + "px");
  card.style.setProperty("--y", e.clientY - r.top + "px");
}));

// ---------- 3D tilt on faculty cards ----------
if (fine) {
  $$(".tilt").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${y * -10}deg) translateY(-6px)`;
    });
    card.addEventListener("mouseleave", () => (card.style.transform = ""));
  });
}

// ---------- Subject filter + search ----------
const filters = $$(".filter");
const pill = $("#filterPill");
let activeCat = "all";
const movePill = (btn) => {
  pill.style.left = btn.offsetLeft + "px";
  pill.style.width = btn.offsetWidth + "px";
};
const applyFilters = () => {
  const q = $("#subjectSearch").value.trim().toLowerCase();
  $$(".el").forEach((el) => {
    const catOk = activeCat === "all" || el.dataset.cat === activeCat;
    const qOk = !q || el.dataset.search.includes(q);
    el.classList.toggle("is-dim", !(catOk && qOk));
    el.classList.toggle("is-match", !!q && catOk && qOk);
  });
};
filters.forEach((btn) => btn.addEventListener("click", () => {
  filters.forEach((b) => b.classList.remove("is-active"));
  btn.classList.add("is-active");
  movePill(btn);
  activeCat = btn.dataset.filter;
  applyFilters();
}));
$("#subjectSearch").addEventListener("input", applyFilters);
const initPill = () => movePill($(".filter.is-active"));
window.addEventListener("load", initPill);
window.addEventListener("resize", initPill);
if (document.fonts) document.fonts.ready.then(initPill);

// ---------- Campus switcher (details come from the admin's "Website Content" page) ----------
const campuses = [
  { key: "Gulshan", name: "Gulshan Campus", addr: "A-292, Block 2, Gulshan-e-Iqbal, Karachi", q: "SKH Solutions Gulshan-e-Iqbal Block 2 Karachi" },
  { key: "Jauhar", name: "Jauhar Campus", addr: "Near Al-Faizan CNG Pump, Block 14, Gulistan-e-Johar, Karachi", q: "SKH Solutions Gulistan-e-Johar Block 14 Karachi" },
  { key: "North", name: "North Campus", addr: "North Nazimabad, Karachi — call us for directions", q: "SKH Solutions North Nazimabad Karachi" },
  { key: "Bahadurabad", name: "Bahadurabad Campus", addr: "371, Siraj-ud-Daula Road, Bahadurabad, Karachi", q: "SKH Solutions Bahadurabad Campus Karachi" },
  { key: "PECHS (Girls)", name: "PECHS Girls Campus", addr: "PECHS, Karachi — dedicated campus for girls", q: "SKH Solutions PECHS Karachi" },
  { key: "Defence", name: "Defence Campus", addr: "DHA, Karachi — call us for directions", q: "SKH Solutions Defence Karachi" },
];
let PUBLIC = { campuses: {}, results: [], testimonials: [] };
let campusIdx = 0, campusLevel = "O Level";
const campusBtns = $$("#campusList button");
const telOf = (p) => { let d = String(p || "").replace(/\D/g, ""); if (d.startsWith("0")) d = "92" + d.slice(1); return d; };
const setCampus = (i, animate = true) => {
  campusIdx = i;
  const c = campuses[i], extra = PUBLIC.campuses[c.key] || {};
  campusBtns.forEach((b) => b.classList.toggle("is-active", +b.dataset.i === i));
  if (animate) ["#campusNo", "#campusName", "#campusAddr", "#campusMeta"].forEach((s) => {
    const el = $(s);
    el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap");
  });
  const phone = extra.phone || "0336 7647647";
  $("#campusNo").textContent = "Campus 0" + (i + 1);
  $("#campusName").textContent = c.name;
  $("#campusAddr").textContent = c.addr;
  $("#campusMeta").innerHTML = `<li><span>📞</span>${phone.replace(/[<>&]/g, "")}</li><li><span>🕒</span>${(extra.timings || "Call for class timings").replace(/[<>&]/g, "")}</li>`;
  $("#campusMap").href = /^https?:\/\//.test(extra.map || "") ? extra.map : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(c.q);
  $("#campusCall").href = "tel:+" + telOf(phone);
  $("#campusWa").href = `https://wa.me/${telOf(phone)}?text=${encodeURIComponent(`Assalam-o-Alaikum, I'd like to know about classes at the ${c.name}.`)}`;
  const src = "https://maps.google.com/maps?q=" + encodeURIComponent(c.q) + "&z=15&output=embed";
  let embedded = false; try { embedded = window.self !== window.top; } catch (e) { embedded = true; }
  if (embedded) { // maps can't be embedded inside a preview frame: show a link card instead
    const box = $(".campus-extra__map");
    box.innerHTML = `<a class="map-link" href="${$("#campusMap").href}" target="_blank" rel="noopener"><span>📍</span><b>${c.name}</b><small>${c.addr}</small><em>Open in Google Maps →</em></a>`;
  } else if ($("#campusFrame").getAttribute("src") !== src) $("#campusFrame").src = src;
  renderCampusSubjects();
};
function renderCampusSubjects() {
  const c = campuses[campusIdx];
  $("#campusSubsTitle").textContent = `Subjects & teachers at ${c.key.replace(" (Girls)", "")}`;
  $("#campusSubs").innerHTML = SUBJECTS.filter((s) => s.levels.includes(campusLevel)).map((s) => {
    const t = teacherAt(s.id, c.key, campusLevel);
    return `<li><button class="cs cs--${s.cat}" data-cs="${s.id}"><b>${s.sym}</b><span>${s.name}<small>${t.name}</small></span></button></li>`;
  }).join("");
  $("#campusEnrol").onclick = () => { const f = $("#f-campus"); if (f) f.value = c.key; };
}
campusBtns.forEach((b) => b.addEventListener("click", () => setCampus(+b.dataset.i)));
$("#campusLv").addEventListener("click", (e) => {
  const b = e.target.closest("[data-lv]"); if (!b) return;
  campusLevel = b.dataset.lv; $$("#campusLv button").forEach((x) => x.classList.toggle("is-on", x === b));
  renderCampusSubjects();
});
$("#campusSubs").addEventListener("click", (e) => { const b = e.target.closest("[data-cs]"); if (b) showSubject(b.dataset.cs); });
setCampus(0, false);

// ---------- News set by the admin (replaces the default cards) ----------
if (NEWS) {
  const e = (x) => String(x ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  $("#newsGrid").innerHTML = NEWS.map((n, i) => `
    <a class="news-card ${i === 0 ? "news-card--big" : ""} reveal is-visible" href="${n.link ? e(n.link) : "#contact"}" ${n.link ? 'target="_blank" rel="noopener"' : ""}>
      ${n.tag ? `<span class="news-card__tag">${e(n.tag)}</span>` : ""}
      <h3>${e(n.title)}</h3>
      ${n.text ? `<p>${e(n.text)}</p>` : ""}
      <span class="news-card__more">${n.link ? "Read more →" : "Enquire →"}</span>
    </a>`).join("");
}

// ---------- Results & testimonials (added by the admin; hidden until there are some) ----------
function renderResults() {
  const esc2 = (x) => String(x ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const { results = [], testimonials = [] } = PUBLIC;
  $("#results").hidden = !results.length && !testimonials.length;
  $("#resGrid").innerHTML = results.slice(0, 12).map((r) => `
    <div class="res-card reveal is-visible"><strong>${esc2(r.grade)}</strong><div><b>${esc2(r.name)}</b><small>${esc2(r.subject)} · ${esc2(r.level)}${r.year ? " · " + esc2(r.year) : ""}</small></div></div>`).join("");
  $("#tesGrid").innerHTML = testimonials.slice(0, 6).map((t) => `
    <figure class="tes-card reveal is-visible"><blockquote>“${esc2(t.text)}”</blockquote><figcaption><b>${esc2(t.name)}</b><small>${esc2(t.role)}</small></figcaption></figure>`).join("");
}
(async () => {
  if (location.protocol === "file:" && !window.SKH_DEMO) return;
  try { PUBLIC = await api("GET", "/api/public"); setCampus(campusIdx, false); renderResults(); } catch (e) {}
})();

// ---------- FAQ: only one open at a time ----------
const faqs = $$(".faq__list details");
faqs.forEach((d) => d.addEventListener("toggle", () => {
  if (d.open) faqs.forEach((o) => o !== d && (o.open = false));
}));

// ---------- Enrolment form -> saved on the SKH server (+ optional WhatsApp) ----------
const form = $("#enrolForm");
const msg = $("#formMsg");
const WHATSAPP_NUMBER = "923367647647";

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  let valid = true;
  $$("[required]", form).forEach((f) => {
    const ok = f.value.trim() !== "";
    f.classList.toggle("is-invalid", !ok);
    if (!ok) valid = false;
  });
  const phone = form.phone.value.replace(/\D/g, "");
  if (phone && phone.length < 10) { form.phone.classList.add("is-invalid"); valid = false; }

  if (!valid) {
    msg.textContent = "Please fill in all required fields correctly.";
    msg.className = "form__msg is-error";
    return;
  }

  const data = { name: form.name.value.trim(), phone: form.phone.value.trim(), level: form.level.value, campus: form.campus.value, subjects: form.subjects.value.trim(), teacher: form.teacher.value.trim() };
  const btn = form.querySelector("[type=submit]"); btn.disabled = true;
  let saved = false;
  try {
    await api("POST", "/api/enquiries", data);
    saved = true;
  } catch (err) {
    if (!err.offline) { msg.textContent = err.message; msg.className = "form__msg is-error"; btn.disabled = false; return; }
  }
  btn.disabled = false;
  const text =
    `Assalam-o-Alaikum, I'd like to enquire about admission.\n` +
    `Name: ${form.name.value.trim()}\nPhone: ${form.phone.value.trim()}\n` +
    `Level: ${form.level.value}\nCampus: ${form.campus.value}\n` +
    `Subjects: ${form.subjects.value.trim() || "-"}\n` +
    `Preferred teacher: ${form.teacher.value.trim() || "-"}`;
  const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  if (saved) {
    msg.innerHTML = `✓ Thank you, ${data.name.split(" ")[0].replace(/[<>&]/g, "")}! Your enquiry has been sent to SKH — our admissions team will call you soon. <a href="${wa}" target="_blank" rel="noopener">Also message us on WhatsApp →</a>`;
  } else {
    window.open(wa, "_blank"); // server not running — fall back to WhatsApp
    msg.textContent = "Thank you! Opening WhatsApp to send your enquiry…";
  }
  msg.className = "form__msg is-success";
  form.reset();
  basket.clear(); preferredTeacher = ""; renderBasket(); $("#basket").hidden = true;
});

// ---------- Footer year ----------
$("#year").textContent = new Date().getFullYear();

// =====================================================
//  Toast
// =====================================================
let toastTimer;
const toast = (text) => {
  const t = $("#toast");
  t.textContent = text;
  t.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-show"), 2600);
};

// =====================================================
//  Enquiry basket (subjects picked across the site)
// =====================================================
const basket = new Set();
let preferredTeacher = "";
const renderBasket = () => {
  const names = [...basket].map((id) => subjectById(id).name);
  $("#basketCount").textContent = basket.size;
  $("#basket").hidden = basket.size === 0;
  $("#basket").classList.remove("bump"); void $("#basket").offsetWidth; $("#basket").classList.add("bump");
  const ids = [...basket];
  const teacherOf = (id) => { try { return finder.picks[id] ? TEACHERS[finder.picks[id]].name : ""; } catch (e) { return ""; } };
  $("#picked").innerHTML = names.map((n, i) => {
    const t = teacherOf(ids[i]);
    return `<span class="pick ${t ? "pick--t" : ""}">${n}${t ? `<small>${t}</small>` : ""}<button type="button" data-rm="${ids[i]}" aria-label="Remove ${n}">✕</button></span>`;
  }).join("");
  $("#f-subjects").value = names.join(", ");
  if (preferredTeacher) $("#f-teacher").value = preferredTeacher;
  // when teachers were chosen in the Course Finder, the chips already show them
  const fromFinder = ids.some((id) => teacherOf(id));
  $("#f-teacher").closest(".field").hidden = fromFinder;
  $$(".el").forEach((el) => el.classList.toggle("is-picked", basket.has(el.dataset.id)));
};
const addSubject = (id, silent) => {
  if (basket.has(id)) { if (!silent) toast(`${subjectById(id).name} is already in your enquiry`); return; }
  basket.add(id); renderBasket();
  if (!silent) toast(`✓ ${subjectById(id).name} added to your enquiry`);
};
$("#picked").addEventListener("click", (e) => {
  const id = e.target.dataset.rm;
  if (id) {
    basket.delete(id);
    try { delete finder.picks[id]; preferredTeacher = SUBJECTS.filter((x) => basket.has(x.id) && finder.picks[x.id]).map((x) => `${x.name}: ${TEACHERS[finder.picks[x.id]].name}`).join(", "); $("#f-teacher").value = preferredTeacher; } catch (err) {}
    renderBasket();
  }
});
$("#basket").addEventListener("click", () => $("#contact").scrollIntoView({ behavior: "smooth" }));

// =====================================================
//  Modal: subject -> teachers -> teacher profile
// =====================================================
const modal = $("#modal");
const modalBody = $("#modalBody");
const backBtn = $("#modalBack");
let history_ = [];
let lastFocus = null;

const openModal = (html, pushState) => {
  if (!modal.classList.contains("is-open")) { lastFocus = document.activeElement; history_ = []; }
  if (pushState) history_.push(pushState);
  backBtn.hidden = history_.length < 2;
  modalBody.innerHTML = html;
  modalBody.scrollTop = 0;
  modalBody.classList.remove("swap"); void modalBody.offsetWidth; modalBody.classList.add("swap");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => $(".modal__close").focus(), 50);
};
const closeModal = () => {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  history_ = [];
  if (lastFocus) lastFocus.focus();
};
$$("[data-close]", modal).forEach((el) => el.addEventListener("click", closeModal));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal(); });
backBtn.addEventListener("click", () => {
  history_.pop();
  const prev = history_.pop();
  if (prev) prev.type === "subject" ? showSubject(prev.id) : showTeacher(prev.id);
});

const teacherCardHTML = (t) => `
  <button class="rec" data-open-teacher="${t.id}">
    <span class="rec__avatar">${t.initials}${teacherPhoto(t.id)}</span>
    <span class="rec__info">
      <strong>${t.name}</strong>
      <small>${t.title}${t.placeholder ? " · <i>Profile coming soon</i>" : ""}</small>
    </span>
    <span class="rec__tag">${t.placeholder ? "Specialist" : "★ Recommended"}</span>
    <span class="rec__go">→</span>
  </button>`;

function showSubject(id) {
  const s = subjectById(id);
  const teachers = teachersOfSubject(s);
  const related = SUBJECTS.filter((x) => x.cat === s.cat && x.id !== s.id).slice(0, 4);
  openModal(`
    <div class="m-subject m-subject--${s.cat}">
      <div class="m-subject__tile"><small>${String(SUBJECTS.indexOf(s) + 1).padStart(2, "0")}</small><b>${s.sym}</b></div>
      <div>
        <p class="kicker">${s.cat === "science" ? "Sciences" : s.cat === "commerce" ? "Commerce" : "Humanities"}</p>
        <h3 id="modalTitle">${s.name}</h3>
        <p class="m-code">Cambridge syllabus ${s.code}</p>
      </div>
    </div>
    <p class="m-desc">${s.desc}</p>
    <div class="m-levels">${s.levels.map((l) => `<span>${l}</span>`).join("")}</div>

    <h4 class="m-h">Recommended teachers</h4>
    <div class="recs">${teachers.map(teacherCardHTML).join("")}</div>

    <div class="m-actions">
      <button class="btn btn--gold" data-add="${s.id}">+ Add ${s.name} to Enquiry</button>
      <a class="btn btn--outline" target="_blank" rel="noopener"
         href="https://wa.me/923367647647?text=${encodeURIComponent(`Assalam-o-Alaikum, I'd like to know about ${s.name} classes at SKH Solutions.`)}">Ask on WhatsApp</a>
    </div>

    ${related.length ? `<h4 class="m-h">Related subjects</h4>
    <div class="m-related">${related.map((r) => `<button data-open-subject="${r.id}"><b>${r.sym}</b>${r.name}</button>`).join("")}</div>` : ""}
  `, { type: "subject", id });
}

function showTeacher(id) {
  const t = getTeacher(id);
  const subjects = t.subjects.map(subjectById);
  openModal(`
    <div class="m-teacher">
      <div class="m-teacher__photo"><span>${t.initials}</span>${teacherPhoto(id)}</div>
      <div>
        <p class="kicker">${t.title}</p>
        <h3 id="modalTitle">${t.name}</h3>
        <div class="m-levels">${subjects.map((s) => `<button class="m-tag" data-open-subject="${s.id}">${s.name}</button>`).join("")}</div>
      </div>
    </div>
    ${t.founder ? `<p class="m-notice m-notice--founder">✦ Founder of SKH Solutions</p>` : ""}
    <h4 class="m-h">About</h4>
    <p class="m-desc">${t.bio}</p>

    <div class="m-facts">
      <div><small>Teaches</small><strong>${subjects.map((s) => s.name).join(", ")}</strong></div>
      <div><small>Levels</small><strong>${t.levels.join(" · ")}</strong></div>
      <div><small>${(t.campusList || []).length ? "Campuses" : "Timings"}</small><strong>${(t.campusList || []).length ? t.campusList.join(", ") + (t.campuses && t.campuses !== "Ask admissions for timings" ? " · " + t.campuses : "") : t.campuses}</strong></div>
    </div>
    ${t.facts ? `<div class="m-facts m-facts--wide">${t.facts.map(([k, v]) => `<div><small>${k}</small><strong>${v}</strong></div>`).join("")}</div>` : ""}

    <h4 class="m-h">${t.founder ? "Books & material by Sir Khurram" : "In class you'll get"}</h4>
    <ul class="m-list">${t.approach.map((a) => `<li>${a}</li>`).join("")}</ul>

    <div class="m-actions">
      <button class="btn btn--gold" data-book="${id}">Enquire with ${t.name.replace(" Specialist", " teacher")}</button>
      <a class="btn btn--outline" target="_blank" rel="noopener"
         href="https://wa.me/923367647647?text=${encodeURIComponent(`Assalam-o-Alaikum, I'd like to join ${t.name}'s ${subjects.map((s) => s.name).join("/")} class at SKH Solutions.`)}">WhatsApp</a>
    </div>
  `, { type: "teacher", id });
}

// Delegated clicks inside modal
modalBody.addEventListener("click", (e) => {
  const tBtn = e.target.closest("[data-open-teacher]");
  const sBtn = e.target.closest("[data-open-subject]");
  const add = e.target.closest("[data-add]");
  const book = e.target.closest("[data-book]");
  if (tBtn) showTeacher(tBtn.dataset.openTeacher);
  else if (sBtn) showSubject(sBtn.dataset.openSubject);
  else if (add) addSubject(add.dataset.add);
  else if (book) {
    const t = getTeacher(book.dataset.book);
    t.subjects.forEach((s) => addSubject(s, true));
    preferredTeacher = t.placeholder ? "" : t.name;
    renderBasket();
    closeModal();
    $("#contact").scrollIntoView({ behavior: "smooth" });
    toast(`✓ ${t.placeholder ? subjectById(t.subjects[0]).name : t.name} added — complete the form to enquire`);
  }
});

// Open from subject tiles & faculty cards (click or Enter key)
const activate = (sel, fn) => {
  document.addEventListener("click", (e) => { const el = e.target.closest(sel); if (el) fn(el); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const el = e.target.closest(sel); if (el) { e.preventDefault(); fn(el); }
  });
};
activate("#elements .el", (el) => showSubject(el.dataset.id));
activate("#facultyGrid .teacher", (el) => showTeacher(el.dataset.teacher));

// =====================================================
//  Course Finder
// =====================================================
const finder = { level: null, year: null, subjects: new Set() };
// Urdu, Islamiyat & Pakistan Studies are completed in O Level 2
const O2_ONLY = ["ur", "is", "ps"];
const finderReady = () => finder.level && (finder.level !== "O Level" || finder.year);
const finderLabel = () => (finder.level === "O Level" && finder.year ? finder.year : finder.level);
const allowedSubjects = () => SUBJECTS.filter((s) => s.levels.includes(finder.level) && !(finder.year === "O Level 3" && O2_ONLY.includes(s.id)));
const pruneSubjects = () => {
  const ok = new Set(allowedSubjects().map((s) => s.id));
  finder.subjects.forEach((id) => { if (!ok.has(id)) finder.subjects.delete(id); });
};

// Step 1: level (single choice)
$$("#finderLevel .chip").forEach((c) => c.addEventListener("click", () => {
  $$("#finderLevel .chip").forEach((x) => x.classList.toggle("is-active", x === c));
  finder.level = c.dataset.v;
  const isO = finder.level === "O Level";
  $("#finderYearWrap").hidden = !isO;
  if (!isO) { finder.year = null; $$("#finderYear .chip").forEach((x) => x.classList.remove("is-active")); }
  pruneSubjects();
  renderFinderSubjects();
  renderFinder();
}));

// Step 1b: O Level year
$$("#finderYear .chip").forEach((c) => c.addEventListener("click", () => {
  $$("#finderYear .chip").forEach((x) => x.classList.toggle("is-active", x === c));
  finder.year = c.dataset.v;
  pruneSubjects();
  renderFinderSubjects();
  renderFinder();
}));

// Step 2: subjects (multiple choice)
function renderFinderSubjects() {
  const box = $("#finderSubjects");
  if (!finderReady()) { box.innerHTML = `<p class="finder__wait">${finder.level ? "Choose O Level 2 or O Level 3 first ☝️" : "Choose your level first ☝️"}</p>`; return; }
  const list = allowedSubjects();
  box.innerHTML = list.map((s) => `
    <button class="chip chip--subject chip--${s.cat} ${finder.subjects.has(s.id) ? "is-active" : ""}" data-sub="${s.id}" aria-pressed="${finder.subjects.has(s.id)}">
      <b>${s.sym}</b>${s.name}<i aria-hidden="true">✓</i>
    </button>`).join("") + `
    <div class="finder__quick">
      ${finder.year === "O Level 2" ? `<button class="link-btn" data-quick="core">+ Add compulsory (Maths, English, Urdu, Islamiyat, Pak Studies)</button>` : ""}
      ${finder.year === "O Level 3" ? `<button class="link-btn" data-quick="core">+ Add compulsory (Maths, English)</button>` : ""}
      ${finder.year === "O Level 3" ? `<p class="finder__info">Urdu, Islamiyat and Pakistan Studies are completed in O Level 2.</p>` : ""}
      <button class="link-btn" data-quick="clear">Clear</button>
    </div>`;
}
$("#finderSubjects").addEventListener("click", (e) => {
  const c = e.target.closest("[data-sub]");
  const q = e.target.closest("[data-quick]");
  if (c) {
    const id = c.dataset.sub;
    finder.subjects.has(id) ? finder.subjects.delete(id) : finder.subjects.add(id);
  } else if (q) {
    if (q.dataset.quick === "core") (finder.year === "O Level 3" ? ["ma", "en"] : ["ma", "en", "ur", "is", "ps"]).forEach((id) => finder.subjects.add(id));
    else finder.subjects.clear();
  } else return;
  renderFinderSubjects();
  renderFinder();
});

// Result: chosen subjects — student picks ONE teacher per subject.
// When every subject has a teacher, we fill the form and go to Enrol.
finder.picks = {};
function renderFinder() {
  const box = $("#finderResult");
  if (!finderReady() || !finder.subjects.size) { box.hidden = true; return; }
  const subs = SUBJECTS.filter((s) => finder.subjects.has(s.id));
  Object.keys(finder.picks).forEach((sid) => { if (!finder.subjects.has(sid)) delete finder.picks[sid]; });
  const picked = subs.filter((s) => finder.picks[s.id]).length;
  const missing = (finder.year === "O Level 2" ? ["ma", "en", "ur", "is", "ps"] : finder.year === "O Level 3" ? ["ma", "en"] : []).filter((id) => !finder.subjects.has(id));
  const tip = missing.length
    ? `${missing.map((id) => subjectById(id).name).join(", ")} ${missing.length > 1 ? "are" : "is"} compulsory in ${finder.year}.`
    : finder.level !== "O Level" && subs.length > 4 ? "Most AS / A2 students take 3–4 subjects." : "";
  box.hidden = false;
  box.innerHTML = `
    <div class="fr__head">
      <div><small>Your selection</small><strong>${subs.length} subject${subs.length > 1 ? "s" : ""}</strong></div>
      <div><small>Recommended program</small><strong>${finderLabel()} regular classes</strong></div>
    </div>
    ${tip ? `<p class="fr__note">💡 ${tip}</p>` : ""}
    <div class="fr__pick-head">
      <p><b>Choose one teacher for each subject</b> — we'll take you straight to enrolment.</p>
      <span class="fr__count ${picked === subs.length ? "is-done" : ""}">${picked}/${subs.length} chosen</span>
    </div>
    <div class="fr__bar"><i style="width:${Math.round((picked / subs.length) * 100)}%"></i></div>
    <ul class="fr__list">${subs.map((s) => `
      <li class="fr__row fr__row--${s.cat} ${finder.picks[s.id] ? "is-picked" : ""}">
        <button class="fr__sub fr__sub--${s.cat}" data-fr="${s.id}"><b>${s.sym}</b><span>${s.name}</span></button>
        <div class="fr__teachers">${teachersAtLevel(s, finder.level).map((id) => `
          <span class="fr__tw">
            <button class="fr__t ${finder.picks[s.id] === id ? "is-picked" : ""}" data-pick="${s.id}|${id}" aria-pressed="${finder.picks[s.id] === id}"><em>${finder.picks[s.id] === id ? "✓" : TEACHERS[id].initials + teacherPhoto(id)}</em>${TEACHERS[id].name}</button>
            <button class="fr__info" data-ft="${id}" aria-label="View ${TEACHERS[id].name}'s profile" title="View profile">i</button>
          </span>`).join("")}</div>
      </li>`).join("")}
    </ul>
    <div class="fr__actions">
      <button class="btn btn--gold btn--sm" id="frAddAll">${picked === subs.length ? "Enrol now →" : "+ Add subjects to Enquiry"}</button>
      <span class="fr__tip">Tap <b>i</b> to view a teacher's profile</span>
    </div>`;
  $$("[data-fr]", box).forEach((b) => b.addEventListener("click", () => showSubject(b.dataset.fr)));
  $$("[data-ft]", box).forEach((b) => b.addEventListener("click", () => showTeacher(b.dataset.ft)));
  $$("[data-pick]", box).forEach((b) => b.addEventListener("click", () => {
    const [sid, tid] = b.dataset.pick.split("|");
    finder.picks[sid] = finder.picks[sid] === tid ? undefined : tid;
    if (!finder.picks[sid]) delete finder.picks[sid];
    renderFinder();
    const all = SUBJECTS.filter((x) => finder.subjects.has(x.id));
    if (all.every((x) => finder.picks[x.id])) goToEnrol(true);
  }));
  $("#frAddAll").addEventListener("click", () => goToEnrol(picked === subs.length));
}

function goToEnrol(withTeachers) {
  const subs = SUBJECTS.filter((s) => finder.subjects.has(s.id));
  subs.forEach((s) => addSubject(s.id, true));
  $("#f-level").value = finder.level;
  if (withTeachers) {
    preferredTeacher = subs.map((s) => `${s.name}: ${TEACHERS[finder.picks[s.id]].name}`).join(", ");
    renderBasket();
    toast("✓ All teachers chosen — taking you to enrolment…");
    setTimeout(() => {
      $("#contact").scrollIntoView({ behavior: "smooth" });
      setTimeout(() => { const n = $("#f-name"); n.focus({ preventScroll: true }); $(".contact__box").classList.add("flash"); setTimeout(() => $(".contact__box").classList.remove("flash"), 1600); }, 900);
    }, 700);
  } else {
    toast(`✓ ${subs.length} subjects added to your enquiry`);
  }
}

// =====================================================
//  Exam countdown
// =====================================================
const EXAM_DATE = new Date("2027-04-26T09:00:00+05:00");  // approx. start of May/June 2027 series
const PREP_START = new Date("2026-08-01T00:00:00+05:00");  // academic session start (for the ring)
const ring = $("#ringProg");
const CIRC = 2 * Math.PI * 52;
ring.style.strokeDasharray = CIRC;
const tickCountdown = () => {
  const diff = Math.max(0, EXAM_DATE - new Date());
  const d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, m = Math.floor(diff / 6e4) % 60, s = Math.floor(diff / 1e3) % 60;
  const set = (u, v, pad) => { const el = $(`#countdown [data-u="${u}"]`); const t = String(v).padStart(pad, "0"); if (el.textContent !== t) { el.textContent = t; el.classList.remove("tick"); void el.offsetWidth; el.classList.add("tick"); } };
  set("d", d, 3); set("h", h, 2); set("m", m, 2); set("s", s, 2);
  const pct = Math.min(1, Math.max(0, diff / (EXAM_DATE - PREP_START)));
  ring.style.strokeDashoffset = CIRC * (1 - pct);
  $("#ringPct").textContent = Math.round(pct * 100) + "%";
};
tickCountdown();
setInterval(tickCountdown, 1000);

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

// Founder profile button
document.addEventListener("click", (e) => { if (e.target.closest("[data-open-founder]")) showTeacher("khurram"); });

// ---------- Logged-in greeting (only when someone is actually signed in on the server) ----------
(async () => {
  try { localStorage.removeItem("skh-student"); sessionStorage.removeItem("skh-student"); } catch (e) {}
  if (location.protocol === "file:" && !window.SKH_DEMO) return;
  let me = null;
  try { me = await DB.whoami(); } catch (e) { return; }
  if (!me) return;
  const btn = document.querySelector(".nav__portal"); if (!btn) return;
  const first = me.name.replace(/^(Sir|Miss|Mr\.|Mrs\.)\s/, "").split(" ")[0].replace(/[<>&]/g, "");
  btn.innerHTML = `Hi, ${first} · Portal`;
  if (me.role !== "student") btn.href = "teacher.html";
})();
