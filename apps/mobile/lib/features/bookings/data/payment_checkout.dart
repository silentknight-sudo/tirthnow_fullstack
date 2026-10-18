import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

import '../../../core/api/api_models.dart';
import '../../../core/config/app_config.dart';
import '../../../core/format/formatters.dart';
import '../../../core/providers.dart';
import '../../../core/widgets/common.dart';
import 'bookings_repository.dart';

/// What the gateway SDK hands back after checkout.
class CheckoutResult {
  const CheckoutResult.success({required this.providerPaymentId, required this.signature})
    : ok = true,
      error = null;

  const CheckoutResult.failed([this.error])
    : ok = false,
      providerPaymentId = null,
      signature = null;

  final bool ok;
  final String? providerPaymentId;
  final String? signature;
  final String? error;
}

/// Opens the payment sheet for a [PaymentIntentResponse]. Razorpay in
/// production; a test sheet backed by the API's mock gateway locally.
abstract interface class PaymentCheckout {
  Future<CheckoutResult> open(
    BuildContext context,
    PaymentIntentResponse intent, {
    String? description,
  });
}

class MockPaymentCheckout implements PaymentCheckout {
  MockPaymentCheckout(this._repo);

  final BookingsRepository _repo;

  @override
  Future<CheckoutResult> open(
    BuildContext context,
    PaymentIntentResponse intent, {
    String? description,
  }) async {
    final l = context.l10n;
    final succeed = await showModalBottomSheet<bool>(
      useRootNavigator: true,
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(l.mockCheckoutTitle, style: Theme.of(ctx).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(
                formatRupees(intent.amountPaise, locale: context.lang),
                style: Theme.of(ctx).textTheme.headlineMedium,
              ),
              if (description != null) Text(description),
              const SizedBox(height: 8),
              Text(l.mockCheckoutBody),
              const SizedBox(height: 16),
              FilledButton(
                key: const Key('mock-pay'),
                onPressed: () => Navigator.pop(ctx, true),
                child: Text(l.mockPaySucceed),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: Text(l.mockPayFail),
              ),
            ],
          ),
        ),
      ),
    );
    if (succeed == null) return const CheckoutResult.failed('dismissed');
    final res = await _repo.mockCheckout(intent.providerOrderId, succeed: succeed);
    if (res['captured'] != true) return const CheckoutResult.failed('declined');
    return CheckoutResult.success(
      providerPaymentId: res['providerPaymentId'] as String,
      signature: res['signature'] as String,
    );
  }
}

class RazorpayCheckout implements PaymentCheckout {
  RazorpayCheckout(this._keyId);

  final String _keyId;

  @override
  Future<CheckoutResult> open(
    BuildContext context,
    PaymentIntentResponse intent, {
    String? description,
  }) {
    final done = Completer<CheckoutResult>();
    final rzp = Razorpay();
    rzp
      ..on(Razorpay.EVENT_PAYMENT_SUCCESS, (PaymentSuccessResponse r) {
        if (!done.isCompleted) {
          done.complete(
            r.paymentId != null && r.signature != null
                ? CheckoutResult.success(providerPaymentId: r.paymentId!, signature: r.signature!)
                : const CheckoutResult.failed('incomplete'),
          );
        }
      })
      ..on(Razorpay.EVENT_PAYMENT_ERROR, (PaymentFailureResponse r) {
        if (!done.isCompleted) done.complete(CheckoutResult.failed(r.message));
      })
      ..open({
        'key': intent.keyId.isNotEmpty ? intent.keyId : _keyId,
        'amount': intent.amountPaise,
        'currency': intent.currency,
        'order_id': intent.providerOrderId,
        'name': 'Tirth Now',
        'description': ?description,
      });
    return done.future.whenComplete(rzp.clear);
  }
}

final paymentCheckoutProvider = Provider<PaymentCheckout>((ref) {
  final config = ref.watch(appConfigProvider);
  return config.paymentProvider == PaymentProviderKind.razorpay
      ? RazorpayCheckout(config.razorpayKeyId)
      : MockPaymentCheckout(ref.watch(bookingsRepositoryProvider));
});
