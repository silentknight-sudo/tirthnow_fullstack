import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_models.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../auth/data/session_controller.dart';
import '../coupons/coupons_screen.dart';
import '../shared/partner_ui.dart';
import 'reviews_screen.dart';

/// Coupons, reviews, business profile, language, sign out.
class MoreScreen extends ConsumerWidget {
  const MoreScreen({required this.vendor, super.key});

  final VendorResponse vendor;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final svc = serviceFor(vendor.type);
    final lang = ref.watch(localeProvider).languageCode;
    final (statusText, statusColor) = switch (vendor.status) {
      'active' => (l.statusActive, TnColors.success),
      'kyc_pending' => (l.statusPending, TnColors.accent),
      'kyc_rejected' => (l.statusRejected, TnColors.sos),
      'suspended' => (l.statusSuspended, TnColors.sos),
      _ => (l.statusDraft, TnColors.muted),
    };
    void open(Widget page) =>
        Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page));
    return Scaffold(
      appBar: AppBar(title: Text(l.tabMore)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          PanelCard(
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Image.asset(svc.image, width: 68, height: 54, fit: BoxFit.cover),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        vendor.displayName,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                      ),
                      Text(
                        vendor.legalName,
                        style: const TextStyle(color: TnColors.muted, fontSize: 12.5),
                      ),
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 6,
                        children: [
                          Pill(svc.title(l), color: TnColors.navy, icon: svc.icon),
                          Pill(statusText, color: statusColor, icon: Icons.verified_rounded),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _Tile(
            icon: Icons.local_offer_rounded,
            title: l.coupons,
            subtitle: l.couponsSub,
            onTap: () => open(CouponsScreen(vendorId: vendor.id)),
          ),
          _Tile(
            icon: Icons.star_rounded,
            title: l.reviews,
            subtitle: l.ratings,
            onTap: () => open(ReviewsScreen(vendorId: vendor.id)),
          ),
          _Tile(
            icon: Icons.badge_rounded,
            title: l.kycStatus,
            subtitle: [
              if (vendor.pan != null) 'PAN ${vendor.pan}',
              if (vendor.gstin != null) 'GSTIN ${vendor.gstin}',
              '${vendor.kycDocuments.length} ✓',
            ].join(' · '),
          ),
          _Tile(
            icon: Icons.translate_rounded,
            title: l.switchLanguage,
            subtitle: lang == 'hi' ? 'हिंदी' : 'English',
            onTap: () => ref.read(localeProvider.notifier).set(lang == 'hi' ? 'en' : 'hi'),
          ),
          _Tile(
            icon: Icons.support_agent_rounded,
            title: l.help,
            subtitle: 'partners@tirthnow.app',
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => ref.read(sessionProvider.notifier).signOut(),
            icon: const Icon(Icons.logout_rounded),
            label: Text(l.signOut),
            style: OutlinedButton.styleFrom(foregroundColor: TnColors.sos),
          ),
        ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.icon, required this.title, required this.subtitle, this.onTap});

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: PanelCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFFFF1E4),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: TnColors.accent),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                Text(subtitle, style: const TextStyle(color: TnColors.muted, fontSize: 12.5)),
              ],
            ),
          ),
          if (onTap != null) const Icon(Icons.chevron_right_rounded, color: TnColors.muted),
        ],
      ),
    ),
  );
}
