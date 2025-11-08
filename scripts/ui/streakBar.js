// /scripts/ui/streakBar.js — v9012
// Premium animated streak bar controller (Pro-ready, redemption-aware)

export function createStreakBar(opts = {}) {
  const { root = "#streakFill", pro = false, total = 10 } = opts;
  const el = resolveEl(root);
  if (!el) throw new Error("[streakBar] Root element not found.");

  let _index = 0;
  let _total = Math.max(1, total | 0);
  const wrongStack = [];

  el.classList.add("wl-streak");
  el.classList.toggle("pro", !!pro);
  if (!el.style.width) el.style.width = "0%";

  function widthFor(idx) {
    return `${Math.min(100, (idx / _total) * 100)}%`;
  }

  function animateWidth(prev, next) {
    el.style.setProperty("--wl-streak-prev", prev);
    el.style.setProperty("--wl-streak-next", next);
    el.style.width = next;
  }

  function setIndex(i) {
    const nextIdx = Math.max(0, Math.min(_total, i | 0));
    animateWidth(el.style.width || "0%", widthFor(nextIdx));
    _index = nextIdx;
    updateAria();
  }

  function setTotal(t) {
    _total = Math.max(1, t | 0);
    setIndex(_index);
  }

  function mark(correct) {
    const nextIdx = Math.min(_total, _index + 1);
    animateWidth(el.style.width || "0%", widthFor(nextIdx));
    if (!correct) wrongStack.push(nextIdx - 1);
    _index = nextIdx;
    updateAria();
  }

  function pulse(className, ms = 520) {
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), ms);
  }

  function pulseGold()   { pulse("pulse-gold"); }
  function pulseError()  { pulse("pulse-error"); }
  function redeemOne() {
    if (!wrongStack.length) return false;
    wrongStack.pop();
    pulse("redeem");
    return true;
  }

  function setProMode(flag) {
    el.classList.toggle("pro", !!flag);
  }

  function updateAria() {
    el.setAttribute("role", "progressbar");
    el.setAttribute("aria-valuemin", "0");
    el.setAttribute("aria-valuemax", String(_total));
    el.setAttribute("aria-valuenow", String(_index));
  }

  updateAria();
  return { el, setIndex, setTotal, mark, redeemOne, setProMode, pulseGold, pulseError };
}

// ---------- Back-compat helpers expected by other modules ----------

/** Mounts or reuses a streak bar on the given root (selector or element). */
export function mountStreakBar(root = "#streakFill", opts = {}) {
  return createStreakBar({ root, ...opts });
}

/** Set index (progress) on a bar. */
export function streakSet(i, total, root = "#streakFill") {
  const bar = createStreakBar({ root, total });
  bar.setIndex(i);
}

/** Gold pulse (correct). */
export function streakPulseGold(root = "#streakFill") {
  const bar = createStreakBar({ root });
  bar.pulseGold();
}

/** Error pulse (wrong). */
export function streakPulseError(root = "#streakFill") {
  const bar = createStreakBar({ root });
  bar.pulseError();
}

/** Redemption animation. */
export function streakRedeem(root = "#streakFill") {
  const bar = createStreakBar({ root });
  bar.redeemOne();
}

// ---------- utils ----------
function resolveEl(selOrEl) {
  return typeof selOrEl === "string" ? document.querySelector(selOrEl) : selOrEl;
}
