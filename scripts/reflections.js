// /scripts/reflections.js — v9012 (CSP-safe, a11y, optional cloud sync)

// Optional imports: will be used only if available
let firebaseAuth, firestoreDb, addDoc, collection, serverTimestamp;
try {
  const bridge = await import("/scripts/firebase-bridge.mjs?v=9012");
  firebaseAuth = bridge.firebaseAuth;
  firestoreDb  = bridge.firestoreDb;

  // Firestore helpers from gstatic (allowed by CSP connect/script-src)
  const fs = await import("https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js");
  addDoc           = fs.addDoc;
  collection       = fs.collection;
  serverTimestamp  = fs.serverTimestamp;
} catch {
  // Offline or library not present — local-only mode will still work
}

const LS_KEY = "wl_reflections";

function getAllLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}

function saveAllLocal(arr) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); }
  catch {}
}

function preventScroll(on) {
  if (on) {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  } else {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }
}

export const Reflections = (() => {
  let openOverlay = null;
  let lastFocused = null;

  async function showCard({ question = "What surprised you today?" } = {}) {
    // prevent multiple overlays
    if (openOverlay) return;
    lastFocused = document.activeElement;

    const overlay = document.createElement("div");
    overlay.className = "overlay-poster";
    Object.assign(overlay.style, {
      position: "fixed", inset: 0, zIndex: 9999,
      display: "grid", placeItems: "center",
      background: "rgba(0,0,0,.6)"
    });

    // Dialog shell
    const card = document.createElement("div");
    card.className = "reflection-card";
    Object.assign(card.style, {
      background: "#0c1a26",
      padding: "20px",
      borderRadius: "16px",
      maxWidth: "520px",
      width: "92vw",
      color: "#eaf2ff",
      boxShadow: "0 12px 48px rgba(0,0,0,.5)"
    });
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-labelledby", "wl-ref-title");
    card.setAttribute("aria-describedby", "wl-ref-q");

    const h3 = document.createElement("h3");
    h3.id = "wl-ref-title";
    h3.style.margin = "0 0 8px";
    h3.textContent = "Daily Reflection";

    const p = document.createElement("p");
    p.id = "wl-ref-q";
    p.className = "muted";
    p.style.margin = "0 0 12px";
    p.textContent = question; // XSS-safe

    const ta = document.createElement("textarea");
    ta.id = "wl-ref-input";
    ta.rows = 4;
    Object.assign(ta.style, {
      width: "100%",
      background: "#0a131c",
      border: "1px solid rgba(255,255,255,.08)",
      color: "#fff",
      borderRadius: "8px",
      padding: "10px"
    });

    const btnRow = document.createElement("div");
    Object.assign(btnRow.style, {
      display: "flex", gap: "8px",
      justifyContent: "flex-end",
      marginTop: "12px"
    });

    const btnSkip = document.createElement("button");
    btnSkip.id = "wl-ref-skip";
    btnSkip.className = "secondary";
    btnSkip.type = "button";
    btnSkip.textContent = "Skip";

    const btnSave = document.createElement("button");
    btnSave.id = "wl-ref-save";
    btnSave.className = "primary";
    btnSave.type = "button";
    btnSave.textContent = "Save";

    btnRow.append(btnSkip, btnSave);
    card.append(h3, p, ta, btnRow);
    overlay.append(card);
    document.body.append(overlay);

    openOverlay = overlay;
    preventScroll(true);
    ta.focus();

    const close = () => {
      if (!openOverlay) return;
      openOverlay.remove();
      openOverlay = null;
      preventScroll(false);
      if (lastFocused?.focus) lastFocused.focus();
    };

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    });

    btnSkip.addEventListener("click", close);

    btnSave.addEventListener("click", async () => {
      const text = (ta.value || "").trim();
      if (text) {
        const entry = { date: new Date().toISOString(), text };
        // Persist local
        const all = getAllLocal();
        all.unshift(entry);
        saveAllLocal(all);

        // Best-effort cloud sync for signed-in users
        try {
          if (firebaseAuth && firestoreDb && addDoc && collection) {
            const auth = await firebaseAuth();
            const user = auth.currentUser;
            if (user) {
              const db = await firestoreDb();
              await addDoc(
                collection(db, "users", user.uid, "reflections"),
                { text, createdAt: serverTimestamp ? serverTimestamp() : new Date() }
              );
            }
          }
        } catch (e) {
          // Non-fatal; keep silent or console.info if you prefer
          console.info("[reflections] cloud sync skipped:", e?.message || e);
        }
      }
      close();
      dispatchEvent(new CustomEvent("wl:reflection-saved"));
    });
  }

  function listLocal() {
    return getAllLocal();
  }

  return { showCard, listLocal };
})();

// Optional global for easy access
window.WhyleeReflections = Reflections;
