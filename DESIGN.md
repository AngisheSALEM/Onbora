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

## 2. Typographie Officielle Apple : `SF Pro`

* **Grands Titres iOS (Hero 34px -> 18px au scroll) :** `FontWeight.w700`, `letterSpacing: -0.6`, `height: 1.15`
* **Titres de Section (Title 2, 22px) :** `FontWeight.w600`, `letterSpacing: -0.3`, `height: 1.22`
* **Titres d'Éléments & Headlines (16px) :** `FontWeight.w600`, `letterSpacing: -0.2`
* **Surtitres (*Eyebrows* / Tags majuscules 11px) :** `FontWeight.w500`, `letterSpacing: 0.4`
* **Badges de Statut, Boutons & Onglets (12-14px) :** `FontWeight.w500` / `w600`
* **Corps de Texte & Métadonnées (13-14px) :** `FontWeight.w400`, `height: 1.35` à `1.4`

---

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
