import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/format/phone.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../shared/partner_ui.dart';
import '../data/identity_provider.dart';
import '../data/session_controller.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  PhoneChallenge? _challenge;
  bool _busy = false;

  @override
  void dispose() {
    _phone.dispose();
    _otp.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final e164 = toIndianE164(_phone.text);
    if (e164 == null) {
      showSnack(context, context.l10n.invalidValue);
      return;
    }
    setState(() => _busy = true);
    try {
      final c = await ref.read(sessionProvider.notifier).startPhone(e164);
      setState(() => _challenge = c);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    final c = _challenge;
    if (c == null || _otp.text.trim().length != 6) return;
    setState(() => _busy = true);
    try {
      await ref.read(sessionProvider.notifier).confirmOtp(c, _otp.text.trim());
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final mock = ref.watch(appConfigProvider).authProvider == AuthProviderKind.mock;
    final lang = ref.watch(localeProvider).languageCode;
    return Scaffold(
      backgroundColor: TnColors.night,
      body: Stack(
        children: [
          // Service collage behind the sheet.
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: MediaQuery.of(context).size.height * 0.62,
            child: Column(
              children: [
                for (final row in [services.sublist(0, 2), services.sublist(2, 4)])
                  Expanded(
                    child: Row(
                      children: [
                        for (final s in row)
                          Expanded(
                            child: Image.asset(s.image, fit: BoxFit.cover, height: double.infinity),
                          ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    TnColors.night.withValues(alpha: 0.2),
                    TnColors.night.withValues(alpha: 0.85),
                    TnColors.night,
                  ],
                  stops: const [0, 0.42, 0.62],
                ),
              ),
            ),
          ),
          SafeArea(
            child: Column(
              children: [
                Align(
                  alignment: Alignment.topRight,
                  child: TextButton(
                    onPressed: () =>
                        ref.read(localeProvider.notifier).set(lang == 'hi' ? 'en' : 'hi'),
                    style: TextButton.styleFrom(foregroundColor: Colors.white),
                    child: Text(l.language),
                  ),
                ),
                const Spacer(),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Image.asset('assets/images/logo.png', width: 40),
                          const SizedBox(width: 10),
                          Text(
                            l.appName,
                            style: const TextStyle(
                              color: TnColors.accentSoft,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Text(
                        l.loginTitle,
                        style: const TextStyle(
                          fontFamily: 'Cormorant',
                          fontSize: 34,
                          height: 1.05,
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        l.loginSub,
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.75)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Container(
                  margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: TnColors.paper,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (_challenge == null) ...[
                        TextField(
                          controller: _phone,
                          keyboardType: TextInputType.phone,
                          maxLength: 10,
                          decoration: InputDecoration(
                            labelText: l.phoneLabel,
                            hintText: l.phoneHint,
                            prefixText: '+91 ',
                            counterText: '',
                            prefixIcon: const Icon(Icons.phone_iphone_rounded),
                          ),
                        ),
                        const SizedBox(height: 14),
                        FilledButton(onPressed: _busy ? null : _send, child: Text(l.sendOtp)),
                      ] else ...[
                        Text(
                          l.otpSentTo(_challenge!.phoneE164),
                          style: const TextStyle(color: TnColors.muted),
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _otp,
                          keyboardType: TextInputType.number,
                          maxLength: 6,
                          autofocus: true,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 22,
                            letterSpacing: 8,
                            fontWeight: FontWeight.w600,
                          ),
                          decoration: InputDecoration(labelText: l.otpLabel, counterText: ''),
                          onSubmitted: (_) => _verify(),
                        ),
                        if (mock)
                          Text(
                            l.mockOtpHint,
                            style: const TextStyle(fontSize: 12, color: TnColors.accent),
                          ),
                        const SizedBox(height: 14),
                        FilledButton(onPressed: _busy ? null : _verify, child: Text(l.verify)),
                        TextButton(
                          onPressed: () => setState(() {
                            _challenge = null;
                            _otp.clear();
                          }),
                          child: Text(l.changeNumber),
                        ),
                      ],
                      if (_busy)
                        const Padding(
                          padding: EdgeInsets.only(top: 10),
                          child: LinearProgressIndicator(),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
