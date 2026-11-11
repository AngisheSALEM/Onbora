/**
 * Onbora KAM Command Center — Strict Design Tokens
 * Enforces 60-30-10 Rule:
 * 60% : Canvas & Card Surfaces (#ECEAE5 / #F6F5F2 in Light, #242124 / #2D2A2D in Dark)
 * 30% : Structural Neutral Hierarchy (#191816 / #787570 in Light, #FFFFFF / #A19FA1 in Dark)
 * 10% : Royal Iris Blue #4F6CE8 strictly for CTAs, unread badges, active focus & nav hover
 * 
 * Border Radius Standard: Small Border Radius (6px - 8px / Friendly & Professional B2B SaaS)
 */

export const designTokens = {
  surfaces: {
    // Light Mode
    canvasLight: '#ECEAE5',
    cardLight: '#F6F5F2',
    subcardLight: '#E4E1DB',
    separatorLight: '#DAD7D0',

    // Dark Mode
    canvasDark: '#242124',
    cardDark: '#2D2A2D',
    subcardDark: '#363336',
    separatorDark: '#403C40',
  },
  accents: {
    cobaltBlue: '#4F6CE8',
    cobaltBlueHover: '#3E5AC8',
    cobaltBlueSubtle: '#4F6CE81A',
    cobaltBlueDarkSubtle: 'rgba(79, 108, 232, 0.20)',
  },
  typography: {
    display: 'font-sans font-extrabold tracking-tight',
    body: 'font-sans font-normal leading-relaxed',
    mono: 'font-mono tabular-nums font-semibold',
  },
  radii: {
    button: 'rounded-lg', // 8px — Friendly & Professional CTA
    card: 'rounded-xl', // 14px — Clean B2B Surface
    hero: 'rounded-2xl', // 16px — Hero / Modal
    subcard: 'rounded-lg', // 8px — Concentric Sub-containers
    badge: 'rounded-md', // 6px — Compact Status Tag
    input: 'rounded-lg', // 8px — Form Fields
    pill: 'rounded-full', // Strict Search & Circular Dots
  }
} as const;
