import 'package:flutter/material.dart';

/// Brand tokens, taken from the logo and shared with the website
/// (cream paper, temple brown, antique gold, saffron).
abstract final class TnColors {
  static const paper = Color(0xFFF6EEDD);
  static const paper2 = Color(0xFFEFE3C8);
  static const card = Color(0xFFFFFAF0);
  static const ink = Color(0xFF3B2414);
  static const brown = Color(0xFF6B3F1F);
  static const gold = Color(0xFFB8862F);
  static const goldSoft = Color(0xFFD9B26A);
  static const saffron = Color(0xFFD9772B);
  static const muted = Color(0xFF7D6650);
  static const night = Color(0xFF1D120A);
  static const line = Color(0x2E6B3F1F);
  static const sos = Color(0xFFB3261E);
  static const success = Color(0xFF3F7A3F);
}

/// Cormorant's default old-style numerals make times like 07:45 hard to scan.
const liningFigures = [FontFeature.liningFigures(), FontFeature.tabularFigures()];

abstract final class TnTheme {
  static const _display = 'Cormorant';

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: TnColors.brown,
      primary: TnColors.brown,
      onPrimary: TnColors.paper,
      secondary: TnColors.gold,
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
    final text = base.textTheme.apply(bodyColor: TnColors.ink, displayColor: TnColors.brown);
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
        titleLarge: text.titleLarge?.copyWith(fontFamily: _display, fontWeight: FontWeight.w700),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: TnColors.paper,
        foregroundColor: TnColors.brown,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFamily: _display,
          fontFeatures: liningFigures,
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: TnColors.brown,
        ),
      ),
      cardTheme: CardThemeData(
        color: TnColors.card,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: TnColors.line),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: TnColors.brown,
          foregroundColor: TnColors.paper,
          minimumSize: const Size(48, 48),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: TnColors.brown,
          minimumSize: const Size(48, 48),
          side: const BorderSide(color: TnColors.gold),
          shape: const StadiumBorder(),
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: TnColors.card,
        selectedColor: TnColors.brown,
        side: const BorderSide(color: TnColors.line),
        shape: const StadiumBorder(),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: TnColors.card,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: TnColors.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: TnColors.line),
        ),
      ),
      navigationBarTheme: const NavigationBarThemeData(
        backgroundColor: TnColors.card,
        indicatorColor: Color(0x29B8862F),
      ),
      dividerTheme: const DividerThemeData(color: TnColors.line),
    );
  }
}
