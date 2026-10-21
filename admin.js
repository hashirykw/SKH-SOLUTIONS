// ===== SKH Solutions — Admin tools (only for the founder / admin account) =====
// Admissions · Manage Students · Teacher logins · Fees & Settings
Object.assign(TITLES, { admissions: "Admissions", students: "Manage Students", staff: "Teacher Logins", fees: "Fees & Settings" });

const LEVELS = ["O Level", "AS Level", "A2 Level"];
const money = (n) => "Rs " + Number(n || 0).toLocaleString("en-PK");
const monthName = (m) => new Date(m + "-01T12:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
const waLink = (phone, text) => {
  let p = String(phone || "").replace(/\D/g, "");
  if (p.startsWith("0")) p = "92" + p.slice(1);
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
};

// run an admin action, then reload everything from the server
async function adminDo(fn, okMsg) {
  try {
    const r = await fn();
    await DB.load();
    CLASSES = DB.classesOf(ME);
    if (!CLASSES.find((c) => c.key === current)) current = CLASSES[0] ? CLASSES[0].key : null;
    fillClassSelects(); renderAll();
    if (okMsg) toast(okMsg);
    return r;
  } catch (e) { toast("⚠ " + e.message); throw e; }
}

function renderAdmin() {
  if (!isAdmin() || !DB.state) return;
  renderEnquiries(); renderStudentsAdmin(); renderStaff(); renderFeesAdmin();
}
(() => {
  const _all = renderAll;
  renderAll = function () { _all(); renderAdmin(); };
})();

// =============== ADMISSIONS ===============
let enqFilter = "open";
function renderEnquiries() {
  const list = DB.state.enquiries || [];
  const n = (st) => list.filter((e) => e.status === st).length;
  $("#enqCount").textContent = n("new"); $("#enqCount").hidden = !n("new");
  $("#enqKpis").innerHTML = [
    { l: "New enquiries", v: n("new"), sub: "Waiting for a call", icon: "✉️" },
    { l: "Contacted", v: n("contacted"), sub: "Follow up soon", icon: "📞" },
    { l: "Enrolled", v: n("enrolled"), sub: "Converted to students", icon: "🎓" },
    { l: "All time", v: list.length, sub: "Total enquiries", icon: "∑" },
  ].map((x, i) => `<div class="kpi" style="--d:${i * 80}ms"><span class="kpi__icon">${x.icon}</span><small>${x.l}</small><strong>${x.v}</strong><em>${x.sub}</em></div>`).join("");

  const shown = list.filter((e) => enqFilter === "all" || (enqFilter === "open" ? e.status === "new" || e.status === "contacted" : e.status === enqFilter));
  $("#enqList").innerHTML = shown.map((e) => `
    <article class="enq ${e.status === "new" ? "is-new" : ""}" data-enq="${e.id}">
      <div>
        <h4>${esc(e.name)} <span class="st-badge st-badge--${e.status}">${e.status}</span></h4>
        <div class="enq__meta">
          <a href="tel:${esc(e.phone)}">📞 ${esc(e.phone)}</a>
          <a href="${waLink(e.phone, `Assalam-o-Alaikum ${e.name}, this is SKH Solutions regarding your admission enquiry.`)}" target="_blank" rel="noopener">WhatsApp</a>
          <span>${timeAgo(e.at)}</span>
          ${e.studentId ? `<span>→ ${esc(e.studentId)}</span>` : ""}
        </div>
      </div>
      <div class="enq__side">
        <select data-enq-status aria-label="Status">${["new", "contacted", "enrolled", "closed"].map((s) => `<option value="${s}" ${s === e.status ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}</select>
        ${e.status !== "enrolled" ? `<button class="btn btn--gold btn--sm" data-enq-enrol>Enrol as student →</button>` : ""}
      </div>
      <div class="enq__detail">
        <span><b>Level:</b> ${esc(e.level || "—")} · <b>Campus:</b> ${esc(e.campus || "—")}</span>
        <span><b>Subjects:</b> ${esc(e.subjects || "—")}</span>
        ${e.teacher ? `<span><b>Preferred teacher:</b> ${esc(e.teacher)}</span>` : ""}
      </div>
      <div class="enq__note"><input data-enq-note value="${esc(e.note || "")}" placeholder="Private note — e.g. called, will visit Saturday" maxlength="300"><button class="btn btn--outline btn--sm" data-enq-savenote>Save note</button></div>
    </article>`).join("") || `<div class="empty-state"><b>No enquiries here</b>Enquiries sent from the website's admission form appear here instantly.</div>`;
}
$("#enqTabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-f]"); if (!b) return;
  enqFilter = b.dataset.f;
  $$("#enqTabs .seg__btn").forEach((x) => x.classList.toggle("is-on", x === b));
  renderEnquiries();
});
$("#enqList").addEventListener("change", (e) => {
  if (!e.target.matches("[data-enq-status]")) return;
  const id = e.target.closest("[data-enq]").dataset.enq;
  adminDo(() => api("PATCH", `/api/admin/enquiries/${id}`, { status: e.target.value }), "✓ Status updated");
});
$("#enqList").addEventListener("click", (e) => {
  const card = e.target.closest("[data-enq]"); if (!card) return;
  const enq = DB.state.enquiries.find((x) => x.id === card.dataset.enq);
  if (e.target.closest("[data-enq-savenote]")) adminDo(() => api("PATCH", `/api/admin/enquiries/${enq.id}`, { note: card.querySelector("[data-enq-note]").value }), "✓ Note saved");
  if (e.target.closest("[data-enq-enrol]")) startEnrolFromEnquiry(enq);
});

// guess subject ids from the free-text "Physics, Maths" field
function guessSubjects(text) {
  const t = String(text || "").toLowerCase();
  const alias = { am: ["add"], lw: ["law"], ma: ["math"], ps: ["pak", "pst"], cs: ["computer"], bs: ["business"], ec: ["econ"], ac: ["account"], is: ["islam"], en: ["english"], ur: ["urdu"], bi: ["bio"], ch: ["chem"], ph: ["phys"], so: ["socio"], py: ["psych"] };
  return SUBJECTS.filter((s) => t.includes(s.name.toLowerCase()) || (alias[s.id] || []).some((a) => t.includes(a))).map((s) => s.id);
}
function startEnrolFromEnquiry(enq) {
  resetStudentForm();
  $("#stName").value = enq.name;
  $("#stPhone").value = enq.phone;
  if (LEVELS.includes(enq.level)) $("#stLevel").value = enq.level;
  if (CAMPUSES.includes(enq.campus)) $("#stCampus").value = enq.campus;
  $("#stEnqId").value = enq.id;
  drawSubjectPicker(guessSubjects(enq.subjects));
  $("#stFormTitle").textContent = `Enrol ${enq.name}`;
  $("#stFormNote").textContent = "From an admission enquiry — check the details, then enrol";
  show("students");
  setTimeout(() => $("#stGuardian").focus(), 400);
}

// =============== MANAGE STUDENTS ===============
function drawSubjectPicker(selected) {
  const level = $("#stLevel").value;
  const keep = selected || $$("#stSubs input:checked").map((i) => i.value);
  $("#stSubs").innerHTML = SUBJECTS.filter((s) => s.levels.includes(level)).map((s) => {
    const t = teacherAt(s.id, $("#stCampus").value, level);
    return `<label><input type="checkbox" value="${s.id}" ${keep.includes(s.id) ? "checked" : ""}><span><b>${s.name}</b><small>${esc(t.name)}</small></span></label>`;
  }).join("");
}
function resetStudentForm() {
  $("#stForm").reset();
  $("#stEditId").value = ""; $("#stEnqId").value = "";
  $("#stErr").hidden = true; $("#stCancel").hidden = true;
  $("#stSave").textContent = "Enrol student";
  $("#stFormTitle").textContent = "Enrol a new student";
  $("#stFormNote").textContent = "A Student ID and first password are created automatically";
  drawSubjectPicker(["ma"]);
}
(() => {
  $("#stCampus").innerHTML = CAMPUSES.map((c) => `<option>${c}</option>`).join("");
  resetStudentForm();
  $("#stLevel").addEventListener("change", () => drawSubjectPicker());
  $("#stCampus").addEventListener("change", () => drawSubjectPicker());
  $("#stCancel").addEventListener("click", resetStudentForm);
})();

$("#stForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    name: $("#stName").value.trim(), level: $("#stLevel").value, campus: $("#stCampus").value,
    section: $("#stSection").value.trim(), guardian: $("#stGuardian").value.trim(), phone: $("#stPhone").value.trim(),
    subjects: $$("#stSubs input:checked").map((i) => i.value),
  };
  const err = $("#stErr");
  if (!body.name) { err.textContent = "Enter the student's name."; err.hidden = false; return; }
  if (!body.subjects.length) { err.textContent = "Choose at least one subject."; err.hidden = false; return; }
  err.hidden = true;
  const editId = $("#stEditId").value;
  const btn = $("#stSave"); btn.disabled = true;
  try {
    if (editId) {
      await adminDo(() => api("PUT", `/api/admin/students/${editId}`, body), `✓ ${body.name}'s details updated`);
      resetStudentForm();
    } else {
      if ($("#stEnqId").value) body.enquiryId = $("#stEnqId").value;
      const r = await adminDo(() => api("POST", "/api/admin/students", body), `✓ ${body.name} enrolled`);
      showCredentials(r.id, { student: r.password, parent: r.parentPassword }, body, "enrolled");
      resetStudentForm();
    }
  } catch (x) { err.textContent = x.message; err.hidden = false; }
  btn.disabled = false;
});

// pw = { student?: "...", parent?: "..." }
function showCredentials(id, pw, st, what) {
  const loginUrl = `${location.origin}/portal.html`;
  const lines = [`Assalam-o-Alaikum! SKH Solutions portal login for ${st.name}:`, `Student ID: ${id}`];
  if (pw.student) lines.push(`Student password: ${pw.student}`);
  if (pw.parent) lines.push(`Parent password: ${pw.parent} (choose "Parent" on the login page)`);
  lines.push(`Log in at: ${loginUrl}`, "(You'll be asked to choose a new password.)");
  const msg = lines.join("\n");
  const title = what === "enrolled" ? "is enrolled" : pw.parent ? "— new parent password" : "— new student password";
  $("#credBox").hidden = false;
  $("#credBox").innerHTML = `
    <h4>✓ ${esc(st.name)} ${title}</h4>
    <div class="cred"><span>Student ID <code>${esc(id)}</code></span>${pw.student ? `<span>Student password <code>${esc(pw.student)}</code></span>` : ""}${pw.parent ? `<span>Parent password <code>${esc(pw.parent)}</code></span>` : ""}</div>
    <p>Give these to the family now — passwords are shown only once. Parents sign in with the same Student ID by choosing <b>Parent</b> on the login page. Everyone chooses their own password at first login.</p>
    <div class="form-actions" style="margin-top:4px">
      <button class="btn btn--outline btn--sm" data-copy>Copy login details</button>
      ${st.phone ? `<a class="btn btn--gold btn--sm" target="_blank" rel="noopener" href="${waLink(st.phone, msg)}">Send on WhatsApp</a>` : ""}
      <button class="link-btn" data-close-cred>Dismiss</button>
    </div>`;
  $("#credBox [data-copy]").onclick = () => { navigator.clipboard?.writeText(msg).then(() => toast("✓ Copied"), () => toast("Copy failed — select the text instead")); };
  $("#credBox [data-close-cred]").onclick = () => { $("#credBox").hidden = true; };
  show("students");
  setTimeout(() => $("#credBox").scrollIntoView({ behavior: "smooth", block: "center" }), 300);
}

function renderStudentsAdmin() {
  const all = Object.values(DB.state.students);
  const q = ($("#stSearch").value || "").trim().toLowerCase();
  const rows = all.filter(({ profile: p }) => !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
    .sort((a, b) => b.profile.id.localeCompare(a.profile.id));
  $("#stCount").textContent = `· ${all.length}`;
  $("#stBody").innerHTML = rows.map(({ profile: p, fees = [] }) => {
    const due = fees.filter((f) => f.status === "due");
    return `<tr data-sid="${p.id}">
      <td><div class="who"><span class="av">${initials(p.name)}</span><div><strong>${esc(p.name)}</strong><small>${p.id}${p.phone ? " · " + esc(p.phone) : ""}</small></div></div></td>
      <td>${p.level}${p.section ? `<small class="muted"> · ${esc(p.section)}</small>` : ""}</td>
      <td>${esc(p.campus)}</td>
      <td>${p.subjects.map((s) => sub(s).sym).join(" · ")}</td>
      <td>${due.length ? `<span class="pill pill--bad">${due.length} due</span>` : `<span class="pill pill--good">Clear</span>`}</td>
      <td><div class="row-acts">
        <button class="link-btn" data-st-edit>Edit</button>
        <button class="link-btn" data-st-report>Report</button>
        <button class="link-btn" data-st-reset>Reset student password</button>
        <button class="link-btn" data-st-preset>${(DB.state.parentAccounts || {})[p.id] && DB.state.parentAccounts[p.id].set ? "Reset parent password" : "Create parent login"}</button>
        <button class="link-btn is-danger" data-st-del>Remove</button>
      </div></td>
    </tr>`;
  }).join("") || `<tr><td colspan="6"><div class="empty-state"><b>No students yet</b>Use the form above to enrol your first student.</div></td></tr>`;
}
$("#stSearch").addEventListener("input", renderStudentsAdmin);
$("#stBody").addEventListener("click", async (e) => {
  const row = e.target.closest("[data-sid]"); if (!row) return;
  const id = row.dataset.sid, p = STUDENTS[id];
  if (e.target.closest("[data-st-edit]")) {
    $("#stEditId").value = id; $("#stEnqId").value = "";
    $("#stName").value = p.name; $("#stLevel").value = p.level; $("#stCampus").value = p.campus;
    $("#stSection").value = p.section || ""; $("#stGuardian").value = p.guardian || ""; $("#stPhone").value = p.phone || "";
    drawSubjectPicker(p.subjects);
    $("#stFormTitle").textContent = `Edit ${p.name}`;
    $("#stFormNote").textContent = `${id} · changing subjects or level updates unpaid fees`;
    $("#stSave").textContent = "Save changes"; $("#stCancel").hidden = false; $("#credBox").hidden = true;
    $("#stFormPanel").scrollIntoView({ behavior: "smooth" });
  }
  if (e.target.closest("[data-st-report]")) printStudentReport(id);
  const reset = e.target.closest("[data-st-reset]");
  if (reset) {
    if (!reset.dataset.armed) { reset.dataset.armed = 1; reset.textContent = "Confirm reset?"; setTimeout(() => { delete reset.dataset.armed; reset.textContent = "Reset student password"; }, 3000); return; }
    const r = await adminDo(() => api("POST", `/api/admin/students/${id}/reset-password`, { who: "student" }), "✓ New password created");
    showCredentials(id, { student: r.password }, p, "reset");
  }
  const preset = e.target.closest("[data-st-preset]");
  if (preset) {
    const label = preset.textContent;
    if (!preset.dataset.armed) { preset.dataset.armed = 1; preset.textContent = "Confirm?"; setTimeout(() => { delete preset.dataset.armed; preset.textContent = label; }, 3000); return; }
    const r = await adminDo(() => api("POST", `/api/admin/students/${id}/reset-password`, { who: "parent" }), "✓ Parent password created");
    showCredentials(id, { parent: r.password }, p, "reset");
  }
  const del = e.target.closest("[data-st-del]");
  if (del) {
    if (!del.dataset.armed) { del.dataset.armed = 1; del.textContent = "Click again to remove"; setTimeout(() => { delete del.dataset.armed; del.textContent = "Remove"; }, 3000); return; }
    adminDo(() => api("DELETE", `/api/admin/students/${id}`), `${p.name} removed`);
  }
});

// =============== TEACHER LOGINS ===============
function renderStaff() {
  const acc = DB.state.teacherAccounts || {};
  const count = {};
  Object.values(STUDENTS).forEach((st) => st.subjects.forEach((s) => { const t = teacherAt(s, st.campus, st.level).id; (count[t] = count[t] || new Set()).add(st.id); }));
  $("#staffBody").innerHTML = Object.entries(TEACHERS).map(([id, t]) => `
    <tr data-tid="${id}">
      <td><div class="who"><span class="av">${t.initials || initials(t.name)}</span><div><strong>${esc(t.name)}</strong><small>${ADMINS.includes(id) ? "Founder · Admin" : esc(t.title || "Teacher")}</small></div></div></td>
      <td><code>${STAFF[id]}</code></td>
      <td>${(t.subjects || []).map((s) => sub(s) ? sub(s).name : s).join(", ")}</td>
      <td>${count[id] ? count[id].size : 0}</td>
      <td>${acc[id] && acc[id].mustChange ? `<span class="pill pill--mid">Temporary</span>` : `<span class="pill pill--good">Set by teacher</span>`}</td>
      <td><div class="row-acts"><span class="pw-slot"></span>${id === ME ? "" : `<button class="link-btn" data-t-reset>Reset password</button>`}</div></td>
    </tr>`).join("");
}
$("#staffBody").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-t-reset]"); if (!b) return;
  const id = b.closest("[data-tid]").dataset.tid;
  if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = "Confirm reset?"; setTimeout(() => { delete b.dataset.armed; b.textContent = "Reset password"; }, 3000); return; }
  const r = await adminDo(() => api("POST", `/api/admin/teachers/${id}/reset-password`), `✓ New password for ${TEACHERS[id].name}`);
  const slot = $(`[data-tid="${id}"] .pw-slot`);
  if (slot) slot.innerHTML = `New password: <span class="pw-new">${esc(r.password)}</span>`;
});

// =============== FEES & SETTINGS ===============
function renderFeesAdmin() {
  const set = DB.settings;
  if (document.activeElement?.closest?.("#setForm") == null) {
    $("#setO").value = set.fees["O Level"]; $("#setAS").value = set.fees["AS Level"]; $("#setA2").value = set.fees["A2 Level"];
    $("#setLate").value = set.lateFee; $("#setBank").value = set.bank || "";
  }
  const recs = Object.values(DB.state.students);
  const months = [...new Set(recs.flatMap((r) => (r.fees || []).map((f) => f.month)))].sort();
  const thisMonth = isoDay(new Date()).slice(0, 7);
  const sel = $("#feeMonth");
  const prev = sel.value;
  sel.innerHTML = months.map((m) => `<option value="${m}">${monthName(m)}</option>`).join("") || `<option value="${thisMonth}">${monthName(thisMonth)}</option>`;
  sel.value = months.includes(prev) ? prev : months.includes(thisMonth) ? thisMonth : (months[0] || thisMonth);
  const month = sel.value, show = $("#feeShow").value;
  const rows = recs.map((r) => ({ p: r.profile, f: (r.fees || []).find((x) => x.month === month) })).filter((x) => x.f);
  const paid = rows.filter((x) => x.f.status === "paid"), unpaid = rows.filter((x) => x.f.status !== "paid");
  $("#feeKpis").innerHTML = [
    { l: "Collected", v: money(paid.reduce((n, x) => n + x.f.amount, 0)), sub: `${paid.length} paid · ${monthName(month)}`, icon: "✓" },
    { l: "Outstanding", v: money(unpaid.reduce((n, x) => n + x.f.amount, 0)), sub: `${unpaid.length} not paid yet`, icon: "⏳" },
    { l: "Students", v: rows.length, sub: "with a voucher this month", icon: "👥" },
    { l: "Late fee", v: money(set.lateFee), sub: "after the due date", icon: "⚠️" },
  ].map((x, i) => `<div class="kpi" style="--d:${i * 80}ms"><span class="kpi__icon">${x.icon}</span><small>${x.l}</small><strong style="font-size:1.5rem">${x.v}</strong><em>${x.sub}</em></div>`).join("");
  $("#feeBody").innerHTML = rows.filter((x) => show === "all" || (show === "paid" ? x.f.status === "paid" : x.f.status !== "paid"))
    .sort((a, b) => (a.f.status === "paid") - (b.f.status === "paid") || a.p.name.localeCompare(b.p.name))
    .map(({ p, f }) => `<tr data-sid="${p.id}" data-fid="${f.id}">
      <td><div class="who"><span class="av">${initials(p.name)}</span><div><strong>${esc(p.name)}</strong><small>${p.id} · ${f.id}</small></div></div></td>
      <td>${esc(p.campus)}</td>
      <td>${money(f.amount)}</td>
      <td>${fmt(f.due)}</td>
      <td><span class="fee-st fee-st--${f.status}">${f.status === "paid" ? `✓ Paid ${fmt(f.paidOn)}` : f.status === "due" ? "Due" : "Upcoming"}</span></td>
      <td><div class="row-acts">
        ${f.status === "paid" ? `<button class="link-btn" data-fee="due">Undo</button>` : `<button class="link-btn" data-fee="paid">Mark paid</button>`}
        <button class="link-btn" data-fee-voucher>${f.status === "paid" ? "Receipt" : "Voucher"}</button>
      </div></td>
    </tr>`).join("") || `<tr><td colspan="6"><div class="empty-state"><b>No fee records</b>Vouchers are created for 6 months when a student is enrolled.</div></td></tr>`;
}
$("#feeMonth").addEventListener("change", renderFeesAdmin);
$("#feeShow").addEventListener("change", renderFeesAdmin);
$("#feeBody").addEventListener("click", (e) => {
  const row = e.target.closest("[data-fid]"); if (!row) return;
  const b = e.target.closest("[data-fee]");
  if (b) adminDo(() => api("POST", `/api/admin/fees/${row.dataset.sid}/${row.dataset.fid}`, { status: b.dataset.fee }), b.dataset.fee === "paid" ? "✓ Marked as paid" : "Marked as unpaid");
  if (e.target.closest("[data-fee-voucher]")) printFeeVoucher(row.dataset.sid, row.dataset.fid);
});
$("#setForm").addEventListener("submit", (e) => {
  e.preventDefault();
  adminDo(() => api("PUT", "/api/admin/settings", {
    fees: { "O Level": $("#setO").value, "AS Level": $("#setAS").value, "A2 Level": $("#setA2").value },
    lateFee: $("#setLate").value, bank: $("#setBank").value,
  }), "✓ Fee settings saved").then(() => document.activeElement.blur()).catch(() => {});
});

// =============== WEBSITE CONTENT (campuses, results, testimonials) ===============
TITLES.site = "Website Content";
function renderSiteAdmin() {
  const set = DB.settings.campuses || {};
  if (!$("#campForm").contains(document.activeElement)) {
    $("#campRows").innerHTML = CAMPUSES.map((c) => { const x = set[c] || {}; return `
      <div class="camp-row" data-camp="${esc(c)}">
        <strong>${esc(c)}<small>${esc(CAMPUS_ADDR[c] || "")}</small></strong>
        <label class="tf"><span>Phone</span><input data-f="phone" value="${esc(x.phone || "")}" maxlength="40"></label>
        <label class="tf"><span>Timings</span><input data-f="timings" value="${esc(x.timings || "")}" maxlength="200" placeholder="e.g. Mon–Sat, 2 pm – 9 pm"></label>
        <label class="tf"><span>Google Maps link</span><input data-f="map" value="${esc(x.map || "")}" maxlength="500" placeholder="https://maps.app.goo.gl/…"></label>
      </div>`; }).join("");
  }
  if (!$("#rSubject").options.length) $("#rSubject").innerHTML = SUBJECTS.map((s) => `<option>${s.name}</option>`).join("");
  $("#resList").innerHTML = (DB.state.results || []).map((r) => `<li><div><strong>${esc(r.name)} — ${esc(r.grade)}</strong><small>${esc(r.subject)} · ${esc(r.level)}${r.year ? " · " + esc(r.year) : ""}</small></div><button class="link-btn is-danger" data-del-res="${r.id}">Remove</button></li>`).join("")
    || `<li class="empty-state"><b>No results added</b>The Results section stays hidden on the website until you add some.</li>`;
  $("#tesList").innerHTML = (DB.state.testimonials || []).map((t) => `<li><div><strong>${esc(t.name)}</strong><small>${esc(t.role)}</small><p>“${esc(t.text)}”</p></div><button class="link-btn is-danger" data-del-tes="${t.id}">Remove</button></li>`).join("")
    || `<li class="empty-state"><b>No testimonials yet</b>They appear on the website once added.</li>`;
}
(() => {
  const _all = renderAll;
  renderAll = function () { _all(); if (isAdmin() && DB.state) renderSiteAdmin(); };
})();
$("#campForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const campuses = {};
  $$("#campRows .camp-row").forEach((r) => { campuses[r.dataset.camp] = Object.fromEntries($$("input", r).map((i) => [i.dataset.f, i.value.trim()])); });
  document.activeElement.blur();
  adminDo(() => api("PUT", "/api/admin/campuses", { campuses }), "✓ Campus details saved — live on the website").catch(() => {});
});
$("#resForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const body = { name: $("#rName").value, subject: $("#rSubject").value, level: $("#rLevel").value, grade: $("#rGrade").value, year: $("#rYear").value };
  adminDo(() => api("POST", "/api/admin/results", body), "✓ Result added").then(() => { $("#rName").value = ""; $("#rGrade").value = ""; }).catch(() => {});
});
$("#tesForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!$("#tConsent").checked) { toast("Tick the permission box first — only publish what people agreed to share"); return; }
  const body = { name: $("#tName").value, role: $("#tRole").value, text: $("#tText").value, consent: true };
  adminDo(() => api("POST", "/api/admin/testimonials", body), "✓ Testimonial added").then(() => { $("#tesForm").reset(); }).catch(() => {});
});
document.addEventListener("click", (e) => {
  const r = e.target.closest("[data-del-res]"); if (r) adminDo(() => api("DELETE", `/api/admin/results/${r.dataset.delRes}`), "Result removed");
  const t = e.target.closest("[data-del-tes]"); if (t) adminDo(() => api("DELETE", `/api/admin/testimonials/${t.dataset.delTes}`), "Testimonial removed");
});

// =============== CONTENT HELPERS ===============
async function refreshContent() {
  const c = await api("GET", "/api/content");
  // start from the built-in profiles, then apply the saved edits (so "reset" works too)
  Object.entries(TEACHER_DEFAULTS).forEach(([id, d]) => {
    const t = TEACHERS[id]; Object.keys(t).forEach((k) => delete t[k]); Object.assign(t, JSON.parse(JSON.stringify(d)));
  });
  applyContent(c);
  DB.content = c;
}
async function contentDo(fn, msg) {
  try { await fn(); await refreshContent(); renderAll(); toast(msg); } catch (e) { toast("⚠ " + e.message); }
}

// =============== NEWS ===============
TITLES.profiles = "Teacher Profiles"; TITLES.timetable = "Timetables"; TITLES.backups = "Backups";
const newsList = () => (DB.content && DB.content.news) || [];
function renderNewsAdmin() {
  $("#newsList").innerHTML = newsList().map((n, i) => `<li><div><strong>${n.tag ? `<span class="st-badge st-badge--new">${esc(n.tag)}</span> ` : ""}${esc(n.title)}</strong>${n.text ? `<p>${esc(n.text)}</p>` : ""}${n.link ? `<small>${esc(n.link)}</small>` : ""}</div>
    <div class="row-acts">${i ? `<button class="link-btn" data-news-up="${i}">↑ Move up</button>` : ""}<button class="link-btn is-danger" data-news-del="${i}">Remove</button></div></li>`).join("")
    || `<li class="empty-state"><b>Using the default news cards</b>Add your own news here — it replaces the defaults on the website.</li>`;
}
const saveNews = (list, msg) => contentDo(() => api("PUT", "/api/admin/news", { news: list }), msg);
$("#newsForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!$("#nwTitle").value.trim()) { toast("Write a headline"); return; }
  const item = { tag: $("#nwTag").value, title: $("#nwTitle").value, text: $("#nwText").value, link: $("#nwLink").value };
  saveNews([item, ...newsList()], "✓ News added to the website").then(() => $("#newsForm").reset());
});
document.addEventListener("click", (e) => {
  const up = e.target.closest("[data-news-up]"), del = e.target.closest("[data-news-del]");
  if (up) { const l = [...newsList()], i = +up.dataset.newsUp; [l[i - 1], l[i]] = [l[i], l[i - 1]]; saveNews(l, "Order updated"); }
  if (del) { const l = newsList().filter((_, i) => i !== +del.dataset.newsDel); saveNews(l, "News removed"); }
});

// =============== TEACHER PROFILES ===============
let pfWho = null;
function renderProfilesAdmin() {
  const sel = $("#pfWho");
  if (!sel.options.length) sel.innerHTML = Object.entries(TEACHERS).map(([id, t]) => `<option value="${id}">${esc(t.name)} — ${esc(sub(t.subjects[0]).name)}</option>`).join("");
  if (!pfWho) pfWho = sel.value;
  if ($("#pfForm").contains(document.activeElement)) return;
  const t = TEACHERS[pfWho], saved = ((DB.content || {}).teachers || {})[pfWho];
  $("#pfTitle").value = t.title || ""; $("#pfTimings").value = t.campuses && t.campuses !== "Ask admissions for timings" ? t.campuses : "";
  $("#pfBio").value = t.bio || "";
  $("#pfFacts").value = (t.facts || []).map(([k, v]) => (k ? `${k}: ${v}` : v)).join("\n");
  $("#pfApproach").value = (t.approach || []).join("\n");
  $("#pfLevels").innerHTML = LEVELS.map((l) => `<label><input type="checkbox" value="${l}" ${t.levels.includes(l) ? "checked" : ""}><span><b>${l}</b></span></label>`).join("");
  $("#pfCampuses").innerHTML = CAMPUSES.map((c) => `<label><input type="checkbox" value="${esc(c)}" ${(t.campusList || []).includes(c) ? "checked" : ""}><span><b>${esc(c)}</b></span></label>`).join("");
  $("#pfHint").textContent = saved ? "Edited by admin" : "Showing the default profile";
}
$("#pfWho").addEventListener("change", (e) => { pfWho = e.target.value; renderProfilesAdmin(); });
$("#pfForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const body = {
    title: $("#pfTitle").value, timings: $("#pfTimings").value, bio: $("#pfBio").value,
    facts: $("#pfFacts").value, approach: $("#pfApproach").value,
    levels: $$("#pfLevels input:checked").map((i) => i.value), campusList: $$("#pfCampuses input:checked").map((i) => i.value),
  };
  if (!body.levels.length) { toast("Tick at least one level"); return; }
  document.activeElement.blur();
  contentDo(() => api("PUT", `/api/admin/teachers/${pfWho}/profile`, body), `✓ ${TEACHERS[pfWho].name}'s profile saved`).then(() => adminDo(async () => {}));
});
$("#pfReset").addEventListener("click", () => {
  const b = $("#pfReset");
  if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = "Click again to reset"; setTimeout(() => { delete b.dataset.armed; b.textContent = "Reset to default"; }, 3000); return; }
  contentDo(() => api("PUT", `/api/admin/teachers/${pfWho}/profile`, { reset: true }), "Profile reset to default").then(() => adminDo(async () => {}));
});

// =============== TIMETABLES ===============
let ttaDraft = null;
const ttaKey = () => `${$("#ttaCampus").value}|${$("#ttaLevel").value}`;
function loadTtaDraft() {
  const real = TIMETABLES[ttaKey()];
  ttaDraft = {};
  DAYS.forEach((d) => (ttaDraft[d] = [0, 1, 2].map((i) => (real && real[d] ? real[d][i] || "" : ""))));
}
function drawTta() {
  const level = $("#ttaLevel").value, subs = SUBJECTS.filter((s) => s.levels.includes(level));
  const real = TIMETABLES[ttaKey()];
  $("#ttaNote").textContent = real ? "This timetable is live on the website and in students' portals." : "No timetable saved yet — the website shows a suggested schedule. Fill this in and save to show the real one.";
  $("#ttaGrid").innerHTML = `<thead><tr><th>Time</th>${DAYS.map((d) => `<th>${d}</th>`).join("")}</tr></thead><tbody>${SLOTS.map((slot, si) => `<tr><td><strong>${slot}</strong></td>${DAYS.map((d) => `
    <td><select data-tt="${d}|${si}"><option value="">— Free —</option>${subs.map((s) => `<option value="${s.id}" ${ttaDraft[d][si] === s.id ? "selected" : ""}>${s.name}</option>`).join("")}</select>
    ${ttaDraft[d][si] ? `<small class="muted">${esc(teacherAt(ttaDraft[d][si], $("#ttaCampus").value, level).name)}</small>` : ""}</td>`).join("")}</tr>`).join("")}</tbody>`;
}
function renderTimetableAdmin() {
  if (!$("#ttaCampus").options.length) $("#ttaCampus").innerHTML = CAMPUSES.map((c) => `<option>${c}</option>`).join("");
  if (!ttaDraft) loadTtaDraft();
  if (!$("#ttaGrid").contains(document.activeElement)) drawTta();
}
["#ttaCampus", "#ttaLevel"].forEach((s) => $(s).addEventListener("change", () => { loadTtaDraft(); drawTta(); }));
$("#ttaGrid").addEventListener("change", (e) => { const [d, i] = e.target.dataset.tt.split("|"); ttaDraft[d][+i] = e.target.value; drawTta(); });
$("#ttaSuggest").addEventListener("click", () => {
  const saved = TIMETABLES[ttaKey()]; delete TIMETABLES[ttaKey()];
  const g = sampleTimetable($("#ttaCampus").value, $("#ttaLevel").value);
  if (saved) TIMETABLES[ttaKey()] = saved;
  DAYS.forEach((d) => (ttaDraft[d] = g[d].map((c) => (c ? c.subject : ""))));
  drawTta(); toast("Suggested schedule filled in — edit it, then Save");
});
$("#ttaSave").addEventListener("click", () => {
  const [c, l] = ttaKey().split("|");
  contentDo(() => api("PUT", "/api/admin/timetable", { key: ttaKey(), grid: ttaDraft }), `✓ ${l} timetable for ${c} saved`);
});
$("#ttaClear").addEventListener("click", () => {
  const b = $("#ttaClear");
  if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = "Click again to remove"; setTimeout(() => { delete b.dataset.armed; b.textContent = "Remove (show the suggested one)"; }, 3000); return; }
  contentDo(() => api("PUT", "/api/admin/timetable", { key: ttaKey(), grid: null }), "Timetable removed").then(() => { loadTtaDraft(); drawTta(); });
});

// =============== BACKUPS ===============
async function renderBackups() {
  try {
    const r = await api("GET", "/api/admin/backups");
    const kb = (n) => (n > 1e6 ? (n / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1e3)) + " KB");
    $("#bkList").innerHTML = r.backups.map((b) => `<li><div><strong>${b.name.startsWith("before-restore") ? "Saved before a restore" : "Daily backup"} · ${new Date(b.at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</strong><small>${esc(b.name)} · ${kb(b.size)}</small></div>
      <button class="link-btn" data-bk="${esc(b.name)}">Restore this</button></li>`).join("") || `<li class="empty-state"><b>No backups yet</b>The first one is made automatically today.</li>`;
  } catch (e) {}
}
document.addEventListener("click", (e) => {
  const v = e.target.closest("[data-view='backups']"); if (v) renderBackups();
  const b = e.target.closest("[data-bk]"); if (!b) return;
  if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = "Click again — this replaces today's data"; setTimeout(() => { delete b.dataset.armed; b.textContent = "Restore this"; }, 4000); return; }
  adminDo(() => api("POST", `/api/admin/backups/${encodeURIComponent(b.dataset.bk)}/restore`), "✓ Data restored from backup").then(renderBackups).catch(() => {});
});
$("#bkFile").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  let data; try { data = JSON.parse(await f.text()); } catch (x) { toast("⚠ That file isn't a backup (.json)"); return; }
  if (!data.students || !data.teachers) { toast("⚠ That file isn't an SKH backup"); return; }
  const n = Object.keys(data.students).length;
  if (!(window._bkArmed && Date.now() - window._bkArmed < 20000)) { window._bkArmed = Date.now(); toast(`This backup has ${n} students. Choose the same file again within 20 seconds to confirm.`); return; }
  window._bkArmed = 0;
  adminDo(() => api("POST", "/api/admin/restore", data), `✓ Restored ${n} students from ${f.name}`).then(renderBackups).catch(() => {});
});

(() => {
  const _all = renderAll;
  renderAll = function () { _all(); if (isAdmin() && DB.state) { renderNewsAdmin(); renderProfilesAdmin(); renderTimetableAdmin(); } };
})();
// load the saved content once for the admin screens
(async () => { try { DB.content = await api("GET", "/api/content"); } catch (e) { DB.content = { teachers: {}, timetable: {}, news: [] }; } if (ME && isAdmin()) renderNewsAdmin(); })();
