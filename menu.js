// /scripts/menu.js — v9010
import { isPro } from "/scripts/entitlements.js?v=9010";
import { auth, onAuthStateChanged } from "/scripts/firebase-bridge.js?v=9010";

const proBadge = document.getElementById("menuProBadge");

onAuthStateChanged(auth, async (user) => {
  if (!proBadge) return;
  if (!user) { proBadge.hidden = true; return; }
  const pro = await isPro(user.uid);
  proBadge.hidden = !pro;
});
