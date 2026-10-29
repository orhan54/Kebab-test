# Kebab O'Delices

> **Projet de démonstration (maquette).** Ce site est un exemple de site vitrine pour un restaurant de kebab. Il n'est pas le site officiel du restaurant. Il pourra être finalisé avec le client si besoin : les données, les photos et les informations pratiques sont donc susceptibles de changer.

Site vitrine pour un restaurant de kebab : la carte, le sandwich du moment et les infos pratiques.

Le site est volontairement simple : **HTML, CSS et JavaScript**, sans framework ni outil de compilation. Les plats et les prix ne sont pas écrits dans le code : ils sont lus depuis un **Google Sheet**, ce qui permet de modifier la carte depuis un téléphone, sans toucher au code.

## Fonctionnement

1. La page se charge et le JavaScript récupère les données du Google Sheet (publié au format CSV).
2. Les plats sont regroupés par catégorie et affichés sous forme de cartes.
3. Une barre de catégories collante permet de naviguer rapidement dans la carte sur mobile.
4. Si une ligne est marquée comme active dans l'onglet « nouveau sandwich », une fenêtre « Le sandwich du moment » s'affiche, une seule fois par visite.

Les modifications faites dans le Google Sheet apparaissent sur le site en quelques minutes (le temps que Google mette à jour le CSV publié).

## Structure du projet

```
.
├── index.html     # structure de la page
├── style.css      # thème sombre, responsive du petit mobile au grand écran
├── script.js      # chargement du Google Sheet et affichage de la carte
├── images/        # photos des plats (format .webp)
└── README.md
```

## Données : Google Sheet

Un seul Google Sheet avec **deux onglets**, chacun publié sur le web au format CSV. Les liens sont à renseigner dans `script.js`, dans l'objet `CONFIG` en haut du fichier.

### Onglet « menu »

| Colonne       | Contenu                                                                        |
| ------------- | ------------------------------------------------------------------------------ |
| `nom`         | Nom du plat                                                                    |
| `categorie`   | Catégorie (Sandwichs, Assiettes, Menus…). L'ordre de la feuille est conservé   |
| `prix`        | Prix, par exemple `8,50`                                                       |
| `description` | Texte court (facultatif)                                                       |
| `photo`       | Nom du fichier dans `images/`, par exemple `kebab-classique.webp` (facultatif) |
| `disponible`  | `VRAI` ou `FAUX`. Un plat à `FAUX` est affiché comme indisponible              |

### Onglet « offres » (pop-up et section en tête de carte)

Chaque ligne active est affichée dans une section en tête de la carte, et la première ouvre aussi le pop-up d'accueil.

| Colonne        | Contenu                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `actif`        | `VRAI` pour afficher l'offre, `FAUX` pour la masquer                                                                                                    |
| `type`         | `nouveau`, `promotion`, `menu`, `offre` ou vide (sandwich du moment). Il change le badge, le titre de la section et le bouton de la barre de catégories |
| `nom`          | Nom du sandwich ou du menu                                                                                                                              |
| `description`  | Texte court, par exemple la composition d'un menu complet                                                                                               |
| `prix`         | Prix                                                                                                                                                    |
| `ancien_prix`  | Facultatif : affiché barré à côté du prix (promotion)                                                                                                   |
| `photo`        | Nom du fichier dans `images/`                                                                                                                           |
| `badge`        | Facultatif : remplace le texte du badge et le titre de la section (ex. « Offre de la semaine »)                                                         |
| `debut`, `fin` | Facultatif : période d'affichage, au format `2026-11-01` ou `01/11/2026` (jours inclus). Hors période, l'offre disparaît toute seule                    |

Les noms de colonnes ne doivent pas être renommés : le code les utilise tels quels.

## Horaires et statut d'ouverture

La pastille « Ouvert maintenant / Ouvre bientôt / Fermé » et la liste des horaires du pied de page sont calculées automatiquement, à l'heure de Paris, à partir de `CONFIG` dans `script.js` :

- `HORAIRES` : les horaires de chaque jour de la semaine (`"11:30-14:00, 18:00-21:30"`, ou `"fermé"`).
- `EXCEPTIONS` : les jours particuliers (jour férié, fermeture exceptionnelle), au format `"2026-11-01": "18:00-21:00 | Toussaint"`. La date l'emporte sur le jour de la semaine, et le texte après `|` s'affiche à côté de l'horaire.
- `BIENTOT` : nombre de minutes avant l'ouverture pendant lesquelles « Ouvre bientôt » s'affiche (30 par défaut).

Pour modifier les horaires depuis un téléphone, on peut aussi ajouter un **3e onglet** au Google Sheet, le publier en CSV et renseigner son lien dans `HORAIRES_URL`. Colonnes : `jour` (un jour de la semaine, ou une date au format `2026-11-01`) et `horaires`. Les lignes du Sheet remplacent les valeurs de `CONFIG`.

## Ajouter ou modifier un plat

1. Si le plat a une photo, déposer l'image dans le dossier `images/` (nom en minuscules, avec des tirets, sans espace ni accent) puis pousser sur GitHub.
2. Ajouter ou modifier la ligne dans le Google Sheet, avec le nom exact du fichier dans la colonne `photo`.
3. Patienter quelques minutes, puis recharger le site.

Sans photo, un emoji s'affiche à la place.

## Lancer le site en local

Ouvrir le dossier dans VS Code et lancer l'extension **Live Server** (clic droit sur `index.html`, puis « Open with Live Server »). Le site est alors disponible sur `http://127.0.0.1:5500`.

## Déploiement

Le site est hébergé avec **GitHub Pages** : chaque `git push` met le site en ligne en une à deux minutes.

## Points techniques

- Affichage fluide du petit mobile (320 px) au grand écran (2K et plus).
- Zones tactiles d'au moins 44 px, focus clavier visible, animations réduites si le système le demande.
- Le lien Google Sheet est en lecture seule : il permet d'afficher la carte, pas de la modifier. Ne jamais mettre d'informations privées dans les onglets publiés.
