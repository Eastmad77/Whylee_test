// /scripts/app.js — v9010 (feature-complete)
(() => {
  const VERSION = "9010";

  // Stamp version in footer if you have <span id="app-version">
  const vLabel = document.getElementById("app-version");
  if (vLabel) vLabel.textContent = `v${VERSION}`;

  // Online/offline body class
  function setNetClass() {
    document.body.classList.toggle("is-offline", !navigator.onLine);
  }
  addEventListener("online", setNetClass);
  addEventListener("offline", setNetClass);
  setNetClass();

  // Service Worker registration + update prompt
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register(`/service-worker.js?v=${VERSION}`, { scope: "/" })
      .catch(err => console.warn("[SW] register failed", err));

    // Optional update prompt elements
    const promptEl = document.getElementById("updatePrompt");
    const btnNow   = document.getElementById("btnUpdateNow");
    const btnLater = document.getElementById("btnUpdateLater");

    const showPrompt = () => { if (promptEl) promptEl.style.display = "block"; };
    const hidePrompt = () => { if (promptEl) promptEl.style.display = "none"; };

    // Listen for NEW_VERSION broadcast from the SW
    if ("BroadcastChannel" in window) {
      const ch = new BroadcastChannel("whylee-sw");
      ch.onmessage = (ev) => {
        if (ev?.data === "NEW_VERSION") showPrompt();
      };
    }

    if (btnNow) {
      btnNow.addEventListener("click", async () => {
        hidePrompt();
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.update()));
        } catch (e) {
          console.warn("[SW] update()", e);
        }
        // Hard reload to pick up new cache
        location.reload();
      });
    }
    if (btnLater) btnLater.addEventListener("click", hidePrompt);
  }

  // Optional PWA install prompt integration (if you expose window.WhyleeInstall)
  const btnInstall = document.getElementById("btn-install");
  if (btnInstall && window.WhyleeInstall) {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      window.WhyleeInstall.setEvent(e);
      btnInstall.hidden = false;
      btnInstall.addEventListener("click", () => window.WhyleeInstall.confirm());
    });
  }

  // Optional refresh & menu hooks
  document.getElementById("btn-refresh")?.addEventListener("click", () => location.reload());
  document.getElementById("btn-menu")?.addEventListener("click",
    () => document.body.classList.toggle("menu-open"));
})();
