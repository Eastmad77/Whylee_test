// /scripts/milestones.js — v9010
// Determines unlocks (skins, badges, boosts) from user stats.
// Pure evaluation + optional Firestore persistence.

import { db, doc, updateDoc, serverTimestamp } from "/scripts/firebase-bridge.js?v=9010";

export const MILESTONES = [
  // Avatar variants (skins)
  { id: "skin:tiger-aurora",  type: "skin",  requires: { xp: 3000, level: 12 } },
  { id: "skin:dragon-ember",  type: "skin",  requires: { streak: 14 } },
  { id: "skin:wolf-midnight", type: "skin",  requires: { streak: 7, xp: 1200 } },
  { id: "skin:bear-regal",    type: "skin",  requires: { level: 15 } },

  // Badges
  { id: "badge:streak-7",   type: "badge", requires: { streak: 7 } },
  { id: "badge:streak-30",  type: "badge", requires: { streak: 30 } },
  { id: "badge:xp-5k",      type: "badge", requires: { xp: 5000 } },

  // Boost example
  { id: "boost:pro-xp-1p",  type: "boost", requires: { pro: true, streak: 10 }, meta: { xpBonus: 0.01 } }
];

export function xpToLevel(xp = 0) {
  return Math.max(1, Math.floor(0.1 * Math.sqrt(Math.max(0, xp))) + 1);
}

export function evaluateMilestones(user) {
  const level = user.level || xpToLevel(user.xp || 0);
  const haveSkins  = new Set(user.unlockedSkins || []);
  const haveBadges = new Set(user.badges || []);
  const newly = [];
  const already = [];

  for (const m of MILESTONES) {
    if (!meets(m.requires, { ...user, level })) continue;
    if (m.type === "skin")  (haveSkins.has(m.id)  ? already : newly).push(m);
    else if (m.type === "badge") (haveBadges.has(m.id) ? already : newly).push(m);
    else newly.push(m);
  }
  return { newly, already, level };
}

function meets(req = {}, u) {
  if (req.xp     != null && (u.xp     || 0) < req.xp)     return false;
  if (req.streak != null && (u.streak || 0) < req.streak) return false;
  if (req.level  != null && (u.level  || xpToLevel(u.xp || 0)) < req.level) return false;
  if (req.pro === true && !u.pro) return false;
  return true;
}

export async function persistMilestones(uid, user, evalResult) {
  if (!uid) return;
  const ref = doc(db, "users", uid);
  const update = { updatedAt: serverTimestamp() };

  const skinIds  = evalResult.newly.filter(m => m.type === "skin").map(m => m.id);
  const badgeIds = evalResult.newly.filter(m => m.type === "badge").map(m => m.id);

  if (skinIds.length) {
    update.unlockedSkins = Array.from(new Set([...(user.unlockedSkins || []), ...skinIds]));
  }
  if (badgeIds.length) {
    update.badges = Array.from(new Set([...(user.badges || []), ...badgeIds]));
  }
  if (skinIds.length || badgeIds.length) {
    await updateDoc(ref, update);
  }
  return { wrote: !!(skinIds.length || badgeIds.length), update };
}
