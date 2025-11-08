// /scripts/leaderboard.js  â€” v9010 (safe, no-blank UI)

// ðŸ”— Absolute imports so Netlify rewrites never break modules
import {
  db, collection, getDocs, query, orderBy, limit
} from "/scripts/firebase-bridge.js?v=9010";

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

function renderRows(listEl, rows) {
  listEl.innerHTML = rows.map((r, idx) => {
    const rank = idx + 1;
    const name = r.displayName || r.name || r.uid?.slice?.(0, 6) || "Player";
    const xp = (r.xp ?? r.score ?? 0);
    const ava = r.avatarUrl || r.avatar || "/media/avatars/fox-default.png";

    return `
      <li class="lb-row">
        <div>#${rank}</div>
        <div class="flex" style="gap:10px; align-items:center;">
          <img class="lb-ava" src="${ava}" alt="" />
          <span class="lb-name">${escapeHtml(name)}</span>
        </div>
        <div class="lb-xp">${xp.toLocaleString()} XP</div>
      </li>
    `;
  }).join("");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ---------- Main ----------
async function loadLeaderboard() {
  const { list, status } = ensureContainer();

  try {
    status.textContent = "Loadingâ€¦";
    // Collection can be either `leaderboard` (array docs) or `users` (with xp field)
    // Try `leaderboard` first, fall back to `users`
    let rows = [];

    // Attempt 1: /leaderboard ordered by xp desc
    try {
      const q1 = query(
        collection(db, "leaderboard"),
        orderBy("xp", "desc"),
        limit(50)
      );
      const snap1 = await getDocs(q1);
      if (!snap1.empty) {
        rows = snap1.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (_) {
      // ignore and try fallback
    }

    // Attempt 2: /users ordered by xp desc (if no dedicated leaderboard)
    if (rows.length === 0) {
      const q2 = query(
        collection(db, "users"),
        orderBy("xp", "desc"),
        limit(50)
      );
      const snap2 = await getDocs(q2);
      rows = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    if (rows.length === 0) {
      list.innerHTML = "";
      status.textContent = "No entries yet. Play a round to be the first!";
      return;
    }

    renderRows(list, rows);
    status.textContent = "";
  } catch (err) {
    // Handle Firestore permission issues & unexpected errors
    console.warn("[leaderboard] load failed:", err);
    const { list, status } = ensureContainer();
    list.innerHTML = "";
    if (String(err?.message || err).includes("Missing or insufficient permissions")) {
      status.textContent = "Leaderboard is temporarily unavailable (permissions). Please sign in or try again later.";
    } else {
      status.textContent = "Couldnâ€™t load leaderboard. Please refresh.";
    }
  }
}

// Run after DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadLeaderboard);
} else {
  loadLeaderboard();
}
