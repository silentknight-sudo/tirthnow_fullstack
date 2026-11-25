import 'package:flutter_test/flutter_test.dart';
import 'package:tirth_now/core/config/app_config.dart';

void main() {
  test('API address keeps only the origin', () {
    expect(
      apiOrigin('https://tirthnow-api.onrender.com/v1/auth/portal/login'),
      'https://tirthnow-api.onrender.com',
    );
    expect(apiOrigin('https://tirthnow-api.onrender.com/'), 'https://tirthnow-api.onrender.com');
    expect(apiOrigin('http://10.0.2.2:4000'), 'http://10.0.2.2:4000');
  });
}
