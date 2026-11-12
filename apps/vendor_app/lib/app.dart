import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/providers.dart';
import 'core/router.dart';
import 'core/theme/app_theme.dart';
import 'l10n/app_localizations.dart';

class PartnerApp extends ConsumerWidget {
  const PartnerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'TirthNow Partner',
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
      routerConfig: ref.watch(routerProvider),
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
