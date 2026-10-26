/* ============ CONFIGURATION (la seule partie à modifier) ============ */
const CONFIG = {
  // Colle ici les liens CSV publiés de Google Sheets (un par onglet).
  // Laisse vide ("") pour utiliser les données de démonstration plus bas.
  MENU_URL:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdBIndNbtI5v_5GUjUDZ9DsKRSi5iowtjtqTE9qC5gETAhvFUYP-ud4DeZvMetFTcbknUbI7zb1L-c/pub?gid=0&single=true&output=csv",
  NOUVEAU_URL:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdBIndNbtI5v_5GUjUDZ9DsKRSi5iowtjtqTE9qC5gETAhvFUYP-ud4DeZvMetFTcbknUbI7zb1L-c/pub?gid=1513644124&single=true&output=csv",
  // Dossier où sont rangées les photos (le tableau contient juste le nom du fichier)
  IMAGES: "images/",
};

/* ============ DONNÉES DE DÉMO (même format que les feuilles) ============ */
const DEMO_MENU = [
  {
    nom: "Kebab classique",
    categorie: "Sandwichs",
    prix: "8,50",
    description:
      "Viande de veau et dinde, salade, tomate, oignon, sauce au choix.",
    photo: "kebab-classique.webp",
    disponible: "VRAI",
  },
  {
    nom: "Kebab poulet",
    categorie: "Sandwichs",
    prix: "8,50",
    description: "Poulet mariné, crudités, sauce blanche.",
    photo: "kebab-poulet.webp",
    disponible: "VRAI",
  },
  {
    nom: "Dürüm",
    categorie: "Sandwichs",
    prix: "9,00",
    description: "Galette fine roulée, viande, crudités, sauce.",
    photo: "durum.webp",
    disponible: "VRAI",
  },
  {
    nom: "Assiette kebab",
    categorie: "Assiettes",
    prix: "12,50",
    description: "Viande, frites, salade, sauce.",
    photo: "assiette.webp",
    disponible: "VRAI",
  },
  {
    nom: "Assiette falafels",
    categorie: "Assiettes",
    prix: "11,50",
    description: "Falafels maison, houmous, salade.",
    photo: "falafel.webp",
    disponible: "FAUX",
  },
  {
    nom: "Menu kebab",
    categorie: "Menus",
    prix: "11,00",
    description: "Sandwich + frites + boisson.",
    photo: "menu-kebab.webp",
    disponible: "VRAI",
  },
  {
    nom: "Frites",
    categorie: "Accompagnements",
    prix: "3,00",
    description: "",
    photo: "",
    disponible: "VRAI",
  },
  {
    nom: "Baklava (2 pièces)",
    categorie: "Desserts",
    prix: "3,50",
    description: "Pistache et miel.",
    photo: "",
    disponible: "VRAI",
  },
  {
    nom: "Canette 33 cl",
    categorie: "Boissons",
    prix: "1,50",
    description: "",
    photo: "",
    disponible: "VRAI",
  },
];
const DEMO_NOUVEAU = [
  {
    actif: "VRAI",
    nom: "Le Sultan",
    description:
      "Agneau grillé, fromage fondu, oignons confits et sauce piquante maison.",
    prix: "10,50",
    photo: "sultan.webp",
  },
];

/* ============ OUTILS ============ */
const $ = (id) => document.getElementById(id);
const isTrue = (v) =>
  ["true", "vrai", "1", "oui", "x"].includes(String(v).trim().toLowerCase());
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

async function loadSheet(url, demo) {
  if (!url) return demo;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Feuille inaccessible (" + res.status + ")");
  return parseCSV(await res.text());
}

// Vignette : photo si elle existe, sinon un emoji de secours
function makeImage(file, alt, fallback = "🥙") {
  const box = document.createElement("div");
  box.textContent = fallback;
  if (file) {
    const img = new Image();
    img.alt = alt;
    img.loading = "lazy";
    img.onload = () => {
      box.textContent = "";
      box.append(img);
    };
    img.src = /^https?:/.test(file) ? file : CONFIG.IMAGES + file;
  }
  return box;
}

/* ============ MENU ============ */
function renderMenu(rows) {
  const root = $("menu-content");
  root.replaceChildren();
  const cats = new Map();
  rows.forEach((r) => {
    if (!r.nom) return;
    const c = r.categorie || "Autres";
    if (!cats.has(c)) cats.set(c, []);
    cats.get(c).push(r);
  });
  if (!cats.size) {
    root.innerHTML = '<p class="state">Le menu arrive bientôt.</p>';
    return;
  }

  cats.forEach((items, cat) => {
    const sec = document.createElement("section");
    sec.className = "cat";
    const h = document.createElement("h3");
    h.textContent = cat;
    const ul = document.createElement("ul");
    ul.className = "items";
    items.forEach((r) => {
      const ok = isTrue(r.disponible);
      const li = document.createElement("li");
      li.className = "item" + (ok ? "" : " off");
      const thumb = makeImage(r.photo, r.nom);
      thumb.className = "thumb";
      const info = document.createElement("div");
      info.className = "info";
      const row = document.createElement("div");
      row.className = "row";
      const name = document.createElement("span");
      name.textContent = r.nom;
      const price = document.createElement("span");
      price.className = "price";
      price.textContent = formatPrice(r.prix);
      row.append(name, price);
      info.append(row);
      if (r.description) {
        const d = document.createElement("p");
        d.className = "desc";
        d.textContent = r.description;
        info.append(d);
      }
      if (!ok) {
        const s = document.createElement("p");
        s.className = "soldout";
        s.textContent = "Indisponible aujourd'hui";
        info.append(s);
      }
      li.append(thumb, info);
      ul.append(li);
    });
    sec.append(h, ul);
    root.append(sec);
  });
}

/* ============ POP-UP NOUVEAU SANDWICH ============ */
function showPopup(rows) {
  const s = rows.find((r) => isTrue(r.actif) && r.nom);
  if (!s) return;
  let seen = false;
  try {
    seen = sessionStorage.getItem("popup-vu") === s.nom;
  } catch (e) {}
  if (seen) return; // déjà vu pendant cette visite

  $("popup-title").textContent = s.nom;
  $("popup-desc").textContent = s.description || "";
  $("popup-price").textContent = s.prix ? formatPrice(s.prix) : "";
  const img = makeImage(s.photo, s.nom, "🥙");
  img.className = "popup-img";
  $("popup-img").replaceWith(img);

  const dlg = $("popup");
  dlg.showModal();
  try {
    sessionStorage.setItem("popup-vu", s.nom);
  } catch (e) {}

  $("popup-close").onclick = () => dlg.close();
  $("popup-cta").onclick = () => dlg.close(); // le lien #menu fait défiler la page
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close();
  }); // clic hors de la fenêtre
}

/* ============ DÉMARRAGE ============ */
(async function init() {
  try {
    const menu = await loadSheet(CONFIG.MENU_URL, DEMO_MENU);
    renderMenu(menu);
  } catch (e) {
    $("menu-content").innerHTML =
      '<p class="state">Impossible de charger le menu pour le moment. Réessayez dans un instant.</p>';
    console.error(e);
  }
  try {
    showPopup(await loadSheet(CONFIG.NOUVEAU_URL, DEMO_NOUVEAU));
  } catch (e) {
    console.error(e);
  }
})();
