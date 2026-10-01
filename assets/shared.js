import { db } from "./glife-firebase.js";
import { collection, getDocs, getCountFromServer, query, where, limit }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------- small helpers ---------- */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const fmt = (t) => (t?.toDate ? t.toDate().toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" }) : "");
export const mins = (t) => Math.max(1, Math.round(String(t || "").trim().split(/\s+/).length / 200));
export const img = (u) => (/^https:\/\//.test(u || "") ? u : "");
export const plain = (t) => String(t || "").replace(/[#*_`>\[\]()-]+/g, " ").replace(/\s+/g, " ").trim();
export const blurb = (a) => a.excerpt || (plain(a.content).slice(0, 150) + "…");
export const when = (a) => a.publishedAt || a.createdAt;

/* Article links.
   CLEAN_URLS=false -> /articles.html?a=my-slug  (works on ANY host, no server rewrites needed)
   CLEAN_URLS=true  -> /articles/my-slug         (needs the Firebase Hosting rewrites to be deployed) */
export const CLEAN_URLS = false;
export const articleUrl = (id) => CLEAN_URLS ? `/articles/${encodeURIComponent(id)}` : `/articles.html?a=${encodeURIComponent(id)}`;
export const listUrl = CLEAN_URLS ? "/articles" : "/articles.html";

/* ---------- published articles (newest first) ---------- */
export async function published(extra = [], max = 100) {
  const s = await getDocs(query(collection(db, "articles"), where("status", "==", "published"), ...extra, limit(max)));
  return s.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (when(b)?.seconds || 0) - (when(a)?.seconds || 0));
}

/* ---------- like + comment counts (cheap aggregate reads, cached 5 min) ---------- */
const TTL = 5 * 60 * 1000;
const pending = new Map();
const key = (id) => "gl_stats_" + id;

function cached(id) {
  try { const v = JSON.parse(sessionStorage.getItem(key(id))); if (v && Date.now() - v.t < TTL) return v; } catch {}
  return null;
}

export function getStats(id) {
  const hit = cached(id);
  if (hit) return Promise.resolve(hit);
  if (pending.has(id)) return pending.get(id);
  const p = (async () => {
    const count = async (sub) => {
      try { return (await getCountFromServer(collection(db, "articles", id, sub))).data().count; }
      catch (err) { console.warn("Count failed for", sub, err?.code || err); return 0; }
    };
    const [likes, comments] = await Promise.all([count("likes"), count("comments")]);
    const out = { likes, comments, t: Date.now() };
    try { sessionStorage.setItem(key(id), JSON.stringify(out)); } catch {}
    pending.delete(id);
    return out;
  })();
  pending.set(id, p);
  return p;
}

export function bustStats(id) {
  pending.delete(id);
  try { sessionStorage.removeItem(key(id)); } catch {}
}

const ICON = (d) => `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const HEART = ICON('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>');
const CHAT = ICON('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>');

export const statsHtml = (id) =>
  `<span class="gl-stats" data-stats="${esc(id)}"><span class="gl-st" title="Likes">${HEART}<b data-l>0</b></span><span class="gl-st" title="Comments">${CHAT}<b data-c>0</b></span></span>`;

/* Fill every [data-stats] inside `root`; loads counts only when the card scrolls near the screen. */
export function hydrateStats(root = document) {
  const els = [...root.querySelectorAll("[data-stats]")];
  const fill = async (el) => {
    const s = await getStats(el.dataset.stats);
    const l = el.querySelector("[data-l]"), c = el.querySelector("[data-c]");
    if (l) l.textContent = s.likes;
    if (c) c.textContent = s.comments;
  };
  if (!("IntersectionObserver" in window)) { els.forEach(fill); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { io.unobserve(e.target); fill(e.target); }
  }), { rootMargin: "200px" });
  els.forEach((el) => io.observe(el));
}

/* ---------- article card (used on /articles, the homepage and related articles) ---------- */
export const card = (a, i = 0) => `<a class="gl-card" style="animation-delay:${Math.min(i, 8) * 60}ms" href="${articleUrl(a.id)}">
  <div class="gl-card-img">${img(a.imageUrl) ? `<img loading="lazy" src="${esc(img(a.imageUrl))}" alt="${esc(a.title)}" onerror="this.remove()">` : ""}</div>
  <div class="gl-card-body"><span class="gl-tag">${esc(a.category)}</span><h3>${esc(a.title)}</h3><p>${esc(blurb(a))}</p>
  <div class="gl-card-foot"><small>${fmt(when(a))} · ${mins(a.content)} min read</small>${statsHtml(a.id)}</div></div></a>`;
