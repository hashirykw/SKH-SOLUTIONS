// ===== "Ask SKH" — virtual assistant =====
// Rule-based: answers from the site's own data (data.js).
// Can later be connected to a real AI model (e.g. Claude API) through a backend.

(() => {
  const chat = $("#chat");
  const panel = $("#chatPanel");
  const log = $("#chatLog");
  const input = $("#chatInput");
  const launcher = $("#chatLauncher");
  const WA = "https://wa.me/923367647647";
  let started = false;

  const QUICK = ["Subjects", "Teachers", "Campuses", "How to enrol", "Timetable", "Fees", "Crash courses", "Which subjects for doctor?"];

  // ---------- open / close ----------
  const open = () => {
    chat.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
    $("#chatBadge").hidden = true;
    $("#chatTeaser").classList.remove("is-show");
    if (!started) { started = true; greet(); }
    setTimeout(() => input.focus(), 300);
  };
  const close = () => {
    chat.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
  };
  launcher.addEventListener("click", () => (chat.classList.contains("is-open") ? close() : open()));
  $("#chatMin").addEventListener("click", close);
  $("#chatTeaser").addEventListener("click", open);
  setTimeout(() => { if (!started) $("#chatTeaser").classList.add("is-show"); }, 6000);

  // ---------- rendering ----------
  const time = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const scrollDown = () => (log.scrollTop = log.scrollHeight);

  const addUser = (text) => {
    log.insertAdjacentHTML("beforeend", `<div class="msg msg--user"><p>${escapeHTML(text)}</p><time>${time()}</time></div>`);
    scrollDown();
  };

  // reply = { text, actions: [{label, do}] , cards: html }
  const addBot = (reply) => {
    const typing = document.createElement("div");
    typing.className = "msg msg--bot msg--typing";
    typing.innerHTML = `<span></span><span></span><span></span>`;
    log.appendChild(typing);
    scrollDown();
    const delay = Math.min(1400, 450 + reply.text.length * 6);
    setTimeout(() => {
      typing.remove();
      const el = document.createElement("div");
      el.className = "msg msg--bot";
      el.innerHTML = `<p>${reply.text}</p>${reply.cards || ""}` +
        (reply.actions ? `<div class="msg__actions">${reply.actions.map((a, i) => `<button data-a="${i}">${a.label}</button>`).join("")}</div>` : "") +
        `<time>${time()}</time>`;
      if (reply.actions) el.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => reply.actions[+b.dataset.a].do()));
      el.querySelectorAll("[data-subject]").forEach((b) => b.addEventListener("click", () => showSubject(b.dataset.subject)));
      el.querySelectorAll("[data-teacher]").forEach((b) => b.addEventListener("click", () => showTeacher(b.dataset.teacher)));
      log.appendChild(el);
      scrollDown();
    }, delay);
  };

  const renderQuick = (items = QUICK) => {
    $("#chatQuick").innerHTML = items.map((q) => `<button>${q}</button>`).join("");
  };
  $("#chatQuick").addEventListener("click", (e) => { if (e.target.tagName === "BUTTON") ask(e.target.textContent); });

  const escapeHTML = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const go = (sel) => () => { close(); $(sel).scrollIntoView({ behavior: "smooth" }); };
  const subjChips = (ids) => `<div class="msg__chips">${ids.map((id) => { const s = subjectById(id); return `<button data-subject="${id}"><b>${s.sym}</b>${s.name}</button>`; }).join("")}</div>`;

  // ---------- knowledge ----------
  const has = (q, words) => words.some((w) => q.includes(w));
  const campusInfo = {
    gulshan: "A-292, Block 2, Gulshan-e-Iqbal",
    jauhar: "Near Al-Faizan CNG Pump, Block 14, Gulistan-e-Johar",
    johar: "Near Al-Faizan CNG Pump, Block 14, Gulistan-e-Johar",
    north: "North Nazimabad — call 0336 7647647 for directions",
    nazimabad: "North Nazimabad — call 0336 7647647 for directions",
    bahadurabad: "371, Siraj-ud-Daula Road, Bahadurabad",
    pechs: "PECHS — our dedicated girls' campus",
    defence: "DHA / Defence — call 0336 7647647 for directions",
    dha: "DHA / Defence — call 0336 7647647 for directions",
  };

  function answer(raw) {
    const q = raw.toLowerCase().trim();

    // Greetings / thanks
    if (/^(hi|hello|hey|salam|assalam|aoa|asalam)/.test(q))
      return { text: "Wa Alaikum Assalam! 😊 How can I help you today? Ask me about subjects, teachers, campuses or admissions." };
    if (has(q, ["thank", "shukriya", "jazak"]))
      return { text: "You're welcome! Anything else I can help with?" };

    // Specific teacher(s) — match on distinctive parts of names
    const COMMON = ["sir", "miss", "ali", "khan", "hassan", "adeel", "hussain"];
    const hits = Object.entries(TEACHERS).filter(([, t]) => {
      const parts = t.name.toLowerCase().replace(/\./g, "").split(" ").filter((w) => w.length > 2 && !COMMON.includes(w));
      const full = t.name.toLowerCase().replace(/^(sir|miss) /, "");
      return q.includes(full) || parts.some((w) => new RegExp(`\\b${w}\\b`).test(q));
    });
    if (q.includes("khurram") || q.includes("founder") || q.includes("owner")) hits.splice(0, hits.length, ["khurram", TEACHERS.khurram]);
    if (hits.length === 1) {
      const [id, t] = hits[0];
      const subs = t.subjects.map((s) => subjectById(s).name).join(", ");
      return {
        text: t.founder
          ? `<b>Sir Khurram Hussain</b> is the founder of SKH Solutions and teaches O Level Islamiyat. He has been teaching since 2008, taught at Beaconhouse and Karachi Grammar School, and has written 9 Islamiyat books.`
          : `<b>${t.name}</b> teaches ${subs} at SKH Solutions (${t.levels.join(", ")}).`,
        actions: [{ label: "View full profile", do: () => showTeacher(id) }, { label: "Enquire", do: go("#contact") }],
      };
    }
    if (hits.length > 1) {
      return {
        text: "I found a few teachers with that name — which one?",
        cards: `<div class="msg__chips">${hits.map(([id, t]) => `<button data-teacher="${id}"><b>${t.initials}</b>${t.name}</button>`).join("")}</div>`,
      };
    }

    // Career / stream recommendations
    const streamMap = [
      [["doctor", "mbbs", "medical", "pre-med", "premed"], "medical"],
      [["engineer", "engineering"], "engineering"],
      [["software", "computer", "programmer", "coding", "tech", "it "], "computing"],
      [["business", "finance", "ca ", "acca", "commerce", "banking", "bba"], "commerce"],
      [["law", "lawyer", "media", "psycholog", "journalis", "humanities"], "humanities"],
    ];
    if (has(q, ["become", "career", "want to be", "for doctor", "for engineer", "which subjects", "what subjects", "combination", "recommend", "suggest"])) {
      for (const [words, key] of streamMap) {
        if (has(q, words)) {
          const st = STREAMS[key];
          return {
            text: `For <b>${st.label}</b>, these are the usual subjects. ${st.note} Tap one to see its teachers:`,
            cards: subjChips(st.subjects),
            actions: [{ label: "Try the Course Finder", do: go("#finder") }],
          };
        }
      }
      return { text: "Tell me what you'd like to become — for example doctor, engineer, software, business or law — and I'll suggest subjects. Or try our Course Finder!", actions: [{ label: "Open Course Finder", do: go("#finder") }] };
    }

    // Specific subject
    const subj = SUBJECTS.find((s) => q.includes(s.name.toLowerCase()) ||
      (s.id === "ma" && has(q, ["math", "maths"])) || (s.id === "cs" && has(q, ["computer", " cs"])) ||
      (s.id === "ac" && q.includes("account")) || (s.id === "bs" && q.includes("business")) ||
      (s.id === "ps" && has(q, ["pak studies", "pakistan"])) || (s.id === "is" && q.includes("islamiat")) ||
      (s.id === "ec" && q.includes("eco")) || (s.id === "bi" && q.includes("bio")) ||
      (s.id === "ch" && q.includes("chem")) || (s.id === "ph" && q.includes("physic")));
    if (subj && !has(q, ["fee", "price", "cost"])) {
      const t = teachersOfSubject(subj);
      const who = t.map((x) => `<b>${x.name}</b>`).join(t.length > 2 ? ", " : " and ").replace(/, (?=[^,]*$)/, " and ");
      return {
        text: `<b>${subj.name}</b> is offered at ${subj.levels.join(", ")} (Cambridge ${subj.code}). It's taught by ${who}. ${subj.desc}`,
        cards: `<div class="msg__chips">${t.map((x) => `<button data-teacher="${x.id}"><b>${x.initials}</b>${x.name}</button>`).join("")}</div>`,
        actions: [
          { label: `Open ${subj.name}`, do: () => showSubject(subj.id) },
          { label: "Add to enquiry", do: () => addSubject(subj.id) },
        ],
      };
    }

    // Lists
    if (has(q, ["subject", "course", "offer", "teach"]))
      return { text: `We offer <b>${SUBJECTS.length} subjects</b> across Sciences, Commerce and Humanities. Tap one to see details and teachers:`, cards: subjChips(SUBJECTS.map((s) => s.id)) };
    if (has(q, ["teacher", "faculty", "sir", "tutor", "staff"]))
      return {
        text: `We have <b>${Object.keys(TEACHERS).length} teachers</b> across all subjects. Which subject are you looking for?`,
        cards: subjChips(SUBJECTS.map((s) => s.id)),
        actions: [{ label: "See all faculty", do: go("#faculty") }],
      };

    // Campuses
    for (const [k, v] of Object.entries(campusInfo)) {
      if (q.includes(k)) return { text: `📍 <b>${k[0].toUpperCase() + k.slice(1)} campus:</b> ${v}.`, actions: [{ label: "See all campuses", do: go("#campuses") }] };
    }
    if (has(q, ["campus", "branch", "location", "address", "where", "near me", "area"]))
      return { text: "We have <b>6 campuses</b> across Karachi: Gulshan, Jauhar, North, Bahadurabad, PECHS (girls) and Defence. Which area are you in?", actions: [{ label: "View campuses", do: go("#campuses") }] };
    if (has(q, ["girl", "female", "ladies"]))
      return { text: "Yes — our <b>PECHS campus</b> is dedicated to girls. 🌸", actions: [{ label: "View campuses", do: go("#campuses") }] };

    // Admissions / fees / timings
    if (has(q, ["fee", "fees", "price", "cost", "charges", "kitni"]))
      return { text: "Fees depend on the subjects, level and campus. Send us your details and our team will share the exact fee on WhatsApp.", actions: [{ label: "Get fee details", do: go("#contact") }, { label: "WhatsApp", do: () => window.open(WA, "_blank") }] };
    if (has(q, ["timing", "timetable", "schedule", "batch", "time", "when"]))
      return { text: "You can check sample batch timings by campus and level in our timetable. Final timings are confirmed at admission.", actions: [{ label: "Open timetable", do: go("#timetable") }] };
    if (has(q, ["enrol", "enroll", "admission", "join", "apply", "register me", "sign up"]))
      return { text: "Enrolling is easy:<br>1️⃣ Pick your subjects<br>2️⃣ Fill the enquiry form<br>3️⃣ We reply on WhatsApp with timings & fees<br>4️⃣ Visit your campus to confirm", actions: [{ label: "Go to enquiry form", do: go("#contact") }] };
    if (has(q, ["caie", "private", "registration", "register"]))
      return { text: "Yes, we help <b>private candidates register for CAIE exams</b> and guide them through the whole process.", actions: [{ label: "Enquire about registration", do: go("#contact") }] };
    if (has(q, ["crash", "revision", "intensive", "short course"]))
      return { text: "Our <b>crash courses</b> are intensive revision programs before each exam session — full syllabus coverage plus past papers.", actions: [{ label: "View programs", do: go("#programs") }] };
    if (has(q, ["result", "grade", "a*", "topper", "achievement"]))
      return { text: "SKH's latest results are shared on our Facebook and Instagram pages. 🏆", actions: [{ label: "Open Facebook", do: () => window.open("https://www.facebook.com/skhsolutions/", "_blank") }] };
    if (has(q, ["portal", "login", "attendance", "marks", "report"]))
      return { text: "Enrolled students can check attendance, marks and timetable on the Student Portal.", actions: [{ label: "Open Student Portal", do: () => (location.href = "portal.html") }] };
    if (has(q, ["exam", "countdown", "paper", "may/june", "oct"]))
      return { text: "The May/June Cambridge series is coming up — see the live countdown on our site.", actions: [{ label: "View countdown", do: go("#finder") }] };
    if (has(q, ["contact", "phone", "number", "call", "whatsapp", "email"]))
      return { text: "📞 <b>0336 7647647</b><br>✉️ skhsolutionss@gmail.com<br>You can also chat with our team on WhatsApp.", actions: [{ label: "WhatsApp us", do: () => window.open(WA, "_blank") }] };

    return {
      text: "I'm not sure about that one yet 🤔 — try one of the options below, or chat with our team on WhatsApp.",
      actions: [{ label: "WhatsApp our team", do: () => window.open(WA, "_blank") }],
    };
  }

  function ask(text) {
    if (!text.trim()) return;
    addUser(text);
    addBot(answer(text));
  }

  function greet() {
    renderQuick();
    addBot({ text: "Assalam-o-Alaikum! 👋 I'm the <b>SKH assistant</b>. I can help you with subjects, teachers, campuses, timings and admissions. What would you like to know?" });
  }

  $("#chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    ask(input.value);
    input.value = "";
  });
})();
