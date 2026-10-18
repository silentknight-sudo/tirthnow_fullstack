import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';

class BookHubScreen extends StatelessWidget {
  const BookHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final tiles = <(IconData, String, String)>[
      (Icons.bed_outlined, l.stays, '/book/hotels'),
      (Icons.local_taxi_outlined, l.cabs, '/book/cabs'),
      (Icons.restaurant_outlined, l.food, '/book/restaurants'),
      (Icons.sailing_outlined, l.experiences, '/book/experiences'),
    ];
    return Scaffold(
      appBar: AppBar(title: Text(l.bookTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
        children: [
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.25,
            children: [
              for (final (icon, label, path) in tiles)
                Card(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(18),
                    onTap: () => context.push(path),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(icon, size: 36, color: TnColors.brown),
                        const SizedBox(height: 8),
                        Text(label, style: Theme.of(context).textTheme.titleMedium),
                      ],
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Card(
            child: ListTile(
              leading: const Icon(Icons.receipt_long_outlined, color: TnColors.brown),
              title: Text(l.myBookings),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/book/orders'),
            ),
          ),
        ],
      ),
    );
  }
}
