// /scripts/auth.js — v9012
// Handles sign-in and password reset for Whylee (CSP-safe)

import { auth, signInWithEmailAndPassword } from "/scripts/firebase-bridge.mjs?v=9012";

let sendPasswordResetEmailFn;
try {
  // Dynamic import from gstatic is allowed by your CSP
  const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js");
  sendPasswordResetEmailFn = sendPasswordResetEmail;
} catch (e) {
  console.warn("[auth] failed to load sendPasswordResetEmail:", e);
}

const emailEl  = document.getElementById("email");
const passEl   = document.getElementById("password");
const msg      = document.getElementById("msg");
const signInBtn = document.getElementById("signInBtn");
const resetBtn  = document.getElementById("resetBtn");

function setMsg(text, colorVar = "var(--text-muted)") {
  if (!msg) return;
  msg.textContent = text;
  msg.style.color = colorVar;
}

if (signInBtn) {
  signInBtn.addEventListener("click", async () => {
    const email = emailEl?.value?.trim() || "";
    const pass  = passEl?.value || "";
    if (!email || !pass) { setMsg("Please enter email and password.", "#ffcc66"); return; }

    setMsg("Signing in…");
    signInBtn.disabled = true;
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      setMsg("✅ Signed in! Redirecting…", "var(--accent)");
      setTimeout(() => (window.location.href = "/game.html"), 800);
    } catch (e) {
      setMsg(e?.message || "Sign-in failed.", "#ff6666");
    } finally {
      signInBtn.disabled = false;
    }
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", async () => {
    const email = emailEl?.value?.trim() || "";
    if (!email) { setMsg("Enter your email first.", "#ffcc66"); return; }
    if (!sendPasswordResetEmailFn) { setMsg("Reset unavailable right now. Please try later.", "#ff6666"); return; }

    setMsg("Sending reset link…");
    resetBtn.disabled = true;
    try {
      await sendPasswordResetEmailFn(auth, email);
      setMsg(`✅ Reset link sent to ${email}. Check your inbox.`, "var(--accent)");
    } catch (e) {
      setMsg(e?.message || "Could not send reset link.", "#ff6666");
    } finally {
      resetBtn.disabled = false;
    }
  });
}

// Enter key triggers sign-in
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && document.activeElement?.tagName === "INPUT") {
    signInBtn?.click();
  }
});
