import { db, auth } from "./glife-firebase.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, doc, getDoc, setDoc, addDoc, deleteDoc, getDocs, getCountFromServer, query, orderBy, limit, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { esc, bustStats } from "./shared.js";

const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};

export async function initEngage(slug, el) {
  el.innerHTML = `<section class="gl-engage">
    <button class="gl-like" id="likeBtn" type="button" aria-pressed="false"><span id="heart">♡</span> <span id="likeN">0</span> <span class="gl-like-t">Like</span></button>
    <h3 class="gl-c-head">Comments <span id="cCount"></span></h3>
    <form id="cForm" class="gl-cform" novalidate>
      <input id="cName" maxlength="60" placeholder="Your name" aria-label="Your name" required>
      <textarea id="cText" maxlength="1000" rows="3" placeholder="Write a comment…" aria-label="Comment" required></textarea>
      <input id="cHp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0">
      <button class="btn btn-primary" type="submit" id="cBtn">Post comment</button>
      <p class="gl-sub-msg" id="cMsg" role="status"></p>
    </form>
    <div id="cList"></div></section>`;

  const $ = (id) => el.querySelector("#" + id);
  const likes = collection(db, "articles", slug, "likes");
  const comments = collection(db, "articles", slug, "comments");
  const say = (t, s = "") => { $("cMsg").textContent = t; $("cMsg").dataset.state = s; };
  $("cName").value = ls.get("gl_name") || "";

  let user = null, isAdmin = false, liked = false, busy = false;
  try {
    if (auth.authStateReady) await auth.authStateReady();
    user = auth.currentUser || (await signInAnonymously(auth)).user;
    try { isAdmin = !user.isAnonymous && (await getDoc(doc(db, "admins", user.uid))).exists(); } catch {}
  } catch (err) {
    console.error("Anonymous sign-in failed (enable Anonymous in Firebase Authentication):", err?.code || err);
    say("Likes and comments are unavailable right now.", "error");
  }

  async function paintLikes() {
    try {
      $("likeN").textContent = (await getCountFromServer(likes)).data().count;
      if (user) liked = (await getDoc(doc(likes, user.uid))).exists();
      $("heart").textContent = liked ? "♥" : "♡";
      $("likeBtn").classList.toggle("on", liked);
      $("likeBtn").setAttribute("aria-pressed", liked);
    } catch (err) { console.warn("Like count failed:", err?.code || err); }
  }

  $("likeBtn").onclick = async () => {
    if (!user || busy) return;
    busy = true;
    try {
      if (liked) await deleteDoc(doc(likes, user.uid));
      else await setDoc(doc(likes, user.uid), { createdAt: serverTimestamp() });
      bustStats(slug);
      await paintLikes();
    } catch (err) { console.error(err); say("Couldn't save your like. Try again.", "error"); }
    busy = false;
  };

  async function paintComments() {
    try {
      const s = await getDocs(query(comments, orderBy("createdAt", "desc"), limit(50)));
      $("cCount").textContent = s.size ? `(${s.size})` : "";
      $("cList").innerHTML = s.docs.map((d) => {
        const c = d.data();
        const dt = c.createdAt?.toDate?.().toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" }) || "just now";
        return `<article class="gl-comment"><div class="gl-c-top"><strong>${esc(c.name)}</strong><span>${dt}</span>
          ${isAdmin ? `<button type="button" class="gl-c-del" data-id="${esc(d.id)}">Delete</button>` : ""}</div>
          <p>${esc(c.text).replace(/\n/g, "<br>")}</p></article>`;
      }).join("") || `<p class="gl-empty" style="padding:20px 0">No comments yet. Be the first.</p>`;
    } catch (err) { console.warn("Comments load failed:", err?.code || err); $("cList").innerHTML = ""; }
  }

  $("cList").onclick = async (e) => {
    const b = e.target.closest(".gl-c-del");
    if (b && confirm("Delete this comment?")) {
      try { await deleteDoc(doc(comments, b.dataset.id)); bustStats(slug); paintComments(); }
      catch (err) { console.error(err); say("Couldn't delete that comment.", "error"); }
    }
  };

  $("cForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if ($("cHp").value) return;                                   // bot trap
    if (!user) return say("Comments are unavailable right now.", "error");
    const name = $("cName").value.trim().slice(0, 60), text = $("cText").value.trim().slice(0, 1000);
    if (!name || !text) return say("Please enter your name and a comment.", "error");
    if (Date.now() - Number(ls.get("gl_last") || 0) < 20000) return say("Please wait a moment before posting again.", "error");
    $("cBtn").disabled = true; say("Posting…");
    try {
      await addDoc(comments, { name, text, uid: user.uid, createdAt: serverTimestamp() });
      ls.set("gl_name", name); ls.set("gl_last", Date.now());
      bustStats(slug);
      $("cText").value = ""; say("Comment posted. Thank you!", "success");
      paintComments();
    } catch (err) { console.error(err); say("Couldn't post your comment. Please try again.", "error"); }
    $("cBtn").disabled = false;
  });

  paintLikes(); paintComments();
}
