import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// PASTE the same firebaseConfig your Contact form already uses
const firebaseConfig = {
 apiKey: "AIzaSyArfO8OE8ShpaqicjUeA_-k3Y34xVAXJqo",
  authDomain: "glife-website.firebaseapp.com",
  projectId: "glife-website",
  storageBucket: "glife-website.firebasestorage.app",
  messagingSenderId: "1067312781013",
  appId: "1:1067312781013:web:909e87728ce47081a8345c",
  measurementId: "G-69QZT3FES4"
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
