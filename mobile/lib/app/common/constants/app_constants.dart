import 'package:flutter/material.dart';

/// Centralized Application Constants & Apple Typography Hierarchy (SF Pro Native)
abstract class AppConstants {
  // --- Native Apple SF Pro Typography System ---
  static const String fontFamilyPrimary = 'SFPro';
  static const String fontFamilySecondary = 'SFPro';
  
  // Standard sizes
  static const double fontSizeOverline = 11.0;  // Surtitre / Eyebrow (11-12px)
  static const double fontSizeSubhead = 13.0;   // Métadonnées / Footnote (13-14px)
  static const double fontSizeBody = 16.0;      // Titre Primaire / Headline (16px)
  static const double fontSizeTitle2 = 22.0;    // Titre de Section / Title 2 (22px)
  static const double fontSizeLargeTitle = 34.0;// Grand Titre iOS (34px)

  static const double fontSizeXs = 11.0;
  static const double fontSizeSm = 12.0;
  static const double fontSizeMd = 14.0;
  static const double fontSizeLg = 16.0;
  static const double fontSizeXl = 18.0;
  static const double fontSizeTitle = 22.0;
  static const double fontSizeHeader = 26.0;
  static const double fontSizeHero = 34.0;

  // --- Strict Typography Hierarchy Getters (700 Large Titles, 600 Sub-elements/Headlines, 500 Badges, 400 Body) ---
  
  /// 1. Grand Titre iOS (Large Title) : 34px | Bold | #FFFFFF (Dark) / #111111 (Light)
  static TextStyle largeTitleStyle(bool isDark) => TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeLargeTitle,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.6,
    height: 1.15,
    color: isDark ? const Color(0xFFFFFFFF) : const Color(0xFF111111),
  );

  /// 2. Titre de Section (Title 2) : 22px | SemiBold | #FFFFFF (Dark) / #111111 (Light)
  static TextStyle title2Style(bool isDark) => TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeTitle2,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.3,
    height: 1.22,
    color: isDark ? const Color(0xFFFFFFFF) : const Color(0xFF111111),
  );

  /// 3. Surtitre / Tag de Catégorie (Overline / Eyebrow) : 11px | Medium | #8E8E93 (Gris Apple)
  static TextStyle overlineStyle(bool isDark) => TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeOverline,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.4,
    color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF8E8E93),
  );

  /// 4. Titre d'Élément Primaire (Headline) : 16px | SemiBold | #FFFFFF (Dark) / #111111 (Light)
  static TextStyle headlineStyle(bool isDark) => TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeBody,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
    height: 1.25,
    color: isDark ? const Color(0xFFFFFFFF) : const Color(0xFF111111),
  );

  /// 5. Métadonnées / Secondary Label (Subhead) : 13px | Regular | #8E8E93 (Gris Apple)
  static TextStyle subheadStyle(bool isDark) => TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeSubhead,
    fontWeight: FontWeight.w400,
    letterSpacing: -0.1,
    height: 1.35,
    color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF8E8E93),
  );

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

  // --- Apple Concentric Geometry ---
  static const double borderRadiusSm = 8.0;
  static const double borderRadiusMd = 14.0;
  static const double borderRadiusLg = 20.0;
  static const double borderRadiusXl = 24.0;
  static const double borderRadiusAppleCard = 20.0;
  static const double borderRadiusAppleButton = 16.0;
  static const double borderRadiusPill = 999.0;

  // --- Brand & High-Contrast Colors ---
  static const Color primaryBlack = Color(0xFF242124);
  static const Color pureBlack = Color(0xFF242124);
  static const Color pureWhite = Color(0xFFF6F5F2);
  static const Color primaryNavy = Color(0xFF242124);

  // Status & Semantic Colors (Apple 60-30-10 Design System compliant)
  static const Color accentGreen = Color(0xFF10B981);
  static const Color successGreen = Color(0xFF10B981);
  static const Color accentAmber = Color(0xFF64748B); // Apple Slate Neutral
  static const Color accentRed = Color(0xFFEF4444);
  static const Color errorRed = Color(0xFFEF4444);
  static const Color accentPurple = Color(0xFF2563EB); // Apple Royal Blue
  static const Color primaryBlue = Color(0xFF007AFF); // Apple System Blue
  static const Color accentBlue = Color(0xFF007AFF);
  static const Color orangeOfficial = Color(0xFF0F172A); // Apple Dark Slate
  static const Color accentYellow = Color(0xFF64748B);
  static const Color accentYellowDark = Color(0xFF94A3B8);
  static const Color accentYellowLight = Color(0xFF475569);

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
  
  // High-Contrast Button Helpers
  static Color primaryBtnColor(bool isDark) => isDark ? const Color(0xFFF6F5F2) : const Color(0xFF242124);
  static Color primaryBtnTextColor(bool isDark) => isDark ? const Color(0xFF242124) : const Color(0xFFF6F5F2);
  static Color secondaryBtnColor(bool isDark) => isDark ? const Color(0xFF3B373D) : const Color(0xFFECEAE5);
  static Color secondaryBtnTextColor(bool isDark) => isDark ? const Color(0xFFF6F5F2) : const Color(0xFF242124);
  static Color secondaryBtnBorderColor(bool isDark) => Colors.transparent;

  /// Semantic Surfaces - Dark Mode (Noir #242124 + Cartes Harmonieuses)
  static const Color backgroundDark = Color(0xFF242124);
  static const Color tabBackgroundDark = Color(0xFF1B191B);
  static const Color primaryDark = Color(0xFF2F2C30);
  static const Color cardDark = Color(0xFF2F2C30);
  static const Color cardDarkGrey = Color(0xFF2F2C30);
  static const Color cardDarkSurface = Color(0xFF2F2C30);
  static const Color subcardDark = Color(0xFF3B373D);
  static const Color surfaceTertiaryDark = Color(0xFF48434B);
  static const Color cardDarkBorder = Colors.transparent;

  /// Semantic Surfaces - Light Mode (Blanc Craie #F6F5F2 + Gris Chauds Harmonieux)
  static const Color backgroundLight = Color(0xFFF6F5F2);
  static const Color tabBackgroundLight = Color(0xFFE7E5DF);
  static const Color cardLight = Color(0xFFFFFFFF);
  static const Color cardLightGrey = Color(0xFFFFFFFF);
  static const Color subcardLight = Color(0xFFECEAE5);
  static const Color surfaceTertiaryLight = Color(0xFFDFDCD6);
  static const Color borderLight = Colors.transparent;

  /// Card Surface Tokens
  static const Color glassDarkSurface = Color(0xFF2F2C30);
  static const Color glassLightSurface = Color(0xFFFFFFFF);
  static const Color glassDarkBorder = Colors.transparent;
  static const Color glassLightBorder = Colors.transparent;

  // --- High-Contrast Typography ---
  static const Color textDark = Color(0xFF242124);
  static const Color textLight = Color(0xFFF6F5F2);
  static const Color textSecondaryLight = Color(0xFF6E6C67);
  static const Color textSecondaryDark = Color(0xFFA1A1AA);
  static const Color textMuted = Color(0xFF8E8E93);
  static const Color textTertiaryLight = Color(0xFF9C9993);
  static const Color textTertiaryDark = Color(0xFF565D6D);

  /// Séparateur de liste (Divider)
  static const Color dividerDark = Color(0x1FFFFFFF);
  static const Color dividerLight = Color(0x14242124);

  static Color getTextSecondary(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark
        ? textSecondaryDark
        : textSecondaryLight;
  }

  // --- Brand & Solution Naming ---
  static const String brandServiceName = 'Orange B2B';
  static const String appName = 'ONBORA SALES';
  static const String appSubtitle = 'Suivi Commercial & Prospection B2B';
  
  // Login texts
  static const String loginTitle = 'Espace Commercial Orange B2B';
  static const String loginButton = 'Se connecter';
  static const String loginIdLabel = 'Identifiant / Email *';
  static const String loginPasswordLabel = 'Mot de passe *';
  static const String loginDemoHint = 'Identifiant : sales1 / Mot de passe : sales1pass';

  // Map & Plaque Home texts
  static const String mapHomeTitle = 'Map';
  static const String mapHomeSub = 'Secteurs territoriaux & Opportunités à qualifier';
  static const String readyToConvertTitle = 'Entreprises Prêtes pour Qualification';
  static const String viewAiBriefBtn = 'Consulter le brief';
  static const String startVisitBtn = 'Démarrer la visite';

  // Sales Home texts (Rendez-vous épuré)
  static const String salesVisitsTitle = 'Rendez-vous';
  static const String navHomeTitle = 'Accueil';
  static const String homeSearchProspectBtn = 'Rechercher un prospect';
  static const String homeSearchPlaceholder = 'Rechercher un prospect...';
  static const String homeActiveMeetingTitle = 'Rendez-vous';
  static const String recentVisitsTitle = 'Visites récentes';

  // Search Prospect texts
  static const String searchProspectTitle = 'Recherche Prospects';
  static const String searchProspectHint = 'Rechercher parmi tous les prospects ou filtrer par plaque...';

  // Dictaphone texts
  static const String dictaphoneTitle = 'Enregistrement de Visite';
  static const String dictaphoneRecordingState = 'ENREGISTREMENT EN COURS';
  static const String dictaphoneStoppedState = 'ENREGISTREMENT TERMINÉ';
  static const String dictaphoneAnalyzingState = 'TRANSCRIPTION DE L\'ÉCHANGE...';
  static const String dictaphoneIdleState = 'Appuyez pour démarrer l\'enregistrement';
  static const String dictaphoneGenerateBtn = 'Rédiger le compte-rendu';

  // Catalog texts
  static const String catalogTitle = 'Catalogue';
  static const String catalogSearchHint = 'Rechercher une offre (Fibre, Cloud, Sécurité...)';

  // Notifications
  static const String notificationsTitle = 'Notifications';

  // MapLibre & MapTiler Vector Tiles Config
  static const String mapTilerApiKey = 'YOUR_MAPTILER_KEY';
  static const String mapTilerStreetsStyleUrl = 'https://api.maptiler.com/maps/streets-v2/style.json?key=';
  static const String mapTilerDarkStyleUrl = 'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=';
  static const String mapLibreDemoStyleUrl = 'https://demotiles.maplibre.org/style.json';
}
