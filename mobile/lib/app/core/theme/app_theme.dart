import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../common/constants/app_constants.dart';

/// Official Onbora Sales Design System Theme Configuration
/// Implements Apple Liquid Glass & Concentricity Guidelines:
/// - Native Apple SF Pro Typography: Bolder, left-aligned, Dynamic Type compatible
/// - Concentric Shapes & Radii: 20px cards, 16px buttons, 999px capsules
/// - Semantic Surfaces: Noir Chaud (#242124) + Cartes Harmonieuses (#2F2C30)
/// - Signature Royal Cobalt Blue (#4F6CE8) for primary CTAs and notification badges
class AppTheme {
  // --- Theme Clair (Apple Luxury Studio & Pure Contrast) ---
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      fontFamily: AppConstants.fontFamilyPrimary,
      brightness: Brightness.light,
      primaryColor: AppConstants.primaryBlue,
      scaffoldBackgroundColor: AppConstants.backgroundLight,
      cardColor: AppConstants.cardLight,
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: ZoomPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
      colorScheme: const ColorScheme.light(
        primary: AppConstants.primaryBlue,
        secondary: AppConstants.primaryBlack,
        tertiary: AppConstants.accentAmber,
        surface: AppConstants.cardLight,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: AppConstants.textDark,
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(fontFamily: AppConstants.fontFamilyPrimary, fontSize: AppConstants.fontSizeHero, fontWeight: FontWeight.w700, color: AppConstants.textDark, letterSpacing: -0.6, height: 1.15),
        titleLarge: TextStyle(fontFamily: AppConstants.fontFamilyPrimary, fontSize: AppConstants.fontSizeTitle, fontWeight: FontWeight.w600, color: AppConstants.textDark, letterSpacing: -0.35, height: 1.22),
        titleMedium: TextStyle(fontFamily: AppConstants.fontFamilyPrimary, fontSize: AppConstants.fontSizeLg, fontWeight: FontWeight.w600, color: AppConstants.textDark, letterSpacing: -0.2),
        bodyLarge: TextStyle(fontFamily: AppConstants.fontFamilyPrimary, fontSize: AppConstants.fontSizeMd, fontWeight: FontWeight.w400, color: AppConstants.textDark, height: 1.4),
        bodyMedium: TextStyle(fontFamily: AppConstants.fontFamilyPrimary, fontSize: AppConstants.fontSizeSm, fontWeight: FontWeight.w400, color: AppConstants.textSecondaryLight, height: 1.4),
        labelLarge: TextStyle(fontFamily: AppConstants.fontFamilyPrimary, fontSize: AppConstants.fontSizeMd, fontWeight: FontWeight.w600, color: Colors.white),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: AppConstants.textDark),
        titleTextStyle: TextStyle(fontFamily: AppConstants.fontFamilyPrimary, fontSize: AppConstants.fontSizeXl, fontWeight: FontWeight.w600, color: AppConstants.textDark, letterSpacing: -0.2),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppConstants.primaryBlue,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppConstants.primaryBlue.withValues(alpha: 0.4),
          disabledForegroundColor: Colors.white70,
          elevation: 0,
          minimumSize: const Size.fromHeight(48),
          padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingXl, vertical: 13),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton)),
          textStyle: const TextStyle(fontFamily: AppConstants.fontFamilyPrimary, fontSize: AppConstants.fontSizeMd, fontWeight: FontWeight.w600, color: Colors.white),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppConstants.textDark,
          side: const BorderSide(color: AppConstants.textDark, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton)),
          textStyle: const TextStyle(fontFamily: AppConstants.fontFamilyPrimary, fontSize: AppConstants.fontSizeSm, fontWeight: FontWeight.w600),
        ),
      ),
      cardTheme: CardThemeData(
        color: AppConstants.cardLight,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleCard),
          side: BorderSide.none,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
          borderSide: const BorderSide(color: AppConstants.primaryBlue, width: 1.5),
        ),
        hintStyle: const TextStyle(fontFamily: AppConstants.fontFamilyPrimary, color: AppConstants.textSecondaryLight, fontSize: AppConstants.fontSizeSm, fontWeight: FontWeight.w400),
        labelStyle: const TextStyle(fontFamily: AppConstants.fontFamilyPrimary, color: AppConstants.textDark, fontSize: AppConstants.fontSizeSm, fontWeight: FontWeight.w500),
      ),
    );
  }

  // --- Theme Sombre (OLED Noir Profond #181F20 & Cartes Grises Apple #1C1C1E) ---
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      fontFamily: AppConstants.fontFamilyPrimary,
      brightness: Brightness.dark,
      primaryColor: AppConstants.primaryBlue,
      scaffoldBackgroundColor: AppConstants.backgroundDark,
      cardColor: AppConstants.cardDark,
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: ZoomPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
      colorScheme: const ColorScheme.dark(
        primary: AppConstants.primaryBlue,
        secondary: AppConstants.pureWhite,
        surface: AppConstants.cardDark,
        onPrimary: Colors.white,
        onSecondary: AppConstants.pureBlack,
        onSurface: Colors.white,
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(fontFamily: AppConstants.fontFamilyPrimary, fontSize: AppConstants.fontSizeHero, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: -0.6, height: 1.15),
        titleLarge: TextStyle(fontFamily: AppConstants.fontFamilyPrimary, fontSize: AppConstants.fontSizeTitle, fontWeight: FontWeight.w600, color: Colors.white, letterSpacing: -0.35, height: 1.22),
        titleMedium: TextStyle(fontFamily: AppConstants.fontFamilyPrimary, fontSize: AppConstants.fontSizeLg, fontWeight: FontWeight.w600, color: Colors.white, letterSpacing: -0.2),
        bodyLarge: TextStyle(fontFamily: AppConstants.fontFamilyPrimary, fontSize: AppConstants.fontSizeMd, fontWeight: FontWeight.w400, color: Colors.white, height: 1.4),
        bodyMedium: TextStyle(fontFamily: AppConstants.fontFamilyPrimary, fontSize: AppConstants.fontSizeSm, fontWeight: FontWeight.w400, color: AppConstants.textSecondaryDark, height: 1.4),
        labelLarge: TextStyle(fontFamily: AppConstants.fontFamilyPrimary, fontSize: AppConstants.fontSizeMd, fontWeight: FontWeight.w600, color: Colors.white),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: Colors.white),
        titleTextStyle: TextStyle(fontFamily: AppConstants.fontFamilyPrimary, fontSize: AppConstants.fontSizeXl, fontWeight: FontWeight.w600, color: Colors.white, letterSpacing: -0.2),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppConstants.primaryBlue,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppConstants.primaryBlue.withValues(alpha: 0.4),
          disabledForegroundColor: Colors.white70,
          elevation: 0,
          minimumSize: const Size.fromHeight(48),
          padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingXl, vertical: 13),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton)),
          textStyle: const TextStyle(fontFamily: AppConstants.fontFamilyPrimary, fontSize: AppConstants.fontSizeMd, fontWeight: FontWeight.w600, color: Colors.white),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.white,
          side: const BorderSide(color: Colors.white, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton)),
          textStyle: const TextStyle(fontFamily: AppConstants.fontFamilyPrimary, fontSize: AppConstants.fontSizeSm, fontWeight: FontWeight.w600),
        ),
      ),
      cardTheme: CardThemeData(
        color: AppConstants.cardDark,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleCard),
          side: BorderSide.none,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppConstants.cardDark,
        contentPadding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
          borderSide: const BorderSide(color: AppConstants.primaryBlue, width: 1.5),
        ),
        hintStyle: const TextStyle(fontFamily: AppConstants.fontFamilyPrimary, color: AppConstants.textSecondaryDark, fontSize: AppConstants.fontSizeSm, fontWeight: FontWeight.w400),
        labelStyle: const TextStyle(fontFamily: AppConstants.fontFamilyPrimary, color: Colors.white, fontSize: AppConstants.fontSizeSm, fontWeight: FontWeight.w500),
      ),
    );
  }
}
