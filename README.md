# Kebab O'Delice

Site vitrine du restaurant **Kebab O'Delice** (Pompey) : la carte, le sandwich du moment et les infos pratiques.

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

| Colonne | Contenu |
| --- | --- |
| `nom` | Nom du plat |
| `categorie` | Catégorie (Sandwichs, Assiettes, Menus…). L'ordre de la feuille est conservé |
| `prix` | Prix, par exemple `8,50` |
| `description` | Texte court (facultatif) |
| `photo` | Nom du fichier dans `images/`, par exemple `kebab-classique.webp` (facultatif) |
| `disponible` | `VRAI` ou `FAUX`. Un plat à `FAUX` est affiché comme indisponible |

### Onglet « nouveau sandwich »

| Colonne | Contenu |
| --- | --- |
| `actif` | `VRAI` pour afficher la fenêtre, `FAUX` pour la masquer |
| `nom` | Nom du sandwich |
| `description` | Texte court |
| `prix` | Prix |
| `photo` | Nom du fichier dans `images/` |

Les noms de colonnes ne doivent pas être renommés : le code les utilise tels quels.

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
