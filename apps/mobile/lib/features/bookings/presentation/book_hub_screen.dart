import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';

class BookHubScreen extends StatelessWidget {
  const BookHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    // (icon, title, subtitle, route, icon colour, tint)
    final tiles = <(IconData, String, String, String, Color, Color)>[
      (
        Icons.apartment_rounded,
        l.stays,
        l.staysSub,
        '/book/hotels',
        const Color(0xFF4338CA),
        const Color(0xFFEEF0FF),
      ),
      (
        Icons.local_taxi_rounded,
        l.cabs,
        l.cabsSub,
        '/book/cabs',
        const Color(0xFF15803D),
        const Color(0xFFEAF7EE),
      ),
      (
        Icons.restaurant_rounded,
        l.food,
        l.foodSub,
        '/book/restaurants',
        const Color(0xFFD97706),
        const Color(0xFFFFF6E0),
      ),
      (
        Icons.celebration_rounded,
        l.experiences,
        l.experiencesSub,
        '/book/experiences',
        const Color(0xFFBE185D),
        const Color(0xFFFDEDF4),
      ),
    ];
    return Scaffold(
      appBar: AppBar(title: Text(l.bookTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 110),
        children: [
          Text(l.bookSub, style: const TextStyle(color: TnColors.muted)),
          const SizedBox(height: 14),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 0.98,
            children: [
              for (final (icon, title, sub, path, color, tint) in tiles)
                Card(
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    onTap: () => context.push(path),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 52,
                            height: 52,
                            decoration: BoxDecoration(color: tint, shape: BoxShape.circle),
                            child: Icon(icon, color: color, size: 28),
                          ),
                          const Spacer(),
                          Text(
                            title,
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            sub,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: TnColors.muted, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          Card(
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              leading: Container(
                width: 44,
                height: 44,
                decoration: const BoxDecoration(color: Color(0xFFEFF3FA), shape: BoxShape.circle),
                child: const Icon(Icons.receipt_long_rounded, color: TnColors.navy),
              ),
              title: Text(l.myBookings, style: const TextStyle(fontWeight: FontWeight.w700)),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => context.push('/book/orders'),
            ),
          ),
        ],
      ),
    );
  }
}
