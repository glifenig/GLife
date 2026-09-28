import { db } from "./glife-firebase.js";
import { collection, doc, getDoc, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = document.getElementById("app");
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (t) => (t?.toDate ? t.toDate().toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" }) : "");
const mins = (t) => Math.max(1, Math.round((t || "").trim().split(/\s+/).length / 200));
const img = (u) => (/^https:\/\//.test(u || "") ? u : "");

function meta(title, desc, image, url) {
  document.title = title;
  $("m-desc").content = desc; $("m-canon").href = url;
  $("og-title").content = title; $("og-desc").content = desc; $("og-img").content = image || "";
}

// Safe mini-markdown: escape FIRST, then add limited formatting.
const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
const render = (t) => esc(t).split(/\n{2,}/).map((b) => {
  if (b.startsWith("## ")) return `<h2>${b.slice(3)}</h2>`;
  if (b.startsWith("### ")) return `<h3>${b.slice(4)}</h3>`;
  if (/^(- .+(\n|$))+$/.test(b)) return `<ul>${b.split("\n").map((l) => `<li>${inline(l.slice(2))}</li>`).join("")}</ul>`;
  return `<p>${inline(b).replace(/\n/g, "<br>")}</p>`;
}).join("");

const card = (a, i = 0) => `<a class="gl-card" style="animation-delay:${Math.min(i, 8) * 60}ms" href="/articles/${encodeURIComponent(a.id)}">
  <div class="gl-card-img">${img(a.imageUrl) ? `<img loading="lazy" src="${esc(img(a.imageUrl))}" alt="${esc(a.title)}">` : ""}</div>
  <div class="gl-card-body"><span class="gl-tag">${esc(a.category)}</span><h3>${esc(a.title)}</h3><p>${esc(a.excerpt)}</p>
  <small>${fmt(a.publishedAt)} · ${mins(a.content)} min read</small></div></a>`;

const ctaForm = `<div class="gl-cta"><h3>Stay in the loop</h3><p>Get GLife Nigeria updates in your inbox.</p>
  <form data-glife-subscribe novalidate><input type="email" placeholder="you@example.com" aria-label="Email" required><button type="submit">Subscribe</button></form></div>`;

async function published(extra = []) {
  const s = await getDocs(query(collection(db, "articles"), where("status", "==", "published"), ...extra, limit(100)));
  return s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.publishedAt?.seconds || 0) - (a.publishedAt?.seconds || 0));
}

async function list() {
  app.innerHTML = `<div class="gl-wrap"><div class="gl-skel" style="margin-top:80px"></div></div>`;
  let posts;
  try { posts = await published(); }
  catch { app.innerHTML = `<div class="gl-wrap"><p class="gl-empty">We couldn't load articles right now. Please try again shortly.</p></div>`; return; }

  const cats = ["All", ...new Set(posts.map((p) => p.category).filter(Boolean))];
  const st = { q: "", cat: "All" };
  app.innerHTML = `<div class="gl-wrap">
    <section class="gl-hero"><h1>GLife Articles</h1><p>Insights, updates and practical guides from the GLife Nigeria team.</p>
    <input class="gl-search" id="q" type="search" placeholder="Search articles…" aria-label="Search articles"></section>
    <div class="gl-chips" id="chips">${cats.map((c, i) => `<button class="gl-chip${i ? "" : " on"}" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
    <div id="feat"></div><div class="gl-grid" id="grid"></div>${ctaForm}</div>`;

  const paint = () => {
    const q = st.q.toLowerCase();
    const rows = posts.filter((p) => (st.cat === "All" || p.category === st.cat) &&
      (!q || [p.title, p.excerpt, p.category, (p.tags || []).join(" ")].join(" ").toLowerCase().includes(q)));
    const showFeat = !q && st.cat === "All" && rows.length > 2;
    const f = showFeat ? rows[0] : null;
    $("feat").innerHTML = f ? `<a class="gl-feat" href="/articles/${encodeURIComponent(f.id)}"><div class="gl-card-img">${img(f.imageUrl) ? `<img src="${esc(img(f.imageUrl))}" alt="${esc(f.title)}">` : ""}</div>
      <div class="gl-card-body"><span class="gl-tag">Featured · ${esc(f.category)}</span><h2>${esc(f.title)}</h2><p>${esc(f.excerpt)}</p><small>${fmt(f.publishedAt)} · ${mins(f.content)} min read</small></div></a>` : "";
    const rest = f ? rows.slice(1) : rows;
    $("grid").innerHTML = rest.length ? rest.map(card).join("") : `<p class="gl-empty" style="grid-column:1/-1">No articles found.</p>`;
  };
  $("q").addEventListener("input", (e) => { st.q = e.target.value.trim(); paint(); });
  $("chips").addEventListener("click", (e) => {
    const b = e.target.closest(".gl-chip"); if (!b) return;
    st.cat = b.dataset.c; document.querySelectorAll(".gl-chip").forEach((x) => x.classList.toggle("on", x === b)); paint();
  });
  paint();
}

async function view(slug) {
  let a;
  try { const s = await getDoc(doc(db, "articles", slug)); if (s.exists() && s.data().status === "published") a = { id: s.id, ...s.data() }; } catch {}
  if (!a) {
    meta("Article not found | GLife Nigeria", "This article could not be found.", "", location.href);
    app.innerHTML = `<div class="gl-wrap"><p class="gl-empty">Article not found. <a href="/articles" style="text-decoration:underline">Back to articles</a></p></div>`; return;
  }
  const url = `${location.origin}/articles/${a.id}`;
  const desc = a.seoDescription || a.excerpt;
  meta(a.seoTitle || `${a.title} | GLife Nigeria`, desc, img(a.imageUrl), url);
  const ld = document.createElement("script"); ld.type = "application/ld+json";
  ld.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "Article", headline: a.title, description: desc,
    image: img(a.imageUrl) || undefined, author: { "@type": "Person", name: a.author }, mainEntityOfPage: url,
    datePublished: a.publishedAt?.toDate?.().toISOString() });
  document.head.appendChild(ld);

  app.innerHTML = `<article class="gl-art"><a href="/articles" class="gl-meta">← All articles</a>
    <div style="margin-top:18px"><span class="gl-tag">${esc(a.category)}</span></div><h1>${esc(a.title)}</h1>
    <div class="gl-meta">${esc(a.author)} · ${fmt(a.publishedAt)} · ${mins(a.content)} min read</div>
    ${img(a.imageUrl) ? `<img class="gl-cover" src="${esc(img(a.imageUrl))}" alt="${esc(a.title)}">` : ""}
    <div class="gl-body">${render(a.content)}</div>
    <div class="gl-tags">${(a.tags || []).map((t) => `<span class="gl-tag">#${esc(t)}</span>`).join("")}</div>${ctaForm}
    <div id="rel"></div></article>`;

  try {
    const rel = (await published([where("category", "==", a.category)])).filter((r) => r.id !== a.id).slice(0, 3);
    if (rel.length) $("rel").innerHTML = `<h3>Related articles</h3><div class="gl-related">${rel.map(card).join("")}</div>`;
  } catch {}
}

const m = location.pathname.replace(/\/+$/, "").match(/^\/articles\/([^/]+)$/);
m ? view(decodeURIComponent(m[1])) : list();
