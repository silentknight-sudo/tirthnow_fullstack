import 'dart:convert';

import 'package:flutter/foundation.dart';

/// One server-sent event (`event:` + JSON `data:`).
@immutable
class SseEvent {
  const SseEvent(this.event, this.data);

  final String event;
  final Map<String, dynamic> data;

  @override
  String toString() => 'SseEvent($event, $data)';
}

/// Turns a stream of UTF-8 text chunks into [SseEvent]s. Chunks may split
/// anywhere, including inside a line.
Stream<SseEvent> parseSse(Stream<String> chunks) async* {
  var buffer = '';
  var event = 'message';
  final data = StringBuffer();

  SseEvent? flush() {
    if (data.isEmpty) {
      event = 'message';
      return null;
    }
    final raw = data.toString();
    data.clear();
    final name = event;
    event = 'message';
    try {
      final decoded = jsonDecode(raw);
      return SseEvent(name, decoded is Map ? decoded.cast<String, dynamic>() : {'value': decoded});
    } on FormatException {
      return SseEvent(name, {'text': raw});
    }
  }

  await for (final chunk in chunks) {
    buffer += chunk;
    var nl = buffer.indexOf('\n');
    while (nl >= 0) {
      final line = buffer.substring(0, nl).replaceAll('\r', '');
      buffer = buffer.substring(nl + 1);
      if (line.isEmpty) {
        final e = flush();
        if (e != null) yield e;
      } else if (line.startsWith('event:')) {
        event = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        if (data.isNotEmpty) data.write('\n');
        data.write(line.substring(5).trimLeft());
      }
      nl = buffer.indexOf('\n');
    }
  }
  final last = flush();
  if (last != null) yield last;
}
