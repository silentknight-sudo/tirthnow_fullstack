import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../reviews/presentation/reviews_section.dart';
import '../data/bookings_repository.dart';
import 'checkout_flow.dart';

/// Search dates shared by the list and detail screens.
class StayQuery {
  const StayQuery({required this.checkIn, required this.checkOut, this.guests = 2, this.rooms = 1});

  factory StayQuery.tonight() {
    final today = DateTime.parse(istDateString());
    return StayQuery(checkIn: today, checkOut: today.add(const Duration(days: 1)));
  }

  final DateTime checkIn;
  final DateTime checkOut;
  final int guests;
  final int rooms;

  String get checkInStr => DateFormat('yyyy-MM-dd').format(checkIn);
  String get checkOutStr => DateFormat('yyyy-MM-dd').format(checkOut);
  int get nights => checkOut.difference(checkIn).inDays;

  StayQuery copyWith({DateTime? checkIn, DateTime? checkOut, int? guests, int? rooms}) => StayQuery(
    checkIn: checkIn ?? this.checkIn,
    checkOut: checkOut ?? this.checkOut,
    guests: guests ?? this.guests,
    rooms: rooms ?? this.rooms,
  );

  @override
  bool operator ==(Object other) =>
      other is StayQuery &&
      other.checkInStr == checkInStr &&
      other.checkOutStr == checkOutStr &&
      other.guests == guests &&
      other.rooms == rooms;

  @override
  int get hashCode => Object.hash(checkInStr, checkOutStr, guests, rooms);
}

class StayQueryController extends Notifier<StayQuery> {
  @override
  StayQuery build() => StayQuery.tonight();

  void set(StayQuery q) => state = q;
}

final stayQueryProvider = NotifierProvider<StayQueryController, StayQuery>(StayQueryController.new);

final hotelsProvider = FutureProvider<List<HotelResponse>>((ref) {
  final q = ref.watch(stayQueryProvider);
  return ref
      .watch(bookingsRepositoryProvider)
      .hotels(checkIn: q.checkInStr, checkOut: q.checkOutStr, guests: q.guests, rooms: q.rooms);
});

final hotelProvider = FutureProvider.family<HotelResponse, String>((ref, id) {
  final q = ref.watch(stayQueryProvider);
  return ref
      .watch(bookingsRepositoryProvider)
      .hotel(id, checkIn: q.checkInStr, checkOut: q.checkOutStr, guests: q.guests, rooms: q.rooms);
});

class _StayBar extends ConsumerWidget {
  const _StayBar();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final q = ref.watch(stayQueryProvider);
    final fmt = DateFormat('d MMM');
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Row(
            children: [
              Expanded(
                child: TextButton.icon(
                  icon: const Icon(Icons.date_range),
                  label: Text('${fmt.format(q.checkIn)} → ${fmt.format(q.checkOut)}'),
                  onPressed: () async {
                    final now = DateTime.parse(istDateString());
                    final r = await showDateRangePicker(
                      context: context,
                      firstDate: now,
                      lastDate: now.add(const Duration(days: 365)),
                      initialDateRange: DateTimeRange(start: q.checkIn, end: q.checkOut),
                    );
                    if (r != null && r.duration.inDays >= 1) {
                      ref
                          .read(stayQueryProvider.notifier)
                          .set(q.copyWith(checkIn: r.start, checkOut: r.end));
                    }
                  },
                ),
              ),
              _Stepper(
                label: l.guests,
                value: q.guests,
                min: 1,
                max: 12,
                onChanged: (v) => ref.read(stayQueryProvider.notifier).set(q.copyWith(guests: v)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Stepper extends StatelessWidget {
  const _Stepper({
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
  });

  final String label;
  final int value;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          tooltip: '$label −',
          icon: const Icon(Icons.remove_circle_outline),
          onPressed: value > min ? () => onChanged(value - 1) : null,
        ),
        Text('$value', semanticsLabel: '$value $label'),
        IconButton(
          tooltip: '$label +',
          icon: const Icon(Icons.add_circle_outline),
          onPressed: value < max ? () => onChanged(value + 1) : null,
        ),
      ],
    );
  }
}

class HotelsScreen extends ConsumerWidget {
  const HotelsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final hotels = ref.watch(hotelsProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.stays)),
      body: Column(
        children: [
          const _StayBar(),
          Expanded(
            child: AsyncView(
              value: hotels,
              onRetry: () => ref.invalidate(hotelsProvider),
              builder: (list) => list.isEmpty
                  ? const EmptyState(icon: Icons.bed_outlined)
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
                      itemCount: list.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (_, i) => _HotelCard(hotel: list[i]),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HotelCard extends StatelessWidget {
  const _HotelCard({required this.hotel});

  final HotelResponse hotel;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final price = hotel.fromPricePaise;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/book/hotels/${hotel.id}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CoverImage(hotel.coverUrl, height: 130, radius: 0),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          hotel.name,
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 19),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          hotel.address,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: TnColors.muted),
                        ),
                        if (hotel.ratingCount > 0) ...[
                          const SizedBox(height: 6),
                          Pill('★ ${hotel.ratingAvg.toStringAsFixed(1)} (${hotel.ratingCount})'),
                        ],
                      ],
                    ),
                  ),
                  if (price != null)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          formatRupees(price, locale: context.lang),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        Text(
                          l.perNight,
                          style: const TextStyle(color: TnColors.muted, fontSize: 12),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class HotelDetailScreen extends ConsumerWidget {
  const HotelDetailScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final hotel = ref.watch(hotelProvider(id));
    return Scaffold(
      appBar: AppBar(title: Text(hotel.value?.name ?? l.stays)),
      body: AsyncView(
        value: hotel,
        onRetry: () => ref.invalidate(hotelProvider(id)),
        builder: (h) {
          final policy = h.cancellationPolicy;
          return ListView(
            padding: const EdgeInsets.only(bottom: 40),
            children: [
              CoverImage(h.coverUrl, height: 200, radius: 0),
              const SizedBox(height: 12),
              const _StayBar(),
              if (h.description != null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text(h.description!),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [for (final a in h.amenities) Pill(a, color: TnColors.muted)],
                ),
              ),
              SectionTitle(l.selectRoom),
              for (final r in h.roomTypes ?? const <RoomTypeResponse>[])
                _RoomTile(hotel: h, room: r),
              SectionTitle(l.cancellationPolicy),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  l.freeCancellation('${policy.freeUntilHoursBefore}', '${policy.penaltyPctAfter}'),
                ),
              ),
              ReviewsSection(targetType: 'hotel', targetId: h.id),
            ],
          );
        },
      ),
    );
  }
}

class _RoomTile extends ConsumerWidget {
  const _RoomTile({required this.hotel, required this.room});

  final HotelResponse hotel;
  final RoomTypeResponse room;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final q = ref.watch(stayQueryProvider);
    final available = room.available ?? true;
    final total = room.stayTotalPaise ?? room.basePricePaise * q.nights * q.rooms;
    return Card(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(room.name, style: Theme.of(context).textTheme.titleMedium),
                  Text(
                    '${l.guests}: ${room.maxGuests}',
                    style: const TextStyle(color: TnColors.muted),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${formatRupees(total, locale: context.lang)} · ${l.nightsCount(q.nights)}',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  if (room.roomsLeft != null && room.roomsLeft! <= 3)
                    Text(
                      l.roomsLeft(room.roomsLeft!.toInt()),
                      style: const TextStyle(color: TnColors.saffron),
                    ),
                ],
              ),
            ),
            FilledButton(
              onPressed: available
                  ? () => placeOrder(
                      context,
                      ref,
                      CreateOrderDto(
                        type: 'hotel',
                        hotel: HotelOrderDto(
                          roomTypeId: room.id,
                          checkIn: q.checkInStr,
                          checkOut: q.checkOutStr,
                          guests: q.guests,
                          rooms: q.rooms,
                        ),
                      ),
                      description: '${hotel.name} · ${room.name}',
                    )
                  : null,
              child: Text(l.bookNow),
            ),
          ],
        ),
      ),
    );
  }
}
