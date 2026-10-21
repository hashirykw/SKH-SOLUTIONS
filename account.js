// ===== SKH Solutions — shared portal bits: change-password dialog + "saved" status =====
const escA = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Change-password dialog. forced = first login with a temporary password.
function passwordDialog({ forced = false } = {}) {
  return new Promise((resolve) => {
    document.getElementById("pwDlg")?.remove();
    const el = document.createElement("div");
    el.id = "pwDlg"; el.className = "pwdlg";
    el.innerHTML = `<form class="pwdlg__box" novalidate>
      <p class="kicker">${forced ? "First login" : "Account"}</p>
      <h3>${forced ? "Set your own password" : "Change password"}</h3>
      <p class="pwdlg__sub">${forced ? "You signed in with a temporary password. Choose your own — at least 8 characters." : "Use at least 8 characters. Don't share it with anyone."}</p>
      <label class="lf"><span>Current password</span><input type="password" name="old" autocomplete="current-password" required></label>
      <label class="lf"><span>New password</span><input type="password" name="nw" autocomplete="new-password" minlength="8" required></label>
      <label class="lf"><span>Repeat new password</span><input type="password" name="nw2" autocomplete="new-password" required></label>
      <p class="login__err" hidden></p>
      <div class="pwdlg__actions">
        <button type="button" class="btn btn--outline btn--sm" data-cancel>${forced ? "Remind me later" : "Cancel"}</button>
        <button class="btn btn--gold btn--sm" type="submit">Save password</button>
      </div>
    </form>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-open"));
    const f = el.querySelector("form"), err = el.querySelector(".login__err");
    const close = (ok) => { el.classList.remove("is-open"); setTimeout(() => el.remove(), 250); resolve(ok); };
    el.querySelector("[data-cancel]").onclick = () => close(false);
    el.addEventListener("click", (e) => { if (e.target === el && !forced) close(false); });
    f.old.focus();
    f.onsubmit = async (e) => {
      e.preventDefault();
      const show = (m) => { err.textContent = m; err.hidden = false; };
      if (f.nw.value.length < 8) return show("New password must be at least 8 characters.");
      if (f.nw.value !== f.nw2.value) return show("The two new passwords don't match.");
      if (f.nw.value === f.old.value) return show("Choose a password different from the current one.");
      const btn = f.querySelector("[type=submit]"); btn.disabled = true;
      try { await DB.changePassword(f.old.value, f.nw.value); close(true); }
      catch (x) { show(x.message); btn.disabled = false; }
    };
  });
}

// Small "Saving… / All changes saved" chip in the top bar
function watchSaves(chip, toastFn) {
  if (!chip) return;
  let t;
  const set = (txt, cls) => { chip.textContent = txt; chip.className = "demo-chip sync-chip " + cls; };
  set("● Saved", "is-ok");
  const _save = DB.save.bind(DB);
  DB.save = function () {
    const p = _save();
    if (p === DB.queue) {
      set("Saving…", "is-busy"); clearTimeout(t);
      p.then((ok) => { if (ok === false) set("⚠ Not saved", "is-err"); else t = setTimeout(() => set("● All changes saved", "is-ok"), 250); });
    }
    return p;
  };
  DB.onError = (e) => {
    toastFn(e.status === 401 ? "Your session ended — please sign in again" : "⚠ " + e.message);
    if (e.status === 401) setTimeout(() => location.reload(), 1500);
  };
}
