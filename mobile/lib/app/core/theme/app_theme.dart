import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../common/constants/app_constants.dart';

/// Official Orange Brand Design System Theme Configuration
/// Implements the 80/20 rule:
/// - 80% Core: Deep Obsidian Black (#000000 / #141414) & Crisp Pure White (#FFFFFF)
/// - 20% Accent: Signature Orange (#FF7900) for primary CTAs and active states
/// - Typography 75: Thick, direct, high-contrast, essential (Bold 700 / ExtraBold 800 / Black 900)
class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: AppConstants.orangeOfficial,
      scaffoldBackgroundColor: AppConstants.backgroundLight,
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: ZoomPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
      colorScheme: const ColorScheme.light(
        primary: AppConstants.orangeOfficial,
        secondary: AppConstants.pureBlack,
        tertiary: AppConstants.accentYellowLight,
        surface: AppConstants.pureWhite,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: AppConstants.textDark,
      ),
      textTheme: GoogleFonts.interTextTheme().copyWith(
        displayLarge: GoogleFonts.inter(fontSize: AppConstants.fontSizeHero, fontWeight: FontWeight.w900, color: AppConstants.textDark, letterSpacing: -0.5),
        titleLarge: GoogleFonts.inter(fontSize: AppConstants.fontSizeTitle, fontWeight: FontWeight.w800, color: AppConstants.textDark, letterSpacing: -0.3),
        titleMedium: GoogleFonts.inter(fontSize: AppConstants.fontSizeLg, fontWeight: FontWeight.w700, color: AppConstants.textDark),
        bodyLarge: GoogleFonts.inter(fontSize: AppConstants.fontSizeMd, fontWeight: FontWeight.w500, color: AppConstants.textDark),
        bodyMedium: GoogleFonts.inter(fontSize: AppConstants.fontSizeSm, fontWeight: FontWeight.normal, color: AppConstants.textSecondaryLight),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        iconTheme: const IconThemeData(color: AppConstants.textDark),
        titleTextStyle: GoogleFonts.inter(fontSize: AppConstants.fontSizeXl, fontWeight: FontWeight.w800, color: AppConstants.textDark),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppConstants.orangeOfficial,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppConstants.orangeOfficial.withValues(alpha: 0.4),
          disabledForegroundColor: Colors.white70,
          elevation: 0,
          minimumSize: const Size.fromHeight(48),
          padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingXl, vertical: 13),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd)),
          textStyle: GoogleFonts.inter(fontSize: AppConstants.fontSizeMd, fontWeight: FontWeight.w800, color: Colors.white),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppConstants.textDark,
          side: const BorderSide(color: AppConstants.textDark, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd)),
          textStyle: GoogleFonts.inter(fontSize: AppConstants.fontSizeSm, fontWeight: FontWeight.w700),
        ),
      ),
      cardTheme: CardThemeData(
        color: AppConstants.pureWhite,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusLg),
          side: const BorderSide(color: AppConstants.borderLight, width: 1.0),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
          borderSide: const BorderSide(color: AppConstants.borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
          borderSide: const BorderSide(color: AppConstants.borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
          borderSide: const BorderSide(color: AppConstants.orangeOfficial, width: 2),
        ),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: AppConstants.orangeOfficial,
      scaffoldBackgroundColor: AppConstants.pureBlack,
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: ZoomPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
      colorScheme: const ColorScheme.dark(
        primary: AppConstants.orangeOfficial,
        secondary: AppConstants.pureWhite,
        surface: AppConstants.primaryDark,
        onPrimary: Colors.white,
        onSecondary: AppConstants.pureBlack,
        onSurface: Colors.white,
      ),
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).copyWith(
        displayLarge: GoogleFonts.inter(fontSize: AppConstants.fontSizeHero, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5),
        titleLarge: GoogleFonts.inter(fontSize: AppConstants.fontSizeTitle, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: -0.3),
        titleMedium: GoogleFonts.inter(fontSize: AppConstants.fontSizeLg, fontWeight: FontWeight.w700, color: Colors.white),
        bodyLarge: GoogleFonts.inter(fontSize: AppConstants.fontSizeMd, fontWeight: FontWeight.w500, color: Colors.white),
        bodyMedium: GoogleFonts.inter(fontSize: AppConstants.fontSizeSm, fontWeight: FontWeight.normal, color: AppConstants.textSecondaryDark),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        iconTheme: const IconThemeData(color: Colors.white),
        titleTextStyle: GoogleFonts.inter(fontSize: AppConstants.fontSizeXl, fontWeight: FontWeight.w800, color: Colors.white),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppConstants.orangeOfficial,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppConstants.orangeOfficial.withValues(alpha: 0.4),
          disabledForegroundColor: Colors.white70,
          elevation: 0,
          minimumSize: const Size.fromHeight(48),
          padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingXl, vertical: 13),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd)),
          textStyle: GoogleFonts.inter(fontSize: AppConstants.fontSizeMd, fontWeight: FontWeight.w800, color: Colors.white),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.white,
          side: const BorderSide(color: Colors.white, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd)),
          textStyle: GoogleFonts.inter(fontSize: AppConstants.fontSizeSm, fontWeight: FontWeight.w700),
        ),
      ),
      cardTheme: CardThemeData(
        color: AppConstants.primaryDark,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusLg),
          side: const BorderSide(color: AppConstants.cardDarkBorder, width: 1.0),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppConstants.primaryDark,
        contentPadding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
          borderSide: const BorderSide(color: AppConstants.cardDarkBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
          borderSide: const BorderSide(color: AppConstants.cardDarkBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
          borderSide: const BorderSide(color: AppConstants.orangeOfficial, width: 2),
        ),
      ),
    );
  }
}
