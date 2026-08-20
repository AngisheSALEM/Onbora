import 'package:flutter/material.dart';

/// Centralized Application Constants (Orange Brand & Apple-grade Glassmorphism Guidelines)
/// Implements the official Orange Design System + Apple Glass Aesthetics:
/// - 80/20 Rule: 80% Core Black (#000000) & Pure White (#FFFFFF), 20% Signature Orange (#FF7900).
/// - Eco-Branding: Deep Black (#000000 / #121212) for OLED screens, Pure White (#FFFFFF) for light surfaces.
/// - Apple-style Squircle Radii: 22px-26px for cards, 16px for buttons, translucent frosted glass.
/// - Typography 75: Thick, direct, essential (Bold 700 / Black 900 / ExtraBold 800).
abstract class AppConstants {
  // --- Fonts & Typography (75 - Épaisse, Directe, Essentielle) ---
  static const String fontFamilyPrimary = 'Inter';
  
  static const double fontSizeXs = 11.0;
  static const double fontSizeSm = 12.0;
  static const double fontSizeMd = 14.0;
  static const double fontSizeLg = 16.0;
  static const double fontSizeXl = 18.0;
  static const double fontSizeTitle = 20.0;
  static const double fontSizeHeader = 24.0;
  static const double fontSizeHero = 28.0;

  // --- Paddings & Margins ---
  static const double paddingXs = 4.0;
  static const double paddingSm = 8.0;
  static const double paddingMd = 12.0;
  static const double paddingLg = 16.0;
  static const double paddingXl = 20.0;
  static const double paddingXxL = 24.0;

  static const double marginSm = 8.0;
  static const double marginMd = 12.0;
  static const double marginLg = 16.0;
  static const double marginXl = 20.0;
  static const double marginXxL = 24.0;

  // --- Apple-Grade Rounded Radii ---
  static const double borderRadiusSm = 8.0;
  static const double borderRadiusMd = 14.0;
  static const double borderRadiusLg = 20.0;
  static const double borderRadiusXl = 24.0;
  static const double borderRadiusAppleCard = 22.0;
  static const double borderRadiusAppleButton = 16.0;
  static const double borderRadiusPill = 999.0;

  // --- Brand Accent Colors (Electric Blue #2563EB) ---
  static const Color primaryBlue = Color(0xFF2563EB);
  static const Color orangeOfficial = Color(0xFF2563EB); // Updated to electric blue #2563EB
  static const Color accentOrange = Color(0xFF2563EB);
  
  /// Eco-Branding Digital Sombre : Noir Absolu & Gris Studio
  static const Color pureBlack = Color(0xFF000000);
  static const Color primaryNavy = Color(0xFF000000);
  static const Color primaryDark = Color(0xFF141416);
  static const Color cardDarkGrey = Color(0xFF1C1C22); // Solid Grey Dark Card
  static const Color cardLightGrey = Color(0xFFF1F2F6); // Solid Grey Light Card
  static const Color cardDarkSurface = Color(0xFF1C1C22);
  static const Color cardDarkBorder = Colors.transparent;

  /// Eco-Branding Lumineux : Blanc Pur & Gris Clair Studio
  static const Color pureWhite = Color(0xFFFFFFFF);
  static const Color backgroundLight = Color(0xFFF8F9FA);
  static const Color cardLight = Color(0xFFF1F2F6);
  static const Color borderLight = Colors.transparent;

  /// Card Surface Tokens (Clean Grey without Glass or Borders)
  static const Color cardDark = Color(0xFF1C1C22);
  static const Color glassDarkSurface = Color(0xFF1C1C22);
  static const Color glassLightSurface = Color(0xFFF1F2F6);
  static const Color glassDarkBorder = Colors.transparent;
  static const Color glassLightBorder = Colors.transparent;

  /// Status & Secondary Colors
  static const Color successGreen = Color(0xFF10B981); // Emerald 500
  static const Color errorRed = Color(0xFFEF4444); // Red 500
  static const Color infoBlue = Color(0xFF2563EB); // Electric Blue #2563EB

  // --- Subtle Digital Lighting ---
  static const Color glowBlueDark = Color(0x282563EB);
  static const Color glowBlueLight = Color(0x162563EB);
  static const Color glowOrangeDark = Color(0x282563EB);
  static const Color glowOrangeLight = Color(0x162563EB);

  // --- High-Contrast Typography (Passe-Passe Noir d'encre & Blanc Pur) ---
  static const Color textDark = Color(0xFF000000); // Noir pur
  static const Color textLight = Color(0xFFFFFFFF); // Blanc pur
  static const Color textMuted = Color(0xFF6B7280); // Gray 500
  static const Color textSecondaryDark = Color(0xFFD1D5DB); // Gray 300
  static const Color textSecondaryLight = Color(0xFF4B5563); // Gray 600

  static Color getTextSecondary(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? textSecondaryDark
        : textSecondaryLight;
  }

  // --- Yellow Palette (Accents fonctionnels / IA) ---
  static const Color accentYellowDark = Color(0xFFFBBF24);
  static const Color accentYellowLight = Color(0xFFB45309);
  static const Color accentYellow = Color(0xFFFBBF24);

  static Color getAccentYellow(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? accentYellowDark
        : accentYellowLight;
  }

  static Color getAccentYellowBg(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? accentYellowDark.withValues(alpha: 0.16)
        : accentYellowLight.withValues(alpha: 0.12);
  }

  // --- Brand & Solution Naming ---
  static const String brandServiceName = 'Orange B2B';
  static const String appName = 'ONBORA SALES';
  static const String appSubtitle = 'Copilote Commercial & Dictaphone IA Terrain Orange B2B';
  
  // Login texts
  static const String loginTitle = 'Espace Commercial Orange B2B';
  static const String loginButton = 'Se Connecter';
  static const String loginIdLabel = 'Identifiant / Email *';
  static const String loginPasswordLabel = 'Mot de passe *';
  static const String loginDemoHint = 'Identifiant : sales1 / Mot de passe : sales1pass';

  // Map & Plaque Home texts
  static const String mapHomeTitle = 'Carte & Plaques Terrain';
  static const String mapHomeSub = 'Plaques territoriales & Opportunités prêtes à être converties';
  static const String readyToConvertTitle = 'Entreprises Prêtes à être Converties';
  static const String viewAiBriefBtn = 'Voir le Brief IA';
  static const String startVisitBtn = 'Démarrer Visite';

  // Sales Home texts (Cleaned up, no redundant marketing slogan)
  static const String salesVisitsTitle = 'Visites & Rendez-vous';
  static const String homeSearchProspectBtn = 'Rechercher un prospect';
  static const String homeSearchPlaceholder = 'Rechercher un prospect, entreprise, secteur...';
  static const String homeActiveMeetingTitle = 'Rendez-vous Client en Cours';
  static const String recentVisitsTitle = 'Historique Récent des Visites';

  // Search Prospect texts
  static const String searchProspectTitle = 'Recherche Prospects';
  static const String searchProspectHint = 'Rechercher parmi tous les prospects ou filtrer par plaque...';

  // Dictaphone texts
  static const String dictaphoneTitle = 'Dictaphone Vocal Terrain';
  static const String dictaphoneRecordingState = 'ENREGISTREMENT EN COURS...';
  static const String dictaphoneStoppedState = 'ENREGISTREMENT TERMINÉ';
  static const String dictaphoneAnalyzingState = 'ANALYSE WHISPER SPEECH-TO-TEXT...';
  static const String dictaphoneIdleState = 'Appuyez pour démarrer l\'enregistrement';
  static const String dictaphoneGenerateBtn = 'Générer le Rapport avec Onbora IA';

  // Catalog texts (Orange B2B replacement)
  static const String catalogTitle = 'Catalogue Solutions Orange B2B';
  static const String catalogSearchHint = 'Rechercher une offre Orange B2B (Fibre, Cloud, Sécurité...)';

  // MapLibre & MapTiler Vector Tiles Config
  static const String mapTilerApiKey = 'YOUR_MAPTILER_KEY';
  static const String mapTilerStreetsStyleUrl = 'https://api.maptiler.com/maps/streets-v2/style.json?key=';
  static const String mapTilerDarkStyleUrl = 'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=';
  static const String mapLibreDemoStyleUrl = 'https://demotiles.maplibre.org/style.json';
}
