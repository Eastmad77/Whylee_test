// /scripts/profile.js — v9010
import { auth, db, doc, getDoc, setDoc, onAuthStateChanged } from "/scripts/firebase-bridge.js?v=9010";
import { isPro } from "/scripts/entitlements.js?v=9010";

const AVATAR_SPEC_URL = "/media/avatars/avatars.json";
const EMOJIS = ["🦊","🦉","🐼","🐱","🐯","🐺","🐲","🐻","⭐","⚡","🔥","💫","🌟","🏆","🎯"];

const els = {
  grid:   document.getElementById("profileAvatarGrid"),
  emoji:  document.getElementById("profileEmojiGrid"),
  save:   document.getElementById("profileSaveBtn"),
  status: document.getElementById("profileSaveStatus"),
};

let state = {
  uid: null,
  isPro: false,
  current: { avatarId: "fox-default", emoji: "🦊" },
  catalogue: [],
};

function lockTag() {
  return `<span class="ava-lock" title="Whylee Pro">🔒 Pro</span>`;
}

async function fetchCatalogue() {
  const res = await fetch(AVATAR_SPEC_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${AVATAR_SPEC_URL}`);
  state.catalogue = await res.json();
}

function renderAvatars() {
  if (!els.grid) return;
  const { catalogue, current, isPro } = state;
  els.grid.innerHTML = catalogue.map(a => {
    const locked = a.pro && !isPro;
    return `
      <button class="ava-card ${current.avatarId === a.id ? "selected": ""}" data-id="${a.id}" ${locked ? 'data-locked="1"' : ""} aria-pressed="${current.avatarId===a.id}">
        <img class="ava-img" src="${a.img}" alt="${a.name}">
        <div class="ava-name">${a.name}</div>
        ${locked ? lockTag() : ""}
      </button>`;
  }).join("");
}

function renderEmojis() {
  if (!els.emoji) return;
  const { current } = state;
  els.emoji.innerHTML = EMOJIS.map(e => `
    <button class="emoji-card ${current.emoji===e ? "selected":""}" data-emoji="${e}" aria-pressed="${current.emoji===e}">
      <span>${e}</span>
    </button>`).join("");
}

function wireEvents() {
  els.grid?.addEventListener("click", (e) => {
    const btn = e.target.closest(".ava-card");
    if (!btn) return;
    if (btn.dataset.locked === "1") {
      if (els.status) els.status.textContent = "That avatar is a Whylee Pro bonus.";
      return;
    }
    state.current.avatarId = btn.dataset.id;
    renderAvatars();
    if (els.status) els.status.textContent = "";
  });

  els.emoji?.addEventListener("click", (e) => {
    const btn = e.target.closest(".emoji-card");
    if (!btn) return;
    state.current.emoji = btn.dataset.emoji;
    renderEmojis();
  });

  els.save?.addEventListener("click", saveProfile);
}

async function loadUserDoc(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const d = snap.data();
    state.current.avatarId = d.avatarId || state.current.avatarId;
    state.current.emoji = d.emoji || state.current.emoji;
  }
}

async function saveProfile() {
  if (!state.uid) return;
  if (els.save) els.save.disabled = true;
  if (els.status) els.status.textContent = "Saving…";
  const ref = doc(db, "users", state.uid);
  await setDoc(ref, {
    avatarId: state.current.avatarId,
    emoji: state.current.emoji,
    updatedAt: Date.now()
  }, { merge: true });
  if (els.save) els.save.disabled = false;
  if (els.status) {
    els.status.textContent = "Saved ✓";
    setTimeout(() => (els.status.textContent = ""), 1500);
  }
}

// Boot
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/signin.html";
    return;
  }
  state.uid = user.uid;
  await fetchCatalogue();
  await loadUserDoc(user.uid);
  state.isPro = await isPro(user.uid);
  renderAvatars();
  renderEmojis();
  wireEvents();
});
