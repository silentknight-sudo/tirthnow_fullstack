import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../l10n/app_localizations.dart';
import '../shared/partner_ui.dart';
import '../vendor/data/vendor_repository.dart';

/// Language codes the API accepts (PanditProfileDto.languages).
const panditLanguages = ['hi', 'braj', 'sa', 'en', 'bn', 'gu', 'mr', 'pa', 'ta', 'te'];

/// Pandit Ji service kinds (= experience kinds).
const panditKinds = ['puja', 'path', 'jyotish', 'palmistry', 'astrology'];

String panditLanguageName(String c) => switch (c) {
  'hi' => 'हिंदी',
  'braj' => 'ब्रज भाषा',
  'sa' => 'संस्कृत',
  'en' => 'English',
  'bn' => 'বাংলা',
  'gu' => 'ગુજરાતી',
  'mr' => 'मराठी',
  'pa' => 'ਪੰਜਾਬੀ',
  'ta' => 'தமிழ்',
  'te' => 'తెలుగు',
  _ => c,
};

String panditKindName(AppLocalizations l, String k) => switch (k) {
  'puja' => l.pkPuja,
  'path' => l.pkPath,
  'jyotish' => l.pkJyotish,
  'palmistry' => l.pkPalmistry,
  _ => l.pkAstrology,
};

String panditKindSub(AppLocalizations l, String k) => switch (k) {
  'puja' => l.pkPujaSub,
  'path' => l.pkPathSub,
  'jyotish' => l.pkJyotishSub,
  'palmistry' => l.pkPalmistrySub,
  _ => l.pkAstrologySub,
};

IconData panditKindIcon(String k) => switch (k) {
  'puja' => Icons.local_fire_department_rounded,
  'path' => Icons.menu_book_rounded,
  'jyotish' => Icons.auto_awesome_rounded,
  'palmistry' => Icons.back_hand_rounded,
  _ => Icons.brightness_4_rounded,
};

/// Editable copy of the profile.
class PanditDraft {
  PanditDraft({
    this.experienceYears = 5,
    List<String>? languages,
    List<String>? specialities,
    this.sampradaya = '',
    this.about = '',
    this.homeVisits = true,
    this.videoConsults = false,
  }) : languages = languages ?? ['hi'],
       specialities = specialities ?? ['puja'];

  factory PanditDraft.from(PanditProfileDto? p) => p == null
      ? PanditDraft()
      : PanditDraft(
          experienceYears: p.experienceYears.toInt(),
          languages: [...p.languages],
          specialities: [...p.specialities],
          sampradaya: p.sampradaya ?? '',
          about: p.about ?? '',
          homeVisits: p.homeVisits,
          videoConsults: p.videoConsults,
        );

  int experienceYears;
  List<String> languages;
  List<String> specialities;
  String sampradaya;
  String about;
  bool homeVisits;
  bool videoConsults;

  /// Null when valid, else a message key.
  String? problem(AppLocalizations l) {
    if (specialities.isEmpty) return l.pandChooseService;
    if (languages.isEmpty) return l.pandChooseLanguage;
    if (experienceYears < 0 || experienceYears > 80) return l.invalidValue;
    return null;
  }

  PanditProfileDto toDto() => PanditProfileDto(
    experienceYears: experienceYears,
    languages: languages,
    specialities: specialities,
    sampradaya: sampradaya.trim().isEmpty ? null : sampradaya.trim(),
    about: about.trim().isEmpty ? null : about.trim(),
    homeVisits: homeVisits,
    videoConsults: videoConsults,
  );
}

/// Services, experience, languages, visits and an introduction.
class PanditProfileEditor extends StatefulWidget {
  const PanditProfileEditor({required this.draft, super.key});
  final PanditDraft draft;

  @override
  State<PanditProfileEditor> createState() => _PanditProfileEditorState();
}

class _PanditProfileEditorState extends State<PanditProfileEditor> {
  late final _years = TextEditingController(text: '${widget.draft.experienceYears}');
  late final _sampradaya = TextEditingController(text: widget.draft.sampradaya);
  late final _about = TextEditingController(text: widget.draft.about);

  @override
  void dispose() {
    _years.dispose();
    _sampradaya.dispose();
    _about.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final d = widget.draft;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          l.pandServicesQ,
          style: const TextStyle(fontWeight: FontWeight.w800, color: PColors.night),
        ),
        const SizedBox(height: 8),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 2.3,
          children: [
            for (final k in panditKinds)
              _KindChoice(
                kind: k,
                selected: d.specialities.contains(k),
                onTap: () => setState(() {
                  d.specialities.contains(k) ? d.specialities.remove(k) : d.specialities.add(k);
                }),
              ),
          ],
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _years,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: l.pandYears,
                  prefixIcon: const Icon(Icons.workspace_premium_rounded),
                ),
                onChanged: (v) => d.experienceYears = int.tryParse(v.trim()) ?? -1,
                validator: (v) {
                  final n = int.tryParse((v ?? '').trim());
                  return n == null || n < 0 || n > 80 ? l.invalidValue : null;
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: TextFormField(
                controller: _sampradaya,
                maxLength: 60,
                decoration: InputDecoration(labelText: l.pandSampradaya, counterText: ''),
                onChanged: (v) => d.sampradaya = v,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Text(
          l.pandLanguages,
          style: const TextStyle(fontWeight: FontWeight.w800, color: PColors.night),
        ),
        const SizedBox(height: 6),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final c in panditLanguages)
              FilterChip(
                label: Text(panditLanguageName(c)),
                selected: d.languages.contains(c),
                onSelected: (on) => setState(() => on ? d.languages.add(c) : d.languages.remove(c)),
              ),
          ],
        ),
        const SizedBox(height: 10),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          secondary: const Icon(Icons.home_rounded, color: PColors.gold),
          title: Text(l.pandHomeVisits),
          subtitle: Text(l.pandHomeVisitsSub),
          value: d.homeVisits,
          onChanged: (v) => setState(() => d.homeVisits = v),
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          secondary: const Icon(Icons.videocam_rounded, color: PColors.gold),
          title: Text(l.pandVideo),
          subtitle: Text(l.pandVideoSub),
          value: d.videoConsults,
          onChanged: (v) => setState(() => d.videoConsults = v),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: _about,
          maxLength: 600,
          maxLines: 3,
          decoration: InputDecoration(
            labelText: l.pandAbout,
            hintText: l.pandAboutHint,
            alignLabelWithHint: true,
          ),
          onChanged: (v) => d.about = v,
        ),
      ],
    );
  }
}

class _KindChoice extends StatelessWidget {
  const _KindChoice({required this.kind, required this.selected, required this.onTap});
  final String kind;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Material(
      color: selected ? const Color(0xFFFFF4E0) : Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? PColors.gold : const Color(0x22232C6B),
              width: selected ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              Icon(panditKindIcon(kind), color: PColors.gold),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      panditKindName(l, kind),
                      style: const TextStyle(fontWeight: FontWeight.w800, color: PColors.night),
                    ),
                    Text(
                      panditKindSub(l, kind),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11, color: TnColors.muted),
                    ),
                  ],
                ),
              ),
              if (selected) const Icon(Icons.check_circle_rounded, size: 18, color: PColors.gold),
            ],
          ),
        ),
      ),
    );
  }
}

/// Edit the public Pandit Ji profile after onboarding (from Account).
class PanditProfileScreen extends ConsumerStatefulWidget {
  const PanditProfileScreen({required this.vendor, super.key});
  final VendorResponse vendor;

  @override
  ConsumerState<PanditProfileScreen> createState() => _PanditProfileScreenState();
}

class _PanditProfileScreenState extends ConsumerState<PanditProfileScreen> {
  final _form = GlobalKey<FormState>();
  late final PanditDraft _draft = PanditDraft.from(widget.vendor.panditProfile);
  bool _busy = false;

  Future<void> _save() async {
    final l = context.l10n;
    if (!_form.currentState!.validate()) return;
    final problem = _draft.problem(l);
    if (problem != null) return showSnack(context, problem);
    setState(() => _busy = true);
    try {
      await ref.read(vendorRepositoryProvider).update(widget.vendor.id, {
        'panditProfile': _draft.toDto().toJson(),
      });
      ref.invalidate(myVendorProvider);
      if (mounted) {
        showSnack(context, l.saved);
        Navigator.of(context).pop();
      }
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.pandProfile)),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            PanditProfileEditor(draft: _draft),
            const SizedBox(height: 16),
            GoldButton(label: l.save, busy: _busy, onPressed: _save),
          ],
        ),
      ),
    );
  }
}
