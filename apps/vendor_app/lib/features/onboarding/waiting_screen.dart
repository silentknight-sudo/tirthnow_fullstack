import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../auth/data/session_controller.dart';
import '../shared/partner_ui.dart';
import '../vendor/data/vendor_repository.dart';
import 'onboarding_screen.dart';

/// Shown while an admin reviews the documents (or the account is suspended).
class WaitingScreen extends ConsumerWidget {
  const WaitingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final v = ref.watch(myVendorProvider).value;
    final suspended = v?.status == 'suspended';
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const OnboardingSteps(step: 3),
              const Spacer(),
              ClipRRect(
                borderRadius: BorderRadius.circular(28),
                child: Image.asset(
                  serviceFor(v?.type ?? 'store').image,
                  width: 220,
                  height: 165,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(height: 28),
              Icon(
                suspended ? Icons.block_rounded : Icons.hourglass_top_rounded,
                color: suspended ? TnColors.sos : TnColors.accent,
                size: 36,
              ),
              const SizedBox(height: 10),
              Text(
                suspended ? l.suspendedTitle : l.waitingTitle,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 10),
              Text(
                l.waitingBody,
                textAlign: TextAlign.center,
                style: const TextStyle(color: TnColors.muted, height: 1.45),
              ),
              if (v != null) ...[
                const SizedBox(height: 16),
                Pill(v.displayName, color: TnColors.navy, icon: serviceFor(v.type).icon),
              ],
              const Spacer(),
              FilledButton.icon(
                onPressed: () => ref.invalidate(myVendorProvider),
                icon: const Icon(Icons.refresh_rounded),
                label: Text(l.checkStatus),
              ),
              TextButton(
                onPressed: () => ref.read(sessionProvider.notifier).signOut(),
                child: Text(l.signOut),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
