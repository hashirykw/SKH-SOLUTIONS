// ===== SKH Solutions — mark attendance by scanning students' QR codes =====
// Works three ways: phone/laptop camera, a USB/Bluetooth QR scanner (it "types" into the box), or typing the ID.
(() => {
  let stream = null, detector = null, jsQRfn = null, timer = null, markCode = "p";
  const recent = new Map(); // id -> time (ignore repeat scans for 3 s)
  const video = $("#qrVideo");

  function beep(ok) {
    try {
      const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain();
      o.frequency.value = ok ? 880 : 220; g.gain.value = 0.08; o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + 0.12);
    } catch (e) {}
  }
  function updateCount() {
    const c = cls(); if (!c) { $("#qrCount").textContent = ""; return; }
    const done = c.students.filter((id) => draftAtt[id]).length;
    $("#qrCount").textContent = `${done}/${c.students.length} marked`;
  }
  function logLine(text, ok) {
    const li = document.createElement("li"); li.className = ok ? "ok" : "bad"; li.textContent = text;
    $("#qrLog").prepend(li);
    while ($("#qrLog").children.length > 6) $("#qrLog").lastChild.remove();
  }
  function handleCode(raw) {
    const id = String(raw || "").replace(/^SKH:/i, "").trim().toUpperCase();
    if (!id) return;
    if (recent.has(id) && Date.now() - recent.get(id) < 3000) return;
    recent.set(id, Date.now());
    const c = cls();
    if (!c) { toast("Choose a class first"); return; }
    const match = c.students.find((s) => s.toUpperCase() === id);
    if (!match) {
      beep(false);
      const known = Object.keys(STUDENTS).find((s) => s.toUpperCase() === id);
      logLine(known ? `✕ ${STUDENTS[known].name} is not in this class` : `✕ Unknown code: ${id}`, false);
      return;
    }
    draftAtt[match] = markCode;
    drawAttRows(c); updateCount(); beep(true);
    const name = STUDENTS[match].name;
    logLine(`✓ ${name} — ${markCode === "l" ? "late" : "present"}`, true);
    toast(`✓ ${name} marked ${markCode === "l" ? "late" : "present"}`);
    const row = [...$$("#aGrid [data-att]")].find((b) => b.dataset.att === match);
    if (row) { const r = row.closest(".att-row"); r.classList.remove("flash"); void r.offsetWidth; r.classList.add("flash"); }
  }

  async function getDetector() {
    if ("BarcodeDetector" in window) {
      try { const f = await BarcodeDetector.getSupportedFormats(); if (f.includes("qr_code")) return (detector = new BarcodeDetector({ formats: ["qr_code"] })); } catch (e) {}
    }
    if (window.jsQR) return (jsQRfn = window.jsQR);
    await new Promise((ok, fail) => { // fallback decoder (needs internet once)
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
    });
    return (jsQRfn = window.jsQR);
  }
  const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d", { willReadFrequently: true });
  async function tick() {
    if (!stream) return;
    if (video.readyState >= 2) {
      try {
        if (detector) { const r = await detector.detect(video); if (r[0]) handleCode(r[0].rawValue); }
        else if (jsQRfn) {
          const w = (canvas.width = Math.min(640, video.videoWidth)), h = (canvas.height = Math.round((w / video.videoWidth) * video.videoHeight));
          ctx.drawImage(video, 0, 0, w, h);
          const r = jsQRfn(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
          if (r) handleCode(r.data);
        }
      } catch (e) {}
    }
    timer = setTimeout(tick, 180);
  }
  async function openCam() {
    if (!cls()) { toast("Choose a class first"); return; }
    if (!window.isSecureContext || !navigator.mediaDevices) {
      toast("The camera only works on https or on this computer (localhost). Use a QR scanner or type the ID instead.");
      $("#qrInput").focus(); return;
    }
    try {
      await getDetector();
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      video.srcObject = stream; await video.play();
      $("#qrCam").hidden = false; $("#qrOpen").textContent = "📷 Camera on";
      updateCount(); tick();
    } catch (e) {
      stopCam();
      toast(e && e.name === "NotAllowedError" ? "Camera permission was blocked — allow it in the browser" : "Couldn't start the QR scanner — use the ID box instead");
      $("#qrInput").focus();
    }
  }
  function stopCam() {
    clearTimeout(timer);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null; video.srcObject = null;
    $("#qrCam").hidden = true; $("#qrOpen").textContent = "📷 Scan QR";
  }

  $("#qrOpen").addEventListener("click", () => (stream ? stopCam() : openCam()));
  $("#qrClose").addEventListener("click", stopCam);
  $("#qrInput").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault(); recent.delete(e.target.value.replace(/^SKH:/i, "").trim().toUpperCase());
    handleCode(e.target.value); e.target.value = "";
  });
  $("#qrMark").addEventListener("click", (e) => {
    const b = e.target.closest("[data-code]"); if (!b) return;
    markCode = b.dataset.code; $$("#qrMark .seg__btn").forEach((x) => x.classList.toggle("is-on", x === b));
  });
  $("#aRestAbsent").addEventListener("click", () => {
    const c = cls(); if (!c) return;
    let n = 0; c.students.forEach((id) => { if (!draftAtt[id]) { draftAtt[id] = "a"; n++; } });
    drawAttRows(c); updateCount();
    toast(n ? `${n} student${n > 1 ? "s" : ""} marked absent — press Save attendance` : "Everyone is already marked");
  });
  // keep the counter right when the class/date changes, and stop the camera when leaving the page
  document.addEventListener("change", (e) => { if (e.target.id === "aDate" || e.target.classList.contains("class-select")) { recent.clear(); $("#qrLog").innerHTML = ""; setTimeout(updateCount, 0); } });
  document.addEventListener("click", (e) => { const v = e.target.closest("[data-view]"); if (v && v.dataset.view !== "attend") stopCam(); if (v && v.dataset.view === "attend") setTimeout(updateCount, 0); });
  $("#aGrid").addEventListener("click", () => setTimeout(updateCount, 0));
  window.addEventListener("pagehide", stopCam);
})();
