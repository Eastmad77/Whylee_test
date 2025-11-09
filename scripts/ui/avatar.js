// /scripts/ui/avatar.js — v9012

export function renderAvatar(container, opts = {}) {
  if (!container) return;
  const {
    tier = "free",              // 'free' | 'pro' | 'leader'
    progress = 0,               // 0..100
    badge = null,               // '#crown-gold' or absolute path to an SVG
    size = 64,                  // px
    useSprite = true
  } = opts;

  container.classList.add("avatar-wrap");
  container.style.width  = `${size}px`;
  container.style.height = `${size}px`;
  container.dataset.tier = tier;
  container.dataset.progress = String(progress);
  container.innerHTML = "";

  const SPRITE = "/media/avatars/avatars-sprite.svg";
  const idByTier = { free: "avatar-default", pro: "avatar-pro-gold", leader: "avatar-leader" };
  const symbolId = idByTier[tier] || idByTier.free;

  if (useSprite) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "avatar-icn");
    svg.setAttribute("viewBox", "0 0 64 64");

    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    // Modern attribute
    use.setAttribute("href", `${SPRITE}#${symbolId}`);
    // Legacy xlink (fallback)
    use.setAttributeNS("http://www.w3.org/1999/xlink", "href", `${SPRITE}#${symbolId}`);

    svg.appendChild(use);
    container.appendChild(svg);
  } else {
    const img = new Image();
    img.className = "avatar-icn";
    img.width = size; img.height = size;
    img.alt = "Profile avatar";
    img.src = ({
      free:   "/media/avatars/profile-default.svg",
      pro:    "/media/avatars/profile-pro-gold.svg",
      leader: "/media/avatars/profile-leader.svg"
    })[tier] || "/media/avatars/profile-default.svg";
    container.appendChild(img);
  }

  const ring = document.createElement("div");
  ring.className = "avatar-ring";
  container.appendChild(ring);

  if (progress > 0) {
    const arc = document.createElement("div");
    arc.className = "avatar-progress";
    arc.style.setProperty("--pct", Math.max(0, Math.min(100, progress)));
    container.appendChild(arc);
  }

  const shouldBadge = tier === "leader" || !!badge;
  if (shouldBadge) {
    const crownWrap = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    crownWrap.setAttribute("class", "avatar-badge");
    crownWrap.setAttribute("viewBox", "0 0 24 24");
    const useC = document.createElementNS("http://www.w3.org/2000/svg", "use");

    let ref;
    if (typeof badge === "string" && (badge.startsWith("/") || badge.startsWith("http"))) {
      // Absolute external path (full sprite path or single SVG)
      ref = badge;
    } else if (typeof badge === "string" && badge.startsWith("#")) {
      // Symbol in our sprite
      ref = `${SPRITE}${badge}`;
    } else {
      // Default crown symbol in our sprite
      ref = `${SPRITE}#crown-gold`;
    }

    useC.setAttribute("href", ref);
    useC.setAttributeNS("http://www.w3.org/1999/xlink", "href", ref);

    crownWrap.appendChild(useC);
    container.appendChild(crownWrap);
  }
}

export function hydrateAvatars() {
  document.querySelectorAll(".avatar-wrap").forEach(el => {
    renderAvatar(el, {
      tier: el.dataset.tier || "free",
      progress: Number(el.dataset.progress || 0),
      badge: el.dataset.badge || null,
      size: Number(el.dataset.size || 64),
      useSprite: true
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".avatar-wrap")) hydrateAvatars();
});

