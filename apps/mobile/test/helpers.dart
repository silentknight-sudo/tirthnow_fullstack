import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tirth_now/core/providers.dart';
import 'package:tirth_now/core/storage/token_store.dart';
import 'package:tirth_now/core/theme/app_theme.dart';
import 'package:tirth_now/l10n/app_localizations.dart';

/// Pumps [child] inside the app theme, localisations and a ProviderScope
/// with in-memory storage (no platform channels in widget tests).
Future<void> pumpApp(
  WidgetTester tester,
  Widget child, {
  List<Override> overrides = const [],
  String lang = 'en',
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [tokenStoreProvider.overrideWithValue(MemoryTokenStore()), ...overrides],
      child: MaterialApp(
        theme: TnTheme.light(),
        locale: Locale(lang),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: child,
      ),
    ),
  );
  await tester.pump();
}
