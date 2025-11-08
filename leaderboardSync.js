// /scripts/leaderboardSync.js — v9010
// Pushes XP & streak to the public leaderboard after gameplay.
// Writes/merges: /leaderboard/{uid} { name, avatarId, emoji, xp, streak, updatedAt }

import { db, doc, setDoc, getDoc } from "/scripts/firebase-bridge.js?v=9010";

/**
 * Syncs player stats to leaderboard after a session.
 * @param {string} uid       Current user's UID
 * @param {object} userData  { name, xp, streak, avatarId, emoji }
 */
export async function syncLeaderboard(uid, userData = {}) {
  if (!uid) {
    console.warn("[Leaderboard] sync skipped: no UID");
    return;
  }

  try {
    const {
      name = "Player",
      xp = 0,
      streak = 0,
      avatarId = "fox-default",
      emoji = "⭐"
    } = userData;

    const ref = doc(db, "leaderboard", uid);
    const snap = await getDoc(ref);
    const prev = snap.exists() ? (snap.data() || {}) : {};
    const prevXP = typeof prev.xp === "number" ? prev.xp : 0;
    const prevStreak = typeof prev.streak === "number" ? prev.streak : 0;

    // Reduce writes: only update when values change
    if (xp !== prevXP || streak !== prevStreak || avatarId !== prev.avatarId || name !== prev.name || emoji !== prev.emoji) {
      await setDoc(
        ref,
        {
          name,
          avatarId,
          emoji,
          xp,
          streak,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      console.log(`[Leaderboard] Synced ${name} (XP ${xp}, streak ${streak})`);
    } else {
      console.log("[Leaderboard] No changes; skipped write");
    }
  } catch (err) {
    console.error("[Leaderboard] Sync failed:", err);
  }
}
