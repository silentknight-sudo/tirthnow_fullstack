import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/ai/presentation/guide_screen.dart';
import '../../features/ai/presentation/identify.dart';
import '../../features/ai/presentation/planner_screen.dart';
import '../../features/auth/data/session_controller.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/bookings/presentation/book_hub_screen.dart';
import '../../features/bookings/presentation/cab_screen.dart';
import '../../features/bookings/presentation/experience_screens.dart';
import '../../features/bookings/presentation/food_screens.dart';
import '../../features/bookings/presentation/hotels_screens.dart';
import '../../features/bookings/presentation/orders_screens.dart';
import '../../features/catalog/presentation/temple_detail_screen.dart';
import '../../features/catalog/presentation/temples_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/profile/presentation/contacts_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/reels/presentation/reels_screen.dart';
import '../../features/safety/presentation/sos_screen.dart';
import '../../features/travel/presentation/weather_screen.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';

/// Keeps the splash on screen briefly at launch so it is seen, not flashed.
final _splashHoldProvider = FutureProvider<void>(
  (ref) => Future<void>.delayed(const Duration(milliseconds: 1800)),
);

/// Re-runs redirects when the session changes or the splash hold ends.
class _SessionListenable extends ChangeNotifier {
  _SessionListenable(Ref ref) {
    ref
      ..listen(sessionProvider, (_, _) => notifyListeners())
      ..listen(_splashHoldProvider, (_, _) => notifyListeners());
  }
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final refresh = _SessionListenable(ref);
  ref.onDispose(refresh.dispose);
  return GoRouter(
    initialLocation: '/',
    refreshListenable: refresh,
    redirect: (context, state) {
      final s = ref.read(sessionProvider);
      final atLogin = state.matchedLocation == '/login';
      if (s.restoring || ref.read(_splashHoldProvider).isLoading) {
        return state.matchedLocation == '/splash' ? null : '/splash';
      }
      // SOS must always be reachable, signed in or not.
      if (!s.signedIn && state.matchedLocation == '/sos') return null;
      if (!s.signedIn) return atLogin ? null : '/login';
      if (atLogin || state.matchedLocation == '/splash') return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const _Splash()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/sos', builder: (_, _) => const SosScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => _Shell(shell: shell),
        branches: [
          StatefulShellBranch(
            routes: [GoRoute(path: '/', builder: (_, _) => const HomeScreen())],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/temples',
                builder: (_, _) => const TemplesScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    builder: (_, s) => TempleDetailScreen(idOrSlug: s.pathParameters['id']!),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/book',
                builder: (_, _) => const BookHubScreen(),
                routes: [
                  GoRoute(
                    path: 'hotels',
                    builder: (_, _) => const HotelsScreen(),
                    routes: [
                      GoRoute(
                        path: ':id',
                        builder: (_, s) => HotelDetailScreen(id: s.pathParameters['id']!),
                      ),
                    ],
                  ),
                  GoRoute(path: 'cabs', builder: (_, _) => const CabScreen()),
                  GoRoute(
                    path: 'restaurants',
                    builder: (_, _) => const RestaurantsScreen(),
                    routes: [
                      GoRoute(
                        path: ':id',
                        builder: (_, s) => RestaurantDetailScreen(id: s.pathParameters['id']!),
                      ),
                    ],
                  ),
                  GoRoute(
                    path: 'experiences',
                    builder: (_, _) => const ExperiencesScreen(),
                    routes: [
                      GoRoute(
                        path: ':id',
                        builder: (_, s) => ExperienceDetailScreen(id: s.pathParameters['id']!),
                      ),
                    ],
                  ),
                  GoRoute(
                    path: 'orders',
                    builder: (_, _) => const OrdersScreen(),
                    routes: [
                      GoRoute(
                        path: ':id',
                        builder: (_, s) => OrderDetailScreen(id: s.pathParameters['id']!),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/guide',
                builder: (_, _) => const GuideScreen(),
                routes: [GoRoute(path: 'planner', builder: (_, _) => const PlannerScreen())],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (_, _) => const ProfileScreen(),
                routes: [GoRoute(path: 'contacts', builder: (_, _) => const ContactsScreen())],
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/notifications',
        builder: (_, _) => const NotificationsScreen(),
        routes: [GoRoute(path: 'settings', builder: (_, _) => const NotificationSettingsScreen())],
      ),
      GoRoute(
        path: '/reels',
        builder: (_, _) => const ReelsScreen(),
        routes: [GoRoute(path: 'saved', builder: (_, _) => const ReelsScreen(saved: true))],
      ),
      GoRoute(path: '/weather', builder: (_, _) => const WeatherScreen()),
    ],
  );
});

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset('assets/images/canva/splash.jpg', fit: BoxFit.cover),
          // Lighten the sky behind the logo so the navy wordmark reads.
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xCCFFFFFF),
                  Color(0x00FFFFFF),
                  Color(0x000C1A30),
                  Color(0x990C1A30),
                ],
                stops: [0, 0.42, 0.7, 1],
              ),
            ),
          ),
          SafeArea(
            child: Column(
              children: [
                const SizedBox(height: 56),
                Image.asset('assets/images/logo_full.png', height: 190, semanticLabel: 'TirthNow'),
                const SizedBox(height: 10),
                Text(
                  '— ${l.brandTagline} —',
                  style: const TextStyle(
                    color: TnColors.navy,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                Text(
                  l.splashSub,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 14),
                const SizedBox(
                  width: 120,
                  child: ClipRRect(
                    borderRadius: BorderRadius.all(Radius.circular(4)),
                    child: LinearProgressIndicator(
                      minHeight: 5,
                      color: TnColors.saffron,
                      backgroundColor: Color(0x66FFFFFF),
                    ),
                  ),
                ),
                const SizedBox(height: 36),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Bottom navigation plus an always-visible SOS button.
class _Shell extends StatelessWidget {
  const _Shell({required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Scaffold(
      body: shell,
      // Hidden on the guide tab, whose composer sits where the button would;
      // the guide's app bar carries its own SOS action.
      floatingActionButton: shell.currentIndex == 3
          ? null
          : FloatingActionButton(
              heroTag: 'sos',
              tooltip: l.sosTitle,
              backgroundColor: TnColors.sos,
              foregroundColor: Colors.white,
              onPressed: () => context.push('/sos'),
              child: const Text('SOS', style: TextStyle(fontWeight: FontWeight.w800)),
            ),
      // Home · AI Guide · Scan (camera) · My Trips · Profile. Temples and Book
      // stay as branches, reached from Home's quick access.
      bottomNavigationBar: _BottomBar(
        index: switch (shell.currentIndex) {
          3 => 1,
          2 => 3,
          4 => 4,
          _ => 0,
        },
        onSelect: (i) {
          switch (i) {
            case 0:
              shell.goBranch(0, initialLocation: shell.currentIndex == 0);
            case 1:
              shell.goBranch(3, initialLocation: shell.currentIndex == 3);
            case 2:
              unawaited(identifyTempleFromCamera(context));
            case 3:
              context.go('/book/orders');
            default:
              shell.goBranch(4, initialLocation: shell.currentIndex == 4);
          }
        },
        items: [
          (Icons.home_outlined, Icons.home_rounded, l.navHome),
          (Icons.smart_toy_outlined, Icons.smart_toy_rounded, l.aiGuide),
          (Icons.qr_code_scanner_rounded, Icons.qr_code_scanner_rounded, l.scan),
          (Icons.luggage_outlined, Icons.luggage, l.myTrips),
          (Icons.person_outline_rounded, Icons.person_rounded, l.navProfile),
        ],
      ),
    );
  }
}

/// Bottom bar with a raised centre button (Book), as in the home design.
class _BottomBar extends StatelessWidget {
  const _BottomBar({required this.index, required this.onSelect, required this.items});

  final int index;
  final ValueChanged<int> onSelect;
  final List<(IconData, IconData, String)> items;

  @override
  Widget build(BuildContext context) {
    final centre = items.length ~/ 2;
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        boxShadow: [BoxShadow(color: Color(0x1A1C3C6B), blurRadius: 16, offset: Offset(0, -2))],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 68,
          child: Row(
            children: [
              for (var i = 0; i < items.length; i++)
                Expanded(
                  child: Semantics(
                    button: true,
                    selected: i == index,
                    label: items[i].$3,
                    child: InkResponse(
                      onTap: () => onSelect(i),
                      child: i == centre
                          ? _centre(items[i], selected: i == index)
                          : _item(items[i], selected: i == index),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _item((IconData, IconData, String) item, {required bool selected}) {
    final color = selected ? TnColors.navy : TnColors.muted;
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: selected ? TnColors.navy : Colors.transparent,
            shape: BoxShape.circle,
          ),
          child: Icon(
            selected ? item.$2 : item.$1,
            color: selected ? Colors.white : color,
            size: 22,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          item.$3,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 11,
            color: color,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _centre((IconData, IconData, String) item, {required bool selected}) => Column(
    mainAxisAlignment: MainAxisAlignment.end,
    children: [
      Transform.translate(
        offset: const Offset(0, -14),
        child: Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [TnColors.navy, Color(0xFF27508A)]),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 4),
            boxShadow: const [
              BoxShadow(color: Color(0x401C3C6B), blurRadius: 12, offset: Offset(0, 4)),
            ],
          ),
          child: Icon(selected ? item.$2 : item.$1, color: Colors.white),
        ),
      ),
      Transform.translate(
        offset: const Offset(0, -10),
        child: Text(
          item.$3,
          style: TextStyle(
            fontSize: 11,
            color: selected ? TnColors.navy : TnColors.muted,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    ],
  );
}
