// /scripts/pro.js — v9010
import { auth, onAuthStateChanged, getIdTokenResult } from "/scripts/firebase-bridge.js?v=9010";
import { isPro } from "/scripts/entitlements.js?v=9010";

const els = {
  status: document.getElementById("proStatus"),
  cta: document.getElementById("proCta"),
};

function ui(msg) { if (els.status) els.status.textContent = msg; }

onAuthStateChanged(auth, async (user) => {
  if (!user) { ui("Sign in to see your Pro status."); return; }
  ui("Checking…");
  try {
    const claim = await getIdTokenResult(user);
    const viaClaim = !!claim?.claims?.pro;
    const viaDoc = await isPro(user.uid);
    const pro = viaClaim || viaDoc;
    ui(pro ? "You have Whylee Pro 🎉" : "Free plan");
    if (els.cta) els.cta.hidden = pro;
  } catch (e) {
    console.warn("[pro] status error", e);
    ui("Status unavailable.");
  }
});
