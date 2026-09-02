import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../common/constants/app_constants.dart';

/// Official Onbora Sales Design System Theme Configuration
/// Implements Apple Liquid Glass & Concentricity Guidelines:
/// - Native System Typography (SF Pro on iOS / Roboto on Android): Bolder, left-aligned, Dynamic Type compatible
/// - Concentric Shapes & Radii: 22px cards, 16px buttons, 999px capsules
/// - Semantic Surfaces: Clean contrast without superfluous decorative borders
/// - Signature Electric Blue (#2563EB) for primary CTAs and active states
class AppTheme {
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
        secondary: AppConstants.pureBlack,
        tertiary: AppConstants.accentAmber,
        surface: AppConstants.cardLight,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: AppConstants.textDark,
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(fontSize: AppConstants.fontSizeHero, fontWeight: FontWeight.w900, color: AppConstants.textDark, letterSpacing: -0.5),
        titleLarge: TextStyle(fontSize: AppConstants.fontSizeTitle, fontWeight: FontWeight.w800, color: AppConstants.textDark, letterSpacing: -0.3),
        titleMedium: TextStyle(fontSize: AppConstants.fontSizeLg, fontWeight: FontWeight.w700, color: AppConstants.textDark),
        bodyLarge: TextStyle(fontSize: AppConstants.fontSizeMd, fontWeight: FontWeight.w500, color: AppConstants.textDark),
        bodyMedium: TextStyle(fontSize: AppConstants.fontSizeSm, fontWeight: FontWeight.normal, color: AppConstants.textSecondaryLight),
        labelLarge: TextStyle(fontSize: AppConstants.fontSizeMd, fontWeight: FontWeight.w800, color: Colors.white),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: AppConstants.textDark),
        titleTextStyle: TextStyle(fontSize: AppConstants.fontSizeXl, fontWeight: FontWeight.w800, color: AppConstants.textDark),
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
          textStyle: const TextStyle(fontSize: AppConstants.fontSizeMd, fontWeight: FontWeight.w800, color: Colors.white),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppConstants.textDark,
          side: const BorderSide(color: AppConstants.textDark, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton)),
          textStyle: const TextStyle(fontSize: AppConstants.fontSizeSm, fontWeight: FontWeight.w700),
        ),
      ),
      cardTheme: CardThemeData(
        color: AppConstants.cardLight,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleCard),
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
          borderSide: const BorderSide(color: AppConstants.primaryBlue, width: 2),
        ),
      ),
    );
  }

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
        displayLarge: TextStyle(fontSize: AppConstants.fontSizeHero, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5),
        titleLarge: TextStyle(fontSize: AppConstants.fontSizeTitle, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: -0.3),
        titleMedium: TextStyle(fontSize: AppConstants.fontSizeLg, fontWeight: FontWeight.w700, color: Colors.white),
        bodyLarge: TextStyle(fontSize: AppConstants.fontSizeMd, fontWeight: FontWeight.w500, color: Colors.white),
        bodyMedium: TextStyle(fontSize: AppConstants.fontSizeSm, fontWeight: FontWeight.normal, color: AppConstants.textSecondaryDark),
        labelLarge: TextStyle(fontSize: AppConstants.fontSizeMd, fontWeight: FontWeight.w800, color: Colors.white),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: Colors.white),
        titleTextStyle: TextStyle(fontSize: AppConstants.fontSizeXl, fontWeight: FontWeight.w800, color: Colors.white),
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
          textStyle: const TextStyle(fontSize: AppConstants.fontSizeMd, fontWeight: FontWeight.w800, color: Colors.white),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.white,
          side: const BorderSide(color: Colors.white, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton)),
          textStyle: const TextStyle(fontSize: AppConstants.fontSizeSm, fontWeight: FontWeight.w700),
        ),
      ),
      cardTheme: CardThemeData(
        color: AppConstants.cardDark,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleCard),
          side: const BorderSide(color: AppConstants.cardDarkBorder, width: 1.0),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppConstants.cardDark,
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
          borderSide: const BorderSide(color: AppConstants.primaryBlue, width: 2),
        ),
      ),
    );
  }
}
