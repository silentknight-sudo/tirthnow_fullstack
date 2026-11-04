import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:video_player/video_player.dart';

import '../../../core/api/api_models.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../catalog/data/catalog_repository.dart';
import '../data/reels_repository.dart';
import 'reel_player.dart';
import 'reel_video_editor.dart';

/// Edit a posted reel's caption, hashtags, temple tag or cover.
/// Returns the updated reel, or null if nothing was saved.
Future<ReelResponse?> showReelEditSheet(BuildContext context, ReelResponse reel) =>
    showModalBottomSheet<ReelResponse>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _EditSheet(reel: reel),
    );

class _EditSheet extends ConsumerStatefulWidget {
  const _EditSheet({required this.reel});

  final ReelResponse reel;

  @override
  ConsumerState<_EditSheet> createState() => _EditSheetState();
}

class _EditSheetState extends ConsumerState<_EditSheet> {
  late final _caption = TextEditingController(text: widget.reel.caption ?? '');
  late String? _templeId = widget.reel.templeId;
  Uint8List? _cover;
  bool _busy = false;
  late ReelEditsDto _edits = widget.reel.edits ?? noEdits;
  bool _editsChanged = false;

  @override
  void dispose() {
    _caption.dispose();
    super.dispose();
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

  Future<void> _editVideo() async {
    final url = widget.reel.playbackUrl;
    if (url == null) return;
    final v = VideoPlayerController.networkUrl(Uri.parse(url));
    setState(() => _busy = true);
    try {
      await v.initialize();
      await v.setLooping(true);
      if (!mounted) return;
      final result = await openReelVideoEditor(context, v, _edits);
      if (result != null && mounted) {
        setState(() {
          _edits = result;
          _editsChanged = true;
        });
      }
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      await v.dispose();
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save() async {
    final l = context.l10n;
    setState(() => _busy = true);
    try {
      final caption = _caption.text.trim();
      final updated = await ref
          .read(reelsRepositoryProvider)
          .edit(
            widget.reel.id,
            caption: caption,
            hashtags: hashtagsIn(caption),
            templeId: _templeId,
            cover: _cover,
            edits: _editsChanged ? _edits : null,
          );
      ref
        ..invalidate(myReelsProvider)
        ..invalidate(reelsFeedProvider);
      if (!mounted) return;
      showSnack(context, l.reelSaved);
      Navigator.pop(context, updated);
    } on Object catch (e) {
      if (mounted) {
        setState(() => _busy = false);
        showSnack(context, errorText(context, e));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final temples = ref.watch(templesProvider).value ?? const <TempleSummaryResponse>[];
    final poster = widget.reel.posterUrl;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l.editReel, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GestureDetector(
                onTap: _busy ? null : _pickCover,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SizedBox(
                    width: 72,
                    height: 128,
                    child: _cover != null
                        ? Image.memory(_cover!, fit: BoxFit.cover)
                        : poster != null
                        ? Image.network(
                            poster,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => const ColoredBox(color: TnColors.night),
                          )
                        : const ColoredBox(
                            color: TnColors.night,
                            child: Icon(Icons.image_outlined, color: Colors.white54),
                          ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _caption,
                  minLines: 5,
                  maxLines: 7,
                  maxLength: 2200,
                  decoration: InputDecoration(hintText: l.writeCaption),
                ),
              ),
            ],
          ),
          if (widget.reel.playbackUrl != null)
            TextButton.icon(
              onPressed: _busy ? null : _editVideo,
              icon: const Icon(Icons.movie_edit),
              label: Text(l.editVideo),
            ),
          TextButton.icon(
            onPressed: _busy ? null : _pickCover,
            icon: const Icon(Icons.image_outlined),
            label: Text(l.chooseCover),
          ),
          DropdownButtonFormField<String?>(
            initialValue: _templeId,
            decoration: InputDecoration(labelText: l.tagTemple),
            isExpanded: true,
            items: [
              DropdownMenuItem<String?>(child: Text(l.noTemple)),
              for (final t in temples)
                DropdownMenuItem<String?>(
                  value: t.id,
                  child: Text(t.name, overflow: TextOverflow.ellipsis),
                ),
            ],
            onChanged: _busy ? null : (id) => setState(() => _templeId = id),
          ),
          const SizedBox(height: 16),
          FilledButton(onPressed: _busy ? null : _save, child: Text(l.save)),
        ],
      ),
    );
  }
}
