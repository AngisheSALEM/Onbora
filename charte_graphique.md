# Charte Graphique Officielle — Onbora
*Copilote Commercial B2B pour MSP*

Cette charte graphique définit l'identité visuelle de la plateforme Onbora. Elle garantit la cohérence, la lisibilité et l'aspect premium de l'interface utilisateur à travers les différents rôles (Client B2B, Prospecteur, KAM, Administrateur).

---

## 1. Identité Visuelle & Palette de Couleurs

Onbora adopte une charte **Orange / Noir / Blanc** premium, inspirée de l'identité des grands opérateurs télécoms (comme Orange Business) mais modernisée avec des effets de translucidité (glassmorphism) et de lumière diffuse (glow orbs).

### A. Les Couleurs Principales
| Couleur | Code Hex | Tailwind Class | Utilisation |
| :--- | :--- | :--- | :--- |
| **Orange Onbora** | `#F97316` | `bg-orange-500` / `text-orange-500` | Accents, boutons primaires, indicateurs d'action active. |
| **Orange Sombre** | `#EA580C` | `bg-orange-600` | Hover sur boutons orange, dégradés. |
| **Noir Pur / Profond** | `#000000` | `text-black` | Texte principal en Thème Clair. |
| **Blanc Pur** | `#FFFFFF` | `bg-white` / `text-white` | Fond principal du Thème Clair, texte sur fonds foncés. |
| **Zinc Sombre** | `#050508` | `bg-zinc-950` | Fond principal du Thème Sombre. |
| **Zinc Moyen** | `#18181B` | `bg-zinc-900` | Composants sombres, en-têtes sombres. |

### B. Les Deux Thèmes

#### ☀️ Thème Clair
*   **Fond global de l'application** : Blanc Pur (`#FFFFFF` / `bg-white`) sur toutes les pages de rôles (KAM, Client B2B, Prospecteur, Admin).
*   **Texte principal** : Noir Pur (`#000000` / `text-black`) pour une lisibilité maximale.
*   **Texte secondaire** : Gris Foncé (`#4B5563` / `text-zinc-600` ou `text-zinc-700`).
*   **Conteneurs & Cartes** : Blanc translucide (`rgba(255, 255, 255, 0.75)` / `.glass-card`) avec bordure fine claire (`border-zinc-200`).

#### 🌙 Thème Sombre
*   **Fond global de l'application** : Zinc Sombre (`#050508` / `bg-zinc-950`).
*   **Texte principal** : Blanc cassé (`#FAFADA` / `text-zinc-50`).
*   **Texte secondaire** : Gris clair (`#A1A1AA` / `text-zinc-400`).
*   **Conteneurs & Cartes** : Noir translucide (`rgba(12, 12, 16, 0.5)` / `.dark .glass-card`) avec bordure fine foncée (`border-zinc-800`).

---

## 2. Typographie & Hiérarchie

*   **Police sans-serif par défaut** : `"Inter", sans-serif` (ou `Geist`, `Satoshi` pour un rendu ultra-premium).
*   **Police à chasse fixe (Monospace)** : `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas` (pour les débits, adresses IP, chiffres de logs et numéros).

### Échelle Typographique
*   **Titre Principal (H1)** : `text-2xl font-bold tracking-tight text-black dark:text-white`
*   **Sous-titre (H2)** : `text-lg font-bold text-zinc-900 dark:text-zinc-100`
*   **Section Title (H3)** : `text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400`
*   **Corps de texte** : `text-sm text-zinc-800 dark:text-zinc-300 leading-relaxed`
*   **Petits textes / Métadonnées** : `text-[11px] font-semibold text-zinc-500 dark:text-zinc-400`

---

## 3. Éléments d'Interface (UI Components)

### A. Boutons
*   **Bouton Primaire (Action forte)** :
    *   *Style* : Fond orange uni (`bg-orange-500`), texte blanc (`text-white`), coins arrondis (`rounded-xl`), effet de micro-translation au clic (`active:scale-98`).
    *   *Hover* : Léger fondu ou orange plus sombre (`hover:bg-orange-600`).
*   **Bouton Secondaire / Outline** :
    *   *Style* : Fond transparent, bordure zinc (`border-zinc-200` en clair, `border-zinc-800` en sombre), texte (`text-zinc-700` en clair, `text-zinc-300` en sombre).
*   **Bouton de Thème (ThemeToggle)** :
    *   *Style* : S'adapte au mode actif (fond blanc en clair, fond noir en sombre).
    *   *Icône* : Affiche l'icône de l'état actuel (Lune en sombre, Soleil en clair).

### B. Champs de Conversation & Saisie
*   *Style* : Coins très arrondis (`rounded-xl` ou `rounded-2xl`).
*   *Thème Clair* : Fond blanc opaque ou très légèrement bleuté, bordure gris clair (`border-zinc-200`), texte noir.
*   *Thème Sombre* : Fond noir opaque (`bg-zinc-950/40`), bordure foncée (`border-zinc-900`), texte blanc.
*   *Focus* : Bordure orange (`focus:border-orange-500`) avec halo orange doux sans ombre portée dure (`focus:ring-2 focus:ring-orange-500/20`).

### C. Bulles du Chatbot (Chat UI)
*   **Bulle Onbora (IA)** :
    *   *Style* : Glassmorphism blanc en clair (`bg-white/90 shadow-sm`), sombre en sombre (`bg-zinc-900/80`). Bordure fine. Alignée à gauche.
    *   *Texte* : Noir en clair, blanc en sombre.
*   **Bulle Client (Utilisateur)** :
    *   *Style* : Fond orange uni (`bg-orange-500`), texte blanc (`text-white`). Pas de bordure. Alignée à droite.

### D. Cartes de Services & Prospects
*   *Style* : Coins arrondis (`rounded-2xl`), bordure fine 1px, effet de transition fluide (`transition-all duration-300`).
*   *Hover* : Bordure s'allume en orange translucide (`hover:border-orange-500/30`), élévation légère (`shadow-md`).
*   *Thème Clair* : Fond blanc pur avec ombre grise diffuse très légère (`shadow-[0_8px_32px_0_rgba(0,0,0,0.04)]`).
*   *Thème Sombre* : Fond noir zinc (`bg-zinc-900/50`) avec ombre sombre (`shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]`).

### E. Indicateurs de Statut (Badges)
*   `Nouveau` : `bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400`
*   `En cours d'étude` : `bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400`
*   `Validé` : `bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400`
*   `Transmis` : `bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400`

### F. Arrière-plans & Grilles
*   **Grille Matricielle (Matrix Grid)** : Lignes de grille orange très discrètes (`opacity-[0.015]` en clair, `opacity-[0.03]` en sombre) animées en arrière-plan fixe.
*   **Orbes Lumineux (Glow Orbs)** : Deux halos orange radiaux flous placés aux coins opposés de l'écran, apportant de la profondeur.
*   **Superposition de bruit (Noise Overlay)** : Texture de bruit de 1% d'opacité en avant-plan (`pointer-events-none`) pour casser le côté "plat" du numérique.

### G. Alertes & Modals
*   *Style* : Fond blanc/sombre opaque, bordure rouge/orange/verte selon le type d'alerte.
*   *Animation* : Entrée fluide en fondu avec translation verticale (`animate-fade-in` / `translate-y-0`).

---

## 4. Règles d'Utilisation de l'Identité Visuelle

1.  **Anti-Emoji** : L'utilisation d'émojis dans l'interface est interdite. Ils doivent être remplacés par des icônes SVG vectorielles épurées ou des glyphes géométriques.
2.  **Contraste élevé** : Le texte doit toujours être noir pur (`text-black`) sur fond blanc dans le thème clair pour respecter les normes d'accessibilité (WCAG AA).
3.  **Matérialité** : Le verre (glassmorphism) doit être utilisé avec modération et toujours avoir une bordure d'un pixel pour simuler la réfraction physique.
4.  **Cohérence du scroll** : Les barres de défilement (scrollbars) sont personnalisées avec une glissière orange très fine et transparente.