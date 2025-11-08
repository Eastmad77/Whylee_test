// /scripts/onboarding.js — v9013 (CSP-safe, Firebase modular, UTF-8 clean)

import { firebaseAuth, firestoreDb } from "/scripts/firebase-bridge.mjs?v=9013";
import { isPro } from "/scripts/entitlements.js?v=9013";
import { requireSignedIn } from "/scripts/signin.js?v=9013"; // optional guard

import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// ------- Catalogs -------
export const AVATARS = [
  { id: "fox",    name: "Fox",    tier: "free", src: "/media/avatars/fox-default.png", emoji: "🦊" },
  { id: "cat",    name: "Cat",    tier: "pro",  src: "/media/avatars/cat-pro.png",     emoji: "🐱" },
  { id: "owl",    name: "Owl",    tier: "pro",  src: "/media/avatars/owl-pro.png",     emoji: "🦉" },
  { id: "panda",  name: "Panda",  tier: "pro",  src: "/media/avatars/panda-pro.png",   emoji: "🐼" },
  { id: "tiger",  name: "Tiger",  tier: "pro",  src: "/media/avatars/tiger-pro.png",   emoji: "🐯" },
  { id: "bear",   name: "Bear",   tier: "pro",  src: "/media/avatars/bear-pro.png",    emoji: "🐻" },
  { id: "dragon", name: "Dragon", tier: "pro",  src: "/media/avatars/dragon-pro.png",  emoji: "🐲" },
  { id: "wolf",   name: "Wolf",   tier: "pro",  src: "/media/avatars/wolf-pro.png",    emoji: "🐺" },
];

const EMOJIS = ["🦊","🐼","🦉","🐯","🐻","🐲","🐺","✨","⭐","🔥","🏆","💡","🎯","🌈","⚡"];

// ------- DOM -------
const qs = (sel) => document.querySelector(sel);

const steps = [qs("#step-1"), qs("#step-2"), qs("#step-3")];
const nameForm = qs("#name-form");
const displayNameEl = qs("#displayName");
const nameHelp = qs("#nameHelp");
const avatarGrid = qs("#avatarGrid");
const proInfo = qs("#proInfo");
const toStep3Btn = qs("#toStep3");
const emojiGrid = qs("#emojiGrid");

qs("#back1")?.addEventListener("click", () => go(0));
qs("#back2")?.addEventListener("click", () => go(1));
qs("#finish")?.addEventListener("click", finish);

let state = {
  uid: null,
  pro: false,
  displayName: "",
  avatarId: null,
  emoji: null,
};

// ------- Init -------
init().catch(console.error);

async function init() {
  await requireSignedIn?.(); // optional guard
  const auth = await firebaseAuth();

  const user = await new Promise((resolve) => {
    if (auth.currentUser) return resolve(auth.currentUser);
    const unsub = auth.onAuthStateChanged((u) => {
      unsub();
      resolve(u || null);
    });
  });

  if (!user) return;

  state.uid = user.uid;
  state.pro = await isPro(user.uid);

  // Populate emoji grid
  emojiGrid.innerHTML = "";
  EMOJIS.forEach((e) => {
    const div = document.createElement("div");
    div.className = "choice-emoji";
    div.textContent = e;
    div.tabIndex = 0;
    div.addEventListener("click", () => selectEmoji(e, div));
    emojiGrid.appendChild(div);
  });

  // Render avatars with gating
  renderAvatarChoices();

  // Prefill name if exists
  const db = await firestoreDb();
  const snap = await getDoc(doc(db, "users", user.uid));
  if (snap.exists()) {
    const u = snap.data();
    if (u.displayName) displayNameEl.value = u.displayName;
  }

  // Username submit
  nameForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const candidate = (displayNameEl.value || "").trim();
    const valid = validateName(candidate);
    if (!valid.ok) {
      nameHelp.textContent = valid.msg;
      return;
    }
    nameHelp.textContent = "Looks good!";
    state.displayName = candidate;
    await ensureUserDoc(candidate);
    go(1);
  });

  toStep3Btn?.addEventListener("click", () => go(2));
}

// ------- Steps -------
function go(n) {
  steps.forEach((s, i) => {
    if (!s) return;
    s.hidden = i !== n;
  });
}

function renderAvatarChoices() {
  avatarGrid.innerHTML = "";
  proInfo.textContent = state.pro
    ? "Pro unlocked — enjoy the full avatar lineup. Bonus skins arrive at milestones!"
    : "Free plan: Fox is unlocked. Pro avatars show a lock and can be previewed.";

  AVATARS.forEach((a) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "avatar-card";
    card.setAttribute("aria-label", `${a.name} avatar`);
    card.innerHTML = `
      <img class="ava-img" src="${a.src}" alt="${a.name}">
      <div class="muted" style="margin-top:6px;text-align:center">${a.name}</div>
    `;
    const locked = a.tier === "pro" && !state.pro;
    if (locked) {
      const lock = document.createElement("span");
      lock.className = "lock";
      lock.textContent = "🔒 Pro";
      card.appendChild(lock);
    }
    card.addEventListener("click", () => {
      if (locked) {
        alert("That avatar requires Whylee Pro. Start your free trial to use it.");
        return;
      }
      selectAvatar(a.id, card);
    });
    avatarGrid.appendChild(card);
  });
}

function selectAvatar(id, cardEl) {
  state.avatarId = id;
  Array.from(avatarGrid.children).forEach((c) => c.classList.remove("selected"));
  cardEl.classList.add("selected");
  toStep3Btn.disabled = false;
}

function selectEmoji(emoji, el) {
  state.emoji = emoji;
  Array.from(emojiGrid.children).forEach((c) => c.classList.remove("selected"));
  el.classList.add("selected");
}

function validateName(name) {
  if (name.length < 3 || name.length > 16) return { ok: false, msg: "Use 3–16 characters." };
  if (!/^[a-zA-Z0-9_]+$/.test(name)) return { ok: false, msg: "Letters, numbers, underscore only." };
  return { ok: true, msg: "" };
}

async function ensureUserDoc(displayName) {
  const db = await firestoreDb();
  const ref = doc(db, "users", state.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      pro: state.pro || false,
      avatarId: "fox",
      emoji: "🦊",
      unlockedSkins: [],
    });
  } else {
    await updateDoc(ref, { displayName, updatedAt: serverTimestamp() });
  }
}

async function finish() {
  const db = await firestoreDb();
  const ref = doc(db, "users", state.uid);
  const update = { updatedAt: serverTimestamp() };
  if (state.avatarId) update.avatarId = state.avatarId;
  if (state.emoji) update.emoji = state.emoji;
  await updateDoc(ref, update);
  window.location.replace("/index.html");
}
