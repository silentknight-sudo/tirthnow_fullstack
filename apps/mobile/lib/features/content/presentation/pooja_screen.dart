import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';

class PoojaItem {
  const PoojaItem(this.image, this.name, this.desc, this.category);
  final String image;
  final Map<String, String> name;
  final Map<String, String> desc;
  final String category;
}

/// Common pooja essentials for Braj darshan. Browse-only for now; ordering
/// can be added later through the vendor catalogue.
const poojaItems = [
  PoojaItem(
    'thali',
    {'en': 'Pooja thali', 'hi': 'पूजा थाली'},
    {
      'en': 'Brass thali with diya, roli, rice and flowers: everything for an aarti.',
      'hi': 'दीया, रोली, चावल और फूलों के साथ पीतल की थाली: आरती का पूरा सामान।',
    },
    'aarti',
  ),
  PoojaItem(
    'diya',
    {'en': 'Diya (oil lamp)', 'hi': 'दीया'},
    {
      'en': 'Brass or clay lamp lit with ghee for aarti and deepdaan on the Yamuna.',
      'hi': 'आरती और यमुना पर दीपदान के लिए घी का पीतल या मिट्टी का दीया।',
    },
    'aarti',
  ),
  PoojaItem(
    'agarbatti',
    {'en': 'Agarbatti & dhoop', 'hi': 'अगरबत्ती और धूप'},
    {
      'en': 'Incense sticks and dhoop for daily pooja and temple offerings.',
      'hi': 'रोज़ की पूजा और मंदिर में अर्पण के लिए अगरबत्ती और धूप।',
    },
    'aarti',
  ),
  PoojaItem(
    'garland',
    {'en': 'Phool mala (garland)', 'hi': 'फूल माला'},
    {
      'en': 'Marigold and rose garlands offered to Thakur ji; buy fresh near the temple.',
      'hi': 'ठाकुर जी को अर्पित गेंदा और गुलाब की माला; मंदिर के पास ताज़ी लें।',
    },
    'offering',
  ),
  PoojaItem(
    'prasad',
    {'en': 'Prasad: peda & mishri', 'hi': 'प्रसाद: पेड़ा और मिश्री'},
    {
      'en': 'Mathura peda, makhan-mishri and laddu, the favourite bhog of Braj.',
      'hi': 'मथुरा के पेड़े, माखन-मिश्री और लड्डू: ब्रज का प्रिय भोग।',
    },
    'offering',
  ),
  PoojaItem(
    'kumkum',
    {'en': 'Roli, chandan & haldi', 'hi': 'रोली, चंदन और हल्दी'},
    {
      'en': 'For tilak and pooja: kumkum, sandalwood paste and turmeric.',
      'hi': 'तिलक और पूजा के लिए: कुमकुम, चंदन और हल्दी।',
    },
    'tilak',
  ),
  PoojaItem(
    'mala',
    {'en': 'Tulsi kanthi & japa mala', 'hi': 'तुलसी कंठी और जप माला'},
    {
      'en': 'Tulsi beads worn by Vaishnavs, and a 108-bead mala for naam jap.',
      'hi': 'वैष्णवों की तुलसी कंठी और नाम जप के लिए 108 मनकों की माला।',
    },
    'tilak',
  ),
  PoojaItem(
    'poshak',
    {'en': 'Laddu Gopal poshak', 'hi': 'लड्डू गोपाल पोशाक'},
    {
      'en': 'Dress, crown and flute for Laddu Gopal, a popular Vrindavan souvenir.',
      'hi': 'लड्डू गोपाल के लिए पोशाक, मुकुट और बाँसुरी: वृंदावन की लोकप्रिय यादगार।',
    },
    'deity',
  ),
];

class PoojaItemsScreen extends StatefulWidget {
  const PoojaItemsScreen({super.key});

  @override
  State<PoojaItemsScreen> createState() => _PoojaItemsScreenState();
}

class _PoojaItemsScreenState extends State<PoojaItemsScreen> {
  String _cat = 'all';

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final lang = context.lang;
    final cats = {
      'all': l.poojaAll,
      'aarti': l.poojaAarti,
      'offering': l.poojaOffering,
      'tilak': l.poojaTilak,
      'deity': l.poojaDeity,
    };
    final items = poojaItems.where((p) => _cat == 'all' || p.category == _cat).toList();
    return Scaffold(
      appBar: AppBar(title: Text(l.poojaItems)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
        children: [
          Text(l.poojaIntro, style: const TextStyle(color: TnColors.muted)),
          const SizedBox(height: 10),
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                for (final e in cats.entries)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(e.value),
                      selected: _cat == e.key,
                      onSelected: (_) => setState(() => _cat = e.key),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              mainAxisExtent: 238,
            ),
            itemCount: items.length,
            itemBuilder: (_, i) {
              final p = items[i];
              return Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: TnColors.line),
                ),
                clipBehavior: Clip.antiAlias,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AspectRatio(
                      aspectRatio: 1.25,
                      child: Image.asset('assets/images/pooja/${p.image}.jpg', fit: BoxFit.cover),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(10, 8, 10, 0),
                      child: Text(
                        p.name[lang] ?? p.name['en']!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(10, 3, 10, 0),
                      child: Text(
                        p.desc[lang] ?? p.desc['en']!,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: TnColors.muted, fontSize: 11.5, height: 1.3),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 14),
          Text(
            l.poojaSoon,
            textAlign: TextAlign.center,
            style: const TextStyle(color: TnColors.muted, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
