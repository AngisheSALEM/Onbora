/**
 * Onbora KAM Command Center — Strict Design Tokens
 * Enforces 60-30-10 Rule:
 * 60% : Canvas & Card Surfaces (#ECEAE5 / #F6F5F2 in Light, #242124 / #2D2A2D in Dark)
 * 30% : Structural Neutral Hierarchy (#191816 / #787570 in Light, #FFFFFF / #A19FA1 in Dark)
 * 10% : Royal Iris Blue #4F6CE8 strictly for CTAs, unread badges, active focus & nav hover
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
    display: 'font-sans font-black tracking-tight',
    body: 'font-sans font-medium leading-relaxed',
    mono: 'font-mono tabular-nums font-bold',
  },
  radii: {
    card: 'rounded-[28px]',
    hero: 'rounded-[32px]',
    pill: 'rounded-full',
    subcard: 'rounded-2xl',
  }
} as const;
