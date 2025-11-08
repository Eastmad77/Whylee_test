// /scripts/game.js — Whylee Gameplay (v9010)
// - Mounts HUD avatar badge
// - Runs a session with QuestionEngine
// - Updates XP/streak + milestones
// - Shows cinematic posters (success/game-over)

import {
  auth, db, doc, getDoc, updateDoc
} from "/scripts/firebase-bridge.js?v=9010";

import { mountAvatarBadge } from "/scripts/components/avatarBadge.js?v=9010";
import { initQuestionEngine } from "/scripts/ai/questionEngine.js?v=9010";
import {
  evaluateMilestones, persistMilestones
} from "/scripts/milestones.js?v=9010";
import {
  showSuccessPoster, showGameOverPoster
} from "/scripts/ui/posterManager.js?v=9010";

// ----- DOM refs (guard everything) -------------------------------------------
const hudScore  = document.getElementById("hudScore");
const hudUserEl = "#hudUser";

const startBtn  = document.getElementById("startBtn");
const nextBtn   = document.getElementById("nextBtn");
const finishBtn = document.getElementById("finishBtn");
const controls  = document.querySelector(".controls");

const viewport  = document.getElementById("viewport");
const qIdxEl    = document.getElementById("qIdx");
const qTotalEl  = document.getElementById("qTotal");
const timerEl   = document.getElementById("timer");

// If critical nodes are missing, bail early (avoid blank UI due to exceptions)
if (!viewport || !startBtn || !nextBtn || !finishBtn) {
  console.warn("[game] Missing required DOM nodes; aborting init.");
}

// ----- State ------------------------------------------------------------------
let eng = null;
let t0 = 0;            // session start ms
let tickHandle = null; // timer interval

function startTimer() {
  t0 = Date.now();
  stopTimer();
  if (!timerEl) return;
  tickHandle = setInterval(() => {
    timerEl.textContent = String(Math.floor((Date.now() - t0) / 1000));
  }, 1000);
}

function stopTimer() {
  if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
}

// ----- Render helpers ---------------------------------------------------------
function renderQuestion(q, index, total) {
  if (!viewport) return;
  if (qIdxEl) qIdxEl.textContent = String(index + 1);
  if (qTotalEl) qTotalEl.textContent = String(total);

  viewport.innerHTML = `
    <h2 class="q-title">${q.q}</h2>
    <div class="answers">
      ${q.choices.map((label,i)=>`<button data-i="${i}">${label}</button>`).join("")}
    </div>
    <p class="muted" style="margin-top:.5rem">Pick one answer</p>
  `;

  viewport.querySelectorAll("button[data-i]").forEach(btn => {
    btn.addEventListener("click", () => {
      const guess = Number(btn.getAttribute("data-i"));
      const timeMs = Date.now() - t0;
      const correct = eng.submit(guess, timeMs); // record + adapt
      viewport.querySelectorAll("button[data-i]").forEach(b => (b.disabled = true));
      btn.style.borderColor = correct ? "var(--brand)" : "crimson";

      const { asked, total } = eng._debug();
      if (nextBtn)   nextBtn.style.display   = asked < total ? "" : "none";
      if (finishBtn) finishBtn.style.display = asked >= total ? "" : "none";
    });
  });
}

function renderSummary(r) {
  if (!viewport) return;
  viewport.innerHTML = `
    <div style="text-align:center; padding: 1.25rem 0">
      <h2 class="h4" style="margin:0 0 .5rem">Great work! 🎉</h2>
      <p class="muted">You answered <strong>${r.correct}/${r.total}</strong> correctly in <strong>${Math.round(r.durationMs/1000)}s</strong>.</p>
      <p class="muted">XP earned (client est.): <strong>${r.xpEarned}</strong></p>
      <div style="margin-top:.75rem; display:flex; gap:.5rem; justify-content:center">
        <a class="btn btn--ghost" href="/leaderboard.html">Leaderboard</a>
        <a class="btn btn--brand" href="/game.html">Play Again</a>
      </div>
    </div>
  `;
  if (controls) controls.style.display = "none";
}

// ----- HUD (avatar badge) -----------------------------------------------------
(async () => {
  try {
    await mountAvatarBadge(hudUserEl, { size: 56, uid: auth.currentUser?.uid || null });
  } catch (e) {
    console.warn("[game] avatar badge mount failed:", e);
  }
})();

// ----- Session lifecycle ------------------------------------------------------
if (startBtn) startBtn.addEventListener("click", async () => {
  if (!auth.currentUser) {
    alert("Please sign in to play.");
    window.location.href = "/signin.html";
    return;
  }

  eng = await initQuestionEngine({ mode: "daily", count: 10 });
  const debug = eng._debug();
  if (qTotalEl) qTotalEl.textContent = String(debug.total);

  startTimer();
  const q = eng.next();
  renderQuestion(q, 0, debug.total);

  startBtn.style.display = "none";
  if (nextBtn)   nextBtn.style.display   = "";
  if (finishBtn) finishBtn.style.display = "none";
});

if (nextBtn) nextBtn.addEventListener("click", () => {
  if (!eng) return;
  const dbg = eng._debug();
  if (dbg.asked < dbg.total) {
    const q = eng.next();
    renderQuestion(q, dbg.asked - 1, dbg.total);
  }
});

if (finishBtn) finishBtn.addEventListener("click", async () => {
  stopTimer();

  // Aggregate results (client view)
  const r = eng ? eng.results({ pro: false }) : { correct: 0, total: 0, durationMs: 0, xpEarned: 0 };
  renderSummary(r);

  // Posters: success vs game-over
  try {
    const pass = r.correct >= Math.ceil((r.total || 0) * 0.6);
    if (pass) {
      await showSuccessPoster();
    } else {
      await showGameOverPoster();
    }
  } catch (_) {}

  // Award XP & streak, then run milestones
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    const user = snap.exists() ? (snap.data() || {}) : {};

    const newXp = Math.max(0, Math.round((user.xp || 0) + (r.xpEarned || 0)));
    const newStreak = (user.streak || 0) + 1;

    await updateDoc(ref, { xp: newXp, streak: newStreak });

    const evald = evaluateMilestones({ ...user, xp: newXp, streak: newStreak, pro: !!user.pro });
    await persistMilestones(uid, user, evald);

    if (hudScore) hudScore.textContent = `XP: ${newXp.toLocaleString()}`;

    if (evald?.newly?.length) {
      const names = evald.newly
        .map(m => m.id.replace(/^(skin|badge|boost):/, "").replace(/-/g, " "));
      alert(`🎉 Unlocked: ${names.join(", ")}`);
    }
  } catch (e) {
    console.error("[game] post-finish error:", e);
  }
});
