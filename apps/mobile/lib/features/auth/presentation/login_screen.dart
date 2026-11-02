import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_models.dart';
import '../../../core/config/app_config.dart';
import '../../../core/format/phone.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../data/identity_provider.dart';
import '../data/session_controller.dart';

/// Phone OTP sign-in and registration, guest mode and language choice.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  PhoneChallenge? _challenge;
  bool _register = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
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
    if (_register && _name.text.trim().length < 2) {
      setState(() => _error = context.l10n.nameRequired);
      return;
    }
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
    final name = _register ? _name.text.trim() : null;
    await _run(() async {
      await ref.read(sessionProvider.notifier).confirmOtp(c, _otp.text);
      if (name != null) {
        // A new account takes the name typed on the Register tab.
        await ref
            .read(apiClientProvider)
            .patch('/me/profile', body: UpdateProfileDto(displayName: name).toJson());
        await ref.read(sessionProvider.notifier).refreshUser();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final isMock = ref.watch(appConfigProvider).authProvider == AuthProviderKind.mock;
    final locale = ref.watch(localeProvider).languageCode;
    final top = MediaQuery.paddingOf(context).top;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F6F1),
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          _Hero(topInset: top),
          Transform.translate(
            offset: const Offset(0, -48),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Stack(
                clipBehavior: Clip.none,
                alignment: Alignment.topCenter,
                children: [
                  Container(
                    margin: const EdgeInsets.only(top: 36),
                    padding: const EdgeInsets.fromLTRB(20, 52, 20, 20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(color: const Color(0x33C9692A)),
                      boxShadow: const [
                        BoxShadow(color: Color(0x1F1C3C6B), blurRadius: 24, offset: Offset(0, 8)),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _Ornamented(
                          _register ? l.registerTitle : l.welcomeBack,
                          style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            color: TnColors.ink,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _register ? l.registerSub : l.welcomeBackSub,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: TnColors.muted, fontSize: 14),
                        ),
                        const SizedBox(height: 18),
                        _ModeTabs(
                          register: _register,
                          onChanged: _busy
                              ? null
                              : (v) => setState(() {
                                  _register = v;
                                  _challenge = null;
                                  _error = null;
                                }),
                        ),
                        const SizedBox(height: 18),
                        if (_challenge == null) ...[
                          if (_register) ...[
                            _IconField(
                              icon: Icons.person_outline_rounded,
                              label: l.fullName,
                              child: TextField(
                                key: const Key('name'),
                                controller: _name,
                                textCapitalization: TextCapitalization.words,
                                decoration: _bare(l.fullNameHint),
                              ),
                            ),
                            const SizedBox(height: 12),
                          ],
                          _IconField(
                            icon: Icons.smartphone_rounded,
                            label: l.phoneLabel,
                            child: Row(
                              children: [
                                const Text(
                                  '+91 ',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                                ),
                                Expanded(
                                  child: TextField(
                                    key: const Key('phone'),
                                    controller: _phone,
                                    keyboardType: TextInputType.phone,
                                    inputFormatters: [
                                      FilteringTextInputFormatter.allow(RegExp(r'[0-9+ ]')),
                                      LengthLimitingTextInputFormatter(14),
                                    ],
                                    decoration: _bare(l.phoneHint),
                                    onSubmitted: (_) => _sendOtp(),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 18),
                          _GradientButton(label: l.sendOtp, busy: _busy, onPressed: _sendOtp),
                        ] else ...[
                          Text(
                            l.otpSentTo(_challenge!.phoneE164),
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 12),
                          _IconField(
                            icon: Icons.lock_outline_rounded,
                            label: l.otpLabel,
                            child: TextField(
                              key: const Key('otp'),
                              controller: _otp,
                              keyboardType: TextInputType.number,
                              autofillHints: const [AutofillHints.oneTimeCode],
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                                LengthLimitingTextInputFormatter(6),
                              ],
                              style: const TextStyle(letterSpacing: 6, fontSize: 18),
                              decoration: _bare('••••••'),
                              onSubmitted: (_) => _verify(),
                            ),
                          ),
                          if (isMock)
                            Padding(
                              padding: const EdgeInsets.only(top: 6, left: 4),
                              child: Text(
                                l.mockOtpHint,
                                style: const TextStyle(color: TnColors.muted, fontSize: 12),
                              ),
                            ),
                          const SizedBox(height: 18),
                          _GradientButton(label: l.verify, busy: _busy, onPressed: _verify),
                          TextButton(
                            onPressed: _busy ? null : () => setState(() => _challenge = null),
                            child: Text(l.changeNumber),
                          ),
                        ],
                        if (_error != null) ...[
                          const SizedBox(height: 10),
                          Text(
                            _error!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: TnColors.sos),
                          ),
                        ],
                        const SizedBox(height: 16),
                        _OrDivider(l.orLabel),
                        const SizedBox(height: 16),
                        _GuestCard(
                          enabled: !_busy,
                          onTap: () => _run(ref.read(sessionProvider.notifier).continueAsGuest),
                        ),
                        const SizedBox(height: 18),
                        Row(
                          children: [
                            const Icon(Icons.language_rounded, size: 18, color: TnColors.muted),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                '${l.chooseLanguage} / भाषा चुनें',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: TnColors.muted),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: _LanguageTile(
                                glyph: 'अ',
                                title: 'हिंदी',
                                subtitle: 'Hindi',
                                selected: locale == 'hi',
                                onTap: () => ref.read(localeProvider.notifier).set('hi'),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _LanguageTile(
                                glyph: 'A',
                                title: 'English',
                                subtitle: 'English',
                                selected: locale == 'en',
                                onTap: () => ref.read(localeProvider.notifier).set('en'),
                              ),
                            ),
                          ],
                        ),
                        if (_busy)
                          const Padding(
                            padding: EdgeInsets.only(top: 16),
                            child: LinearProgressIndicator(),
                          ),
                      ],
                    ),
                  ),
                  // Logo medallion sitting on the card's top edge.
                  Container(
                    width: 84,
                    height: 84,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBF2),
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0x66C9692A), width: 2),
                      boxShadow: const [
                        BoxShadow(color: Color(0x261C3C6B), blurRadius: 12, offset: Offset(0, 4)),
                      ],
                    ),
                    child: Image.asset('assets/images/logo.png', semanticLabel: l.appName),
                  ),
                ],
              ),
            ),
          ),
          Transform.translate(
            offset: const Offset(0, -28),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: [
                  const Icon(Icons.spa_outlined, color: TnColors.accent),
                  const SizedBox(height: 4),
                  Text(
                    l.loginFooter,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: TnColors.navy, fontSize: 13),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _bare(String hint) => InputDecoration(
    hintText: hint,
    filled: false,
    isDense: true,
    border: InputBorder.none,
    enabledBorder: InputBorder.none,
    focusedBorder: InputBorder.none,
    contentPadding: const EdgeInsets.only(top: 4, bottom: 2),
  );
}

/// Canva banner of the ghats at dusk with the wordmark and tagline over it.
class _Hero extends StatelessWidget {
  const _Hero({required this.topInset});

  final double topInset;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return SizedBox(
      height: 300 + topInset,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset('assets/images/canva/login.jpg', fit: BoxFit.cover),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xCC0C1A30), Color(0x330C1A30), Color(0x000C1A30)],
                stops: [0, 0.55, 1],
              ),
            ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(20, topInset + 20, 20, 0),
            child: Column(
              children: [
                const Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: 'Tirth',
                        style: TextStyle(color: Colors.white),
                      ),
                      TextSpan(
                        text: 'Now',
                        style: TextStyle(color: Color(0xFFFFB866)),
                      ),
                    ],
                  ),
                  style: TextStyle(fontSize: 38, fontWeight: FontWeight.w800, height: 1.1),
                ),
                const SizedBox(height: 6),
                _Ornamented(
                  l.brandTagline,
                  color: const Color(0xFFFFD9A8),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  l.welcomeTitle,
                  style: const TextStyle(color: Color(0xE6FFFFFF), fontSize: 14),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Text with small diamond ornaments on both sides, as in the reference.
class _Ornamented extends StatelessWidget {
  const _Ornamented(this.text, {required this.style, this.color = TnColors.accent});

  final String text;
  final TextStyle style;
  final Color color;

  @override
  Widget build(BuildContext context) {
    Widget orn(bool flip) => Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (!flip) Container(width: 22, height: 1.4, color: color),
        Icon(Icons.diamond_outlined, size: 12, color: color),
        if (flip) Container(width: 22, height: 1.4, color: color),
      ],
    );
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        orn(false),
        const SizedBox(width: 8),
        Flexible(
          child: Text(text, textAlign: TextAlign.center, style: style),
        ),
        const SizedBox(width: 8),
        orn(true),
      ],
    );
  }
}

class _ModeTabs extends StatelessWidget {
  const _ModeTabs({required this.register, required this.onChanged});

  final bool register;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    Widget tab(String label, bool value) {
      final selected = register == value;
      return Expanded(
        child: Semantics(
          button: true,
          selected: selected,
          child: GestureDetector(
            onTap: onChanged == null ? null : () => onChanged!(value),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                gradient: selected
                    ? const LinearGradient(colors: [TnColors.navy, Color(0xFF27508A)])
                    : null,
                borderRadius: BorderRadius.circular(28),
                boxShadow: selected
                    ? const [
                        BoxShadow(color: Color(0x401C3C6B), blurRadius: 10, offset: Offset(0, 4)),
                      ]
                    : null,
              ),
              alignment: Alignment.center,
              child: Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: selected ? Colors.white : TnColors.ink,
                ),
              ),
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFE9EDF5),
        borderRadius: BorderRadius.circular(32),
      ),
      child: Row(children: [tab(l.tabLogin, false), tab(l.tabRegister, true)]),
    );
  }
}

/// Input with a tinted icon box on the left and a small label above the text.
class _IconField extends StatelessWidget {
  const _IconField({required this.icon, required this.label, required this.child});

  final IconData icon;
  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: const Color(0xFFDDE2EC)),
      color: Colors.white,
    ),
    child: IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            width: 56,
            decoration: const BoxDecoration(
              color: Color(0xFFEFF2F9),
              borderRadius: BorderRadius.horizontal(left: Radius.circular(15)),
            ),
            child: Icon(icon, color: TnColors.navy),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 8, 12, 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(label, style: const TextStyle(fontSize: 12, color: TnColors.muted)),
                  child,
                ],
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class _GradientButton extends StatelessWidget {
  const _GradientButton({required this.label, required this.busy, required this.onPressed});

  final String label;
  final bool busy;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => Opacity(
    opacity: busy ? 0.6 : 1,
    child: Material(
      borderRadius: BorderRadius.circular(30),
      clipBehavior: Clip.antiAlias,
      child: Ink(
        height: 54,
        decoration: const BoxDecoration(
          gradient: LinearGradient(colors: [TnColors.navy, Color(0xFF2F5FA0)]),
        ),
        child: InkWell(
          onTap: busy ? null : onPressed,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Positioned(
                right: 20,
                child: Icon(Icons.arrow_forward_rounded, color: Colors.white),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _OrDivider extends StatelessWidget {
  const _OrDivider(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      const Expanded(child: Divider()),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Text(text, style: const TextStyle(color: TnColors.muted)),
      ),
      const Expanded(child: Divider()),
    ],
  );
}

class _GuestCard extends StatelessWidget {
  const _GuestCard({required this.enabled, required this.onTap});

  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        key: const Key('guest'),
        borderRadius: BorderRadius.circular(16),
        onTap: enabled ? onTap : null,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFDDE2EC)),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: const BoxDecoration(color: Color(0xFFEFF2F9), shape: BoxShape.circle),
                child: const Icon(Icons.person_search_outlined, color: TnColors.navy),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l.continueAsGuest,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: TnColors.navy,
                        fontSize: 16,
                      ),
                    ),
                    Text(l.guestSub, style: const TextStyle(color: TnColors.muted, fontSize: 12)),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_rounded, color: TnColors.muted),
            ],
          ),
        ),
      ),
    );
  }
}

class _LanguageTile extends StatelessWidget {
  const _LanguageTile({
    required this.glyph,
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final String glyph;
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: selected,
    label: title,
    child: GestureDetector(
      onTap: onTap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: selected ? const Color(0xFFEFF2F9) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: selected ? TnColors.navy : const Color(0xFFDDE2EC),
                width: selected ? 1.6 : 1,
              ),
            ),
            child: Column(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(color: Color(0xFFF2F4F8), shape: BoxShape.circle),
                  child: Text(
                    glyph,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: TnColors.navy,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                Text(subtitle, style: const TextStyle(color: TnColors.muted, fontSize: 12)),
              ],
            ),
          ),
          if (selected)
            const Positioned(
              right: -6,
              top: -6,
              child: CircleAvatar(
                radius: 11,
                backgroundColor: TnColors.navy,
                child: Icon(Icons.check_rounded, color: Colors.white, size: 15),
              ),
            ),
        ],
      ),
    ),
  );
}
