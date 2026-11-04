import 'dart:io';

import 'package:image_picker/image_picker.dart';
import 'package:video_player/video_player.dart';

/// Preview a picked video from the device file system.
VideoPlayerController localVideoController(XFile file) =>
    VideoPlayerController.file(File(file.path));
