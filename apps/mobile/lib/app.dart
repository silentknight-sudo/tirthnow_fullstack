import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/providers.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'l10n/app_localizations.dart';

class TirthNowApp extends ConsumerWidget {
  const TirthNowApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'Tirth Now',
      debugShowCheckedModeBanner: false,
      theme: TnTheme.light(),
      locale: ref.watch(localeProvider),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      routerConfig: ref.watch(appRouterProvider),
      // Compact type: 90% of the phone's text size, and large system font
      // settings are capped so screens still fit.
      builder: (context, child) {
        final mq = MediaQuery.of(context);
        final system = mq.textScaler.scale(100) / 100;
        return MediaQuery(
          data: mq.copyWith(textScaler: TextScaler.linear(system.clamp(0.85, 1.15) * 0.9)),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}
