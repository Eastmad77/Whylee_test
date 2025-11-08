// /scripts/signin.js — v9013
// Google sign-in with popup + redirect fallback, aligned to firebase-bridge.mjs

(async () => {
  // Prefer the central bridge so config & order are correct site-wide
  let app, db;
  try {
    const bridge = await import("/scripts/firebase-bridge.mjs?v=9013");
    if (!bridge?.app || !bridge?.firestoreDb) throw new Error("bridge missing");
    app = bridge.app;
    db  = await bridge.firestoreDb();
  } catch (e) {
    console.warn("[signin] firebase-bridge not available:", e);
    return; // Nothing else to do safely
  }

  // Auth SDK (dynamic, CSP-safe: allowed gstatic domain)
  const {
    getAuth, GoogleAuthProvider,
    signInWithPopup, signInWithRedirect, getRedirectResult
  } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js");

  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  // Handle redirect result if we’re coming back from a redirect flow
  try {
    const redir = await getRedirectResult(auth);
    if (redir?.user) {
      await postSignIn(redir.user);
    }
  } catch (e) {
    console.warn("[signin] redirect result error:", e);
  }

  async function writeProfile(user) {
    if (!db) return;
    try {
      const {
        doc, setDoc, serverTimestamp
      } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: user.displayName || "Player",
          avatar: user.photoURL || "",
          email: user.email || "",
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch (e) {
      console.warn("[signin] write profile failed:", e);
    }
  }

  function saveLocal(user) {
    try {
      localStorage.setItem("wl_username", user.displayName || "Player");
      if (user.photoURL) localStorage.setItem("wl_avatar", user.photoURL);
    } catch {}
  }

  async function postSignIn(user) {
    saveLocal(user);
    await writeProfile(user);
    location.href = "/profile.html";
  }

  const btn = document.getElementById("google-login");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      // Try popup first
      const res = await signInWithPopup(auth, provider);
      if (res?.user) await postSignIn(res.user);
    } catch (e) {
      // Fallback to redirect for Safari/iOS or blocked popups
      console.info("[signin] popup failed, trying redirect:", e?.message || e);
      try {
        await signInWithRedirect(auth, provider);
        // The page will navigate away; result handled above on return
      } catch (e2) {
        console.error("[signin] redirect failed:", e2);
        alert("Sign-in failed. Please try again.");
      }
    } finally {
      btn.disabled = false;
    }
  });
})();
