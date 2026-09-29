import { published, card, hydrateStats } from "./shared.js";

const SHOW = 3; // how many latest articles appear on the homepage

(async () => {
  const section = document.getElementById("articles");
  const mount = document.getElementById("home-articles");
  if (!section || !mount) return;

  try {
    const posts = (await published([], 50)).slice(0, SHOW);
    if (!posts.length) return;              // nothing published yet: the section stays hidden
    mount.innerHTML = posts.map((p, i) => card(p, i)).join("");
    section.hidden = false;
    hydrateStats(mount);
  } catch (err) {
    console.error("Homepage articles failed:", err);   // homepage stays clean if anything goes wrong
  }
})();
