import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/api_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../coupons/coupons_screen.dart';
import '../shared/partner_ui.dart';

/// Ways to bring in more pilgrims.
class MarketingScreen extends StatelessWidget {
  const MarketingScreen({required this.vendor, super.key});

  final VendorResponse vendor;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    void coupons() =>
        Navigator.of(context)
            .push(MaterialPageRoute<void>(builder: (_) => CouponsScreen(vendorId: vendor.id)));
    return Scaffold(
      appBar: AppBar(title: Text(l.marketing)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          GrowthTile(
            icon: Icons.local_offer_rounded,
            color: const Color(0xFFE08A1E),
            title: l.addCoupon,
            subtitle: l.couponsSub,
            onTap: coupons,
          ),
          GrowthTile(
            icon: Icons.share_rounded,
            color: const Color(0xFF1FAF5A),
            title: l.shareStore,
            subtitle: l.shareStoreSub,
            onTap: () => launchUrl(
              Uri.parse(
                'https://wa.me/?text=${Uri.encodeComponent(l.shareText(vendor.displayName))}',
              ),
              mode: LaunchMode.externalApplication,
            ),
          ),
          GrowthTile(
            icon: Icons.celebration_rounded,
            color: const Color(0xFFD9467A),
            title: l.festivalCampaign,
            subtitle: l.festivalCampaignSub,
            onTap: coupons,
          ),
          GrowthTile(
            icon: Icons.rocket_launch_rounded,
            color: PColors.violet,
            title: l.promotions,
            subtitle: l.promotionsSub,
            badge: l.comingSoon,
          ),
          GrowthTile(
            icon: Icons.loyalty_rounded,
            color: const Color(0xFF2A7FD4),
            title: l.loyalty,
            subtitle: l.loyaltySub,
            badge: l.comingSoon,
          ),
        ],
      ),
    );
  }
}

class GrowthTile extends StatelessWidget {
  const GrowthTile({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    this.onTap,
    this.badge,
    super.key,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;
  final String? badge;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: PanelCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w800, color: PColors.night),
                ),
                const SizedBox(height: 2),
                Text(subtitle, style: const TextStyle(color: TnColors.muted, fontSize: 12.5)),
              ],
            ),
          ),
          if (badge != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFF1EEFB),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                badge!,
                style: const TextStyle(
                  fontSize: 10.5,
                  color: PColors.violet,
                  fontWeight: FontWeight.w700,
                ),
              ),
            )
          else
            const Icon(Icons.chevron_right_rounded, color: TnColors.muted),
        ],
      ),
    ),
  );
}
