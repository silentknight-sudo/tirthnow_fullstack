import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../../l10n/app_localizations.dart';
import '../../bookings/presentation/checkout_flow.dart';
import '../../bookings/presentation/hotels_screens.dart';
import '../../catalog/data/catalog_repository.dart';
import '../data/ai_repository.dart';

const _interests = ['aarti', 'temples', 'parikrama', 'ghats', 'food', 'shopping', 'festivals'];

/// Plan a yatra: solo, family or group, with stay, travel and your own
/// stops. "AI plan" builds days around real aarti times from the temple
/// schedules; "Custom plan" keeps only what you add.
class PlannerScreen extends ConsumerStatefulWidget {
  const PlannerScreen({super.key});

  @override
  ConsumerState<PlannerScreen> createState() => _PlannerScreenState();
}

class _Member {
  _Member(this.name, {this.age, this.phone, this.role = 'member'});
  String name;
  int? age;
  String? phone;
  String role;
}

class _Stop {
  _Stop(this.dayIndex, this.time, this.title, {this.note, this.templeId});
  int dayIndex;
  String time;
  String title;
  String? note;
  String? templeId;
}

class _PlannerScreenState extends ConsumerState<PlannerScreen> {
  String _tripType = 'family';
  final _groupName = TextEditingController();
  final _members = <_Member>[];
  DateTime _start = DateTime.parse(istDateString()).add(const Duration(days: 1));
  int _days = 2;
  final _cities = <String>{'vrindavan'};
  String _mode = 'ai';
  String _pace = 'normal';
  final _picked = <String>{'aarti', 'temples'};
  bool _elderly = false;
  bool _wheelchair = false;

  bool _withStay = true;
  HotelResponse? _hotel;
  final _stayName = TextEditingController();
  final _nightly = TextEditingController();
  int _rooms = 1;
  String _checkIn = '12:00';

  bool _withTravel = true;
  String _arrivalMode = 'train';
  final _from = TextEditingController();
  String? _arrival = '09:00';
  String? _departure = '18:00';
  String _local = 'e_rickshaw';
  final _travelDetails = TextEditingController();

  final _stops = <_Stop>[];
  final _notes = TextEditingController();
  bool _busy = false;
  Json? _plan;

  @override
  void dispose() {
    for (final c in [_groupName, _stayName, _nightly, _from, _travelDetails, _notes]) {
      c.dispose();
    }
    super.dispose();
  }

  int get _party => _tripType == 'solo' ? 1 : (_members.isEmpty ? 1 : _members.length);

  Future<String?> _pickTime(String? current) async {
    final parts = (current ?? '09:00').split(':').map(int.parse).toList();
    final t = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: parts[0], minute: parts[1]),
      builder: (c, child) =>
          MediaQuery(data: MediaQuery.of(c).copyWith(alwaysUse24HourFormat: true), child: child!),
    );
    if (t == null) return null;
    return '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
  }

  Future<void> _editMember([int? index]) async {
    final m = await showModalBottomSheet<_Member?>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      useRootNavigator: true,
      builder: (_) => _MemberSheet(initial: index == null ? null : _members[index]),
    );
    if (m == null) return;
    setState(() {
      if (index == null) {
        _members.add(m);
      } else {
        _members[index] = m;
      }
    });
  }

  Future<void> _addStop() async {
    final s = await showModalBottomSheet<_Stop?>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      useRootNavigator: true,
      builder: (_) => _StopSheet(days: _days, pickTime: _pickTime),
    );
    if (s != null) setState(() => _stops.add(s));
  }

  Future<void> _generate() async {
    final l = context.l10n;
    if (!requireSignedIn(context, ref)) return;
    if (_mode == 'custom' && _stops.isEmpty && !_withStay && !_withTravel) {
      showSnack(context, l.customNeedsStops);
      return;
    }
    if (_tripType != 'solo' && _members.isEmpty) {
      showSnack(context, l.addMembersFirst);
      return;
    }
    setState(() => _busy = true);
    try {
      final stayName = _hotel?.name ?? _stayName.text.trim();
      final nightlyRupees = int.tryParse(_nightly.text.trim());
      final plan = await ref
          .read(aiRepositoryProvider)
          .createItinerary(
            CreateItineraryDto(
              days: _days,
              startDate: DateFormat('yyyy-MM-dd').format(_start),
              pace: _pace,
              mode: _mode,
              cities: _cities.toList(),
              interests: _mode == 'ai' ? _picked.toList() : null,
              lang: ref.read(localeProvider).languageCode,
              partySize: _party,
              tripType: _tripType,
              groupName: _groupName.text.trim().isEmpty ? null : _groupName.text.trim(),
              members: _tripType == 'solo'
                  ? null
                  : [
                      for (final m in _members)
                        TripMemberDto(name: m.name, age: m.age, phone: m.phone, role: m.role),
                    ],
              accessibility: AccessibilityDto(elderly: _elderly, wheelchair: _wheelchair),
              stay: _withStay && stayName.isNotEmpty
                  ? TripStayDto(
                      name: stayName,
                      hotelId: _hotel?.id,
                      rooms: _rooms,
                      checkInTime: _checkIn,
                      nightlyPaise: nightlyRupees != null
                          ? nightlyRupees * 100
                          : _hotel?.fromPricePaise,
                      address: _hotel?.address,
                    )
                  : null,
              travel: _withTravel
                  ? TripTravelDto(
                      arrivalMode: _arrivalMode,
                      from: _from.text.trim().isEmpty ? null : _from.text.trim(),
                      arrivalTime: _arrival,
                      departureTime: _departure,
                      localTransport: _local,
                      details: _travelDetails.text.trim().isEmpty
                          ? null
                          : _travelDetails.text.trim(),
                    )
                  : null,
              customStops: [
                for (final s in _stops.where((s) => s.dayIndex < _days))
                  CustomStopDto(
                    dayIndex: s.dayIndex,
                    time: s.time,
                    title: s.title,
                    note: s.note,
                    templeId: s.templeId,
                  ),
              ],
              notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
            ),
          );
      setState(() => _plan = plan);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final plan = _plan;
    if (plan != null) {
      return Scaffold(
        appBar: AppBar(title: Text(l.yourYatra)),
        body: ItineraryView(plan: plan, onReset: () => setState(() => _plan = null)),
      );
    }
    return Scaffold(
      appBar: AppBar(title: Text(l.planner)),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: FilledButton.icon(
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
            icon: _busy
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : Icon(_mode == 'ai' ? Icons.auto_awesome : Icons.edit_calendar_rounded),
            label: Text(_mode == 'ai' ? l.createAiPlan : l.createCustomPlan),
            onPressed: _busy ? null : _generate,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          const _PlannerHero(),
          const SizedBox(height: 16),
          _Section(
            icon: Icons.groups_2_rounded,
            title: l.whoIsTravelling,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    for (final (k, icon, label) in [
                      ('solo', Icons.person_rounded, l.tripSolo),
                      ('family', Icons.family_restroom_rounded, l.tripFamily),
                      ('group', Icons.groups_rounded, l.tripGroup),
                    ])
                      Expanded(
                        child: _ChoiceCard(
                          icon: icon,
                          label: label,
                          selected: _tripType == k,
                          onTap: () => setState(() => _tripType = k),
                        ),
                      ),
                  ],
                ),
                if (_tripType != 'solo') ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: _groupName,
                    maxLength: 60,
                    decoration: InputDecoration(
                      labelText: l.groupName,
                      hintText: l.groupNameHint,
                      prefixIcon: const Icon(Icons.flag_rounded),
                      counterText: '',
                    ),
                  ),
                  const SizedBox(height: 10),
                  for (final (i, m) in _members.indexed)
                    _MemberTile(
                      member: m,
                      onTap: () => _editMember(i),
                      onRemove: () => setState(() => _members.removeAt(i)),
                    ),
                  OutlinedButton.icon(
                    onPressed: _members.length >= 50 ? null : _editMember,
                    icon: const Icon(Icons.person_add_alt_1_rounded),
                    label: Text(l.addMember),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    l.membersCount(_members.length),
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: TnColors.muted, fontSize: 12),
                  ),
                ],
              ],
            ),
          ),
          _Section(
            icon: Icons.event_rounded,
            title: l.whenWhere,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _FieldTile(
                        icon: Icons.calendar_month_rounded,
                        label: l.startDate,
                        value: DateFormat('EEE, d MMM', context.lang).format(_start),
                        onTap: () async {
                          final now = DateTime.parse(istDateString());
                          final d = await showDatePicker(
                            context: context,
                            firstDate: now,
                            lastDate: now.add(const Duration(days: 365)),
                            initialDate: _start,
                          );
                          if (d != null) setState(() => _start = d);
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    _Stepper(
                      label: l.days,
                      value: _days,
                      min: 1,
                      max: 7,
                      onChanged: (v) => setState(() => _days = v),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(l.cities, style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    for (final c in ref.watch(citiesProvider).value ?? const <CityResponse>[])
                      FilterChip(
                        label: Text(c.name),
                        selected: _cities.contains(c.slug),
                        onSelected: (on) => setState(() {
                          if (on && _cities.length < 5) {
                            _cities.add(c.slug);
                          } else if (!on && _cities.length > 1) {
                            _cities.remove(c.slug);
                          }
                        }),
                      ),
                  ],
                ),
              ],
            ),
          ),
          _Section(
            icon: Icons.tune_rounded,
            title: l.planningStyle,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SegmentedButton<String>(
                  segments: [
                    ButtonSegment(
                      value: 'ai',
                      icon: const Icon(Icons.auto_awesome),
                      label: Text(l.modeAi),
                    ),
                    ButtonSegment(
                      value: 'custom',
                      icon: const Icon(Icons.edit_note_rounded),
                      label: Text(l.modeCustom),
                    ),
                  ],
                  selected: {_mode},
                  onSelectionChanged: (s) => setState(() => _mode = s.first),
                ),
                const SizedBox(height: 8),
                Text(
                  _mode == 'ai' ? l.modeAiHint : l.modeCustomHint,
                  style: const TextStyle(color: TnColors.muted, fontSize: 12.5),
                ),
                if (_mode == 'ai') ...[
                  const SizedBox(height: 12),
                  Text(l.pace, style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  SegmentedButton<String>(
                    segments: [
                      ButtonSegment(value: 'relaxed', label: Text(l.paceRelaxed)),
                      ButtonSegment(value: 'normal', label: Text(l.paceModerate)),
                      ButtonSegment(value: 'packed', label: Text(l.paceIntense)),
                    ],
                    selected: {_pace},
                    showSelectedIcon: false,
                    onSelectionChanged: (s) => setState(() => _pace = s.first),
                  ),
                  const SizedBox(height: 12),
                  Text(l.interests, style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      for (final i in _interests)
                        FilterChip(
                          label: Text(_interestLabel(l, i)),
                          selected: _picked.contains(i),
                          onSelected: (on) =>
                              setState(() => on ? _picked.add(i) : _picked.remove(i)),
                        ),
                    ],
                  ),
                ],
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  secondary: const Icon(Icons.elderly_rounded, color: TnColors.navy),
                  title: Text(l.eldersInGroup),
                  value: _elderly,
                  onChanged: (v) => setState(() => _elderly = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  secondary: const Icon(Icons.accessible_rounded, color: TnColors.navy),
                  title: Text(l.wheelchairAccess),
                  value: _wheelchair,
                  onChanged: (v) => setState(() => _wheelchair = v),
                ),
              ],
            ),
          ),
          _Section(
            icon: Icons.hotel_rounded,
            title: l.stay,
            trailing: Switch(value: _withStay, onChanged: (v) => setState(() => _withStay = v)),
            child: !_withStay
                ? Text(l.stayOff, style: const TextStyle(color: TnColors.muted))
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(l.pickHotel, style: const TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 118,
                        child: ref
                            .watch(hotelsProvider)
                            .when(
                              loading: () => const Center(child: CircularProgressIndicator()),
                              error: (_, _) => const SizedBox.shrink(),
                              data: (hotels) => ListView(
                                scrollDirection: Axis.horizontal,
                                children: [
                                  for (final h in hotels)
                                    _HotelChoice(
                                      hotel: h,
                                      selected: _hotel?.id == h.id,
                                      onTap: () => setState(() {
                                        _hotel = _hotel?.id == h.id ? null : h;
                                        _stayName.clear();
                                        _nightly.text = _hotel?.fromPricePaise == null
                                            ? ''
                                            : '${(_hotel!.fromPricePaise! / 100).round()}';
                                      }),
                                    ),
                                ],
                              ),
                            ),
                      ),
                      if (_hotel == null) ...[
                        const SizedBox(height: 10),
                        TextField(
                          controller: _stayName,
                          maxLength: 120,
                          decoration: InputDecoration(
                            labelText: l.ownStay,
                            hintText: l.ownStayHint,
                            prefixIcon: const Icon(Icons.house_rounded),
                            counterText: '',
                          ),
                        ),
                      ],
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _nightly,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                labelText: l.pricePerNight,
                                prefixText: '₹ ',
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          _Stepper(
                            label: l.rooms,
                            value: _rooms,
                            min: 1,
                            max: 50,
                            onChanged: (v) => setState(() => _rooms = v),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      _FieldTile(
                        icon: Icons.login_rounded,
                        label: l.checkInTime,
                        value: _checkIn,
                        onTap: () async {
                          final t = await _pickTime(_checkIn);
                          if (t != null) setState(() => _checkIn = t);
                        },
                      ),
                    ],
                  ),
          ),
          _Section(
            icon: Icons.train_rounded,
            title: l.travelDetails,
            trailing: Switch(value: _withTravel, onChanged: (v) => setState(() => _withTravel = v)),
            child: !_withTravel
                ? Text(l.travelOff, style: const TextStyle(color: TnColors.muted))
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(l.arrivingBy, style: const TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 8,
                        children: [
                          for (final (k, icon) in [
                            ('train', Icons.train_rounded),
                            ('bus', Icons.directions_bus_rounded),
                            ('car', Icons.directions_car_rounded),
                            ('flight', Icons.flight_rounded),
                          ])
                            ChoiceChip(
                              avatar: Icon(icon, size: 18),
                              label: Text(_modeLabel(l, k)),
                              selected: _arrivalMode == k,
                              onSelected: (_) => setState(() => _arrivalMode = k),
                            ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _from,
                        maxLength: 80,
                        decoration: InputDecoration(
                          labelText: l.travellingFrom,
                          hintText: 'New Delhi',
                          prefixIcon: const Icon(Icons.my_location_rounded),
                          counterText: '',
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: _FieldTile(
                              icon: Icons.flight_land_rounded,
                              label: l.arrivalTime,
                              value: _arrival ?? '—',
                              onTap: () async {
                                final t = await _pickTime(_arrival);
                                if (t != null) setState(() => _arrival = t);
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _FieldTile(
                              icon: Icons.flight_takeoff_rounded,
                              label: l.departureTime,
                              value: _departure ?? '—',
                              onTap: () async {
                                final t = await _pickTime(_departure);
                                if (t != null) setState(() => _departure = t);
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(l.gettingAround, style: const TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        children: [
                          for (final k in ['e_rickshaw', 'cab', 'bus', 'walk', 'own_vehicle'])
                            ChoiceChip(
                              label: Text(_modeLabel(l, k)),
                              selected: _local == k,
                              onSelected: (_) => setState(() => _local = k),
                            ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _travelDetails,
                        maxLength: 200,
                        decoration: InputDecoration(
                          labelText: l.ticketDetails,
                          hintText: l.ticketDetailsHint,
                          prefixIcon: const Icon(Icons.confirmation_number_rounded),
                          counterText: '',
                        ),
                      ),
                    ],
                  ),
          ),
          _Section(
            icon: Icons.add_location_alt_rounded,
            title: _mode == 'custom' ? l.yourItinerary : l.yourOwnStops,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_stops.isEmpty)
                  Text(
                    _mode == 'custom' ? l.customEmpty : l.ownStopsHint,
                    style: const TextStyle(color: TnColors.muted),
                  ),
                for (final (i, s) in _stops.indexed)
                  Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: TnColors.saffron.withValues(alpha: 0.15),
                        child: Text(
                          'D${s.dayIndex + 1}',
                          style: const TextStyle(
                            color: TnColors.saffron,
                            fontWeight: FontWeight.w800,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      title: Text(s.title),
                      subtitle: Text([s.time, if (s.note != null) s.note].join(' · ')),
                      trailing: IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => setState(() => _stops.removeAt(i)),
                      ),
                    ),
                  ),
                OutlinedButton.icon(
                  onPressed: _stops.length >= 60 ? null : _addStop,
                  icon: const Icon(Icons.add_rounded),
                  label: Text(l.addStop),
                ),
              ],
            ),
          ),
          _Section(
            icon: Icons.sticky_note_2_rounded,
            title: l.notesForGroup,
            child: TextField(
              controller: _notes,
              maxLength: 500,
              minLines: 2,
              maxLines: 4,
              decoration: InputDecoration(hintText: l.notesHint),
            ),
          ),
        ],
      ),
    );
  }
}

String _interestLabel(AppLocalizations l, String k) => switch (k) {
  'aarti' => l.interest_aarti,
  'temples' => l.interest_temples,
  'parikrama' => l.interest_parikrama,
  'ghats' => l.interest_ghats,
  'food' => l.interest_food,
  'shopping' => l.interest_shopping,
  _ => l.interest_festivals,
};

String _modeLabel(AppLocalizations l, String k) => switch (k) {
  'train' => l.travel_train,
  'bus' => l.travel_bus,
  'car' => l.travel_car,
  'flight' => l.travel_flight,
  'e_rickshaw' => l.travel_e_rickshaw,
  'cab' => l.travel_cab,
  'walk' => l.travel_walk,
  'own_vehicle' => l.travel_own_vehicle,
  _ => k,
};

String _roleLabel(AppLocalizations l, String k) => switch (k) {
  'organiser' => l.role_organiser,
  'elder' => l.role_elder,
  'child' => l.role_child,
  _ => l.role_member,
};

class _PlannerHero extends StatelessWidget {
  const _PlannerHero();

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: Stack(
        children: [
          Image.asset(
            'assets/images/canva/planner.jpg',
            height: 150,
            width: double.infinity,
            fit: BoxFit.cover,
          ),
          Container(
            height: 150,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xE61C3C6B), Color(0x661C3C6B)],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ),
            ),
          ),
          Positioned(
            left: 18,
            top: 22,
            right: 120,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l.planYourYatra,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  l.plannerHeroHint,
                  style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.3),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.icon, required this.title, required this.child, this.trailing});

  final IconData icon;
  final String title;
  final Widget child;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 14),
    padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: TnColors.line),
      boxShadow: const [BoxShadow(color: Color(0x0F1C3C6B), blurRadius: 12, offset: Offset(0, 4))],
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: TnColors.saffron.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: TnColors.saffron, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: TnColors.ink,
                ),
              ),
            ),
            ?trailing,
          ],
        ),
        const SizedBox(height: 12),
        child,
      ],
    ),
  );
}

class _ChoiceCard extends StatelessWidget {
  const _ChoiceCard({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: selected ? TnColors.navy : TnColors.paper,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: selected ? TnColors.navy : TnColors.line),
      ),
      child: Column(
        children: [
          Icon(icon, color: selected ? Colors.white : TnColors.navy, size: 26),
          const SizedBox(height: 6),
          Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : TnColors.ink,
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
        ],
      ),
    ),
  );
}

class _FieldTile extends StatelessWidget {
  const _FieldTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(12),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: TnColors.paper,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: TnColors.line),
      ),
      child: Row(
        children: [
          Icon(icon, color: TnColors.navy, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: TnColors.muted, fontSize: 11.5)),
                Text(
                  value,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
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
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
    decoration: BoxDecoration(
      color: TnColors.paper,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: TnColors.line),
    ),
    child: Column(
      children: [
        Text(label, style: const TextStyle(color: TnColors.muted, fontSize: 11.5)),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              visualDensity: VisualDensity.compact,
              icon: const Icon(Icons.remove_circle_outline_rounded),
              onPressed: value > min ? () => onChanged(value - 1) : null,
            ),
            Text('$value', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            IconButton(
              visualDensity: VisualDensity.compact,
              icon: const Icon(Icons.add_circle_outline_rounded),
              onPressed: value < max ? () => onChanged(value + 1) : null,
            ),
          ],
        ),
      ],
    ),
  );
}

class _MemberTile extends StatelessWidget {
  const _MemberTile({required this.member, required this.onTap, required this.onRemove});

  final _Member member;
  final VoidCallback onTap;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final colors = {
      'organiser': TnColors.saffron,
      'elder': const Color(0xFF7048E8),
      'child': const Color(0xFF2F9E44),
    };
    final c = colors[member.role] ?? TnColors.navy;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        onTap: onTap,
        leading: CircleAvatar(
          backgroundColor: c,
          child: Text(
            member.name.characters.first.toUpperCase(),
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
          ),
        ),
        title: Text(member.name, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text(
          [
            _roleLabel(l, member.role),
            if (member.age != null) l.ageYears(member.age!),
            ?member.phone,
          ].join(' · '),
        ),
        trailing: IconButton(icon: const Icon(Icons.close_rounded), onPressed: onRemove),
      ),
    );
  }
}

class _MemberSheet extends StatefulWidget {
  const _MemberSheet({this.initial});

  final _Member? initial;

  @override
  State<_MemberSheet> createState() => _MemberSheetState();
}

class _MemberSheetState extends State<_MemberSheet> {
  final _form = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.initial?.name);
  late final _age = TextEditingController(text: widget.initial?.age?.toString());
  late final _phone = TextEditingController(text: widget.initial?.phone?.replaceFirst('+91', ''));
  late String _role = widget.initial?.role ?? 'member';

  @override
  void dispose() {
    _name.dispose();
    _age.dispose();
    _phone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
      child: Form(
        key: _form,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              widget.initial == null ? l.addMember : l.editMember,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _name,
              autofocus: true,
              maxLength: 60,
              decoration: InputDecoration(labelText: l.name, counterText: ''),
              validator: (v) => (v ?? '').trim().isEmpty ? l.required : null,
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _age,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(labelText: l.age),
                    validator: (v) {
                      if ((v ?? '').isEmpty) return null;
                      final n = int.tryParse(v!);
                      return n == null || n < 0 || n > 120 ? l.invalidAge : null;
                    },
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: TextFormField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(labelText: l.phoneOptional, prefixText: '+91 '),
                    validator: (v) {
                      final d = (v ?? '').replaceAll(RegExp(r'\D'), '');
                      if (d.isEmpty) return null;
                      return RegExp(r'^[6-9]\d{9}$').hasMatch(d) ? null : l.invalidPhone;
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: [
                for (final r in ['organiser', 'member', 'elder', 'child'])
                  ChoiceChip(
                    label: Text(_roleLabel(l, r)),
                    selected: _role == r,
                    onSelected: (_) => setState(() => _role = r),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () {
                if (!_form.currentState!.validate()) return;
                final digits = _phone.text.replaceAll(RegExp(r'\D'), '');
                Navigator.pop(
                  context,
                  _Member(
                    _name.text.trim(),
                    age: int.tryParse(_age.text),
                    phone: digits.isEmpty ? null : '+91$digits',
                    role: _role,
                  ),
                );
              },
              child: Text(l.save),
            ),
          ],
        ),
      ),
    );
  }
}

class _StopSheet extends ConsumerStatefulWidget {
  const _StopSheet({required this.days, required this.pickTime});

  final int days;
  final Future<String?> Function(String?) pickTime;

  @override
  ConsumerState<_StopSheet> createState() => _StopSheetState();
}

class _StopSheetState extends ConsumerState<_StopSheet> {
  int _day = 0;
  String _time = '10:00';
  final _title = TextEditingController();
  final _note = TextEditingController();
  String? _templeId;

  @override
  void dispose() {
    _title.dispose();
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final temples = ref.watch(templesProvider).value ?? const <TempleSummaryResponse>[];
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l.addStop, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                for (var d = 0; d < widget.days; d++)
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ChoiceChip(
                      label: Text(l.dayN('${d + 1}')),
                      selected: _day == d,
                      onSelected: (_) => setState(() => _day = d),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String?>(
            initialValue: _templeId,
            isExpanded: true,
            decoration: InputDecoration(labelText: l.templeOptional),
            items: [
              DropdownMenuItem<String?>(child: Text(l.noTemple)),
              for (final t in temples)
                DropdownMenuItem<String?>(
                  value: t.id,
                  child: Text(t.name, overflow: TextOverflow.ellipsis),
                ),
            ],
            onChanged: (id) => setState(() {
              _templeId = id;
              final t = temples.where((x) => x.id == id).firstOrNull;
              if (t != null && _title.text.trim().isEmpty) _title.text = t.name;
            }),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _title,
            maxLength: 120,
            decoration: InputDecoration(
              labelText: l.stopTitle,
              hintText: l.stopTitleHint,
              counterText: '',
            ),
          ),
          const SizedBox(height: 10),
          _FieldTile(
            icon: Icons.schedule_rounded,
            label: l.time,
            value: _time,
            onTap: () async {
              final t = await widget.pickTime(_time);
              if (t != null) setState(() => _time = t);
            },
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _note,
            maxLength: 300,
            decoration: InputDecoration(labelText: l.noteOptional, counterText: ''),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: () {
              if (_title.text.trim().isEmpty) return;
              Navigator.pop(
                context,
                _Stop(
                  _day,
                  _time,
                  _title.text.trim(),
                  note: _note.text.trim().isEmpty ? null : _note.text.trim(),
                  templeId: _templeId,
                ),
              );
            },
            child: Text(l.addStop),
          ),
        ],
      ),
    );
  }
}

class _HotelChoice extends StatelessWidget {
  const _HotelChoice({required this.hotel, required this.selected, required this.onTap});

  final HotelResponse hotel;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      width: 168,
      margin: const EdgeInsets.only(right: 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: selected ? TnColors.saffron : TnColors.line, width: 2),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (hotel.coverUrl != null)
              Image.network(
                hotel.coverUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) =>
                    Image.asset('assets/images/canva/stay.jpg', fit: BoxFit.cover),
              )
            else
              Image.asset('assets/images/canva/stay.jpg', fit: BoxFit.cover),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, Color(0xCC000000)],
                ),
              ),
            ),
            Positioned(
              left: 10,
              right: 10,
              bottom: 8,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    hotel.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                  ),
                  if (hotel.fromPricePaise != null)
                    Text(
                      '${formatRupees(hotel.fromPricePaise!, locale: context.lang)} / ${context.l10n.night}',
                      style: const TextStyle(color: Colors.white70, fontSize: 11.5),
                    ),
                ],
              ),
            ),
            if (selected)
              const Positioned(
                top: 8,
                right: 8,
                child: CircleAvatar(
                  radius: 12,
                  backgroundColor: TnColors.saffron,
                  child: Icon(Icons.check_rounded, color: Colors.white, size: 16),
                ),
              ),
          ],
        ),
      ),
    ),
  );
}

// ───────────────────────────── Itinerary view ─────────────────────────────

const _kindColor = {
  'aarti': Color(0xFFE8590C),
  'temple': TnColors.navy,
  'meal': Color(0xFF2F9E44),
  'rest': Color(0xFF7048E8),
  'travel': Color(0xFF1C7ED6),
  'stay': Color(0xFFC2255C),
  'explore': Color(0xFF0C8599),
  'custom': Color(0xFFF08C00),
};

const _kindIcon = {
  'aarti': Icons.local_fire_department_rounded,
  'temple': Icons.temple_hindu_rounded,
  'meal': Icons.restaurant_rounded,
  'rest': Icons.bedtime_rounded,
  'travel': Icons.directions_rounded,
  'stay': Icons.hotel_rounded,
  'explore': Icons.explore_rounded,
  'custom': Icons.push_pin_rounded,
};

class ItineraryView extends ConsumerStatefulWidget {
  const ItineraryView({super.key, required this.plan, this.onReset});

  final Json plan;
  final VoidCallback? onReset;

  @override
  ConsumerState<ItineraryView> createState() => _ItineraryViewState();
}

class _ItineraryViewState extends ConsumerState<ItineraryView> {
  bool _downloading = false;

  Future<void> _pdf() async {
    setState(() => _downloading = true);
    try {
      final bytes = await ref
          .read(apiClientProvider)
          .getBytes('/ai/itineraries/${widget.plan['id']}/pdf');
      final name =
          '${(widget.plan['title'] as String? ?? 'yatra').replaceAll(RegExp(r'[^\w\- ]'), '').trim().replaceAll(' ', '-')}-tirthnow.pdf';
      await SharePlus.instance.share(
        ShareParams(
          files: [
            XFile.fromData(Uint8List.fromList(bytes), mimeType: 'application/pdf', name: name),
          ],
          fileNameOverrides: [name],
        ),
      );
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  Future<void> _share() async {
    try {
      final url = await ref.read(aiRepositoryProvider).share(widget.plan['id'] as String);
      await SharePlus.instance.share(ShareParams(text: url));
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final plan = widget.plan;
    final days = (plan['dayList'] as List<dynamic>? ?? const []).map(asJson).toList();
    final cost = plan['estimatedCostPaise'] as num? ?? 0;
    final party = (plan['partySize'] as num? ?? 1).toInt();
    final trip = plan['trip'] is Map ? asJson(plan['trip']) : const <String, dynamic>{};
    final members = (trip['members'] as List<dynamic>? ?? const []).map(asJson).toList();
    final stay = trip['stay'] is Map ? asJson(trip['stay']) : null;
    final travel = trip['travel'] is Map ? asJson(trip['travel']) : null;
    final start = DateTime.parse(plan['startDate'] as String);
    final end = start.add(Duration(days: (plan['days'] as num? ?? 1).toInt() - 1));
    final df = DateFormat('d MMM', context.lang);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            gradient: const LinearGradient(
              colors: [TnColors.navy, Color(0xFF2B4F86)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: const [
              BoxShadow(color: Color(0x331C3C6B), blurRadius: 18, offset: Offset(0, 8)),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: TnColors.saffron,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      trip['mode'] == 'custom' ? l.modeCustom : l.modeAi,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const Spacer(),
                  const Icon(Icons.temple_hindu_rounded, color: Colors.white24, size: 34),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                plan['title'] as String? ?? l.planner,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  height: 1.15,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '${df.format(start)} – ${df.format(end)}',
                style: const TextStyle(color: Colors.white70),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  _HeroStat(
                    icon: Icons.calendar_today_rounded,
                    label: l.days,
                    value: '${days.length}',
                  ),
                  _HeroStat(icon: Icons.people_alt_rounded, label: l.pilgrims, value: '$party'),
                  _HeroStat(
                    icon: Icons.currency_rupee_rounded,
                    label: l.estCost,
                    value: formatRupees(cost, locale: context.lang),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: TnColors.saffron,
                  minimumSize: const Size.fromHeight(48),
                ),
                icon: _downloading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.download_rounded),
                label: Text(l.downloadPdf),
                onPressed: _downloading ? null : _pdf,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                icon: const Icon(Icons.share_rounded),
                label: Text(l.sharePlan),
                onPressed: _share,
              ),
            ),
          ],
        ),
        if (members.isNotEmpty) ...[
          const SizedBox(height: 16),
          _InfoCard(
            color: TnColors.navy,
            icon: Icons.groups_rounded,
            title: trip['groupName'] is String
                ? '${l.yatraGroup} · ${trip['groupName']}'
                : l.yatraGroup,
            child: Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                for (final m in members)
                  Chip(
                    avatar: CircleAvatar(
                      backgroundColor: TnColors.saffron,
                      child: Text(
                        (m['name'] as String? ?? '?').characters.first.toUpperCase(),
                        style: const TextStyle(color: Colors.white, fontSize: 12),
                      ),
                    ),
                    label: Text(
                      [
                        m['name'] as String? ?? '',
                        if (m['age'] is num) '${(m['age'] as num).toInt()}',
                      ].join(', '),
                    ),
                  ),
              ],
            ),
          ),
        ],
        if (stay != null) ...[
          const SizedBox(height: 12),
          _InfoCard(
            color: const Color(0xFFC2255C),
            icon: Icons.hotel_rounded,
            title: l.stay,
            child: _KeyValues([
              (l.name, stay['name'] as String? ?? ''),
              if (stay['rooms'] is num) (l.rooms, '${(stay['rooms'] as num).toInt()}'),
              if (stay['nightlyPaise'] is num)
                (l.pricePerNight, formatRupees(stay['nightlyPaise'] as num, locale: context.lang)),
              if (stay['checkInTime'] is String) (l.checkInTime, stay['checkInTime'] as String),
              if (stay['address'] is String) (l.address, stay['address'] as String),
            ]),
          ),
        ],
        if (travel != null) ...[
          const SizedBox(height: 12),
          _InfoCard(
            color: const Color(0xFF1C7ED6),
            icon: Icons.train_rounded,
            title: l.travelDetails,
            child: _KeyValues([
              (
                l.arrivingBy,
                [
                  _modeLabel(l, travel['arrivalMode'] as String? ?? ''),
                  if (travel['from'] is String) travel['from'] as String,
                  if (travel['arrivalTime'] is String) travel['arrivalTime'] as String,
                ].join(' · '),
              ),
              if (travel['departureTime'] is String)
                (l.departureTime, travel['departureTime'] as String),
              if (travel['localTransport'] is String)
                (l.gettingAround, _modeLabel(l, travel['localTransport'] as String)),
              if (travel['details'] is String) (l.ticketDetails, travel['details'] as String),
            ]),
          ),
        ],
        if (trip['notes'] is String) ...[
          const SizedBox(height: 12),
          _InfoCard(
            color: TnColors.saffron,
            icon: Icons.sticky_note_2_rounded,
            title: l.notesForGroup,
            child: Text(trip['notes'] as String),
          ),
        ],
        for (final d in days) _DayTimeline(day: d),
        const SizedBox(height: 8),
        Text(
          l.aartiDisclaimer,
          textAlign: TextAlign.center,
          style: const TextStyle(color: TnColors.muted, fontSize: 12),
        ),
        if (widget.onReset != null)
          TextButton.icon(
            onPressed: widget.onReset,
            icon: const Icon(Icons.edit_rounded),
            label: Text(l.planAnother),
          ),
      ],
    );
  }
}

class _HeroStat extends StatelessWidget {
  const _HeroStat({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0x1FFFFFFF),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: TnColors.accentSoft, size: 18),
          const SizedBox(height: 6),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16),
          ),
          Text(label, style: const TextStyle(color: Colors.white60, fontSize: 11)),
        ],
      ),
    ),
  );
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({
    required this.color,
    required this.icon,
    required this.title,
    required this.child,
  });

  final Color color;
  final IconData icon;
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: TnColors.line),
    ),
    clipBehavior: Clip.antiAlias,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          color: color,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            children: [
              Icon(icon, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
        ),
        Padding(padding: const EdgeInsets.all(14), child: child),
      ],
    ),
  );
}

class _KeyValues extends StatelessWidget {
  const _KeyValues(this.rows);

  final List<(String, String)> rows;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      for (final (k, v) in rows)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 110,
                child: Text(k, style: const TextStyle(color: TnColors.muted, fontSize: 13)),
              ),
              Expanded(
                child: Text(v, style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ),
    ],
  );
}

class _DayTimeline extends StatelessWidget {
  const _DayTimeline({required this.day});

  final Json day;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final items = (day['items'] as List<dynamic>? ?? const []).map(asJson).toList();
    final date = DateTime.parse(day['date'] as String);
    final idx = ((day['dayIndex'] as num?) ?? 0).toInt() + 1;
    return Padding(
      padding: const EdgeInsets.only(top: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: TnColors.navy,
              borderRadius: BorderRadius.circular(30),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: TnColors.saffron,
                  child: Text(
                    '$idx',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900),
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  '${l.dayN('$idx')} · ${DateFormat('EEEE, d MMM', context.lang).format(date)}',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                ),
              ],
            ),
          ),
          if (day['note'] is String)
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 10, 8, 0),
              child: Text(
                day['note'] as String,
                style: const TextStyle(color: TnColors.muted, fontStyle: FontStyle.italic),
              ),
            ),
          const SizedBox(height: 8),
          for (final (i, it) in items.indexed) _TimelineItem(item: it, last: i == items.length - 1),
        ],
      ),
    );
  }
}

class _TimelineItem extends StatelessWidget {
  const _TimelineItem({required this.item, required this.last});

  final Json item;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final kind = item['kind'] as String? ?? '';
    final color = _kindColor[kind] ?? TnColors.navy;
    final starts = item['startsAt'] is String ? DateTime.parse(item['startsAt'] as String) : null;
    final travel = item['travelDurationMin'] as num?;
    final cost = item['estCostPaise'] as num?;
    final sub = [
      if (travel != null) l.minTravel('${travel.round()}'),
      if (cost != null && cost > 0) formatRupees(cost, locale: context.lang),
      if (item['note'] is String) item['note'] as String,
    ].join(' · ');
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 52,
            child: Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                starts == null ? '' : formatIstTime(starts),
                textAlign: TextAlign.right,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  color: TnColors.navy,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
            ),
          ),
          SizedBox(
            width: 34,
            child: Column(
              children: [
                const SizedBox(height: 10),
                Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                  child: Icon(_kindIcon[kind] ?? Icons.circle, color: Colors.white, size: 13),
                ),
                if (!last) Expanded(child: Container(width: 2, color: TnColors.line)),
              ],
            ),
          ),
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 8, top: 4),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border(left: BorderSide(color: color, width: 3)),
                boxShadow: const [
                  BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item['title'] as String? ?? '',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
                  ),
                  if (sub.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(sub, style: const TextStyle(color: TnColors.muted, fontSize: 12.5)),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
