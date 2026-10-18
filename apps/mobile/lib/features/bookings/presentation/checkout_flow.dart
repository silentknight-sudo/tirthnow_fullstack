import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_models.dart';
import '../../../core/widgets/common.dart';
import '../../auth/data/session_controller.dart';
import '../data/bookings_repository.dart';
import '../data/payment_checkout.dart';

/// Guests can browse; bookings need a phone sign-in.
bool requireSignedIn(BuildContext context, WidgetRef ref) {
  final s = ref.read(sessionProvider);
  if (s.signedIn && !s.isGuest) return true;
  showSnack(context, context.l10n.signInToContinue);
  return false;
}

/// Creates the order, opens checkout, verifies the payment, then shows the
/// order. One idempotency key per tap protects against double bookings.
Future<void> placeOrder(
  BuildContext context,
  WidgetRef ref,
  CreateOrderDto dto, {
  String? description,
}) async {
  if (!requireSignedIn(context, ref)) return;
  final repo = ref.read(bookingsRepositoryProvider);
  final key = ApiClient.newIdempotencyKey();
  try {
    final created = await repo.createOrder(dto, idempotencyKey: key);
    if (!context.mounted) return;
    final intent = created.payment;
    if (intent != null) {
      await payForOrder(context, ref, created.order.id, intent, description: description);
    }
    ref.invalidate(ordersProvider);
    if (context.mounted) await context.push('/book/orders/${created.order.id}');
  } on Object catch (e) {
    if (context.mounted) showSnack(context, errorText(context, e));
  }
}

/// Opens the gateway for a pending order and verifies the result with the API.
Future<bool> payForOrder(
  BuildContext context,
  WidgetRef ref,
  String orderId,
  PaymentIntentResponse intent, {
  String? description,
}) async {
  final l = context.l10n;
  final result = await ref
      .read(paymentCheckoutProvider)
      .open(context, intent, description: description);
  if (!context.mounted) return false;
  if (!result.ok) {
    showSnack(context, l.paymentFailed);
    return false;
  }
  try {
    await ref
        .read(bookingsRepositoryProvider)
        .verifyPayment(
          orderId,
          VerifyPaymentDto(
            providerOrderId: intent.providerOrderId,
            providerPaymentId: result.providerPaymentId!,
            signature: result.signature!,
          ),
          idempotencyKey: ApiClient.newIdempotencyKey(),
        );
    ref
      ..invalidate(orderProvider(orderId))
      ..invalidate(ordersProvider);
    if (context.mounted) showSnack(context, l.paymentSuccess);
    return true;
  } on Object catch (e) {
    if (context.mounted) showSnack(context, errorText(context, e));
    return false;
  }
}
