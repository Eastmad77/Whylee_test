// /scripts/firebase-bridge.js — v9010
// One place to init Firebase + re-export modular SDK.
// Assumes /scripts/firebase-config.js set window.firebaseConfig.

if (!window.firebaseConfig) {
  throw new Error("[firebase-bridge] Missing firebaseConfig. Load /scripts/firebase-config.js?v=9010 first.");
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  getIdTokenResult,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  getFirestore,
  doc, getDoc, setDoc, updateDoc, addDoc,
  collection, getDocs, query, where, orderBy, limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  getStorage,
  ref, getDownloadURL, uploadBytes
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

// Init
export const firebaseApp = initializeApp(window.firebaseConfig);

// Instances
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

// Auth re-exports
export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  getIdTokenResult,
};

// Firestore re-exports (incl. collection!)
export {
  doc, getDoc, setDoc, updateDoc, addDoc,
  collection, getDocs, query, where, orderBy, limit,
  serverTimestamp
};

// Storage
export { ref, getDownloadURL, uploadBytes };
