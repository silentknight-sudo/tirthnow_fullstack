import 'package:intl/intl.dart';

/// Money is integer paise everywhere; format only at the edge.
String formatRupees(num paise, {String locale = 'en'}) {
  final f = NumberFormat.currency(
    locale: locale == 'hi' ? 'hi_IN' : 'en_IN',
    symbol: '₹',
    decimalDigits: paise % 100 == 0 ? 0 : 2,
  );
  return f.format(paise / 100);
}

/// India Standard Time has no daylight saving, so a fixed offset is exact.
const istOffset = Duration(hours: 5, minutes: 30);

/// Converts a UTC instant to IST wall-clock for display.
DateTime toIst(DateTime utc) => utc.toUtc().add(istOffset);

String formatIstTime(DateTime utc) => DateFormat('HH:mm').format(toIst(utc));

String formatIstDate(DateTime utc, {String locale = 'en'}) =>
    DateFormat('EEE d MMM', locale == 'hi' ? 'hi' : 'en').format(toIst(utc));

/// `02:05:09`-style countdown; whole days are shown as `1d 02:05:09`.
String formatCountdown(Duration d) {
  if (d.isNegative) return '00:00:00';
  String two(int n) => n.toString().padLeft(2, '0');
  final days = d.inDays;
  final h = two(d.inHours % 24);
  final m = two(d.inMinutes % 60);
  final s = two(d.inSeconds % 60);
  return days > 0 ? '${days}d $h:$m:$s' : '$h:$m:$s';
}

/// Today's date in IST as `YYYY-MM-DD` (the API's calendar dates are IST).
String istDateString([DateTime? now]) =>
    DateFormat('yyyy-MM-dd').format(toIst(now ?? DateTime.now().toUtc()));
