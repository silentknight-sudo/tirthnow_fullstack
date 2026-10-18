import 'package:flutter_test/flutter_test.dart';
import 'package:tirth_now/core/api/sse.dart';

void main() {
  test('parses events split across arbitrary chunk boundaries', () async {
    const raw =
        'event: token\ndata: {"text":"Radhe "}\n\n'
        'event: token\ndata: {"text":"Radhe!"}\n\n'
        'event: citation\ndata: {"n":1,"title":"Temple guide"}\n\n'
        'event: done\ndata: {"messageId":"m1"}\n\n';
    final chunks = <String>[];
    for (var i = 0; i < raw.length; i += 7) {
      chunks.add(raw.substring(i, i + 7 > raw.length ? raw.length : i + 7));
    }
    final events = await parseSse(Stream.fromIterable(chunks)).toList();
    expect(events.map((e) => e.event), ['token', 'token', 'citation', 'done']);
    expect(
      events.where((e) => e.event == 'token').map((e) => e.data['text']).join(),
      'Radhe Radhe!',
    );
    expect(events[2].data['title'], 'Temple guide');
  });

  test('handles CRLF line endings and a final event without a blank line', () async {
    final events = await parseSse(Stream.value('event: error\r\ndata: {"code":"X"}\r\n')).toList();
    expect(events.single.event, 'error');
    expect(events.single.data['code'], 'X');
  });

  test('keeps non-JSON data as text', () async {
    final events = await parseSse(Stream.value('data: hello\n\n')).toList();
    expect(events.single.event, 'message');
    expect(events.single.data['text'], 'hello');
  });
}
