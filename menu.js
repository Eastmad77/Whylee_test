// /scripts/menu.js — v
import { isPro } from "/scripts/entitlements.js?v=";
import { auth, onAuthStateChanged } from "/scripts/firebase-bridge.js?v=";

const proBadge = document.getElementById("menuProBadge");

onAuthStateChanged(auth, async (user) => {
  if (!proBadge) return;
  if (!user) { proBadge.hidden = true; return; }
  const pro = await isPro(user.uid);
  proBadge.hidden = !pro;
});
