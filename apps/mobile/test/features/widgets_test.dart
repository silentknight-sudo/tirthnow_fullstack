import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tirth_now/core/api/api_models.dart';
import 'package:tirth_now/features/auth/presentation/login_screen.dart';
import 'package:tirth_now/features/bookings/presentation/orders_screens.dart';
import 'package:tirth_now/features/catalog/presentation/aarti_widgets.dart';

import '../helpers.dart';

AartiInstanceResponse aartiIn(Duration d) {
  final starts = DateTime.now().toUtc().add(d);
  return AartiInstanceResponse(
    scheduleId: 's1',
    templeId: 't1',
    templeName: 'ISKCON Krishna Balaram',
    kind: 'sandhya',
    name: 'Sandhya Arati',
    date: '2026-10-18',
    localTime: '18:30',
    startsAt: starts.toIso8601String(),
    endsAt: starts.add(const Duration(minutes: 20)).toIso8601String(),
    isLiveStreamed: false,
  );
}

void main() {
  group('LoginScreen', () {
    testWidgets('rejects an invalid phone number', (tester) async {
      await pumpApp(tester, const LoginScreen());
      await tester.enterText(find.byKey(const Key('phone')), '12345');
      await tester.tap(find.text('Send OTP'));
      await tester.pump();
      expect(find.text('Enter a valid 10-digit Indian mobile number.'), findsOneWidget);
      expect(find.byKey(const Key('otp')), findsNothing);
    });

    testWidgets('moves to the OTP step and shows the test-mode hint', (tester) async {
      await pumpApp(tester, const LoginScreen());
      await tester.enterText(find.byKey(const Key('phone')), '9812345678');
      await tester.tap(find.text('Send OTP'));
      await tester.pumpAndSettle();
      expect(find.text('We sent a code to +919812345678'), findsOneWidget);
      expect(find.text('Test mode: use 123456'), findsOneWidget);
    });

    testWidgets('renders in Hindi', (tester) async {
      await pumpApp(tester, const LoginScreen(), lang: 'hi');
      expect(find.text('हर तीर्थ, अभी।'), findsOneWidget);
      expect(find.text('OTP भेजें'), findsOneWidget);
    });
  });

  testWidgets('NextAartiCard shows the aarti and a live countdown', (tester) async {
    await pumpApp(
      tester,
      Scaffold(body: NextAartiCard(aarti: aartiIn(const Duration(hours: 1, minutes: 30)))),
    );
    expect(find.text('Sandhya Arati'), findsOneWidget);
    expect(find.textContaining('18:30 IST'), findsOneWidget);
    expect(find.textContaining(RegExp(r'^01:(29|30):\d\d$')), findsOneWidget);
    await tester.pump(const Duration(seconds: 2));
    expect(find.textContaining(RegExp(r'^01:29:\d\d$')), findsOneWidget);
  });

  testWidgets('an aarti already under way says so instead of counting down', (tester) async {
    await pumpApp(
      tester,
      Scaffold(body: NextAartiCard(aarti: aartiIn(const Duration(minutes: -5)))),
    );
    expect(find.text('Happening now'), findsOneWidget);
    expect(find.text('00:00:00'), findsNothing);
  });

  testWidgets('order status labels are localised', (tester) async {
    late String en;
    late String hi;
    await pumpApp(
      tester,
      Builder(
        builder: (c) {
          en = orderStatusLabel(c, 'confirmed');
          return const SizedBox();
        },
      ),
    );
    await pumpApp(
      tester,
      Builder(
        builder: (c) {
          hi = orderStatusLabel(c, 'confirmed');
          return const SizedBox();
        },
      ),
      lang: 'hi',
    );
    expect(en, 'Confirmed');
    expect(hi, 'पक्का');
  });
}
