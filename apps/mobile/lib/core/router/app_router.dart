import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/ai/presentation/guide_screen.dart';
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

/// Re-runs redirects when the session changes.
class _SessionListenable extends ChangeNotifier {
  _SessionListenable(Ref ref) {
    ref.listen(sessionProvider, (_, _) => notifyListeners());
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
      if (s.restoring) return state.matchedLocation == '/splash' ? null : '/splash';
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
  Widget build(BuildContext context) => Scaffold(
    body: Center(
      child: Image.asset('assets/images/logo.png', height: 160, semanticLabel: 'Tirth Now'),
    ),
  );
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
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.home_outlined),
            selectedIcon: const Icon(Icons.home),
            label: l.navHome,
          ),
          NavigationDestination(
            icon: const Icon(Icons.temple_hindu_outlined),
            selectedIcon: const Icon(Icons.temple_hindu),
            label: l.navTemples,
          ),
          NavigationDestination(
            icon: const Icon(Icons.luggage_outlined),
            selectedIcon: const Icon(Icons.luggage),
            label: l.navBook,
          ),
          NavigationDestination(
            icon: const Icon(Icons.auto_awesome_outlined),
            selectedIcon: const Icon(Icons.auto_awesome),
            label: l.navGuide,
          ),
          NavigationDestination(
            icon: const Icon(Icons.person_outline),
            selectedIcon: const Icon(Icons.person),
            label: l.navProfile,
          ),
        ],
      ),
    );
  }
}
