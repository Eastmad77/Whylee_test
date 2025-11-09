// /scripts/components/avatarBadge.js — v9012
// Renders a small avatar pill with ring/badge; live updates via onSnapshot.

import { auth, db, doc, onSnapshot } from "/scripts/firebase-bridge.mjs?v=9012";

export async function mountAvatarBadge(target, opts = {}) {
  const root = typeof target === "string" ? document.querySelector(target) : target;
  if (!root) return;

  const size = opts.size ?? 56;
  const uid  = opts.uid ?? auth?.currentUser?.uid ?? null;

  root.innerHTML = `
    <div class="avatar-badge"
         style="width:${size}px;height:${size}px;border-radius:12px;overflow:hidden;
                background:rgba(255,255,255,.06);display:grid;place-items:center">
      <img id="avaImg" alt="avatar"
           style="width:100%;height:100%;object-fit:cover;display:block"/>
    </div>
  `;

  const img = root.querySelector("#avaImg");
  const fallback = "/media/avatars/profile-default.svg";
  img.src = fallback;

  if (!uid || !db) return;

  let unsub;
  try {
    const ref = doc(db, "users", uid);
    unsub = onSnapshot(ref, (snap) => {
      const d = snap.data() || {};
      img.src = d.avatarSrc || d.avatarUrl || d.avatar || fallback;
    }, (err) => {
      console.warn("[avatarBadge] snapshot error:", err?.message || err);
      img.src = fallback;
    });
  } catch (e) {
    console.warn("[avatarBadge] init failed:", e?.message || e);
  }

  // Optional: detach on node removal
  const obs = new MutationObserver(() => {
    if (!document.body.contains(root)) {
      try { unsub?.(); } catch {}
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}
