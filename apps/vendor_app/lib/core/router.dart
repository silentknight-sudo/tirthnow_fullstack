import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/data/session_controller.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/dashboard/home_shell.dart';
import '../features/onboarding/kyc_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/onboarding/waiting_screen.dart';
import '../features/vendor/data/vendor_repository.dart';

/// Where a partner belongs right now: login → choose service → KYC →
/// waiting for approval → dashboard.
String? partnerStage(Ref ref) {
  final s = ref.read(sessionProvider);
  if (s.restoring) return '/splash';
  if (!s.signedIn || s.isGuest) return '/login';
  final v = ref.read(myVendorProvider);
  if (v.isLoading && !v.hasValue) return '/splash';
  final vendor = v.value;
  if (vendor == null) return '/onboarding';
  return switch (vendor.status) {
    'draft' || 'kyc_rejected' => '/kyc',
    'kyc_pending' || 'suspended' => '/waiting',
    _ => '/home',
  };
}

class _Refresh extends ChangeNotifier {
  void ping() => notifyListeners();
}

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _Refresh();
  ref
    ..listen(sessionProvider, (_, _) => refresh.ping())
    ..listen(myVendorProvider, (_, _) => refresh.ping())
    ..onDispose(refresh.dispose);
  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final stage = partnerStage(ref);
      final loc = state.matchedLocation;
      if (stage == '/home') {
        return loc.startsWith('/home') ? null : '/home';
      }
      // Partners with rejected KYC may still look at the waiting screen.
      if (stage == '/kyc' && loc == '/kyc') return null;
      return loc == stage ? null : stage;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const _Splash()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/onboarding', builder: (_, _) => const OnboardingScreen()),
      GoRoute(path: '/kyc', builder: (_, _) => const KycScreen()),
      GoRoute(path: '/waiting', builder: (_, _) => const WaitingScreen()),
      GoRoute(path: '/home', builder: (_, _) => const HomeShell()),
    ],
  );
});

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) =>
      Scaffold(body: Center(child: Image.asset('assets/images/logo.png', width: 96)));
}
