import { db, auth } from "./glife-firebase.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, limit, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slugify = (s) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
const FIELDS = ["title", "slug", "excerpt", "content", "imageUrl", "category", "tags", "author", "status", "seoTitle", "seoDescription"];
let editing = null, cache = [], subs = [];
const msg = (t, c = "") => { $("fMsg").textContent = t; $("fMsg").className = "ad-msg " + c; };

// ---- auth ----
onAuthStateChanged(auth, async (u) => {
  $("login").classList.toggle("hide", !!u); $("dash").classList.add("hide");
  if (!u) return $("login").classList.remove("hide");
  try { if (!(await getDoc(doc(db, "admins", u.uid))).exists()) throw 0; }
  catch { await signOut(auth); $("loginMsg").textContent = "This account is not authorised."; return; }
  $("dash").classList.remove("hide"); loadArticles();
});
$("loginBtn").onclick = async () => {
  $("loginMsg").textContent = "";
  try { await signInWithEmailAndPassword(auth, $("em").value.trim(), $("pw").value); }
  catch { $("loginMsg").textContent = "Invalid email or password."; }
};
$("out").onclick = () => signOut(auth);
document.querySelectorAll(".ad-tabs .gl-chip").forEach((b) => b.onclick = () => {
  document.querySelectorAll(".ad-tabs .gl-chip").forEach((x) => x.classList.toggle("on", x === b));
  ["tArt", "tSub"].forEach((t) => $(t).classList.toggle("hide", t !== b.dataset.t));
  if (b.dataset.t === "tSub") loadSubs();
});

// ---- articles ----
async function loadArticles() {
  const s = await getDocs(query(collection(db, "articles"), orderBy("createdAt", "desc"), limit(200)));
  cache = s.docs.map((d) => ({ id: d.id, ...d.data() }));
  $("rows").innerHTML = cache.map((a) => `<tr><td>${esc(a.title)}</td><td>${esc(a.status)}</td><td>
    <button data-a="edit" data-id="${esc(a.id)}">Edit</button><button data-a="tog" data-id="${esc(a.id)}">${a.status === "published" ? "Unpublish" : "Publish"}</button>
    <button data-a="del" data-id="${esc(a.id)}">Delete</button></td></tr>`).join("") || `<tr><td colspan="3">No articles yet.</td></tr>`;
}
$("rows").onclick = async (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const a = cache.find((x) => x.id === b.dataset.id); if (!a) return;
  if (b.dataset.a === "edit") {
    editing = a.id; FIELDS.forEach((f) => $(f).value = f === "tags" ? (a.tags || []).join(", ") : a[f] ?? "");
    $("slug").disabled = true; $("fTitle").textContent = "Edit article"; scrollTo({ top: 0, behavior: "smooth" });
  } else if (b.dataset.a === "tog") {
    const pub = a.status !== "published"; const patch = { status: pub ? "published" : "draft", updatedAt: serverTimestamp() };
    if (pub && !a.publishedAt) patch.publishedAt = serverTimestamp();
    await updateDoc(doc(db, "articles", a.id), patch); loadArticles();
  } else if (b.dataset.a === "del" && confirm(`Delete "${a.title}" permanently?`)) {
    await deleteDoc(doc(db, "articles", a.id)); if (editing === a.id) reset(); loadArticles();
  }
};
function reset() { editing = null; FIELDS.forEach((f) => $(f).value = ""); $("author").value = "GLife Nigeria"; $("status").value = "draft"; $("slug").disabled = false; $("fTitle").textContent = "New article"; msg(""); }
$("reset").onclick = reset;
$("title").addEventListener("input", () => { if (!editing && !$("slug").dataset.touched) $("slug").value = slugify($("title").value); });
$("slug").addEventListener("input", () => $("slug").dataset.touched = "1");

$("save").onclick = async () => {
  const g = (id) => $(id).value.trim();
  const d = {
    title: g("title").slice(0, 150), slug: editing || slugify(g("slug") || g("title")), excerpt: (g("excerpt") || g("content").replace(/[#*_`>\[\]()-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 180)).slice(0, 400),
    content: g("content").slice(0, 60000), imageUrl: g("imageUrl"), category: g("category").slice(0, 50) || "General",
    tags: [...new Set(g("tags").split(",").map((t) => t.trim().toLowerCase().slice(0, 30)).filter(Boolean))].slice(0, 10),
    author: g("author").slice(0, 80) || "GLife Nigeria", status: g("status") === "published" ? "published" : "draft",
    seoTitle: g("seoTitle").slice(0, 70), seoDescription: g("seoDescription").slice(0, 160),
  };
  if (!d.title || !d.slug || !d.content) return msg("Title, slug and content are required.", "err");
  if (d.imageUrl) { try { if (new URL(d.imageUrl).protocol !== "https:") throw 0; } catch { return msg("Image URL must be a valid https:// link.", "err"); } }
  $("save").disabled = true; msg("Saving…");
  try {
    const ref = doc(db, "articles", d.slug);
    if (editing) {
      const old = cache.find((a) => a.id === editing); const patch = { ...d, updatedAt: serverTimestamp() };
      if (d.status === "published" && !old?.publishedAt) patch.publishedAt = serverTimestamp();
      await updateDoc(ref, patch);
    } else {
      if ((await getDoc(ref)).exists()) throw new Error("dup");
      await setDoc(ref, { ...d, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...(d.status === "published" ? { publishedAt: serverTimestamp() } : {}) });
    }
    msg("Saved.", "ok"); reset(); msg("Saved.", "ok"); loadArticles();
  } catch (e) { msg(e.message === "dup" ? "That slug already exists. Choose another." : "Save failed. Check your inputs and permissions.", "err"); }
  $("save").disabled = false;
};

// ---- subscribers ----
async function loadSubs() {
  const s = await getDocs(query(collection(db, "subscribers"), orderBy("subscribedAt", "desc"), limit(5000)));
  subs = s.docs.map((d) => d.data()); $("subCount").textContent = `(${subs.length})`;
  $("subRows").innerHTML = subs.map((x) => `<tr><td>${esc(x.email)}</td><td>${esc(x.status)}</td><td>${esc(x.subscribedAt?.toDate?.().toLocaleString("en-NG") || "")}</td></tr>`).join("") || `<tr><td colspan="3">No subscribers yet.</td></tr>`;
}
$("exp").onclick = () => {
  const cell = (v) => { v = String(v ?? ""); if (/^[=+\-@]/.test(v)) v = "'" + v; return `"${v.replace(/"/g, '""')}"`; };
  const csv = "email,status,subscribedAt\n" + subs.map((x) => [x.email, x.status, x.subscribedAt?.toDate?.().toISOString() || ""].map(cell).join(",")).join("\n");
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: "glife-subscribers.csv" });
  a.click(); URL.revokeObjectURL(a.href);
};
