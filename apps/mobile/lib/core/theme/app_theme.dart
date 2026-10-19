import 'package:flutter/material.dart';

/// Brand tokens, taken from the logo and shared with the website
/// (temple navy, saffron flag, warm white paper).
abstract final class TnColors {
  static const paper = Color(0xFFF7F6F1);
  static const paper2 = Color(0xFFEDEAE0);
  static const card = Color(0xFFFFFFFF);
  static const ink = Color(0xFF14233D);
  static const navy = Color(0xFF1C3C6B);
  static const accent = Color(0xFFC9692A);
  static const accentSoft = Color(0xFFE9A15F);
  static const saffron = Color(0xFFE07A2E);
  static const muted = Color(0xFF5E6B80);
  static const night = Color(0xFF0C1A30);
  static const line = Color(0x2E1C3C6B);
  static const sos = Color(0xFFB3261E);
  static const success = Color(0xFF3F7A3F);
}

/// Cormorant's default old-style numerals make times like 07:45 hard to scan.
const liningFigures = [FontFeature.liningFigures(), FontFeature.tabularFigures()];

abstract final class TnTheme {
  static const _display = 'Cormorant';

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: TnColors.navy,
      primary: TnColors.navy,
      onPrimary: TnColors.paper,
      secondary: TnColors.accent,
      tertiary: TnColors.saffron,
      surface: TnColors.paper,
      onSurface: TnColors.ink,
      error: TnColors.sos,
    );
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      fontFamilyFallback: const ['TiroDevanagari'],
    );
    final text = base.textTheme.apply(bodyColor: TnColors.ink, displayColor: TnColors.navy);
    return base.copyWith(
      scaffoldBackgroundColor: TnColors.paper,
      textTheme: text.copyWith(
        headlineLarge: text.headlineLarge?.copyWith(
          fontFamily: _display,
          fontWeight: FontWeight.w600,
          fontFeatures: liningFigures,
        ),
        headlineMedium: text.headlineMedium?.copyWith(
          fontFamily: _display,
          fontWeight: FontWeight.w600,
          fontFeatures: liningFigures,
        ),
        headlineSmall: text.headlineSmall?.copyWith(
          fontFamily: _display,
          fontWeight: FontWeight.w600,
          fontFeatures: liningFigures,
        ),
        titleLarge: text.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        titleMedium: text.titleMedium?.copyWith(fontWeight: FontWeight.w600),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: TnColors.paper,
        foregroundColor: TnColors.navy,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFeatures: liningFigures,
          fontSize: 20,
          fontWeight: FontWeight.w800,
          color: TnColors.navy,
        ),
      ),
      cardTheme: CardThemeData(
        color: TnColors.card,
        elevation: 2,
        shadowColor: const Color(0x261C3C6B),
        surfaceTintColor: Colors.transparent,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: TnColors.line),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: TnColors.navy,
          foregroundColor: TnColors.paper,
          minimumSize: const Size(48, 48),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: TnColors.navy,
          minimumSize: const Size(48, 48),
          side: const BorderSide(color: TnColors.accent),
          shape: const StadiumBorder(),
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: TnColors.card,
        selectedColor: TnColors.navy,
        side: const BorderSide(color: TnColors.line),
        shape: const StadiumBorder(),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: TnColors.card,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(28),
          borderSide: const BorderSide(color: TnColors.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(28),
          borderSide: const BorderSide(color: TnColors.line),
        ),
      ),
      navigationBarTheme: const NavigationBarThemeData(
        backgroundColor: TnColors.card,
        indicatorColor: Color(0x29C9692A),
      ),
      dividerTheme: const DividerThemeData(color: TnColors.line),
    );
  }
}
