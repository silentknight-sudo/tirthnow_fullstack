import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/api/api_models.dart';
import '../../../core/api/uploads.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../../l10n/app_localizations.dart';
import '../../auth/data/session_controller.dart';
import 'edit_profile_screen.dart' show myProfileProvider;

/// Creator profile in four steps (Account, Details, Profile, Interests), then a
/// review and a success page. Saved through PATCH /me/profile (`creator` block).
class CreateCreatorScreen extends ConsumerStatefulWidget {
  const CreateCreatorScreen({super.key});

  @override
  ConsumerState<CreateCreatorScreen> createState() => _CreateCreatorScreenState();
}

/// Pages: 0 intro, 1 account, 2 details, 3 profile, 4 interests, 5 review, 6 done.
class _CreateCreatorScreenState extends ConsumerState<CreateCreatorScreen> {
  static final _usernameRe = RegExp(r'^[a-z0-9_.]{3,30}$');
  static const _interestKeys = [
    'braj_yatra',
    'temples',
    'darshan',
    'travel_tips',
    'yatra_vlogs',
    'festivals',
    'bhakti',
    'local_food',
    'history',
    'other',
  ];

  int _page = 0;
  bool _busy = false;
  bool _loaded = false;
  final _name = TextEditingController();
  final _username = TextEditingController();
  final _bio = TextEditingController();
  final _location = TextEditingController();
  DateTime? _dob;
  String? _gender;
  final Set<String> _interests = {};
  Uint8List? _photo;
  String? _photoMime;

  @override
  void dispose() {
    for (final c in [_name, _username, _bio, _location]) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _signedIn {
    final s = ref.read(sessionProvider);
    return s.signedIn && !s.isGuest;
  }

  void _go(int page) => setState(() => _page = page);

  void _next() {
    final l = context.l10n;
    switch (_page) {
      case 0:
        _go(_signedIn ? 2 : 1);
      case 1:
        if (_signedIn) _go(2);
      case 2:
        if (_name.text.trim().isEmpty) return showSnack(context, l.enterYourName);
        if (!_usernameRe.hasMatch(_username.text.trim())) {
          return showSnack(context, l.cpUsernameRule);
        }
        _go(3);
      case 3:
        _go(4);
      case 4:
        if (_interests.isEmpty) return showSnack(context, l.cpPickInterest);
        _go(5);
    }
  }

  Future<void> _pickPhoto() async {
    final img = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 800,
      imageQuality: 85,
    );
    if (img == null) return;
    final bytes = await img.readAsBytes();
    setState(() {
      _photo = bytes;
      _photoMime =
          img.mimeType ?? (img.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
    });
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: _dob ?? DateTime(now.year - 25),
      firstDate: DateTime(now.year - 100),
      lastDate: DateTime(now.year - 13, now.month, now.day),
    );
    if (d != null) setState(() => _dob = d);
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      final api = ref.read(apiClientProvider);
      String? mediaId;
      if (_photo != null) {
        mediaId = await uploadMedia(
          api,
          purpose: 'avatar',
          mimeType: _photoMime ?? 'image/jpeg',
          bytes: _photo!,
        );
      }
      String? two(int n) => n.toString().padLeft(2, '0');
      await api.patch(
        '/me/profile',
        body: UpdateProfileDto(
          displayName: _name.text.trim(),
          avatarMediaId: mediaId,
          creator: CreatorProfileDto(
            username: _username.text.trim(),
            bio: _bio.text.trim().isEmpty ? null : _bio.text.trim(),
            location: _location.text.trim().isEmpty ? null : _location.text.trim(),
            dateOfBirth: _dob == null
                ? null
                : '${_dob!.year}-${two(_dob!.month)}-${two(_dob!.day)}',
            gender: _gender,
            interests: _interests.toList(),
          ),
        ).toJson(),
      );
      await ref.read(sessionProvider.notifier).refreshUser();
      ref.invalidate(myProfileProvider);
      if (mounted) _go(6);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _interestLabel(String k) {
    final l = context.l10n;
    return switch (k) {
      'braj_yatra' => l.cpIntBraj,
      'temples' => l.heroTemples,
      'darshan' => l.heroDarshan,
      'travel_tips' => l.cpIntTips,
      'yatra_vlogs' => l.cpIntVlogs,
      'festivals' => l.cpIntFestivals,
      'bhakti' => l.cpIntBhakti,
      'local_food' => l.cpIntFood,
      'history' => l.cpIntHistory,
      _ => l.cpIntOther,
    };
  }

  static const _interestIcons = {
    'braj_yatra': Icons.temple_hindu_rounded,
    'temples': Icons.account_balance_rounded,
    'darshan': Icons.visibility_rounded,
    'travel_tips': Icons.place_rounded,
    'yatra_vlogs': Icons.smart_display_rounded,
    'festivals': Icons.celebration_rounded,
    'bhakti': Icons.music_note_rounded,
    'local_food': Icons.restaurant_rounded,
    'history': Icons.menu_book_rounded,
    'other': Icons.more_horiz_rounded,
  };

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final profile = ref.watch(myProfileProvider).value;
    if (!_loaded && profile != null) {
      _loaded = true;
      _name.text = profile.displayName ?? '';
      final c = profile.creator;
      _username.text = c.username ?? '';
      _bio.text = c.bio ?? '';
      _location.text = c.location ?? '';
      _gender = c.gender;
      _interests.addAll(c.interests ?? const []);
      if (c.dateOfBirth != null) _dob = DateTime.tryParse(c.dateOfBirth!);
    }
    ref.listen(sessionProvider, (_, s) {
      if (_page == 1 && s.signedIn && !s.isGuest) _go(2);
    });

    if (_page == 0) return _intro(l);
    if (_page == 6) return _done(l);
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _go(_page == 2 && _signedIn ? 0 : _page - 1);
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          centerTitle: true,
          leading: BackButton(onPressed: () => _go(_page == 2 && _signedIn ? 0 : _page - 1)),
          title: Text(
            l.createProfile,
            style: const TextStyle(fontWeight: FontWeight.w700, color: TnColors.navy),
          ),
        ),
        body: Column(
          children: [
            _Stepper(step: (_page - 1).clamp(0, 4)),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
                children: switch (_page) {
                  1 => _account(l),
                  2 => _details(l),
                  3 => _profile(l),
                  4 => _interestsPage(l),
                  _ => _review(l),
                },
              ),
            ),
            if (_page != 1)
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 14),
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(52),
                      backgroundColor: TnColors.navy,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                    ),
                    onPressed: _busy ? null : (_page == 5 ? _save : _next),
                    child: _busy
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Text(
                            _page == 5 ? l.createProfile : l.continueLabel,
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                          ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _heading(String title, String sub) => Column(
    children: [
      Text(
        title,
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: TnColors.ink),
      ),
      const SizedBox(height: 6),
      Text(
        sub,
        textAlign: TextAlign.center,
        style: const TextStyle(color: TnColors.muted, fontSize: 13.5),
      ),
      const SizedBox(height: 18),
    ],
  );

  InputDecoration _field(String hint) => InputDecoration(
    hintText: hint,
    isDense: true,
    filled: true,
    fillColor: Colors.white,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: TnColors.line),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: TnColors.line),
    ),
  );

  Widget _labelled(IconData icon, String label, Widget field) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(icon, color: TnColors.ink, size: 22),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              field,
            ],
          ),
        ),
      ],
    ),
  );

  List<Widget> _account(AppLocalizations l) {
    Widget option(Widget icon, String label) => Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: OutlinedButton(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          backgroundColor: Colors.white,
          side: const BorderSide(color: TnColors.line),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
          elevation: 1,
        ),
        onPressed: () => context.push('/login'),
        child: Row(
          children: [
            const SizedBox(width: 8),
            icon,
            Expanded(
              child: Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: TnColors.ink,
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                ),
              ),
            ),
            const SizedBox(width: 32),
          ],
        ),
      ),
    );
    return [
      _heading(l.cpAccountTitle, l.cpAccountSub),
      option(
        const Text(
          'G',
          style: TextStyle(color: Color(0xFF4285F4), fontSize: 22, fontWeight: FontWeight.w900),
        ),
        l.cpWithGoogle,
      ),
      option(const Icon(Icons.call_outlined, color: TnColors.ink), l.cpWithPhone),
      option(const Icon(Icons.mail_outline_rounded, color: TnColors.ink), l.cpWithEmail),
      const SizedBox(height: 4),
      Text(
        l.cpSignInNote,
        textAlign: TextAlign.center,
        style: const TextStyle(color: TnColors.muted, fontSize: 12),
      ),
      const SizedBox(height: 24),
      const _Skyline(),
    ];
  }

  List<Widget> _details(AppLocalizations l) {
    final ok = _usernameRe.hasMatch(_username.text.trim());
    final genders = {
      'female': l.cpFemale,
      'male': l.cpMale,
      'other': l.cpOther,
      'undisclosed': l.cpUndisclosed,
    };
    return [
      _heading(l.cpDetailsTitle, l.cpDetailsSub),
      _labelled(
        Icons.person_outline_rounded,
        l.displayName,
        TextField(
          controller: _name,
          maxLength: 60,
          decoration: _field('Aditya Kumar').copyWith(counterText: ''),
        ),
      ),
      _labelled(
        Icons.alternate_email_rounded,
        l.cpUsername,
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: _username,
              onChanged: (v) {
                final lower = v.toLowerCase();
                if (lower != v) {
                  _username.value = _username.value.copyWith(text: lower);
                }
                setState(() {});
              },
              decoration: _field('adityakumar').copyWith(
                prefixIcon: const Padding(
                  padding: EdgeInsets.only(left: 12, right: 2),
                  child: Text('@', style: TextStyle(fontSize: 16, color: TnColors.muted)),
                ),
                prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
                suffixIcon: ok
                    ? const Icon(Icons.check_circle_rounded, color: Color(0xFF2F9E44))
                    : null,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              l.cpUsernameHint(_username.text.trim().isEmpty ? 'username' : _username.text.trim()),
              style: const TextStyle(color: TnColors.muted, fontSize: 11.5),
            ),
          ],
        ),
      ),
      _labelled(
        Icons.calendar_month_outlined,
        l.cpDob,
        InkWell(
          onTap: _pickDob,
          child: InputDecorator(
            decoration: _field(''),
            child: Text(
              _dob == null
                  ? l.cpDobHint
                  : '${_dob!.day.toString().padLeft(2, '0')}/${_dob!.month.toString().padLeft(2, '0')}/${_dob!.year}',
              style: TextStyle(color: _dob == null ? TnColors.muted : TnColors.ink),
            ),
          ),
        ),
      ),
      _labelled(
        Icons.face_outlined,
        l.cpGender,
        DropdownButtonFormField<String>(
          initialValue: _gender,
          decoration: _field(l.cpGenderHint),
          hint: Text(l.cpGenderHint),
          items: [
            for (final e in genders.entries) DropdownMenuItem(value: e.key, child: Text(e.value)),
          ],
          onChanged: (v) => setState(() => _gender = v),
        ),
      ),
    ];
  }

  List<Widget> _profile(AppLocalizations l) => [
    _heading(l.cpProfileTitle, l.cpProfileSub),
    Center(
      child: GestureDetector(
        onTap: _pickPhoto,
        child: CircleAvatar(
          radius: 54,
          backgroundColor: const Color(0xFFE7EEFB),
          backgroundImage: _photo != null ? MemoryImage(_photo!) : null,
          child: _photo == null
              ? const Icon(Icons.photo_camera_rounded, color: TnColors.navy, size: 34)
              : null,
        ),
      ),
    ),
    const SizedBox(height: 8),
    Center(
      child: TextButton(
        onPressed: _pickPhoto,
        child: Text(l.cpAddPhoto, style: const TextStyle(fontWeight: FontWeight.w700)),
      ),
    ),
    const SizedBox(height: 8),
    Text(l.cpBio, style: const TextStyle(fontWeight: FontWeight.w700)),
    const SizedBox(height: 6),
    TextField(controller: _bio, maxLength: 150, maxLines: 3, decoration: _field(l.cpBioHint)),
    const SizedBox(height: 6),
    _labelled(
      Icons.location_on_outlined,
      l.cpLocation,
      TextField(
        controller: _location,
        maxLength: 80,
        decoration: _field(l.cpLocationHint).copyWith(counterText: ''),
      ),
    ),
  ];

  List<Widget> _interestsPage(AppLocalizations l) => [
    _heading(l.cpInterestsTitle, l.cpInterestsSub),
    GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 2.9,
      children: [
        for (final k in _interestKeys)
          Builder(
            builder: (_) {
              final on = _interests.contains(k);
              return InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () => setState(() => on ? _interests.remove(k) : _interests.add(k)),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: on ? const Color(0xFFFFF4EA) : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: on ? TnColors.saffron : TnColors.line,
                      width: on ? 1.5 : 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(_interestIcons[k], color: TnColors.saffron, size: 22),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _interestLabel(k),
                          maxLines: 2,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12.5),
                        ),
                      ),
                      if (on)
                        const Icon(Icons.check_circle_rounded, color: TnColors.saffron, size: 18),
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    ),
  ];

  List<Widget> _review(AppLocalizations l) {
    Widget row(IconData icon, String label, String value, int page) => ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: TnColors.ink),
      title: Text(label, style: const TextStyle(fontSize: 12, color: TnColors.muted)),
      subtitle: Text(
        value.isEmpty ? '—' : value,
        style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: TnColors.ink),
      ),
      trailing: IconButton(
        icon: const Icon(Icons.edit_outlined, size: 20),
        onPressed: () => _go(page),
      ),
    );
    return [
      _heading(l.cpReviewTitle, l.cpReviewSub),
      Center(
        child: CircleAvatar(
          radius: 48,
          backgroundImage: _photo != null
              ? MemoryImage(_photo!)
              : const AssetImage('assets/images/canva/hero-travel.jpg') as ImageProvider,
        ),
      ),
      const SizedBox(height: 8),
      row(Icons.person_outline_rounded, l.displayName, _name.text.trim(), 2),
      row(Icons.alternate_email_rounded, l.cpUsername, '@${_username.text.trim()}', 2),
      row(Icons.notes_rounded, l.cpBio, _bio.text.trim(), 3),
      row(Icons.location_on_outlined, l.cpLocation, _location.text.trim(), 3),
      row(Icons.interests_outlined, l.cpInterests, _interests.map(_interestLabel).join(', '), 4),
    ];
  }

  Widget _intro(AppLocalizations l) {
    Widget point(IconData icon, String text) => Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: TnColors.line),
      ),
      child: Row(
        children: [
          Icon(icon, color: TnColors.saffron, size: 20),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13.5))),
        ],
      ),
    );
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(backgroundColor: Colors.white),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: Image.asset(
              'assets/images/canva/creator-intro.jpg',
              height: 200,
              fit: BoxFit.cover,
            ),
          ),
          const SizedBox(height: 18),
          Text(
            l.cpIntroTitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: TnColors.ink,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            l.cpIntroSub,
            textAlign: TextAlign.center,
            style: const TextStyle(color: TnColors.muted, fontSize: 13.5),
          ),
          const SizedBox(height: 16),
          point(Icons.video_call_rounded, l.cpPointVideos),
          point(Icons.groups_rounded, l.cpPointCommunity),
          point(Icons.favorite_rounded, l.cpPointFollowers),
          const SizedBox(height: 12),
          FilledButton(
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
              backgroundColor: TnColors.navy,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
            ),
            onPressed: _next,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  l.createProfile,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.arrow_forward_rounded),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(l.cpHaveProfile, style: const TextStyle(color: TnColors.muted)),
              TextButton(
                onPressed: () => context.push(_signedIn ? '/reels/mine' : '/login'),
                child: Text(l.cpSignIn, style: const TextStyle(fontWeight: FontWeight.w800)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _done(AppLocalizations l) => Scaffold(
    backgroundColor: Colors.white,
    body: SafeArea(
      child: Column(
        children: [
          const Spacer(),
          Container(
            width: 96,
            height: 96,
            decoration: const BoxDecoration(color: Color(0xFF2F9E44), shape: BoxShape.circle),
            child: const Icon(Icons.check_rounded, color: Colors.white, size: 60),
          ),
          const SizedBox(height: 20),
          Text(
            l.cpDoneTitle,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: TnColors.ink),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(32, 10, 32, 24),
            child: Text(
              l.cpDoneSub,
              textAlign: TextAlign.center,
              style: const TextStyle(color: TnColors.muted, fontSize: 14),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              children: [
                FilledButton(
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                    backgroundColor: TnColors.navy,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                  ),
                  onPressed: () => context.pushReplacement('/reels/mine'),
                  child: Text(
                    l.cpGoProfile,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                  ),
                  onPressed: () => context.pushReplacement('/reels/new'),
                  icon: const Icon(Icons.add_a_photo_outlined),
                  label: Text(l.cpFirstPost, style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
          const Spacer(),
          const _Skyline(),
        ],
      ),
    ),
  );
}

/// Numbered progress: Account · Details · Profile · Interests.
class _Stepper extends StatelessWidget {
  const _Stepper({required this.step});
  final int step;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final labels = [l.cpStepAccount, l.cpStepDetails, l.cpStepProfile, l.cpStepInterests];
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
      child: Row(
        children: [
          for (var i = 0; i < 4; i++) ...[
            Column(
              children: [
                Container(
                  width: 26,
                  height: 26,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: i < step
                        ? TnColors.navy
                        : i == step
                        ? TnColors.saffron
                        : Colors.white,
                    border: Border.all(color: i <= step ? Colors.transparent : TnColors.line),
                  ),
                  child: i < step
                      ? const Icon(Icons.check_rounded, color: Colors.white, size: 16)
                      : Text(
                          '${i + 1}',
                          style: TextStyle(
                            color: i == step ? Colors.white : TnColors.muted,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                ),
                const SizedBox(height: 4),
                Text(
                  labels[i],
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: i == step ? FontWeight.w800 : FontWeight.w500,
                    color: i == step ? TnColors.saffron : TnColors.muted,
                  ),
                ),
              ],
            ),
            if (i < 3)
              Expanded(
                child: Container(
                  height: 2,
                  margin: const EdgeInsets.only(bottom: 18, left: 4, right: 4),
                  color: i < step ? TnColors.navy : TnColors.line,
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _Skyline extends StatelessWidget {
  const _Skyline();

  @override
  Widget build(BuildContext context) => Opacity(
    opacity: 0.7,
    child: Image.asset(
      'assets/images/canva/skyline.jpg',
      height: 120,
      width: double.infinity,
      fit: BoxFit.cover,
    ),
  );
}
