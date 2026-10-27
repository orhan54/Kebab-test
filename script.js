/* ============ CONFIGURATION (la seule partie à modifier) ============ */
const CONFIG = {
  // Liens CSV publiés de Google Sheets (un par onglet)
  MENU_URL:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdBIndNbtI5v_5GUjUDZ9DsKRSi5iowtjtqTE9qC5gETAhvFUYP-ud4DeZvMetFTcbknUbI7zb1L-c/pub?gid=0&single=true&output=csv",
  NOUVEAU_URL:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdBIndNbtI5v_5GUjUDZ9DsKRSi5iowtjtqTE9qC5gETAhvFUYP-ud4DeZvMetFTcbknUbI7zb1L-c/pub?gid=1513644124&single=true&output=csv",
  // Dossier des photos (la feuille contient juste le nom du fichier)
  IMAGES: "images/",
};

/* ============ OUTILS ============ */
const $ = (id) => document.getElementById(id);

const isTrue = (v) =>
  ["true", "vrai", "1", "oui", "x"].includes(String(v).trim().toLowerCase());

// Minuscules, sans accents ni espaces : "Catégorie " devient "categorie"
const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

function formatPrice(p) {
  const n = parseFloat(
    String(p)
      .replace(",", ".")
      .replace(/[^\d.]/g, ""),
  );
  return isNaN(n) ? p : n.toFixed(2).replace(".", ",") + " €";
}

// Lecture d'un CSV (gère les guillemets et les virgules dans les textes)
function parseCSV(text) {
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [head, ...data] = rows;
  return data
    .filter((r) => r.some((v) => v.trim()))
    .map((r) =>
      Object.fromEntries(head.map((k, i) => [norm(k), (r[i] || "").trim()])),
    );
}

async function loadSheet(url) {
  if (!url) throw new Error("Lien de feuille manquant dans CONFIG");
  const res = await fetch(url);
  if (!res.ok) throw new Error("Feuille inaccessible (" + res.status + ")");
  return parseCSV(await res.text());
}

// Remplit une vignette : photo si elle existe, sinon un emoji de secours
function fillImage(box, file, alt, fallback = "🥙") {
  box.textContent = fallback;
  if (!file) return;
  const img = new Image();
  img.alt = alt;
  img.onload = () => box.replaceChildren(img);
  img.onerror = () => console.warn("Image introuvable :", img.src);
  img.src = /^https?:/.test(file) ? file : CONFIG.IMAGES + file;
}

/* ============ MENU ============ */
function renderItem(r) {
  const available = isTrue(r.disponible);

  const li = document.createElement("li");
  li.className = "item" + (available ? "" : " off");

  const name = document.createElement("span");
  name.textContent = r.nom;
  const price = document.createElement("span");
  price.className = "price";
  price.textContent = formatPrice(r.prix);
  const row = document.createElement("div");
  row.className = "row";
  row.append(name, price);

  const info = document.createElement("div");
  info.className = "info";
  info.append(row);

  if (r.description) {
    const desc = document.createElement("p");
    desc.className = "desc";
    desc.textContent = r.description;
    info.append(desc);
  }
  if (!available) {
    const soldout = document.createElement("p");
    soldout.className = "soldout";
    soldout.textContent = "Indisponible aujourd'hui";
    info.append(soldout);
  }

  const thumb = document.createElement("div");
  thumb.className = "thumb";
  fillImage(thumb, r.photo, r.nom);

  li.append(thumb, info);
  return li;
}

function renderMenu(rows) {
  const root = $("menu-content");
  root.replaceChildren();

  // Regroupe les plats par catégorie (dans l'ordre de la feuille)
  const cats = new Map();
  for (const r of rows) {
    if (!r.nom) continue;
    const c = r.categorie || "Autres";
    if (!cats.has(c)) cats.set(c, []);
    cats.get(c).push(r);
  }
  if (!cats.size) {
    root.innerHTML = '<p class="state">Le menu arrive bientôt.</p>';
    return;
  }

  let n = 0;
  for (const [cat, items] of cats) {
    const section = document.createElement("section");
    section.className = "cat";
    section.id = "cat-" + n++;
    const title = document.createElement("h3");
    title.textContent = cat;
    const list = document.createElement("ul");
    list.className = "items";
    list.append(...items.map(renderItem));
    section.append(title, list);
    root.append(section);
  }
  renderCategoryNav([...cats.keys()]);
}

function showMenuError(err) {
  $("menu-content").innerHTML =
    '<p class="state">Impossible de charger le menu pour le moment. Réessayez dans un instant.</p>';
  console.error(err);
}

/* ============ NAVIGATION PAR CATÉGORIES ============ */
const root = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Mesure la hauteur des barres collantes pour que le défilement s'arrête au bon endroit
function syncBars() {
  const nav = $("cat-nav");
  root.style.setProperty(
    "--top-h",
    document.querySelector(".top").offsetHeight + "px",
  );
  root.style.setProperty("--nav-h", (nav ? nav.offsetHeight : 0) + "px");
}
const bars = new ResizeObserver(syncBars);
bars.observe(document.querySelector(".top"));

function renderCategoryNav(names) {
  $("cat-nav")?.remove();
  if (names.length < 2) return; // une seule catégorie : inutile

  const nav = document.createElement("nav");
  nav.id = "cat-nav";
  nav.className = "catnav";
  nav.setAttribute("aria-label", "Catégories du menu");
  names.forEach((name, i) => {
    const a = document.createElement("a");
    a.href = "#cat-" + i;
    a.textContent = name;
    nav.append(a);
  });
  document.querySelector("main").before(nav);

  bars.observe(nav);
  syncBars();
  trackActiveCategory(nav);
}

// Met en surbrillance la catégorie visible et garde son bouton centré dans la barre
function trackActiveCategory(nav) {
  const links = [...nav.children];
  const sections = links.map((a) => document.querySelector(a.hash));
  let current = -1;
  let queued = false;
  let locked = false; // vrai pendant le défilement déclenché par un clic
  let unlockTimer;

  function setActive(idx) {
    if (idx === current) return;
    current = idx;
    links.forEach((a, i) => {
      a.classList.toggle("on", i === idx);
      if (i === idx) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    if (idx >= 0) {
      const a = links[idx];
      nav.scrollTo({
        left: a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }
  }

  function update() {
    queued = false;
    const line =
      parseFloat(getComputedStyle(root).getPropertyValue("--top-h")) +
      nav.offsetHeight +
      24;
    let idx = -1;
    sections.forEach((s, i) => {
      if (s.getBoundingClientRect().top <= line) idx = i;
    });
    setActive(idx);
  }

  const unlock = () => {
    locked = false;
    clearTimeout(unlockTimer);
  };

  // Clic sur un bouton : il s'allume tout de suite, sans passer par les catégories du milieu
  nav.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    setActive(links.indexOf(a));
    locked = true;
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(unlock, 1000); // sécurité si la page ne bouge pas
  });

  addEventListener(
    "scroll",
    () => {
      if (locked) {
        // on attend la fin du défilement (150 ms sans mouvement), puis on reprend le suivi
        clearTimeout(unlockTimer);
        unlockTimer = setTimeout(unlock, 150);
        return;
      }
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );

  // Si la personne reprend la main pendant le défilement, le suivi reprend aussitôt
  ["wheel", "touchstart", "keydown"].forEach((ev) =>
    addEventListener(ev, unlock, { passive: true }),
  );

  update();
}

/* ============ POP-UP NOUVEAU SANDWICH ============ */
function showPopup(rows) {
  const s = rows.find((r) => isTrue(r.actif) && r.nom);
  if (!s) return;

  // Une seule fois par visite (ajouter ?popup à l'adresse force l'affichage, pratique pour tester)
  const force = new URLSearchParams(location.search).has("popup");
  try {
    if (!force && sessionStorage.getItem("popup-vu") === s.nom) return;
  } catch (e) {}

  $("popup-title").textContent = s.nom;
  $("popup-desc").textContent = s.description || "";
  $("popup-price").textContent = s.prix ? formatPrice(s.prix) : "";
  fillImage($("popup-img"), s.photo, s.nom);

  const dlg = $("popup");
  dlg.showModal();
  try {
    sessionStorage.setItem("popup-vu", s.nom);
  } catch (e) {}

  $("popup-close").onclick = () => dlg.close();
  $("popup-cta").onclick = () => dlg.close(); // le lien #menu fait défiler la page
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close(); // clic hors de la fenêtre
  });
}

/* ============ DÉMARRAGE ============ */
// Les deux feuilles se chargent en parallèle, indépendamment l'une de l'autre
loadSheet(CONFIG.MENU_URL).then(renderMenu).catch(showMenuError);
loadSheet(CONFIG.NOUVEAU_URL).then(showPopup).catch(console.error);
