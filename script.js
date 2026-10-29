// ---------- Configuration ----------
const CONFIG = {
  // Google Sheet publié en CSV (un lien par onglet)
  MENU_URL:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdBIndNbtI5v_5GUjUDZ9DsKRSi5iowtjtqTE9qC5gETAhvFUYP-ud4DeZvMetFTcbknUbI7zb1L-c/pub?gid=0&single=true&output=csv",
  NOUVEAU_URL:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdBIndNbtI5v_5GUjUDZ9DsKRSi5iowtjtqTE9qC5gETAhvFUYP-ud4DeZvMetFTcbknUbI7zb1L-c/pub?gid=1513644124&single=true&output=csv",
  // Dossier des photos
  IMAGES: "images/",
  // Boutons Appeler / WhatsApp
  TEL: "09 80 46 99 38",
  WHATSAPP: "06 17 90 42 89",
  WHATSAPP_MESSAGE: "Bonjour, je voudrais commander : ",

  // Horaires ("fermé" ou vide = fermé)
  HORAIRES: {
    lundi: "11:30-14:00, 18:00-21:30",
    mardi: "11:30-14:00, 18:00-21:30",
    mercredi: "11:30-14:00, 18:00-21:30",
    jeudi: "11:30-14:00, 18:00-21:30",
    vendredi: "11:30-14:00, 18:00-21:30",
    samedi: "11:30-14:00, 18:00-21:30",
    dimanche: "11:30-14:00, 18:00-21:30",
  },
  // Jours particuliers : la date l'emporte sur le jour de la semaine, le texte après "|" s'affiche à côté
  EXCEPTIONS: {
    "2026-11-01": "18:00-21:00 | Toussaint",
  },
  // Optionnel : onglet "horaires" du Sheet (colonnes jour / horaires), remplace les valeurs ci-dessus
  HORAIRES_URL: "",
  TIMEZONE: "Europe/Paris",
  BIENTOT: 30, // minutes avant l'ouverture pour afficher "Ouvre bientôt"
};

// ---------- Outils ----------
const $ = (id) => document.getElementById(id);

const isTrue = (v) =>
  ["true", "vrai", "1", "oui", "x"].includes(String(v).trim().toLowerCase());

// "Catégorie " -> "categorie"
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

// Parser CSV (guillemets et virgules dans les cellules)
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

// Photo si elle existe, sinon un emoji
function fillImage(box, file, alt, fallback = "🥙") {
  box.textContent = fallback;
  if (!file) return;
  const img = new Image();
  img.alt = alt;
  img.onload = () => box.replaceChildren(img);
  img.onerror = () => console.warn("Image introuvable :", img.src);
  img.src = /^https?:/.test(file) ? file : CONFIG.IMAGES + file;
}

// ---------- Menu ----------
function renderItem(r) {
  const available = isTrue(r.disponible);

  const li = document.createElement("li");
  li.className =
    "item" + (available ? "" : " off") + (r.isOffer ? " offer" : "");

  const name = document.createElement("span");
  name.textContent = r.nom;
  const price = document.createElement("span");
  price.className = "price";
  appendPrice(price, r);
  const row = document.createElement("div");
  row.className = "row";
  row.append(name, price);

  const info = document.createElement("div");
  info.className = "info";
  info.append(row);

  if (r.isOffer) {
    const tag = document.createElement("p");
    tag.className = "offer-tag";
    tag.textContent = r.badge;
    info.prepend(tag);
  }
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

function renderMenu(rows, offers = []) {
  const root = $("menu-content");
  root.replaceChildren();

  // Plats par catégorie, dans l'ordre de la feuille
  const cats = new Map();
  for (const r of rows) {
    if (!r.nom) continue;
    const c = r.categorie || "Autres";
    if (!cats.has(c)) cats.set(c, []);
    cats.get(c).push(r);
  }
  if (!cats.size && !offers.length) {
    root.innerHTML = '<p class="state">Le menu arrive bientôt.</p>';
    return;
  }

  const navItems = [];
  let n = 0;
  const addSection = (title, items, extraClass = "") => {
    const section = document.createElement("section");
    section.className = "cat" + extraClass;
    section.id = "cat-" + n++;
    const h = document.createElement("h3");
    h.textContent = title;
    const list = document.createElement("ul");
    list.className = "items";
    list.append(...items.map(renderItem));
    section.append(h, list);
    root.append(section);
  };

  // Offres en tête de carte
  if (offers.length) {
    const head = offersHeading(offers);
    addSection(
      head.title,
      offers.map((o) => ({ ...o, disponible: "VRAI" })),
      " offers",
    );
    navItems.push({ label: head.nav, hot: true });
  }
  for (const [cat, items] of cats) {
    addSection(cat, items);
    navItems.push({ label: cat });
  }
  renderCategoryNav(navItems);
}

function showMenuError(err) {
  $("menu-content").innerHTML =
    '<p class="state">Impossible de charger le menu pour le moment. Réessayez dans un instant.</p>';
  console.error(err);
}

// ---------- Navigation par catégories ----------
const root = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Hauteur des barres collantes, utilisée par le CSS (scroll-padding)
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

function renderCategoryNav(items) {
  $("cat-nav")?.remove();
  if (items.length < 2) return;

  const nav = document.createElement("nav");
  nav.id = "cat-nav";
  nav.className = "catnav";
  nav.setAttribute("aria-label", "Catégories du menu");
  items.forEach((item, i) => {
    const a = document.createElement("a");
    a.href = "#cat-" + i;
    a.textContent = item.label;
    if (item.hot) a.classList.add("hot");
    nav.append(a);
  });
  document.querySelector("main").before(nav);

  bars.observe(nav);
  syncBars();
  trackActiveCategory(nav);
}

// Catégorie active selon le scroll
function trackActiveCategory(nav) {
  const links = [...nav.children];
  const sections = links.map((a) => document.querySelector(a.hash));
  let current = -1;
  let queued = false;
  let locked = false; // scroll déclenché par un clic
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

  // Au clic, le bouton s'active directement (pas de passage par les catégories intermédiaires)
  nav.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    setActive(links.indexOf(a));
    locked = true;
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(unlock, 1000); // au cas où la page ne bouge pas
  });

  addEventListener(
    "scroll",
    () => {
      if (locked) {
        // fin du scroll = 150 ms sans mouvement
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

  // L'utilisateur reprend la main
  ["wheel", "touchstart", "keydown"].forEach((ev) =>
    addEventListener(ev, unlock, { passive: true }),
  );

  update();
}

// ---------- Offres ----------
// Textes par type d'offre : badge, bouton de la barre, bouton du pop-up
const OFFER_TYPES = {
  moment: {
    badge: "Le sandwich du moment",
    nav: "Du moment",
    cta: "Voir le menu",
  },
  nouveau: { badge: "Nouveauté", nav: "Nouveauté", cta: "Voir la nouveauté" },
  promotion: { badge: "Promotion", nav: "Promo", cta: "Voir la promotion" },
  menu: {
    badge: "Menu du moment",
    nav: "Menu du moment",
    cta: "Voir le menu du moment",
  },
  offre: { badge: "Offre exceptionnelle", nav: "Offre", cta: "Voir l'offre" },
};

// "2026-11-01" ou "01/11/2026" -> "2026-11-01" ("" si illisible)
function toDateKey(value) {
  const v = String(value || "").trim();
  const fr = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
}

// Colonne "type", tolérante ; vide = sandwich du moment
function offerType(raw) {
  const n = norm(raw || "");
  if (n.includes("promo")) return "promotion";
  if (n.includes("offre")) return "offre";
  if (n.includes("nouveau")) return "nouveau";
  if (n.includes("menu")) return "menu";
  return "moment";
}

// Offres actives aujourd'hui (actif + dates debut / fin)
function activeOffers(rows) {
  const today = dayInfo(parisNow(), 0).key;
  return rows
    .filter((r) => isTrue(r.actif) && r.nom)
    .filter((r) => {
      const from = toDateKey(r.debut);
      const to = toDateKey(r.fin);
      return (!from || today >= from) && (!to || today <= to);
    })
    .map((r) => {
      const type = offerType(r.type);
      return {
        ...r,
        type,
        badge: r.badge || OFFER_TYPES[type].badge,
        isOffer: true,
      };
    });
}

// Titre de la section et libellé du bouton de la barre
function offersHeading(offers) {
  const sameType = offers.every((o) => o.type === offers[0].type);
  if (offers.length === 1)
    return { title: offers[0].badge, nav: OFFER_TYPES[offers[0].type].nav };
  if (sameType)
    return {
      title: OFFER_TYPES[offers[0].type].badge,
      nav: OFFER_TYPES[offers[0].type].nav,
    };
  return { title: "Offres du moment", nav: "Offres" };
}

// Prix, avec l'ancien prix barré si renseigné
function appendPrice(el, r) {
  const old = r.ancien_prix || r["ancien prix"];
  if (old) {
    const was = document.createElement("s");
    was.className = "was";
    was.textContent = formatPrice(old);
    el.append(was, " ");
  }
  el.append(formatPrice(r.prix));
}

// ---------- Pop-up ----------
function showPopup(offers) {
  const s = offers[0];
  if (!s) return;

  // Une fois par visite ; ?popup dans l'URL force l'affichage
  const force = new URLSearchParams(location.search).has("popup");
  try {
    if (!force && sessionStorage.getItem("popup-vu") === s.nom) return;
  } catch (e) {}

  $("popup-badge").textContent = s.badge;
  $("popup-title").textContent = s.nom;
  $("popup-desc").textContent = s.description || "";
  const price = $("popup-price");
  price.replaceChildren();
  if (s.prix) appendPrice(price, s);
  if (!s.photo)
    console.warn(
      "Pop-up : colonne « photo » vide ou absente. Colonnes lues :",
      Object.keys(s)
        .filter((k) => k !== "isOffer")
        .join(", "),
    );
  fillImage($("popup-img"), s.photo, s.nom);

  // Le bouton mène à la section d'offres (ou au menu)
  const cta = $("popup-cta");
  const section = document.querySelector(".cat.offers");
  cta.textContent = OFFER_TYPES[s.type].cta;
  cta.href = section ? "#" + section.id : "#menu";

  const dlg = $("popup");
  dlg.showModal();
  try {
    sessionStorage.setItem("popup-vu", s.nom);
  } catch (e) {}

  $("popup-close").onclick = () => dlg.close();
  cta.onclick = () => dlg.close();
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close(); // clic sur le fond
  });
}

// ---------- Boutons Appeler / WhatsApp ----------
// "06 12 34 56 78" -> "33612345678"
const toInternational = (n) => {
  const d = String(n).replace(/\D/g, "");
  return d.startsWith("0") ? "33" + d.slice(1) : d;
};

function setupContact() {
  document.querySelectorAll("[data-tel]").forEach((a) => {
    a.href = "tel:+" + toInternational(CONFIG.TEL);
  });

  const wa = toInternational(CONFIG.WHATSAPP);
  const ready = /^33[67]\d{8}$/.test(wa); // mobile français : 11 chiffres
  document.querySelectorAll("[data-wa]").forEach((a) => {
    if (ready) {
      a.href =
        "https://wa.me/" +
        wa +
        "?text=" +
        encodeURIComponent(CONFIG.WHATSAPP_MESSAGE);
    } else {
      a.removeAttribute("href"); // bouton grisé tant que le numéro est incomplet
      a.setAttribute("aria-disabled", "true");
    }
  });
  if (!ready)
    console.warn("WhatsApp : numéro à compléter dans CONFIG.WHATSAPP");
}

// ---------- Horaires et statut d'ouverture ----------
const DAYS = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];
const SCHEDULE = {
  week: { ...CONFIG.HORAIRES },
  dates: { ...CONFIG.EXCEPTIONS },
};

// Date et heure à Paris, quel que soit le fuseau du visiteur
function parisNow() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: CONFIG.TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return {
    y: +p.year,
    m: +p.month,
    d: +p.day,
    minutes: (+p.hour % 24) * 60 + +p.minute,
  };
}

// Jour "aujourd'hui + n" : date AAAA-MM-JJ et nom
function dayInfo(base, n) {
  const dt = new Date(Date.UTC(base.y, base.m - 1, base.d + n));
  return { key: dt.toISOString().slice(0, 10), name: DAYS[dt.getUTCDay()] };
}

// "11:30-14:00, 18:00-21:30 | Toussaint" -> { ranges: [[690, 840], [1080, 1290]], note: "Toussaint" }
function parseHours(value) {
  const [times, note = ""] = String(value || "")
    .split("|")
    .map((t) => t.trim());
  const ranges = [];
  for (const m of times.matchAll(
    /(\d{1,2})\s*[:h]\s*(\d{2})?\s*[-–—]\s*(\d{1,2})\s*[:h]\s*(\d{2})?/g,
  )) {
    ranges.push([+m[1] * 60 + +(m[2] || 0), +m[3] * 60 + +(m[4] || 0)]);
  }
  return { ranges: ranges.sort((a, b) => a[0] - b[0]), note };
}

const scheduleFor = (info) =>
  parseHours(SCHEDULE.dates[info.key] ?? SCHEDULE.week[info.name]);

// 1110 -> "18h30", 1080 -> "18h"
const fmtTime = (min) =>
  Math.floor(min / 60) +
  "h" +
  (min % 60 ? String(min % 60).padStart(2, "0") : "");

function getStatus() {
  const now = parisNow();

  for (const [start, end] of scheduleFor(dayInfo(now, 0)).ranges) {
    if (now.minutes >= start && now.minutes < end) {
      return {
        state: "open",
        text: "Ouvert maintenant · jusqu'à " + fmtTime(end),
      };
    }
  }

  // Prochaine ouverture (7 jours max)
  for (let i = 0; i <= 7; i++) {
    const next = scheduleFor(dayInfo(now, i)).ranges.find(
      ([start]) => i > 0 || start > now.minutes,
    );
    if (!next) continue;
    const at = fmtTime(next[0]);
    if (i === 0) {
      return next[0] - now.minutes <= CONFIG.BIENTOT
        ? { state: "soon", text: "Ouvre bientôt · à " + at }
        : { state: "closed", text: "Fermé · réouvre à " + at };
    }
    const when = i === 1 ? "demain" : dayInfo(now, i).name;
    return { state: "closed", text: "Fermé · réouvre " + when + " à " + at };
  }
  return { state: "closed", text: "Fermé" };
}

function updateStatus() {
  const el = $("status");
  if (!el) return;
  const st = getStatus();
  const dot = document.createElement("span");
  dot.className = "dot";
  dot.setAttribute("aria-hidden", "true");
  el.className = "status " + st.state;
  el.replaceChildren(dot, st.text);
}

// Semaine en cours, jours consécutifs identiques regroupés
function weekGroups(now) {
  const todayIdx =
    (new Date(Date.UTC(now.y, now.m - 1, now.d)).getUTCDay() + 6) % 7; // 0 = lundi
  const groups = [];
  for (let i = 0; i < 7; i++) {
    const info = dayInfo(now, i - todayIdx);
    const { ranges, note } = scheduleFor(info);
    const times = ranges.length
      ? ranges.map(([a, b]) => fmtTime(a) + "–" + fmtTime(b)).join(" · ")
      : "Fermé";
    const last = groups[groups.length - 1];
    if (last && last.times === times && last.note === note) {
      last.days.push(info.name);
      last.today = last.today || i === todayIdx;
    } else {
      groups.push({ days: [info.name], times, note, today: i === todayIdx });
    }
  }
  return groups;
}

function groupLabel(days) {
  const cap = (d) => d.charAt(0).toUpperCase() + d.slice(1);
  if (days.length === 7) return "Tous les jours";
  if (days.length === 1) return cap(days[0]);
  if (days.length === 2) return cap(days[0]) + " et " + days[1];
  return "Du " + days[0] + " au " + days[days.length - 1];
}

// Liste du pied de page
function renderHours() {
  const ul = $("hours");
  if (!ul) return;
  ul.replaceChildren();
  for (const g of weekGroups(parisNow())) {
    const li = document.createElement("li");
    if (g.today) li.className = "today";

    const day = document.createElement("span");
    day.className = "day";
    day.textContent = groupLabel(g.days);
    if (g.today) day.append(chip("Aujourd'hui", "tag-today"));
    if (g.note) day.append(chip(g.note, "tag-note"));

    const times = document.createElement("span");
    times.className = "times";
    times.textContent = g.times;

    li.append(day, times);
    ul.append(li);
  }
}

function chip(text, cls) {
  const el = document.createElement("small");
  el.className = "tag " + cls;
  el.textContent = text;
  return el;
}

// Horaires venant du Sheet (optionnel)
function applySheetHours(rows) {
  for (const r of rows) {
    const jour = norm(r.jour || "");
    if (!jour) continue;
    const key = toDateKey(jour) || jour; // "2026-11-01", "01/11/2026" ou "lundi"
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) SCHEDULE.dates[key] = r.horaires || "";
    else if (DAYS.includes(key)) SCHEDULE.week[key] = r.horaires || "";
  }
}

async function initHours() {
  if (CONFIG.HORAIRES_URL) {
    try {
      applySheetHours(await loadSheet(CONFIG.HORAIRES_URL));
    } catch (e) {
      console.warn(
        "Horaires : feuille inaccessible, horaires par défaut utilisés",
        e,
      );
    }
  }
  updateStatus();
  renderHours();
  setInterval(() => {
    updateStatus();
    renderHours();
  }, 60000); // rafraîchi chaque minute
}

// ---------- Démarrage ----------
// Chargement en parallèle ; le menu attend seulement les offres pour les afficher en tête
setupContact();
initHours();
const offersLoaded = loadSheet(CONFIG.NOUVEAU_URL)
  .then(activeOffers)
  .catch((e) => {
    console.error(e);
    return [];
  });
const menuRendered = loadSheet(CONFIG.MENU_URL)
  .then(async (rows) => renderMenu(rows, await offersLoaded))
  .catch(showMenuError);
Promise.all([menuRendered, offersLoaded]).then(([, offers]) =>
  showPopup(offers),
);
