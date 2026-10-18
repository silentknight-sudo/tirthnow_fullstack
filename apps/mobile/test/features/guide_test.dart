import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tirth_now/core/api/api_client.dart';
import 'package:tirth_now/core/api/api_models.dart';
import 'package:tirth_now/core/storage/token_store.dart';
import 'package:tirth_now/features/ai/data/ai_repository.dart';
import 'package:tirth_now/features/ai/presentation/guide_screen.dart';
import 'package:tirth_now/features/auth/data/session_controller.dart';

import '../helpers.dart';

class FakeAi extends AiRepository {
  FakeAi()
    : super(ApiClient(baseUrl: 'http://unused', tokens: MemoryTokenStore(), language: () => 'en'));

  final asked = <String>[];

  @override
  Future<String> createSession(String lang) async => 'session-1';

  @override
  Stream<GuideEvent> ask(String sessionId, String content) async* {
    asked.add(content);
    for (final t in ['From the temple schedule: ', 'Sandhya Arati ', '18:30 IST']) {
      await Future<void>.delayed(const Duration(milliseconds: 10));
      yield GuideToken(t);
    }
    yield GuideCitation(const Citation(n: 1, title: 'ISKCON Vrindavan — temple guide'));
    yield GuideDone();
  }
}

class SignedIn extends SessionController {
  @override
  Session build() => const Session(
    user: AuthUserResponse(
      id: 'u1',
      email: null,
      phoneE164: '+919812345678',
      displayName: null,
      isGuest: false,
      roles: ['user'],
      vendorIds: [],
    ),
  );
}

void main() {
  testWidgets('a suggestion streams an answer with its citation', (tester) async {
    final ai = FakeAi();
    await pumpApp(
      tester,
      const GuideScreen(),
      overrides: [
        aiRepositoryProvider.overrideWithValue(ai),
        sessionProvider.overrideWith(SignedIn.new),
      ],
    );
    await tester.tap(find.text('ISKCON Vrindavan sandhya aarti kab hai?'));
    await tester.pump();
    expect(
      find.text('ISKCON Vrindavan sandhya aarti kab hai?'),
      findsOneWidget,
      reason: 'user bubble replaces suggestions',
    );
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump();
    expect(ai.asked.single, 'ISKCON Vrindavan sandhya aarti kab hai?');
    expect(find.text('From the temple schedule: Sandhya Arati 18:30 IST'), findsOneWidget);
    expect(find.text('[1] ISKCON Vrindavan — temple guide'), findsOneWidget);
  });

  testWidgets('typing and pressing send asks the guide', (tester) async {
    final ai = FakeAi();
    await pumpApp(
      tester,
      const GuideScreen(),
      overrides: [
        aiRepositoryProvider.overrideWithValue(ai),
        sessionProvider.overrideWith(SignedIn.new),
      ],
    );
    await tester.enterText(find.byType(TextField), 'Govardhan parikrama?');
    await tester.tap(find.byTooltip('Send'));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump();
    expect(ai.asked.single, 'Govardhan parikrama?');
  });
}
