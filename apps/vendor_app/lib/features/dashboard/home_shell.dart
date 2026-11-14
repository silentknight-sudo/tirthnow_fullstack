import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../coupons/coupons_screen.dart';
import '../listings/listings_screen.dart';
import '../orders/orders_screen.dart';
import '../profile/more_screen.dart';
import '../shared/signature.dart';
import '../vendor/data/vendor_repository.dart';
import 'dashboard_screen.dart';

/// Approved partners: Dashboard · Orders · (+) · Listings · Account.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _tab = 0;

  void _quickActions(String vendorId, String name) {
    final l = context.l10n;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        margin: const EdgeInsets.all(14),
        padding: const EdgeInsets.fromLTRB(18, 14, 18, 22),
        decoration: BoxDecoration(
          gradient: Dusk.gradient,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: Dusk.stroke),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Dusk.stroke,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  for (final (icon, label, color, action) in [
                    (
                      Icons.add_box_rounded,
                      l.addListing,
                      PColors.gold,
                      () => setState(() => _tab = 2),
                    ),
                    (
                      Icons.local_offer_rounded,
                      l.addCoupon,
                      const Color(0xFFFF8FB1),
                      () => Navigator.of(context).push(
                        MaterialPageRoute<void>(builder: (_) => CouponsScreen(vendorId: vendorId)),
                      ),
                    ),
                    (
                      Icons.share_rounded,
                      l.shareStore,
                      const Color(0xFF7BE0A5),
                      () => launchUrl(
                        Uri.parse('https://wa.me/?text=${Uri.encodeComponent(l.shareText(name))}'),
                        mode: LaunchMode.externalApplication,
                      ),
                    ),
                  ])
                    Expanded(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(18),
                        onTap: () {
                          Navigator.pop(ctx);
                          action();
                        },
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Column(
                            children: [
                              Container(
                                width: 58,
                                height: 58,
                                decoration: BoxDecoration(
                                  color: color.withValues(alpha: 0.14),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: color.withValues(alpha: 0.4)),
                                ),
                                child: Icon(icon, color: color, size: 28),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                label,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

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
      extendBody: true,
      body: IndexedStack(index: _tab, children: pages),
      bottomNavigationBar: FloatingNav(
        index: _tab,
        onTap: (i) => setState(() => _tab = i),
        onCenter: () => _quickActions(vendor.id, vendor.displayName),
        items: [
          (Icons.space_dashboard_outlined, Icons.space_dashboard_rounded, l.tabDashboard),
          (Icons.receipt_long_outlined, Icons.receipt_long_rounded, l.tabOrders),
          (Icons.inventory_2_outlined, Icons.inventory_2_rounded, l.tabListings),
          (Icons.person_outline_rounded, Icons.person_rounded, l.tabAccount),
        ],
      ),
    );
  }
}
