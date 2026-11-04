import 'package:image_picker/image_picker.dart';
import 'package:video_player/video_player.dart';

/// On the web a picked file's path is a blob: URL.
VideoPlayerController localVideoController(XFile file) =>
    VideoPlayerController.networkUrl(Uri.parse(file.path));
