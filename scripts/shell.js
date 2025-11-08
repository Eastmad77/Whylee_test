// /scripts/shell.js — v9012
(function () {
  const APP_ID = "app";

  const el = () => document.getElementById(APP_ID);

  const routes = {
    "#/home": () => `
      <section class="route route--home" role="region" aria-labelledby="home-title">
        <h2 id="home-title">Daily Challenge</h2>
        <button id="start-btn" class="primary">Start Today’s Challenge</button>
      </section>`,

    "#/tasks": () => `
      <section class="route route--tasks" role="region" aria-labelledby="tasks-title">
        <h2 id="tasks-title">Tasks</h2>
        <p class="muted">New modes arrive with Whylee Pro.</p>
      </section>`,

    "#/about": () => `
      <section class="route route--about" role="region" aria-labelledby="about-title">
        <h2 id="about-title">About Whylee</h2>
        <p class="muted">Cinematic daily brain training.</p>
      </section>`
  };

  function viewFor(hash) {
    if (routes[hash]) return routes[hash];
    // fallback to home for unknown routes
    return routes["#/home"];
  }

  function render(hash) {
    const target = el();
    if (!target) return;

    const tmpl = viewFor(hash);
    target.innerHTML = tmpl();

    // highlight active tab if present
    const tabs = document.querySelectorAll(".tabs [data-tab]");
    if (tabs.length) {
      tabs.forEach(a => {
        // prefer data-tab, fallback to href’s hash
        const val = a.getAttribute("data-tab") || (new URL(a.href, location.href)).hash;
        a.classList.toggle("active", val === hash);
      });
    }

    // bind Start button (idempotent; element was freshly replaced by innerHTML)
    const startBtn = document.getElementById("start-btn");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        if (window.WhyleeGame?.start) {
          window.WhyleeGame.start();
        } else {
          // Optional: lazy import if your build exposes a module
          console.warn("[shell] WhyleeGame.start not available.");
        }
      }, { once: true });
    }
  }

  function ensureDefaultHash() {
    if (!location.hash || !routes[location.hash]) {
      // set to home without creating an extra history entry
      history.replaceState(null, "", "#/home");
    }
  }

  function onChange() {
    ensureDefaultHash();
    render(location.hash);
  }

  window.addEventListener("hashchange", onChange);
  window.addEventListener("DOMContentLoaded", onChange);

  // Expose minimal API if needed elsewhere
  window.Shell = { render };
})();
