// ===== SKH Solutions — printable Progress Report & Fee Voucher =====
// Opens a clean A4 page in a new tab; use "Save as PDF" in the print dialog.

const RPT = {
  money: (n) => "Rs " + Number(n).toLocaleString("en-PK"),
  esc: (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
  subj: (id) => SUBJECTS.find((s) => s.id === id),
  grade: (p) => (p >= 90 ? "A*" : p >= 80 ? "A" : p >= 70 ? "B" : p >= 60 ? "C" : p >= 50 ? "D" : "E"),
  d: (x, o = { day: "numeric", month: "short", year: "numeric" }) => new Date(x).toLocaleDateString("en-GB", o),
  logo: () => new URL("assets/skh-emblem.png", location.href).href,
};

function openPrintable(title, bodyHTML, landscape) {
  let w = null;
  try { w = window.open("", "_blank"); } catch (e) {}
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${RPT.esc(title)}</title>
  <style>
    @page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Segoe UI", Arial, sans-serif; color: #16213a; background: #e9eef6; font-size: 12px; line-height: 1.45; }
    .bar { position: sticky; top: 0; display: flex; gap: 12px; align-items: center; justify-content: center; padding: 12px; background: #072062; color: #fff; font-size: 13px; }
    .bar button { padding: 9px 20px; border: 0; border-radius: 20px; cursor: pointer; font-weight: 700; background: linear-gradient(120deg,#7fe0ff,#12aef0 45%,#1a5fe0); color: #041033; }
    .page { width: ${landscape ? "297mm" : "210mm"}; min-height: ${landscape ? "210mm" : "297mm"}; margin: 16px auto; padding: 14mm; background: #fff; box-shadow: 0 10px 40px rgba(7,32,98,.15); }
    .hd { display: flex; align-items: center; gap: 14px; padding-bottom: 12px; border-bottom: 3px solid #12aef0; }
    .hd img { width: 58px; height: 58px; border-radius: 50%; background: #072062; padding: 5px; }
    .hd h1 { font-size: 20px; color: #072062; letter-spacing: -.3px; }
    .hd p { font-size: 11px; color: #5d6a80; }
    .hd .tag { margin-left: auto; text-align: right; }
    .hd .tag b { display: block; font-size: 15px; color: #072062; }
    .demo { display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 700; background: #e0f4fd; color: #0a6fc4; }
    h2 { font-size: 13px; color: #072062; text-transform: uppercase; letter-spacing: .08em; margin: 16px 0 8px; padding-left: 8px; border-left: 4px solid #12aef0; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .kv { padding: 8px 10px; border-radius: 8px; background: #f2f6fc; }
    .kv small { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .08em; color: #5d6a80; }
    .kv b { font-size: 12.5px; color: #072062; }
    .stat { text-align: center; padding: 10px; border-radius: 10px; background: #072062; color: #fff; }
    .stat b { display: block; font-size: 20px; color: #6ad4ff; }
    .stat small { font-size: 9px; text-transform: uppercase; letter-spacing: .1em; opacity: .8; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #072062; color: #fff; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
    td { padding: 6px 8px; border-bottom: 1px solid #e3ebf6; vertical-align: top; }
    tr:nth-child(even) td { background: #f7f9fc; }
    .pbar { display: inline-block; width: 90px; height: 7px; border-radius: 7px; background: #e3ebf6; vertical-align: middle; overflow: hidden; margin-right: 6px; }
    .pbar i { display: block; height: 100%; background: linear-gradient(90deg,#12aef0,#5cb82e); }
    .g { display: inline-block; min-width: 26px; text-align: center; padding: 1px 6px; border-radius: 6px; font-weight: 700; background: #072062; color: #6ad4ff; }
    .ok { color: #15803d; font-weight: 700; } .warn { color: #b45309; font-weight: 700; } .bad { color: #b91c1c; font-weight: 700; }
    .remark { padding: 8px 10px; border-left: 3px solid #12aef0; background: #f2f6fc; border-radius: 6px; margin-bottom: 6px; }
    .remark small { color: #5d6a80; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 30px; }
    .sign div { border-top: 1px solid #16213a; padding-top: 4px; text-align: center; font-size: 10px; color: #5d6a80; }
    .ft { margin-top: 18px; padding-top: 8px; border-top: 1px solid #e3ebf6; font-size: 9px; color: #8793a6; display: flex; justify-content: space-between; }
    .vouchers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
    .v { padding: 10px 12px; border-right: 1px dashed #8793a6; }
    .v:last-child { border-right: 0; }
    .v .copy { display: inline-block; padding: 2px 8px; border-radius: 10px; background: #072062; color: #6ad4ff; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
    .v .vh { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
    .v .vh img { width: 34px; height: 34px; border-radius: 50%; background: #072062; padding: 3px; }
    .v .vh b { font-size: 13px; color: #072062; }
    .v table { font-size: 10px; margin: 6px 0; }
    .v .total td { font-weight: 800; font-size: 12px; background: #e0f4fd !important; }
    .v .line { display: flex; justify-content: space-between; font-size: 10px; padding: 3px 0; border-bottom: 1px dotted #cbd5e1; }
    .v .stamp { margin-top: 18px; display: flex; justify-content: space-between; font-size: 9px; color: #5d6a80; }
    .v .stamp span { border-top: 1px solid #16213a; padding-top: 3px; width: 45%; text-align: center; }
    .paid-stamp { display: inline-block; margin-top: 8px; padding: 4px 12px; border: 2px solid #15803d; border-radius: 6px; color: #15803d; font-weight: 800; transform: rotate(-6deg); }
    @media print { body { background: #fff; } .bar { display: none; } .page { margin: 0; box-shadow: none; width: auto; min-height: 0; padding: 0; } }
  </style></head><body>
  <div class="bar"><span>Choose <b>“Save as PDF”</b> as the printer to download.</span><button onclick="window.print()">⬇ Save as PDF / Print</button></div>
  <div class="page">${bodyHTML}</div>
  <script>window.addEventListener("load", () => setTimeout(() => window.print(), 400));<\/script>
  </body></html>`;
  if (w) { w.document.write(html); w.document.close(); return; }
  showReportOverlay(title, html);
}

// Pop-ups blocked (phones, tablets, embedded previews): show the report inside the page instead
function showReportOverlay(title, html) {
  document.getElementById("rptOverlay")?.remove();
  const fit = `<style>.bar{display:none!important}body{background:#e9eef6}</style><script>
    function fit(){var p=document.querySelector('.page');if(!p)return;p.style.zoom=1;var k=Math.min(1,(innerWidth-16)/p.offsetWidth);p.style.zoom=k;}
    addEventListener('load',fit);addEventListener('resize',fit);<\/script>`;
  const doc = html.replace(/<script>window\.addEventListener\("load"[\s\S]*?<\/script>/, "").replace("</body>", fit + "</body>");
  const o = document.createElement("div");
  o.id = "rptOverlay";
  o.style.cssText = "position:fixed;inset:0;z-index:500;display:flex;flex-direction:column;background:rgba(4,16,51,.85);padding:env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0)";
  o.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;color:#fff;font:600 14px sans-serif">
      <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${RPT.esc(title)}</span>
      <button type="button" style="border:0;border-radius:20px;padding:8px 16px;font:700 13px sans-serif;cursor:pointer;background:#12aef0;color:#041033">Close ✕</button></div>
    <iframe title="${RPT.esc(title)}" style="flex:1;width:100%;border:0;background:#e9eef6"></iframe>`;
  o.querySelector("iframe").srcdoc = doc;
  o.querySelector("button").onclick = () => o.remove();
  document.body.appendChild(o);
}

// ---------------- Monthly Progress Report ----------------
function printStudentReport(studentId) {
  const st = STUDENTS[studentId], rec = DB.student(studentId), e = RPT.esc;
  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const attKey = `${now.getFullYear()}-${now.getMonth()}`;
  const mAtt = Object.values(rec.att[attKey] || {});
  const allAtt = Object.values(rec.att).flatMap((m) => Object.values(m));
  const rate = (arr) => { const p = arr.filter((x) => x === "p" || x === "l").length, a = arr.filter((x) => x === "a").length; return p + a ? Math.round((p / (p + a)) * 100) : 100; };
  const pct = (t) => Math.round((t.m / t.o) * 100);
  const subjRows = st.subjects.map((sid) => {
    const s = RPT.subj(sid), ts = rec.tests.filter((t) => t.s === sid).sort((a, b) => a.d.localeCompare(b.d));
    const avg = ts.length ? Math.round(ts.reduce((n, t) => n + pct(t), 0) / ts.length) : null;
    const prog = DB.syllabusProgress(studentId, sid);
    return { s, ts, avg, prog, teacher: teacherAt(sid, st.campus, st.level).name };
  });
  const avgs = subjRows.map((r) => r.avg).filter((x) => x !== null);
  const overall = avgs.length ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : 0;
  const syllAvg = Math.round(subjRows.reduce((n, r) => n + (r.prog ? r.prog.pct : 0), 0) / subjRows.length);
  const tasksDone = rec.tasks.filter((t) => t.done).length;
  const remarks = (rec.remarks || []).slice().sort((a, b) => b.at - a.at).slice(0, 4);
  const fee = (rec.fees || []).find((f) => f.status === "due");
  const attRate = rate(mAtt);

  const body = `
    <div class="hd">
      <img src="${RPT.logo()}" alt="">
      <div><h1>SKH Solutions</h1><p>An Institute of O &amp; A Levels · One Stop Solution</p><p>${e(CAMPUS_ADDR[st.campus])}, Karachi · 0336 7647647</p></div>
      <div class="tag"><b>Monthly Progress Report</b>${monthLabel}<br><span class="demo">Student ID ${e(studentId)}</span></div>
    </div>

    <h2>Student</h2>
    <div class="grid">
      <div class="kv"><small>Name</small><b>${e(st.name)}</b></div>
      <div class="kv"><small>Student ID</small><b>${studentId}</b></div>
      <div class="kv"><small>Level · Section</small><b>${st.level} · ${st.section}</b></div>
      <div class="kv"><small>Campus</small><b>${st.campus}</b></div>
      <div class="kv"><small>Guardian</small><b>${e(st.guardian)}</b></div>
      <div class="kv"><small>Subjects</small><b>${st.subjects.length}</b></div>
      <div class="kv"><small>Report date</small><b>${RPT.d(now)}</b></div>
      <div class="kv"><small>Enrolled since</small><b>${RPT.d(st.joined, { month: "long", year: "numeric" })}</b></div>
    </div>

    <h2>Summary</h2>
    <div class="grid">
      <div class="stat"><b>${attRate}%</b><small>Attendance (${now.toLocaleDateString("en-GB", { month: "short" })})</small></div>
      <div class="stat"><b>${overall}% · ${RPT.grade(overall)}</b><small>Average test score</small></div>
      <div class="stat"><b>${syllAvg}%</b><small>Syllabus progress</small></div>
      <div class="stat"><b>${tasksDone}/${rec.tasks.length}</b><small>Assignments submitted</small></div>
    </div>

    <h2>Subject performance</h2>
    <table>
      <thead><tr><th>Subject</th><th>Teacher</th><th>Tests</th><th>Average</th><th>Grade</th><th>Syllabus progress</th></tr></thead>
      <tbody>${subjRows.map((r) => `<tr>
        <td><b>${r.s.name}</b><br><small>Cambridge ${r.prog ? r.prog.code : r.s.code}</small></td>
        <td>${e(r.teacher)}</td>
        <td>${r.ts.map((t) => `${e(t.t)}: <b>${t.m}/${t.o}</b>`).join("<br>") || "—"}</td>
        <td>${r.avg === null ? "—" : r.avg + "%"}</td>
        <td>${r.avg === null ? "—" : `<span class="g">${RPT.grade(r.avg)}</span>`}</td>
        <td>${r.prog ? `<span class="pbar"><i style="width:${r.prog.pct}%"></i></span>${r.prog.pct}%<br><small>${r.prog.done}/${r.prog.subs} sub-topics complete</small>` : "—"}</td>
      </tr>`).join("")}</tbody>
    </table>

    <div class="two">
      <div>
        <h2>Attendance</h2>
        <table>
          <tr><td>This month</td><td><b>${attRate}%</b> — ${mAtt.filter((x) => x === "p").length} present, ${mAtt.filter((x) => x === "l").length} late, ${mAtt.filter((x) => x === "a").length} absent</td></tr>
          <tr><td>This term</td><td><b>${rate(allAtt)}%</b></td></tr>
        </table>
        <h2>Topics to revise</h2>
        <table>${subjRows.flatMap((r) => (r.prog ? r.prog.low.slice(0, 2).map((l) => `<tr><td>${r.s.name}</td><td>${e(l.sub)} <small>(${e(l.topic)})</small></td></tr>`) : [])).slice(0, 6).join("") || "<tr><td>No low-confidence topics marked. ✦</td></tr>"}</table>
      </div>
      <div>
        <h2>Teacher remarks</h2>
        ${remarks.map((r) => `<div class="remark">${e(r.text)}<br><small>— ${e((TEACHERS[r.by] || {}).name || "Teacher")}${RPT.subj(r.s) ? `, ${RPT.subj(r.s).name}` : ""} · ${RPT.d(r.at)}</small></div>`).join("") || `<div class="remark">${overall >= 80 ? "Excellent progress this month — keep up the consistent effort." : overall >= 65 ? "Good progress. Regular past-paper practice will help lift grades further." : "More practice needed. Please focus on topical past papers and attend every class."}<br><small>— SKH Solutions</small></div>`}
        <h2>Fees</h2>
        <table>
          ${(rec.fees || []).filter((f) => f.status !== "upcoming").map((f) => `<tr><td>${RPT.d(f.month + "-01", { month: "long", year: "numeric" })}</td><td>${RPT.money(f.amount)}</td><td class="${f.status === "paid" ? "ok" : "warn"}">${f.status === "paid" ? "Paid" : "Due " + RPT.d(f.due)}</td></tr>`).join("")}
        </table>
        ${fee ? `<p style="margin-top:6px;font-size:10px;color:#b45309">Please clear the ${RPT.d(fee.month + "-01", { month: "long" })} fee by ${RPT.d(fee.due)}.</p>` : ""}
      </div>
    </div>

    <div class="sign"><div>Class Teacher</div><div>Campus Coordinator</div><div>Parent / Guardian</div></div>
    <div class="ft"><span>SKH Solutions · Generated from the Student Portal</span><span>${RPT.d(now)} · ${studentId}</span></div>`;
  openPrintable(`${st.name} — Progress Report ${monthLabel}`, body);
}

// ---------------- Fee Voucher (Bank / SKH / Student copies) ----------------
function printFeeVoucher(studentId, feeId) {
  const st = STUDENTS[studentId], rec = DB.student(studentId), e = RPT.esc;
  const f = rec.fees.find((x) => x.id === feeId);
  const per = Math.round(f.amount / Math.max(1, st.subjects.length));
  const late = Number(DB.settings.lateFee) || 0, bank = DB.settings.bank || "Any branch / SKH front desk";
  const monthLabel = RPT.d(f.month + "-01", { month: "long", year: "numeric" });
  const copy = (label) => `
    <div class="v">
      <span class="copy">${label}</span>
      <div class="vh"><img src="${RPT.logo()}" alt=""><div><b>SKH Solutions</b><br><small>${e(st.campus)} campus · 0336 7647647</small></div></div>
      <div class="line"><span>Voucher no.</span><b>${f.id}</b></div>
      <div class="line"><span>Student</span><b>${e(st.name)}</b></div>
      <div class="line"><span>Student ID</span><b>${studentId}</b></div>
      <div class="line"><span>Level · Section</span><b>${st.level} · ${st.section}</b></div>
      <div class="line"><span>Fee month</span><b>${monthLabel}</b></div>
      <div class="line"><span>Due date</span><b>${RPT.d(f.due)}</b></div>
      <table>
        <thead><tr><th>Subject</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${st.subjects.map((sid) => `<tr><td>${RPT.subj(sid).name}</td><td style="text-align:right">${RPT.money(per)}</td></tr>`).join("")}
        <tr class="total"><td>Total payable</td><td style="text-align:right">${RPT.money(f.amount)}</td></tr></tbody>
      </table>
      <div class="line"><span>After due date</span><b>${RPT.money(f.amount + late)}</b></div>
      <div class="line"><span>Bank</span><b>${e(bank)}</b></div>
      ${f.status === "paid" ? `<span class="paid-stamp">PAID ${RPT.d(f.paidOn)}</span>` : ""}
      <div class="stamp"><span>Depositor</span><span>Bank stamp</span></div>
    </div>`;
  const body = `
    <div class="hd" style="margin-bottom:10px">
      <img src="${RPT.logo()}" alt="">
      <div><h1>Fee Voucher — ${monthLabel}</h1><p>Pay at any branch before the due date and keep the student copy.</p></div>
      <div class="tag"><b>${f.status === "paid" ? "Receipt" : "Voucher"}</b>${e(f.id)}</div>
    </div>
    <div class="vouchers">${copy("Bank copy")}${copy("SKH copy")}${copy("Student copy")}</div>`;
  openPrintable(`Fee Voucher ${f.id}`, body, true);
}
