import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/widgets/common.dart';
import '../listings/listings_screen.dart';
import '../orders/orders_screen.dart';
import '../profile/more_screen.dart';
import '../vendor/data/vendor_repository.dart';
import 'dashboard_screen.dart';

/// Approved partners: Dashboard · Orders · Listings · More.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final vendor = ref.watch(myVendorProvider).value;
    if (vendor == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final pages = [
      DashboardScreen(vendor: vendor, onOpenTab: (i) => setState(() => _tab = i)),
      OrdersScreen(vendor: vendor),
      ListingsScreen(vendor: vendor),
      MoreScreen(vendor: vendor),
    ];
    return Scaffold(
      body: IndexedStack(index: _tab, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.insights_outlined),
            selectedIcon: const Icon(Icons.insights_rounded),
            label: l.tabDashboard,
          ),
          NavigationDestination(
            icon: const Icon(Icons.receipt_long_outlined),
            selectedIcon: const Icon(Icons.receipt_long_rounded),
            label: l.tabOrders,
          ),
          NavigationDestination(
            icon: const Icon(Icons.inventory_2_outlined),
            selectedIcon: const Icon(Icons.inventory_2_rounded),
            label: l.tabListings,
          ),
          NavigationDestination(
            icon: const Icon(Icons.grid_view_outlined),
            selectedIcon: const Icon(Icons.grid_view_rounded),
            label: l.tabMore,
          ),
        ],
      ),
    );
  }
}
