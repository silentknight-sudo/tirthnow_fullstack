import 'dart:convert';

import 'package:hive_ce_flutter/hive_ce_flutter.dart';

/// Small offline cache for read-only catalog responses (temples, aarti,
/// festivals). Pilgrims often lose signal in crowded lanes.
abstract interface class JsonCache {
  Future<Object?> read(String key);
  Future<void> write(String key, Object? value);
}

class MemoryJsonCache implements JsonCache {
  final _data = <String, String>{};

  @override
  Future<Object?> read(String key) async {
    final raw = _data[key];
    return raw == null ? null : jsonDecode(raw);
  }

  @override
  Future<void> write(String key, Object? value) async => _data[key] = jsonEncode(value);
}

class HiveJsonCache implements JsonCache {
  HiveJsonCache(this._box);

  static Future<HiveJsonCache> open() async {
    await Hive.initFlutter();
    return HiveJsonCache(await Hive.openBox<String>('tn_cache'));
  }

  final Box<String> _box;

  @override
  Future<Object?> read(String key) async {
    final raw = _box.get(key);
    return raw == null ? null : jsonDecode(raw);
  }

  @override
  Future<void> write(String key, Object? value) => _box.put(key, jsonEncode(value));
}
