/// Normalises an Indian mobile number to E.164. Accepts 10 digits starting
/// 6–9, with or without a leading +91 / 91. Returns null when invalid.
String? toIndianE164(String input) {
  final digits = input.replaceAll(RegExp(r'\D'), '');
  final local = digits.length == 12 && digits.startsWith('91') ? digits.substring(2) : digits;
  if (!RegExp(r'^[6-9]\d{9}$').hasMatch(local)) return null;
  return '+91$local';
}
