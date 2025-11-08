// /memoryMatch.js — Level 2: Memory Match (Premium), v9012
// Fixes: encoding, correct imports/paths, auth readiness, Firestore helpers, SFX paths.

// Firebase bridge (no secrets in repo)
import { firebaseAuth, firestoreDb } from "/scripts/firebase-bridge.mjs?v=9012";

// Firestore helpers (modular SDK via gstatic; allowed by your CSP)
import {
  doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// App components (root-level in your repo)
import { mountAvatarBadge } from "/avatarBadge.js?v=9012";
import { createPips, setPipState, addWrongPip, removeOneWrongPip } from "/pips.js?v=9012";
import { mountStreakBar, streakSet, streakPulseGold, streakPulseError, streakRedeem } from "/streakBar.js?v=9012";

// --------- Utilities ---------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Safe audio helper (avoid throwing in restricted environments)
function safeAudio(src, volume = 0.7) {
  try {
    const a = new Audio(src);
    a.volume = volume;
    return a;
  } catch {
    return { play: () => Promise.resolve(), currentTime: 0 };
  }
}

// --------- SFX (use your /media/audio paths) ---------
const sfx = {
  click:   safeAudio("/media/audio/soft-click.mp3"),
  right:   safeAudio("/media/audio/correct.mp3"),
  wrong:   safeAudio("/media/audio/wrong.mp3"),
  levelup: safeAudio("/media/audio/levelup.mp3"),
};

// --------- DOM refs ---------
const board   = document.getElementById("board");
const timerEl = document.getElementById("timer");
const scoreEl = document.getElementById("hudScore");
const restart = document.getElementById("restartBtn");

// --------- Game state ---------
const TOTAL_PAIRS = 5;
let deck = [];
let open = [];
let matchedPairs = 0;
let correctStreak = 0; // for redemption
let missCount = 0;     // miss rail count
let proUser = false;

// Timer
let t0 = 0, tickHandle = null;
function startTimer() {
  t0 = Date.now();
  stopTimer();
  tickHandle = setInterval(() => {
    if (timerEl) timerEl.textContent = Math.floor((Date.now() - t0) / 1000);
  }, 1000);
}
function stopTimer() {
  if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
}

// Emoji pool (UTF-8 clean)
const EMOJI_POOL = ["🐶","🦊","🐼","🐨","🐯","🐵","🦄","🐸","🦉","🐙","🐧","🛸","🚀","⭐","⚡"];

// --------- Auth & Pro resolution ---------
async function whenAuthReady() {
  const auth = await firebaseAuth();
  // Wait for a settled auth state (handles refresh restores)
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    const unsub = auth.onAuthStateChanged((user) => {
      unsub();
      resolve(user || null);
    });
  });
}

// Optional: entitlements check using your existing module (root-level /entitlements.js)
let isPro = async () => false;
try {
  const mod = await import("/entitlements.js?v=9012");
  if (typeof mod.isPro === "function") isPro = mod.isPro;
} catch {
  console.warn("[memoryMatch] entitlements module not found, defaulting to Free.");
}

// --------- Rendering ---------
function cardHtml(c, isProUser) {
  const cls = ["mm-card"];
  if (c.flipped || c.done) cls.push("flipped");
  if (c.done) cls.push("matched");
  if (isProUser) cls.push("pro");
  return `
    <div class="${cls.join(" ")}" data-i="${c.id}" aria-label="Card">
      <div class="mm-inner">
        <div class="mm-face mm-front"></div>
        <div class="mm-face mm-back"><span class="mm-emoji">${c.emoji}</span></div>
      </div>
    </div>
  `;
}

function render() {
  if (!board) return;
  board.innerHTML = deck.map((c) => cardHtml(c, proUser)).join("");
  board.querySelectorAll(".mm-card").forEach((el) => {
    const idx = Number(el.dataset.i);
    el.addEventListener("click", () => onClick(idx, el));
  });
}

// --------- HUD / Score ---------
async function scoreSync(db, uid) {
  try {
    if (!uid) return;
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    const user = snap.data() || {};
    if (scoreEl) scoreEl.textContent = `XP: ${(user.xp || 0).toLocaleString()}`;
  } catch (e) {
    // keep silent in UI, dev log only
    console.debug("[memoryMatch] scoreSync error:", e?.message || e);
  }
}

async function awardXpAndStreak(db, uid) {
  try {
    if (!uid) return;
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    const user = snap.data() || {};
    const timeSec = Math.max(1, Math.floor((Date.now() - t0) / 1000));
    const base = 120 + (TOTAL_PAIRS * 25);
    const speed = Math.max(0, 60 - timeSec) * 2;
    const earned = base + speed;
    const newXp = Math.max(0, Math.round((user.xp || 0) + earned));
    const newStreak = (user.streak || 0) + 1;
    await updateDoc(ref, { xp: newXp, streak: newStreak });
    if (scoreEl) scoreEl.textContent = `XP: ${newXp.toLocaleString()}`;
  } catch (e) {
    console.error("[memoryMatch] awardXpAndStreak error:", e);
  }
}

function winBanner() {
  if (!board) return;
  const el = document.createElement("div");
  el.className = "win-banner";
  el.innerHTML = `<h2>All pairs found! 🎉</h2>`;
  board.insertAdjacentElement("beforebegin", el);
}

// --------- Game flow ---------
async function onClick(idx, el) {
  const c = deck[idx];
  if (!c || c.done || c.flipped) return;

  sfx.click.play().catch(()=>{});
  c.flipped = true;
  el.classList.add("flipped");
  open.push(idx);

  // Update streak bar to indicate progress toward next pair
  streakSet(matchedPairs + (open.length === 2 ? 1 : 0), TOTAL_PAIRS);

  if (open.length === 2) {
    board.style.pointerEvents = "none";
    await sleep(420);
    const [a, b] = open;
    const ca = deck[a], cb = deck[b];
    if (ca.emoji === cb.emoji) {
      // match
      ca.done = cb.done = true;
      matchedPairs++;
      correctStreak++;
      sfx.right.currentTime = 0; sfx.right.play().catch(()=>{});
      setPipState("#hudPips", matchedPairs, "good");
      if (proUser) streakPulseGold("#streakFill");
      // Redemption: 3 in a row removes one miss bead
      if (correctStreak >= 3 && missCount > 0) {
        missCount--;
        removeOneWrongPip("#hudMiss");
        streakRedeem("#streakFill");
      }
      if (matchedPairs === TOTAL_PAIRS) {
        stopTimer();
        sfx.levelup.play().catch(()=>{});
        winBanner();
        const db = await firestoreDb();
        const auth = await firebaseAuth();
        await awardXpAndStreak(db, auth.currentUser?.uid || null);
      }
    } else {
      // mismatch
      correctStreak = 0;
      missCount++;
      addWrongPip("#hudMiss");
      sfx.wrong.currentTime = 0; sfx.wrong.play().catch(()=>{});
      streakPulseError("#streakFill");
      ca.flipped = cb.flipped = false;
      board.querySelector(`.mm-card[data-i="${a}"]`)?.classList.remove("flipped");
      board.querySelector(`.mm-card[data-i="${b}"]`)?.classList.remove("flipped");
    }
    open = [];
    board.style.pointerEvents = "";
  }
}

function setup(resetHud = false) {
  const items = shuffle([...EMOJI_POOL]).slice(0, TOTAL_PAIRS);
  deck = shuffle([...items, ...items]).map((emoji, i) => ({
    id: i, emoji, flipped: false, done: false
  }));
  open.length = 0;
  matchedPairs = 0;
  correctStreak = 0;
  missCount = 0;

  if (resetHud) {
    createPips("#hudPips", TOTAL_PAIRS, { size: "lg" });
    createPips("#hudMiss", 10, { size: "sm", inactive: true });
    streakSet(0, TOTAL_PAIRS); // streak bar mapped to pairs
  }

  render();
}

async function bootstrap() {
  // HUD mounts
  const auth = await firebaseAuth();
  const user = await whenAuthReady();
  await mountAvatarBadge("#hudUser", { size: 56, uid: user?.uid || null });
  mountStreakBar("#streakFill");
  createPips("#hudPips", TOTAL_PAIRS, { size: "lg" });
  createPips("#hudMiss", 10, { size: "sm", inactive: true });

  // Pro flag
  proUser = user?.uid ? await isPro(user.uid) : false;

  // Initial score fetch
  const db = await firestoreDb();
  await scoreSync(db, user?.uid || null);

  // Start
  setup();
  startTimer();

  // Restart
  if (restart) {
    restart.addEventListener("click", () => {
      sfx.click.play().catch(()=>{});
      setup(true);
      stopTimer();
      startTimer();
    });
  }
}

// Kick off
bootstrap().catch((e) => console.error("[memoryMatch] bootstrap error:", e));
