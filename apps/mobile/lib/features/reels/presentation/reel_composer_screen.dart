import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:video_player/video_player.dart';

import '../../../core/api/api_models.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../../l10n/app_localizations.dart';
import '../../catalog/data/catalog_repository.dart';
import '../data/reels_repository.dart';
import 'reel_player.dart';
import 'reel_video_editor.dart';
import 'video_source/video_source.dart';

const maxReelSeconds = 90;
const maxReelBytes = 100 * 1024 * 1024;
const suggestedTags = ['radheradhe', 'vrindavan', 'aarti', 'braj', 'darshan', 'parikrama'];

/// MIME type the API expects for a picked video.
String videoMimeOf(XFile file) {
  final name = file.name.toLowerCase();
  if (name.endsWith('.mov')) return 'video/quicktime';
  if (name.endsWith('.webm') || file.mimeType == 'video/webm') return 'video/webm';
  return 'video/mp4';
}

/// Instagram-style composer: pick or record a video, preview it, write a
/// caption with hashtags, tag a temple, choose a cover and share.
class ReelComposerScreen extends ConsumerStatefulWidget {
  const ReelComposerScreen({super.key});

  @override
  ConsumerState<ReelComposerScreen> createState() => _ReelComposerScreenState();
}

class _ReelComposerScreenState extends ConsumerState<ReelComposerScreen> {
  final _caption = TextEditingController();
  XFile? _file;
  VideoPlayerController? _video;
  Uint8List? _cover;
  String? _templeId;
  double? _progress;
  String? _error;
  ReelEditsDto _edits = noEdits;
  ReelPlayback? _playback;

  @override
  void dispose() {
    _caption.dispose();
    _playback?.detach();
    unawaited(_video?.dispose());
    super.dispose();
  }

  Future<void> _pick(ImageSource source) async {
    final file = await ImagePicker().pickVideo(
      source: source,
      maxDuration: const Duration(seconds: maxReelSeconds),
    );
    if (file == null || !mounted) return;
    final l = context.l10n;
    if (await file.length() > maxReelBytes) {
      setState(() => _error = l.videoTooBig);
      return;
    }
    final old = _video;
    final controller = localVideoController(file);
    try {
      await controller.initialize();
    } on Object catch (_) {
      // Some formats cannot preview here; the upload still works.
    }
    if (controller.value.isInitialized &&
        controller.value.duration > const Duration(seconds: maxReelSeconds)) {
      await controller.dispose();
      setState(() => _error = l.videoTooLong);
      return;
    }
    await controller.setLooping(true);
    _playback?.detach();
    _edits = noEdits;
    final playback = ReelPlayback(controller, _edits);
    if (controller.value.isInitialized) await playback.attach();
    await controller.play();
    setState(() {
      _file = file;
      _video = controller;
      _playback = playback;
      _error = null;
    });
    await old?.dispose();
    // Straight into the editor, like Instagram.
    if (mounted && controller.value.isInitialized) await _openEditor();
  }

  Future<void> _openEditor() async {
    final v = _video;
    if (v == null || !v.value.isInitialized) return;
    _playback?.detach();
    final result = await openReelVideoEditor(context, v, _edits);
    if (!mounted) return;
    if (result != null) _edits = result;
    final playback = ReelPlayback(v, _edits);
    await playback.attach();
    await v.play();
    setState(() => _playback = playback);
  }

  Future<void> _pickCover() async {
    final img = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 1080,
      imageQuality: 85,
    );
    if (img == null) return;
    final bytes = await img.readAsBytes();
    setState(() => _cover = bytes);
  }

  void _addTag(String tag) {
    final text = _caption.text.trimRight();
    if (hashtagsIn(text).contains(tag)) return;
    _caption.text = '${text.isEmpty ? '' : '$text '}#$tag ';
    _caption.selection = TextSelection.collapsed(offset: _caption.text.length);
    setState(() {});
  }

  Future<void> _share() async {
    final file = _file;
    if (file == null) return;
    final l = context.l10n;
    setState(() {
      _progress = 0;
      _error = null;
    });
    try {
      await _video?.pause();
      final caption = _caption.text.trim();
      await ref
          .read(reelsRepositoryProvider)
          .post(
            video: await file.readAsBytes(),
            videoMime: videoMimeOf(file),
            cover: _cover,
            caption: caption.isEmpty ? null : caption,
            hashtags: hashtagsIn(caption),
            templeId: _templeId,
            edits: _edits,
            onProgress: (f) {
              if (mounted) setState(() => _progress = f);
            },
          );
      ref.invalidate(myReelsProvider);
      if (!mounted) return;
      showSnack(context, l.reelProcessing);
      context.pushReplacement('/reels/mine');
    } on Object catch (e) {
      if (mounted) {
        setState(() {
          _progress = null;
          _error = errorText(context, e);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final uploading = _progress != null;
    return Scaffold(
      appBar: AppBar(
        title: Text(l.newReel),
        actions: [
          if (_file != null)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: FilledButton(
                onPressed: uploading ? null : _share,
                style: FilledButton.styleFrom(minimumSize: const Size(0, 38)),
                child: Text(l.shareReel),
              ),
            ),
        ],
      ),
      body: _file == null ? _picker(l) : _editor(l, uploading),
    );
  }

  Widget _picker(AppLocalizations l) => ListView(
    padding: const EdgeInsets.all(20),
    children: [
      const SizedBox(height: 12),
      Container(
        height: 220,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: const LinearGradient(
            colors: [TnColors.navy, Color(0xFF6A3FA0), TnColors.saffron],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: const Center(
          child: Icon(Icons.video_camera_back_rounded, color: Colors.white, size: 72),
        ),
      ),
      const SizedBox(height: 16),
      Text(
        l.reelComposerHint,
        textAlign: TextAlign.center,
        style: const TextStyle(color: TnColors.muted),
      ),
      const SizedBox(height: 20),
      FilledButton.icon(
        onPressed: () => _pick(ImageSource.camera),
        icon: const Icon(Icons.videocam_rounded),
        label: Text(l.recordVideo),
      ),
      const SizedBox(height: 10),
      OutlinedButton.icon(
        onPressed: () => _pick(ImageSource.gallery),
        icon: const Icon(Icons.video_library_outlined),
        label: Text(l.chooseFromGallery),
      ),
      if (_error != null) ...[
        const SizedBox(height: 12),
        Text(
          _error!,
          textAlign: TextAlign.center,
          style: const TextStyle(color: TnColors.sos),
        ),
      ],
    ],
  );

  Widget _editor(AppLocalizations l, bool uploading) {
    final temples = ref.watch(templesProvider).value ?? const <TempleSummaryResponse>[];
    final v = _video;
    return Stack(
      children: [
        ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Preview: tap to play or pause.
                GestureDetector(
                  onTap: v == null
                      ? null
                      : () => setState(() => v.value.isPlaying ? v.pause() : v.play()),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: 132,
                      height: 234,
                      color: Colors.black,
                      child: v != null && v.value.isInitialized
                          ? EditedVideo(controller: v, edits: _edits)
                          : const Center(
                              child: Icon(Icons.movie_outlined, color: Colors.white54, size: 40),
                            ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _caption,
                    minLines: 7,
                    maxLines: 9,
                    maxLength: 2200,
                    enabled: !uploading,
                    decoration: InputDecoration(
                      hintText: l.writeCaption,
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      filled: false,
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
              ],
            ),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final t in suggestedTags)
                  ActionChip(
                    label: Text('#$t'),
                    visualDensity: VisualDensity.compact,
                    onPressed: uploading ? null : () => _addTag(t),
                  ),
              ],
            ),
            const Divider(height: 28),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.movie_edit, color: TnColors.navy),
              title: Text(l.editVideo),
              subtitle: Text(l.editVideoHint),
              trailing: const Icon(Icons.chevron_right),
              onTap: uploading || v == null || !v.value.isInitialized ? null : _openEditor,
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.temple_hindu_outlined, color: TnColors.navy),
              title: Text(l.tagTemple),
              trailing: DropdownButton<String?>(
                value: _templeId,
                underline: const SizedBox.shrink(),
                hint: Text(l.noTemple),
                onChanged: uploading ? null : (id) => setState(() => _templeId = id),
                items: [
                  DropdownMenuItem<String?>(child: Text(l.noTemple)),
                  for (final t in temples)
                    DropdownMenuItem<String?>(
                      value: t.id,
                      child: SizedBox(
                        width: 160,
                        child: Text(t.name, overflow: TextOverflow.ellipsis),
                      ),
                    ),
                ],
              ),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.image_outlined, color: TnColors.navy),
              title: Text(l.cover),
              trailing: _cover == null
                  ? TextButton(onPressed: uploading ? null : _pickCover, child: Text(l.chooseCover))
                  : GestureDetector(
                      onTap: uploading ? null : _pickCover,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.memory(_cover!, width: 40, height: 56, fit: BoxFit.cover),
                      ),
                    ),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.swap_horiz_rounded, color: TnColors.navy),
              title: Text(l.changeVideo),
              onTap: uploading ? null : () => _pick(ImageSource.gallery),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(_error!, style: const TextStyle(color: TnColors.sos)),
              ),
          ],
        ),
        if (uploading)
          Positioned.fill(
            child: ColoredBox(
              color: const Color(0x99000000),
              child: Center(
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 64,
                          height: 64,
                          child: CircularProgressIndicator(value: _progress, strokeWidth: 6),
                        ),
                        const SizedBox(height: 14),
                        Text(l.uploadingReel(((_progress ?? 0) * 100).round())),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
