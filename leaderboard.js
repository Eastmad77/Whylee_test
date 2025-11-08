// /leaderboard.js — v9013 (safe, CSP-friendly, no-blank UI)

// Firestore: get DB from your bridge; get query helpers from gstatic (allowed by CSP)
import { firestoreDb } from "/scripts/firebase-bridge.mjs?v=9013";
import {
  collection, getDocs, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// ---------- Tiny DOM helpers ----------
function ensureContainer() {
  // Prefer existing elements if present
  let list = document.getElementById("lbList") || document.querySelector(".lb");
  let status = document.getElementById("lbStatus");

  // If not present, create a minimal, styled block so page never looks blank
  if (!list) {
    const wrap = document.createElement("section");
    wrap.className = "card";
    wrap.style.margin = "1rem auto";
    wrap.style.maxWidth = "720px";

    const h = document.createElement("h2");
    h.textContent = "Leaderboard";
    h.className = "h2";
    h.style.marginBottom = "0.5rem";
    wrap.appendChild(h);

    list = document.createElement("ul");
    list.id = "lbList";
    list.className = "lb";
    wrap.appendChild(list);

    status = document.createElement("div");
    status.id = "lbStatus";
    status.className = "muted";
    status.style.marginTop = "0.5rem";
    wrap.appendChild(status);

    const main = document.querySelector("main") || document.body;
    main.appendChild(wrap);
  }

  if (!status) {
    status = document.createElement("div");
    status.id = "lbStatus";
    status.className = "muted";
    status.style.marginTop = "0.5rem";
    list.insertAdjacentElement("afterend", status);
  }

  return { list, status };
}

// Safer row rendering (no innerHTML for untrusted data)
function renderRowsDOM(listEl, rows) {
  listEl.replaceChildren();
  rows.forEach((r, idx) => {
    const rank = idx + 1;
    const name = r.displayName || r.name || (r.uid && r.uid.slice ? r.uid.slice(0, 6) : "Player");
    const xp = (r.xp ?? r.score ?? 0);

    // Restrict avatar to known-safe default if it doesn't look like a same-origin path
    let ava = r.avatarUrl || r.avatar || "/media/avatars/fox-default.png";
    if (typeof ava !== "string" || !ava.startsWith("/")) {
      ava = "/media/avatars/fox-default.png";
    }

    const li = document.createElement("li");
    li.className = "lb-row";

    const rankDiv = document.createElement("div");
    rankDiv.textContent = `#${rank}`;

    const mid = document.createElement("div");
    mid.className = "flex";
    mid.style.gap = "10px";
    mid.style.alignItems = "center";

    const img = document.createElement("img");
    img.className = "lb-ava";
    img.src = ava;
    img.alt = "";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";

    const span = document.createElement("span");
    span.className = "lb-name";
    span.textContent = String(name);

    mid.append(img, span);

    const xpDiv = document.createElement("div");
    xpDiv.className = "lb-xp";
    xpDiv.textContent = `${Number(xp).toLocaleString()} XP`;

    li.append(rankDiv, mid, xpDiv);
    listEl.appendChild(li);
  });
}

// ---------- Main ----------
async function loadLeaderboard() {
  const { list, status } = ensureContainer();
  status.textContent = "Loading…";

  try {
    const db = await firestoreDb();
    if (!db) {
      status.textContent = "Leaderboard is unavailable (no database).";
      return;
    }

    let rows = [];

    // Attempt 1: /leaderboard ordered by xp desc
    try {
      const q1 = query(collection(db, "leaderboard"), orderBy("xp", "desc"), limit(50));
      const snap1 = await getDocs(q1);
      if (!snap1.empty) {
        rows = snap1.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch {
      /* ignore; try fallback */
    }

    // Attempt 2: /users ordered by xp desc (if no dedicated leaderboard)
    if (rows.length === 0) {
      const q2 = query(collection(db, "users"), orderBy("xp", "desc"), limit(50));
      const snap2 = await getDocs(q2);
      rows = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    if (rows.length === 0) {
      list.innerHTML = "";
      status.textContent = "No entries yet. Play a round to be the first!";
      return;
    }

    renderRowsDOM(list, rows);
    status.textContent = "";
  } catch (err) {
    console.warn("[leaderboard] load failed:", err);
    const { list, status } = ensureContainer();
    list.innerHTML = "";
    const msg = String(err?.message || err);
    if (msg.includes("Missing or insufficient permissions")) {
      status.textContent = "Leaderboard is temporarily unavailable (permissions). Please sign in or try again later.";
    } else {
      status.textContent = "Couldn't load leaderboard. Please refresh.";
    }
  }
}

// Run after DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadLeaderboard, { once: true });
} else {
  loadLeaderboard();
}
