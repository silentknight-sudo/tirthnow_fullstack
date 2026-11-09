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
import '../../auth/data/session_controller.dart';
import '../../bookings/presentation/checkout_flow.dart';

final myProfileProvider = FutureProvider<ProfileResponse>((ref) async {
  ref.watch(sessionProvider.select((s) => s.user?.id));
  return ProfileResponse.fromJson(await ref.watch(apiClientProvider).getJson('/me/profile'));
});

/// Create or edit your profile: photo, name, language and home city.
class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _name = TextEditingController();
  Uint8List? _photo;
  String? _photoMime;
  bool _loaded = false;
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _pick() async {
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

  Future<void> _save() async {
    if (!requireSignedIn(context, ref)) return;
    final l = context.l10n;
    final name = _name.text.trim();
    if (name.isEmpty) {
      showSnack(context, l.enterYourName);
      return;
    }
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
      await api.patch(
        '/me/profile',
        body: UpdateProfileDto(displayName: name, avatarMediaId: mediaId).toJson(),
      );
      await ref.read(sessionProvider.notifier).refreshUser();
      ref.invalidate(myProfileProvider);
      if (!mounted) return;
      showSnack(context, l.profileSaved);
      context.pop();
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final profile = ref.watch(myProfileProvider).value;
    if (!_loaded && profile != null) {
      _loaded = true;
      _name.text = profile.displayName ?? '';
    }
    final avatarUrl = profile?.avatarUrl;
    return Scaffold(
      appBar: AppBar(title: Text(l.editProfile)),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: GestureDetector(
              onTap: _busy ? null : _pick,
              child: Stack(
                children: [
                  Container(
                    padding: const EdgeInsets.all(3),
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [TnColors.saffron, Color(0xFFE1306C), Color(0xFF7048E8)],
                      ),
                    ),
                    child: CircleAvatar(
                      radius: 56,
                      backgroundColor: TnColors.paper2,
                      backgroundImage: _photo != null
                          ? MemoryImage(_photo!)
                          : (avatarUrl != null ? NetworkImage(avatarUrl) : null) as ImageProvider?,
                      child: _photo == null && avatarUrl == null
                          ? const Icon(Icons.person_rounded, size: 56, color: TnColors.muted)
                          : null,
                    ),
                  ),
                  const Positioned(
                    right: 2,
                    bottom: 2,
                    child: CircleAvatar(
                      radius: 18,
                      backgroundColor: TnColors.navy,
                      child: Icon(Icons.photo_camera_rounded, color: Colors.white, size: 18),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: TextButton(onPressed: _busy ? null : _pick, child: Text(l.changePhoto)),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _name,
            maxLength: 60,
            decoration: InputDecoration(
              labelText: l.displayName,
              prefixIcon: const Icon(Icons.badge_rounded),
            ),
          ),
          const SizedBox(height: 6),
          Text(l.profilePublicNote, style: const TextStyle(color: TnColors.muted, fontSize: 12)),
          const SizedBox(height: 20),
          FilledButton.icon(
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50)),
            onPressed: _busy ? null : _save,
            icon: _busy
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.check_rounded),
            label: Text(l.save),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46)),
            onPressed: () => context.push('/reels/new'),
            icon: const Icon(Icons.video_call_rounded),
            label: Text(l.uploadReel),
          ),
        ],
      ),
    );
  }
}
