# ONBORA DESIGN SYSTEM & TOKENS (DESIGN.md)

Ce document formalise les règles de design strictes et les tokens de l'application Onbora (Mobile & Web).

---

## 1. Règle Fondamentale des Proportions : La Règle du 60 - 30 - 10

L'interface Onbora applique une discipline chromatique stricte :

* **60% — Couleur Dominante (Arrière-plan & Toile de Fond) :**
  * **Dark Mode :** Noir chaud `#242124`
  * **Light Mode :** Blanc craie / porcelaine `#F6F5F2`

* **30% — Couleurs Secondaires & Structurelles (Surfaces, Conteneurs, Typographie) :**
  * **Dark Mode :** Cartes `#2F2C30`, Sous-cartes `#3B373D`, TabBar `#1B191B`, Texte `#FFFFFF` & gris `#A1A1AA`
  * **Light Mode :** Cartes `#FFFFFF`, Gris `#ECEAE5`, TabBar `#E7E5DF`, Texte `#242124` & gris `#6E6C67`

* **10% — Couleur d'Accent Unique (Bleu Cobalt Éclatant `#4F6CE8`) :**
  * **Réservé exclusivement aux :**
    1. **Boutons CTA Primaires** (Actions clés de conversion, validation, export PDF).
    2. **Badges de Notifications & Points non-lus** (Pastille de la cloche, alertes non lues).
    3. **Indicateurs d'état actif majeurs**.

---

## 2. Typographie Harmonique & Échelle du Nombre d'Or (φ ≈ 1.618)

La typographie d'Onbora repose sur une **échelle modulaire harmonique régie par le Nombre d'Or** :
\[
\phi = \frac{1 + \sqrt{5}}{2} \approx 1.6180339887
\]

Cette rigueur mathématique élimine tout dimensionnement arbitraire de texte. Elle garantit un rythme vertical fluide, une scannabilité optimale pour les données d'entreprise et un contraste hiérarchique naturel entre le micro-étiquetage et les grands indicateurs chiffrés.

### 2.1 Échelle Typographique Harmonique (Matrice Complète)

| Niveau Typographique | Taille (px) | Équiv. Rem | Ratio / Dérivation du Nombre d'Or | Interlignage (*Leading*) | Espacement (*Tracking*) | Poids (*Weight*) | Rôle Sémantique & Usage |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| **Display KPI / Stat** | **89 px** | 5.56 rem | 55 × φ ≈ 88.99 (Fibonacci 89) | 94 px (1.05) | -0.04em | Heavy 800 | Compteurs KPI majeurs, chiffres clés d'impact |
| **Hero Display** | **55 px** | 3.44 rem | 34 × φ ≈ 55.01 (Fibonacci 55) | 62 px (1.13) | -0.035em | Bold 700 / 800 | Grands titres d'accueil et portails de découverte |
| **Grand Titre (Large Title)** | **34 px** | 2.12 rem | 21 × φ ≈ 33.98 (Fibonacci 34) | 40 px (1.18) | -0.03em | Bold 700 | Titres principaux de vue (Portefeuille, Briefing) |
| **Titre de Section (Title 1)** | **26 px** | 1.62 rem | 16 × φ ≈ 25.89 (Base × φ) | 32 px (1.23) | -0.025em | SemiBold 600 | En-têtes de widgets, grandes sections de page |
| **Titre d'Élément (Title 2 / Headline)** | **21 px** | 1.31 rem | 13 × φ ≈ 21.03 (Fibonacci 21) | 27 px (1.28) | -0.02em | SemiBold 600 | Titres de cartes, noms de comptes, modales |
| **Corps Principal (Body Base)** | **16 px** | 1.00 rem | Racine standard φ⁰ | **26 px (1.618)** | -0.015em | Regular 400 / 500 | Paragraphes de lecture, bulles chat copilote IA |
| **Corps Compact (Body Sm)** | **14 px** | 0.87 rem | 11 × √φ ≈ 13.99 | 22 px (1.57) | -0.01em | Regular 400 / 600 | Tableaux de données, boutons primaires/secondaires |
| **Métadonnées / Subhead** | **13 px** | 0.81 rem | 21 / φ ≈ 12.98 (Fibonacci 13) | **21 px (1.618)** | -0.01em | Regular 400 / 500 | Horodatages, statuts secondaires, infobulles |
| **Surtitre (Eyebrow / Tag)** | **11 px** | 0.69 rem | 14 / √φ ≈ 11.01 | 16 px (1.45) | **+0.04em** | Medium 500 / 600 | Badges de catégorie, surtitres tout en majuscules |
| **Légende / Footnote Micro** | **10 px** | 0.62 rem | 16 / φ ≈ 9.89 | 14 px (1.40) | +0.01em | Medium 500 | Mentions légales, conditions, sous-indices |
| **Micro Annotation** | **8 px** | 0.50 rem | 13 / φ ≈ 8.03 (Fibonacci 8) | 12 px (1.50) | +0.02em | Bold 700 | Puces d'état compactes, badges ultra-denses |

### 2.2 Règle d'Or de l'Interlignage (*Golden Leading*)
* **Texte courant (13px et 16px) :** L'interlignage applique strictement le ratio φ = 1.618 (16 × 1.618 ≈ 26px, 13 × 1.618 ≈ 21px) pour assurer un confort de lecture oculaire parfait.
* **Titres & Display (21px à 89px) :** L'interlignage se resserre proportionnellement à l'inverse harmonique de la racine d'or (√φ ≈ 1.272) pour préserver la compacité architecturale des blocs de titres.

### 2.3 Règle de Compensation Optique (*Golden Tracking*)
Plus le texte grandit sur l'échelle d'or, plus son crénage (*letterSpacing*) se resserre négativement pour compenser l'illusion d'écartement perçue à grande taille, tandis que les micro-textes (8px - 11px) reçoivent un espacement positif (+0.04em) pour garantir une netteté de lecture instantanée.


## 3. Palette de Tokens

### Thème Sombre
* **Arrière-plan Global (`backgroundDark`) :** `#242124` (Noir chaud)
* **Barre de navigation / TabBar (`tabBackgroundDark`) :** `#1B191B`
* **Surface Carte Niveau 1 (`cardDark`) :** `#2F2C30` (+4% de lift)
* **Surface Carte Focus / Boutons (`subcardDark`) :** `#3B373D`
* **Surface Tertiaire (`surfaceTertiaryDark`) :** `#48434B`
* **Texte Primaire :** `#FFFFFF`
* **Texte Secondaire :** `#A1A1AA` / `#8E8E93`

### Thème Clair
* **Arrière-plan Global (`backgroundLight`) :** `#F6F5F2` (Blanc craie)
* **Surface Carte Niveau 1 (`cardLight`) :** `#FFFFFF` (Ombre ultra-douce `blur: 10`, `alpha: 0.035`)
* **Surface Carte Focus / Boutons (`subcardLight`) :** `#ECEAE5` (Gris correspondant)
* **Barre de navigation / TabBar (`tabBackgroundLight`) :** `#E7E5DF`
* **Surface Tertiaire (`surfaceTertiaryLight`) :** `#DFDCD6`
* **Texte Primaire :** `#242124` (Noir chaud)
* **Texte Secondaire :** `#6E6C67` / `#8E8E93`

### Couleur d'Accent Unique (10%)
* **Bleu Cobalt Éclatant (`primaryBlue` / `accentBlue`) :** `#4F6CE8` (Pour les CTAs et Badges de Notification)

---

## 4. Règle Zéro Bordure 1px (*Zero 1px Borders*)

* **INTERDICTION :** `Border.all(color: Colors.grey, width: 1)` ou `Border.all(color: borderLight, width: 1)`.
* La séparation et le relief sont obtenus exclusivement par le contraste de fond et l'espace négatif.

---

## 5. Règle Zéro Cards Imbriquées (*No Nested Cards*)

* **INTERDICTION :** Placer une sous-boîte grise `Container(decoration: ...)` à l'intérieur d'une carte déjà grise.
* **PATTERN :** Utiliser des lignes d'icônes sémantiques directes avec fond transparent et typographie hiérarchisée.

---

## 6. Règle Zéro Ombres Portées Colorées / Fluorescentes (*No Glowing Colored Shadows*)

* **INTERDICTION FORMELLE :** Les ombres colorées artificielles (ex: `shadow-[#4F6CE8]/20`, `shadow-md shadow-[#4F6CE8]/25`, `shadow-emerald-500/10`).
* **DIRECTIVE :** Toutes les interfaces Web utilisent des surfaces plates, sans `box-shadow`, y compris les boutons, menus, modales et états de survol. Le focus clavier reste visible avec un contour. Cette préférence remplace les anciennes autorisations d’ombres neutres.

---

## 7. Règle Zéro Emojis dans l'Interface (*No Unicode Emojis in UI*)

* **INTERDICTION FORMELLE :** Utiliser des émojis Unicode (🥇, 🥈, 🥉, 👑, ⚡, 🏆, 🗺️, ✉️, etc.) dans les boutons, en-têtes, badges ou podiums.
* **STANDARD :** Utiliser exclusivement des icônes vectorielles SVG soignées depuis le composant partagé `Icons.tsx` (`<Icons.Crown />`, `<Icons.Trophy />`, `<Icons.Award />`, `<Icons.Zap />`, etc.).

---

## 8. UX Podiums & Filtres Déroulants

* **Podiums Discrets :** Les classements Top 3 (Commerciaux ou KAM) ne doivent pas envahir l'espace vertical. Ils sont proposés comme une option en retrait, pliable/dépliable (`[ Icons.Trophy ] Podium Top 3 Performance`), compacte et élégante.
* **Filtres Déroulants :** Privilégier les menus déroulants sleek `<select>` aux grappes horizontales de boutons-pills pour les filtres complexes (statuts, entités, périmètres).

---

## 9. Règle Zéro Lignes de Séparation sur les Fonds & Zéro Doubles Bordures d'Input (*Clean Canvas & Borderless Nested Inputs*)

* **INTERDICTION FORMELLE DES LIGNES SUR LES FONDS :**
  * Il est strictement interdit d'ajouter des séparateurs horizontaux ou verticaux (`border-b`, `border-t`, `border-l`, `<hr />`, `<div className="border-t ...">`) sur les toiles de fond, sous les headers de navigation, sous les titres de pages (ex: *Portefeuille*, *Rendez-vous*) ou entre les blocs de cartes.
  * **EXCEPTION UNIQUE ET STRICTE :** Les lignes séparatrices sont **réservées exclusivement aux lignes des tableaux de données** (`<thead>`, `<tbody>`, `<tr>`), où elles contribuent à la lisibilité et à la scannabilité des colonnes tabulaires.
* **INTERDICTION FORMELLE DES DOUBLES BORDURES SUR LES INPUTS :**
  * Les champs de recherche et inputs imbriqués doivent adopter un style pilule épuré (`rounded-full`), avec un `<input>` totalement transparent sans double contour intérieur (`border-none bg-transparent outline-none ring-0`).
  * Les icônes d'action adjacentes (ex: icône filtres) s'insèrent naturellement dans la pilule sans séparateur vertical intermédiaire (`border-l`).

---

## 10. Règle Zéro Icône Sparkles & Primauté Absolue du Skeleton Loader (*No Sparkles Icon & Mandatory Skeleton Loaders*)

* **INTERDICTION FORMELLE ET DÉFINITIVE DE L'ICÔNE SPARKLES :**
  * Il est formellement interdit d'utiliser l'icône *Sparkles* / *Étoiles scintillantes* (`Icons.Sparkles`, `CupertinoIcons.sparkles`, `LucideIcons.sparkles`, ou tout dérivé) dans l'intégralité du système Onbora (Web Next.js & Mobile Flutter).
  * Les clichés visuels de type "poussière magique" (*AI fairy dust / magic sparkles*) sont proscrits au profit d'un design professionnel B2B rigoureux, sobre et high-end.

* **OBLIGATION DU SKELETON LOADER POUR LES ÉTATS DE CHARGEMENT :**
  * Pour tout chargement asynchrone, scoring IA, récupération de flux d'actualités B2B, génération de compte-rendu ou parsing de document :
    * **Web :** Utiliser obligatoirement les composants Shimmer Skeleton dédiés (`SkeletonNewsLoader`, `SkeletonDebriefLoader`, `SkeletonCard`, `SkeletonBox` dans [`SkeletonLoader.tsx`](file:///frontend/src/components/shared/SkeletonLoader.tsx)).
    * **Mobile :** Utiliser obligatoirement `SkeletonBox`, `SkeletonCard` et `SkeletonListLoader` ([`skeleton_loader.dart`](file:///mobile/lib/app/common/screen/widget/skeleton_loader.dart)).
  * Interdiction de remplacer les données manquantes par de simples spinners ou icônes animées isolées : l'utilisateur doit percevoir immédiatement le gabarit structurel des données en cours de chargement.

* **SUBSTITUTION SÉMANTIQUE POUR LES BOUTONS & STATUTS IA :**
  * Lorsqu'une icône est nécessaire pour une action ou un signal IA (synthèse, comparaison, déclencheur d'opportunité), utiliser exclusivement des icônes vectorielles orientées métier :
    * Signaux & déclencheurs rapides : `<Icons.Zap />` / `CupertinoIcons.bolt_fill`
    * Calcul Core AI / Intelligence : `<Icons.Cpu />` / `LucideIcons.cpu`
    * Comparaison sectorielle / multi-périmètres : `<Icons.Layers />` / `<Icons.Scale />`
    * Rapports & synthèses écrites : `<Icons.FileText />` / `CupertinoIcons.doc_text_fill`
    * Validation & finalisation : `<Icons.CheckCircle />` / `CupertinoIcons.check_mark_circled`

---

## 11. Identité de Marque, Logo & Favicon Officiels (*Brand Identity & Icons*)

* **Monogramme & Favicon Officiel ("On") :**
  * L'icône d'application mobile et le favicon web sont constitués **exclusivement du badge "On"** (sans la mention "bora").
  * Le badge est un squircle géométrique en Bleu Cobalt `#4F6CE8` contenant la ligature stylisée blanche "On" (croissant lunaire dynamique fusionné à la lettre "n").
  * Formats officiels :
    * Web Favicon multi-tailles : [`favicon.ico`](file:///frontend/public/favicon.ico) (16x16, 32x32, 48x48, 64x64)
    * Web PWA / App Router Icon : [`icon.png`](file:///frontend/public/icon.png) (512x512)
    * Apple Touch Icon : [`apple-icon.png`](file:///frontend/public/apple-icon.png) (180x180)
    * Mobile Flutter / Android Icon : [`app_icon.png`](file:///mobile/assets/icons/app_icon.png) (512x512) et launchers mipmap.
* **Logo Horizontal Officiel (Lockup "Onbora") :**
  * Le logo complet associe le badge "On" au mot-symbole "bora" en typographie géométrique sans-serif bold.
  * Version Light : Texte "bora" noir `#000000` sur fond clair ([`onbora_logo.png`](file:///frontend/public/onbora_logo.png)).
  * Version Dark : Texte "bora" blanc `#FFFFFF` sur fond sombre ([`onbora_logo_dark.png`](file:///frontend/public/onbora_logo_dark.png)).
* **Composant Partagé Réutilisable ([`Logo.tsx`](file:///frontend/src/components/shared/Logo.tsx)) :**
  * Utilisation par défaut en mode icône : `<Logo size={36} />`.
  * Utilisation en mode logo complet : `<Logo variant="full" size={36} />`.




---

## 12. Système de Border Radius : Standard « Small Border Radius » (Friendly & Professional)

Conformément aux standards de design d'interface modernes (référence Ali Pineda — *How to Use Border Radius Like a Pro*), l'identité visuelle d'Onbora en tant que copilote commercial B2B MSP adopte le style **Small Border Radius (6px à 8px)** garantissant une allure à la fois **conviviale, moderne, rigoureuse et professionnelle** (*Friendly & Professional*), à l'opposé des angles vifs ultra-stricts (0px - *Serious & Formal*) et des capsules exagérées (9999px - *Playful & Casual*).

### 12.1 Matrice des Rayons de Courbure (Web & Mobile)

| Élément d'Interface | Token Tailwind (Web) | Valeur CSS (Web) | Constante Flutter (Mobile) | Rôle & Justification Visuelle |
| :--- | :---: | :---: | :---: | :--- |
| **Boutons d'Action (Primaires & Secondaires)** | `rounded-lg` | **8 px** | `borderRadiusAppleButton` (8.0) | Allure équilibrée, accessible et professionnelle. Fin des capsules informelles sur les CTA. |
| **Sous-cartes & Conteneurs imbriqués** | `rounded-lg` | **8 px** | `borderRadiusMd` (8.0) | Intégration géométrique concentrique avec les boutons et inputs. |
| **Champs de formulaire classiques (Inputs)** | `rounded-lg` | **8 px** | `borderRadiusMd` (8.0) | Continuité visuelle fluide avec les boutons d'action. |
| **Badges de statut & Chips denses** | `rounded-md` | **6 px** | `borderRadiusSm` (6.0) | Marquage compact sans effet bonbon. |
| **Cartes Principales & Panneaux (Cards)** | `rounded-xl` | **12 à 14 px** | `borderRadiusAppleCard` (14.0) | Enveloppe douce et contenue (abandon des anciens rayons excessifs de 28-32px). |
| **Modales & Sections Hero** | `rounded-2xl` | **16 px** | `borderRadiusXl` (16.0) | Délimitation claire des calques modaux au premier plan. |
| **Barre de Recherche Imbriquée & Puces d'État** | `rounded-full` | **9999 px** | `borderRadiusPill` (999.0) | Réservé strictement à la pilule épurée de recherche (DESIGN.md §9) et aux puces circulaires. |

### 12.2 Principe de Géométrie Concentrique
Lorsque deux conteneurs arrondis sont imbriqués (ex: un bouton ou une sous-carte à l'intérieur d'une carte), le rayon intérieur doit toujours être inférieur au rayon extérieur selon la formule concentrique :
\[
R_{\text{intérieur}} \approx R_{\text{extérieur}} - \text{Padding}
\]
Avec des cartes à 14px et un padding de 16px à 24px, les boutons intérieurs à 8px épousent naturellement la courbure de la carte sans distorsion optique.
