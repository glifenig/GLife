import { db } from "./glife-firebase.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const css = document.createElement("style");
css.textContent = `.gl-sub-msg{margin:.5rem 0 0;font-size:.9rem;min-height:1.2em}
.gl-sub-msg[data-state=success]{color:#22c55e}.gl-sub-msg[data-state=error]{color:#ef4444}
[data-glife-subscribe] button:disabled{opacity:.7;cursor:wait}`;
document.head.appendChild(css);

document.addEventListener("submit", async (e) => {
  const form = e.target.closest?.("[data-glife-subscribe]");
  if (!form) return;                        // Contact form is never touched
  e.preventDefault(); e.stopImmediatePropagation();

  const input = form.querySelector('input[type="email"]');
  const btn = form.querySelector("button");
  let msg = form.id === "subscriberForm" ? document.getElementById("subscribeMessage") : null;
  if (!msg) msg = form.querySelector(".gl-sub-msg");
  if (!msg) { msg = document.createElement("p"); form.appendChild(msg); msg.setAttribute("role", "status"); }
  msg.classList.add("gl-sub-msg");
  const show = (t, s) => { msg.textContent = t; msg.dataset.state = s; };

  const email = input.value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@\/]+@[^\s@\/]+\.[^\s@\/]{2,}$/.test(email))
    return show("Please enter a valid email address.", "error");

  const label = btn.textContent;
  btn.disabled = true; btn.textContent = "Subscribing…"; show("", "");
  try {
    await setDoc(doc(db, "subscribers", email), { email, status: "active", subscribedAt: serverTimestamp() });
    show("You're subscribed. Thank you!", "success"); form.reset();
  } catch (err) {
    if (err.code === "permission-denied") show("This email is already subscribed.", "success");
    else show("Something went wrong. Please try again.", "error");
  } finally { btn.disabled = false; btn.textContent = label; }
}, true);
