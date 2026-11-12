import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/format/phone.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../shared/partner_ui.dart';
import '../data/identity_provider.dart';
import '../data/session_controller.dart';

enum _Step { splash, phone, otp }

/// Splash → phone → OTP, all on the night background.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  _Step _step = _Step.splash;
  bool _register = false;
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  final _otpFocus = FocusNode();
  PhoneChallenge? _challenge;
  bool _busy = false;
  int _resendIn = 0;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    _phone.dispose();
    _otp.dispose();
    _otpFocus.dispose();
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    setState(() => _resendIn = 30);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      setState(() => _resendIn--);
      if (_resendIn <= 0) t.cancel();
    });
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
      setState(() {
        _challenge = c;
        _step = _Step.otp;
        _otp.clear();
      });
      _startTimer();
      _otpFocus.requestFocus();
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    final c = _challenge;
    if (c == null || _otp.text.length != 6) return;
    setState(() => _busy = true);
    try {
      await ref.read(sessionProvider.notifier).confirmOtp(c, _otp.text);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(localeProvider).languageCode;
    return Scaffold(
      backgroundColor: PColors.night,
      body: NightBackground(
        image: _step == _Step.otp ? null : 'assets/images/hero.jpg',
        child: SafeArea(
          child: Column(
            children: [
              Row(
                children: [
                  if (_step != _Step.splash)
                    IconButton(
                      color: Colors.white,
                      icon: const Icon(Icons.arrow_back_rounded),
                      onPressed: () =>
                          setState(() => _step = _step == _Step.otp ? _Step.phone : _Step.splash),
                    ),
                  const Spacer(),
                  TextButton(
                    onPressed: () =>
                        ref.read(localeProvider.notifier).set(lang == 'hi' ? 'en' : 'hi'),
                    style: TextButton.styleFrom(foregroundColor: Colors.white),
                    child: Text(context.l10n.language),
                  ),
                ],
              ),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: switch (_step) {
                    _Step.splash => _splash(context),
                    _Step.phone => _phoneCard(context),
                    _Step.otp => _otpCard(context),
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _brand({double size = 54}) => Column(
    children: [
      Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          boxShadow: [BoxShadow(color: PColors.gold.withValues(alpha: 0.45), blurRadius: 24)],
        ),
        child: Image.asset('assets/images/logo.png', width: size, height: size),
      ),
      const SizedBox(height: 12),
      const Text.rich(
        TextSpan(
          children: [
            TextSpan(
              text: 'Tirth',
              style: TextStyle(color: Colors.white),
            ),
            TextSpan(
              text: 'Now',
              style: TextStyle(color: PColors.gold),
            ),
          ],
        ),
        style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: 0.3),
      ),
      Text(
        context.l10n.partnerTag.toUpperCase(),
        style: const TextStyle(
          color: PColors.gold,
          letterSpacing: 4,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    ],
  );

  Widget _splash(BuildContext context) {
    final l = context.l10n;
    return Padding(
      key: const ValueKey('splash'),
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(child: _brand()),
          const Spacer(),
          Text(
            l.splashTitle,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 30,
              height: 1.15,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            l.splashSub,
            style: TextStyle(color: Colors.white.withValues(alpha: 0.78), height: 1.4),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final s in services)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(s.icon, size: 15, color: PColors.gold),
                      const SizedBox(width: 6),
                      Text(s.title(l), style: const TextStyle(color: Colors.white, fontSize: 12)),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 24),
          GoldButton(
            label: l.getStarted,
            icon: Icons.arrow_forward_rounded,
            onPressed: () => setState(() => _step = _Step.phone),
          ),
        ],
      ),
    );
  }

  Widget _phoneCard(BuildContext context) {
    final l = context.l10n;
    return SingleChildScrollView(
      key: const ValueKey('phone'),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      child: Column(
        children: [
          _brand(size: 46),
          const SizedBox(height: 28),
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    children: [
                      for (final (reg, label) in [(false, l.login), (true, l.register)])
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _register = reg),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(vertical: 11),
                              decoration: BoxDecoration(
                                gradient: _register == reg ? PColors.goldGradient : null,
                                borderRadius: BorderRadius.circular(11),
                              ),
                              child: Text(
                                label,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: _register == reg ? PColors.night : Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  l.phoneLabel,
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.75), fontSize: 13),
                ),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    children: [
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 14),
                        child: Text(
                          '🇮🇳  +91',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                        ),
                      ),
                      Container(width: 1, height: 26, color: Colors.white24),
                      Expanded(
                        child: TextField(
                          controller: _phone,
                          keyboardType: TextInputType.phone,
                          maxLength: 10,
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 17,
                            letterSpacing: 1.2,
                          ),
                          decoration: InputDecoration(
                            hintText: l.phoneHint,
                            hintStyle: const TextStyle(color: Colors.white38, letterSpacing: 0),
                            counterText: '',
                            filled: false,
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 16,
                            ),
                          ),
                          onSubmitted: (_) => _send(),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                GoldButton(label: l.sendOtp, busy: _busy, onPressed: _send),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _otpCard(BuildContext context) {
    final l = context.l10n;
    final mock = ref.watch(appConfigProvider).authProvider == AuthProviderKind.mock;
    final code = _otp.text;
    return SingleChildScrollView(
      key: const ValueKey('otp'),
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
      child: Column(
        children: [
          Container(
            width: 84,
            height: 84,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: PColors.gold, width: 2),
              color: PColors.gold.withValues(alpha: 0.08),
            ),
            child: const Icon(Icons.verified_user_outlined, color: PColors.gold, size: 40),
          ),
          const SizedBox(height: 22),
          Text(
            l.verifyNumber,
            style: const TextStyle(color: Colors.white, fontSize: 25, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Text(
            l.otpEnter(_challenge?.phoneE164 ?? ''),
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white.withValues(alpha: 0.75)),
          ),
          const SizedBox(height: 26),
          // Six boxes over one hidden field.
          GestureDetector(
            onTap: _otpFocus.requestFocus,
            child: Stack(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (var i = 0; i < 6; i++)
                      Container(
                        width: 46,
                        height: 56,
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: i < code.length
                              ? Colors.white
                              : Colors.white.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: i == code.length
                                ? PColors.gold
                                : Colors.white.withValues(alpha: 0.2),
                            width: i == code.length ? 2 : 1,
                          ),
                        ),
                        child: Text(
                          i < code.length ? code[i] : '',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: PColors.night,
                          ),
                        ),
                      ),
                  ],
                ),
                Positioned.fill(
                  child: TextField(
                    controller: _otp,
                    focusNode: _otpFocus,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    autofocus: true,
                    showCursor: false,
                    enableInteractiveSelection: false,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    style: const TextStyle(color: Colors.transparent),
                    decoration: const InputDecoration(
                      counterText: '',
                      filled: false,
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                    ),
                    onChanged: (v) {
                      setState(() {});
                      if (v.length == 6) _verify();
                    },
                  ),
                ),
              ],
            ),
          ),
          if (mock) ...[
            const SizedBox(height: 12),
            Text(l.mockOtpHint, style: const TextStyle(fontSize: 12, color: PColors.gold)),
          ],
          const SizedBox(height: 18),
          if (_resendIn > 0)
            Text(
              l.resendIn('$_resendIn'),
              style: TextStyle(color: Colors.white.withValues(alpha: 0.7)),
            )
          else
            TextButton(
              onPressed: _busy ? null : _send,
              style: TextButton.styleFrom(foregroundColor: PColors.gold),
              child: Text(l.resend),
            ),
          const SizedBox(height: 24),
          GoldButton(label: l.verify, busy: _busy, onPressed: code.length == 6 ? _verify : null),
        ],
      ),
    );
  }
}
