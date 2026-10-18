import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/format/phone.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../data/identity_provider.dart';
import '../data/session_controller.dart';

/// Phone OTP sign-in, guest mode and language choice.
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
  String? _error;

  @override
  void dispose() {
    _phone.dispose();
    _otp.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } on IdentityException catch (e) {
      setState(
        () =>
            _error = e.code == 'invalid-otp' ? context.l10n.otpInvalid : context.l10n.errorGeneric,
      );
    } on Object catch (e) {
      if (mounted) setState(() => _error = errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sendOtp() async {
    final e164 = toIndianE164(_phone.text);
    if (e164 == null) {
      setState(() => _error = context.l10n.phoneInvalid);
      return;
    }
    await _run(() async {
      final c = await ref.read(sessionProvider.notifier).startPhone(e164);
      setState(() => _challenge = c);
    });
  }

  Future<void> _verify() async {
    final c = _challenge;
    if (c == null) return;
    if (!RegExp(r'^\d{6}$').hasMatch(_otp.text)) {
      setState(() => _error = context.l10n.otpInvalid);
      return;
    }
    await _run(() => ref.read(sessionProvider.notifier).confirmOtp(c, _otp.text));
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final theme = Theme.of(context);
    final isMock = ref.watch(appConfigProvider).authProvider == AuthProviderKind.mock;
    final locale = ref.watch(localeProvider).languageCode;
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'en', label: Text('English')),
                  ButtonSegment(value: 'hi', label: Text('हिंदी')),
                ],
                selected: {locale},
                showSelectedIcon: false,
                onSelectionChanged: (s) => ref.read(localeProvider.notifier).set(s.first),
              ),
            ),
            const SizedBox(height: 16),
            Center(
              child: Image.asset(
                'assets/images/logo_full.png',
                height: 170,
                semanticLabel: l.appName,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              l.welcomeTitle,
              textAlign: TextAlign.center,
              style: theme.textTheme.headlineMedium,
            ),
            const SizedBox(height: 8),
            Text(
              l.welcomeSub,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge?.copyWith(color: TnColors.muted),
            ),
            const SizedBox(height: 28),
            if (_challenge == null) ...[
              TextField(
                key: const Key('phone'),
                controller: _phone,
                keyboardType: TextInputType.phone,
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9+ ]')),
                  LengthLimitingTextInputFormatter(14),
                ],
                decoration: InputDecoration(
                  labelText: l.phoneLabel,
                  hintText: l.phoneHint,
                  prefixText: '+91 ',
                ),
                onSubmitted: (_) => _sendOtp(),
              ),
              const SizedBox(height: 16),
              FilledButton(onPressed: _busy ? null : _sendOtp, child: Text(l.sendOtp)),
            ] else ...[
              Text(l.otpSentTo(_challenge!.phoneE164), textAlign: TextAlign.center),
              const SizedBox(height: 12),
              TextField(
                key: const Key('otp'),
                controller: _otp,
                keyboardType: TextInputType.number,
                autofillHints: const [AutofillHints.oneTimeCode],
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(6),
                ],
                decoration: InputDecoration(
                  labelText: l.otpLabel,
                  helperText: isMock ? l.mockOtpHint : null,
                ),
                onSubmitted: (_) => _verify(),
              ),
              const SizedBox(height: 16),
              FilledButton(onPressed: _busy ? null : _verify, child: Text(l.verify)),
              TextButton(
                onPressed: _busy ? null : () => setState(() => _challenge = null),
                child: Text(l.changeNumber),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: TnColors.sos),
              ),
            ],
            const SizedBox(height: 24),
            const Divider(),
            const SizedBox(height: 12),
            OutlinedButton(
              key: const Key('guest'),
              onPressed: _busy
                  ? null
                  : () => _run(ref.read(sessionProvider.notifier).continueAsGuest),
              child: Text(l.continueAsGuest),
            ),
            const SizedBox(height: 8),
            Text(
              l.guestNote,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(color: TnColors.muted),
            ),
            if (_busy)
              const Padding(padding: EdgeInsets.only(top: 16), child: LinearProgressIndicator()),
          ],
        ),
      ),
    );
  }
}
