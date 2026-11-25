import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';

import 'app.dart';
import 'core/cache/json_cache.dart';
import 'core/config/app_config.dart';
import 'core/providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Keep more decoded images in memory so scrolling back does not re-decode.
  PaintingBinding.instance.imageCache
    ..maximumSize = 300
    ..maximumSizeBytes = 150 << 20;
  final config = AppConfig.fromEnvironment();
  // Formatters without an explicit locale would otherwise use the device
  // locale, and an unusual one (e.g. "en-US@posix") throws at start-up.
  Intl.defaultLocale = 'en';
  await initializeDateFormatting('en');
  await initializeDateFormatting('hi');
  if (config.authProvider == AuthProviderKind.firebase) {
    // Uses the platform files from docs/CLIENT_SETUP_TODO.md.
    await Firebase.initializeApp();
  }
  final cache = await HiveJsonCache.open();
  runApp(
    ProviderScope(
      overrides: [
        appConfigProvider.overrideWithValue(config),
        jsonCacheProvider.overrideWithValue(cache),
      ],
      child: const TirthNowApp(),
    ),
  );
}
