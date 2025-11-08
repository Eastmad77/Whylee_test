// /scripts/components/pips.js — v9012
// Simple visual "pip rail" system for score, streak, or miss tracking.

export function createPips(target, count, opts = {}) {
  const el = resolveEl(target);
  if (!el) return;

  el.innerHTML = "";
  el.classList.add("pip-rail");
  el.setAttribute("role", "progressbar");
  el.setAttribute("aria-valuemin", "0");
  el.setAttribute("aria-valuemax", String(count));

  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    p.className = `pip ${opts.size || ""}`.trim();
    p.dataset.state = opts.inactive ? "empty" : "";
    p.setAttribute("aria-label", `pip ${i + 1}`);
    el.appendChild(p);
  }
}

export function setPipState(target, index, state) {
  const el = resolveEl(target);
  if (!el) return;
  const pips = el.querySelectorAll(".pip");
  const p = pips[Math.max(0, Math.min(index - 1, pips.length - 1))];
  if (!p) return;
  p.dataset.state = state;
  stylePip(p);
}

export function addWrongPip(target) {
  const el = resolveEl(target);
  if (!el) return;
  const p = [...el.querySelectorAll(".pip")].find(
    (x) => !x.dataset.state || x.dataset.state === "empty"
  );
  if (!p) return;
  p.dataset.state = "bad";
  stylePip(p);
}

export function removeOneWrongPip(target) {
  const el = resolveEl(target);
  if (!el) return;
  const p = [...el.querySelectorAll(".pip")].reverse().find(
    (x) => x.dataset.state === "bad"
  );
  if (!p) return;
  p.dataset.state = "empty";
  stylePip(p);
}

function stylePip(p) {
  const st = p.dataset.state || "empty";
  const baseShadow = "0 0 0 1px rgba(255,255,255,.12)";
  const styleMap = {
    good: {
      background: "linear-gradient(180deg,#34F5C6,#03C5FF)",
      boxShadow: "0 0 18px rgba(0,232,255,.45)",
    },
    bad: {
      background: "linear-gradient(180deg,#F66,#C0152B)",
      boxShadow: "0 0 14px rgba(255,64,64,.45)",
    },
    pending: {
      background: "linear-gradient(180deg,#CFF5FF,#7AE0FF)",
      boxShadow: "0 0 10px rgba(0,232,255,.25)",
    },
    empty: {
      background: "transparent",
      boxShadow: baseShadow,
    },
  };

  const s = styleMap[st] || styleMap.empty;
  p.style.background = s.background;
  p.style.boxShadow = s.boxShadow;
}

function resolveEl(target) {
  return typeof target === "string" ? document.querySelector(target) : target;
}
