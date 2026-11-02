import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/widgets/common.dart';
import '../../auth/data/session_controller.dart';
import '../data/ai_repository.dart';

/// Take a photo of a temple and open the best match (the bottom bar's Scan
/// button and the guide's camera action).
Future<void> identifyTempleFromCamera(BuildContext context) async {
  final container = ProviderScope.containerOf(context);
  final photo = await ImagePicker().pickImage(
    source: ImageSource.camera,
    maxWidth: 1600,
    imageQuality: 85,
  );
  if (photo == null || !context.mounted) return;
  try {
    if (!container.read(sessionProvider).signedIn) {
      await container.read(sessionProvider.notifier).continueAsGuest();
    }
    final matches = await container
        .read(aiRepositoryProvider)
        .identifyLandmark(await photo.readAsBytes(), 'image/jpeg');
    if (!context.mounted) return;
    if (matches.isEmpty) {
      showSnack(context, context.l10n.emptyList);
      return;
    }
    await context.push('/temples/${matches.first['templeId']}');
  } on Object catch (e) {
    if (context.mounted) showSnack(context, errorText(context, e));
  }
}
