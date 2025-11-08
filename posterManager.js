// /posterManager.js — alias-aware (v9012)
// Maps legacy keys like 'poster-start.jpg' to real files under /media/posters/v1/*.

(function () {
  const ALIAS = {
    "poster-start.jpg":      "/media/posters/v1/poster-01-start.jpg",
    "poster-mode.jpg":       "/media/posters/v1/poster-02-mode.jpg",
    "poster-reward.jpg":     "/media/posters/v1/poster-03-reward.jpg",
    "poster-reflection.jpg": "/media/posters/v1/poster-04-reflection.jpg",
    "poster-upgrade.jpg":    "/media/posters/v1/poster-05-upgrade.jpg",
    "poster-challenge.jpg":  "/media/posters/v1/poster-06-challenge.jpg",
    "poster-pro.jpg":        "/media/posters/v1/poster-07-pro.jpg",
    "poster-levelup.jpg":    "/media/posters/v1/poster-08-levelup.jpg",
    "poster-community.jpg":  "/media/posters/v1/poster-09-community.jpg",
    "poster-brand.jpg":      "/media/posters/v1/poster-10-brand.jpg",
    "poster-success.jpg":    "/media/posters/v1/poster-success.jpg",
    "poster-gameover.jpg":   "/media/posters/v1/poster-gameover.jpg",
    "poster-night.jpg":      "/media/posters/v1/poster-night.jpg",
    "poster-level2.jpg":     "/media/posters/v1/poster-level2.jpg",
    "poster-level3.jpg":     "/media/posters/v1/poster-level3.jpg"
  };

  function resolvePoster(src) {
    if (!src) return null;
    if (src.startsWith("/")) return src;
    if (ALIAS[src]) return ALIAS[src];
    // If already points to /media/posters/v1 keep as-is
    if (src.includes("/media/posters/")) return src;
    // Default to v1 folder
    return "/media/posters/v1/" + src;
  }

  // Patch common helpers if present
  if (window.PosterManager && typeof window.PosterManager.set === "function") {
    const origSet = window.PosterManager.set;
    window.PosterManager.set = function (el, src) {
      return origSet.call(this, el, resolvePoster(src));
    };
  }

  // Provide minimal helpers if none exist
  if (!window.PosterManager) {
    window.PosterManager = {
      url: (src) => resolvePoster(src),
      set: (el, src) => { if (el) el.src = resolvePoster(src); }
    };
  }

  // Auto-upgrade any <img data-poster="poster-start.jpg">
  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("img[data-poster]").forEach(img => {
      img.src = resolvePoster(img.getAttribute("data-poster"));
    });
  });
})();
