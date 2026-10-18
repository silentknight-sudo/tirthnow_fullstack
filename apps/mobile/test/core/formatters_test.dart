import 'package:flutter_test/flutter_test.dart';
import 'package:tirth_now/core/format/formatters.dart';
import 'package:tirth_now/core/format/phone.dart';

void main() {
  group('formatRupees', () {
    test('whole rupees drop the decimals', () => expect(formatRupees(216000), '₹2,160'));
    test('Indian digit grouping', () => expect(formatRupees(1250000000), '₹1,25,00,000'));
    test('paise are kept when present', () => expect(formatRupees(14999), '₹149.99'));
  });

  test('countdown formats hours, minutes, seconds and days', () {
    expect(formatCountdown(const Duration(hours: 2, minutes: 5, seconds: 9)), '02:05:09');
    expect(formatCountdown(const Duration(days: 1, hours: 3)), '1d 03:00:00');
    expect(formatCountdown(const Duration(seconds: -5)), '00:00:00');
  });

  test('IST is UTC+05:30 regardless of device zone', () {
    final utc = DateTime.utc(2026, 10, 18, 13, 0);
    expect(formatIstTime(utc), '18:30');
    expect(istDateString(DateTime.utc(2026, 10, 18, 19, 0)), '2026-10-19');
  });

  group('toIndianE164', () {
    test('accepts 10-digit numbers', () => expect(toIndianE164('98123 45678'), '+919812345678'));
    test('accepts +91 prefix', () => expect(toIndianE164('+91 9812345678'), '+919812345678'));
    test('rejects landlines and short numbers', () {
      expect(toIndianE164('0123456789'), isNull);
      expect(toIndianE164('98123'), isNull);
    });
  });
}
