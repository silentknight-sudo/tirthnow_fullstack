import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../shared/partner_ui.dart';
import 'marketing_screen.dart';

/// Partner support: WhatsApp, email, callback and FAQs.
class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  // Support contacts; replace with the client's real ones before launch.
  static const _email = 'partners@tirthnow.app';

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final faqs = [(l.faq1q, l.faq1a), (l.faq2q, l.faq2a), (l.faq3q, l.faq3a)];
    return Scaffold(
      appBar: AppBar(title: Text(l.support)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
        children: [
          const Center(
            child: CircleAvatar(
              radius: 36,
              backgroundColor: Color(0xFFF1EEFB),
              child: Icon(Icons.support_agent_rounded, size: 40, color: PColors.violet),
            ),
          ),
          const SizedBox(height: 10),
          Center(
            child: Text(
              l.howHelp,
              style: const TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w800,
                color: PColors.night,
              ),
            ),
          ),
          const SizedBox(height: 18),
          GrowthTile(
            icon: Icons.chat_rounded,
            color: const Color(0xFF1FAF5A),
            title: l.chatSupport,
            subtitle: l.help,
            onTap: () =>
                launchUrl(Uri.parse('https://wa.me/'), mode: LaunchMode.externalApplication),
          ),
          GrowthTile(
            icon: Icons.mail_rounded,
            color: const Color(0xFF2A7FD4),
            title: l.emailUs,
            subtitle: _email,
            onTap: () => launchUrl(Uri.parse('mailto:$_email')),
          ),
          GrowthTile(
            icon: Icons.phone_callback_rounded,
            color: const Color(0xFFE08A1E),
            title: l.callUs,
            subtitle: _email,
            onTap: () => launchUrl(Uri.parse('mailto:$_email?subject=Callback%20request')),
          ),
          const SizedBox(height: 8),
          Text(
            l.faqs,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: PColors.night),
          ),
          const SizedBox(height: 8),
          for (final (q, a) in faqs)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: PanelCard(
                padding: EdgeInsets.zero,
                child: ExpansionTile(
                  shape: const Border(),
                  title: Text(q, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                  children: [Text(a, style: const TextStyle(color: TnColors.muted, height: 1.4))],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
