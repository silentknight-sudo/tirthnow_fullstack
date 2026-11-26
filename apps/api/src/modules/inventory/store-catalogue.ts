/**
 * Temple Store master catalogue (client's "India Master Product Catalogue", Nov 2026).
 * Category keys are stored on products; sub-categories are optional. Examples guide
 * vendors when they list items — they are not stock claims.
 */
export interface CatalogueSub {
  key: string;
  en: string;
  hi: string;
  examples: string[];
}
export interface CatalogueCategory {
  key: string;
  en: string;
  hi: string;
  subcategories: CatalogueSub[];
}

const sub = (key: string, en: string, hi: string, examples: string[]): CatalogueSub => ({
  key,
  en,
  hi,
  examples,
});

export const STORE_CATALOGUE: readonly CatalogueCategory[] = [
  {
    key: 'krishna_shringar',
    en: 'Krishna Shringar',
    hi: 'कृष्ण श्रृंगार',
    subcategories: [
      sub('poshak_vastra', 'Poshak / Vastra', 'पोशाक / वस्त्र', [
        'Daily cotton poshak',
        'Silk poshak',
        'Velvet poshak',
        'Zardozi poshak',
        'Winter woollen poshak',
        'Janmashtami dress',
        'Pitambar',
        'Radha Rani sari',
      ]),
      sub('headwear_ornaments', 'Mukut & ornaments', 'मुकुट और आभूषण', [
        'Mor-mukut',
        'Pagdi',
        'Kundan mukut',
        'Morpankh mukut',
        'Kundal',
        'Haar',
        'Bajuband',
        'Payal',
      ]),
      sub('shringar_accessories', 'Shringar accessories', 'श्रृंगार सामग्री', [
        'Bansuri',
        'Flute stand',
        'Morpankh',
        'Kanthi',
        'Chandan beads',
        'Designer shringar combo',
      ]),
      sub('seating_bedding', 'Singhasan, jhula & bedding', 'सिंहासन, झूला और बिस्तर', [
        'Singhasan',
        'Velvet gaddi',
        'Jhula',
        'Palna',
        'Razai',
        'Makhan handi',
        'Miniature utensils',
      ]),
      sub('care_utility', 'Care & storage', 'देखभाल और भंडारण', [
        'Poshak storage box',
        'Jewellery box',
        'Mukut stand',
        'Idol-size measuring guide',
      ]),
    ],
  },
  {
    key: 'morpankh_braj',
    en: 'Morpankh & Braj',
    hi: 'मोरपंख और ब्रज',
    subcategories: [
      sub('morpankh', 'Morpankh products', 'मोरपंख उत्पाद', [
        'Single peacock feather',
        'Feather bunch',
        'Chauri',
        'Framed feather',
        'Door toran',
      ]),
      sub('braj_souvenirs', 'Braj souvenirs', 'ब्रज स्मृति चिन्ह', [
        'Banke Bihari temple miniature',
        'Braj map',
        '84 Kos Parikrama map',
        'Radhe Radhe nameplate',
        'Vrindavan photo magnet',
      ]),
      sub('decor_display', 'Devotional decor', 'भक्ति सजावट', [
        'Pichwai art',
        'Madhubani Krishna art',
        'Tanjore-style art',
        'Bandhanwar',
        'Brass wall hanging',
      ]),
    ],
  },
  {
    key: 'mala_beads',
    en: 'Mala & Beads',
    hi: 'माला और मनके',
    subcategories: [
      sub('mala_types', 'Mala', 'माला', [
        'Tulsi kanthi mala',
        'Tulsi japa mala 108+1',
        'Radha naam mala',
        'Rudraksha mala',
        'Sphatik mala',
        'Vaijayanti mala',
        'Chandan mala',
        'Kamal gatta mala',
      ]),
      sub('jap_accessories', 'Jap accessories', 'जप सामग्री', [
        'Gomukhi',
        'Digital jap counter',
        'Mala pouch',
        'Tulsi bracelet',
        'Kalawa/mauli',
      ]),
      sub('beads_certified', 'Beads & certified items', 'मनके और प्रमाणित वस्तुएँ', [
        'Loose Tulsi beads',
        'Rudraksha by mukhi',
        'Navratna jewellery',
        'Bead kits',
      ]),
    ],
  },
  {
    key: 'idols_murtis',
    en: 'Idols & Photos',
    hi: 'मूर्ति और चित्र',
    subcategories: [
      sub('deity_idols', 'Deity idols', 'देव मूर्तियाँ', [
        'Laddu Gopal',
        'Radha Krishna',
        'Banke Bihari Ji',
        'Govardhan-dhari Krishna',
        'Ganesha',
        'Hanuman',
        'Ram Darbar',
      ]),
      sub('idol_materials', 'Brass, marble & more', 'पीतल, संगमरमर व अन्य', [
        'Brass',
        'Panchdhatu',
        'Ashtadhatu',
        'Marble',
        'Silver-plated',
        'Eco-friendly clay',
      ]),
      sub('photos_display', 'Photos & frames', 'फोटो और फ्रेम', [
        'Banke Bihari photo',
        'Radha Krishna photo',
        'LED photo frame',
        'Calendar',
        'Display dome',
      ]),
    ],
  },
  {
    key: 'puja_samagri',
    en: 'Puja Samagri',
    hi: 'पूजा सामग्री',
    subcategories: [
      sub('tilak_powders', 'Tilak, roli & chandan', 'तिलक, रोली और चंदन', [
        'Roli',
        'Kumkum',
        'Gopi chandan',
        'Vrindavan tilak',
        'Kesar chandan',
        'Abir',
        'Gulal',
      ]),
      sub('incense_fragrance', 'Agarbatti & dhoop', 'अगरबत्ती और धूप', [
        'Agarbatti',
        'Dhoop cones',
        'Sambrani cups',
        'Loban',
        'Bhimseni kapoor',
        'Attar/itra',
        'Rose water',
      ]),
      sub('diya_lighting', 'Diya & batti', 'दीया और बत्ती', [
        'Clay diya',
        'Brass diya',
        'Akhand diya',
        'Cotton batti',
        'Ghee',
        'Diya oil',
      ]),
      sub('offerings_daily', 'Daily offerings', 'दैनिक भेंट', [
        'Moli/kalawa',
        'Janeu',
        'Supari',
        'Whole coconut',
        'Mishri',
        'Gangajal',
        'Makhana',
      ]),
    ],
  },
  {
    key: 'puja_utensils',
    en: 'Thali & Utensils',
    hi: 'थाली और बर्तन',
    subcategories: [
      sub('ritual_vessels', 'Thali, kalash & vessels', 'थाली, कलश और पात्र', [
        'Puja thali',
        'Aarti thali',
        'Panchpatra',
        'Copper kalash',
        'Lota',
        'Shankh',
        'Ghanti',
      ]),
      sub('puja_tools', 'Puja tools', 'पूजा उपकरण', [
        'Aarti lamp',
        'Kapoor aarti stand',
        'Agarbatti stand',
        'Manjira',
        'Kartal',
        'Puja chowki',
        'Kusha aasan',
      ]),
      sub('thali_sets', 'Complete thali sets', 'पूर्ण थाली सेट', [
        '5-piece set',
        '7-piece set',
        '11-piece set',
        '21-piece set',
        'Brass',
        'Silver-plated',
      ]),
    ],
  },
  {
    key: 'havan_yagya',
    en: 'Havan & Yagya',
    hi: 'हवन और यज्ञ',
    subcategories: [
      sub('havan_equipment', 'Havan kund & wood', 'हवन कुंड और समिधा', [
        'Copper havan kund',
        'Portable havan kund',
        'Mango wood',
        'Samidha bundle',
        'Havan spoon',
      ]),
      sub('havan_ingredients', 'Havan samagri', 'हवन सामग्री', [
        'Mixed havan samagri',
        'Guggal',
        'Black sesame',
        'Jaw',
        'Navagraha samidha',
        'Kapoor',
      ]),
      sub('ceremony_kits', 'Ceremony kits', 'अनुष्ठान किट', [
        'Satyanarayan Katha kit',
        'Griha Pravesh kit',
        'Navagraha Shanti kit',
        'Rudrabhishek kit',
        'Sundarkand kit',
      ]),
    ],
  },
  {
    key: 'gomaya',
    en: 'Gomaya (Cow Dung)',
    hi: 'गोमय (गोबर उत्पाद)',
    subcategories: [
      sub('gomaya_puja', 'Puja & burning', 'पूजा व हवन', [
        'Cow dung cakes (uple)',
        'Havan cakes',
        'Gomaya dhoop cups',
        'Cow dung diya',
        'Cow dung sambrani cups',
      ]),
      sub('gomaya_garden', 'Home & garden', 'घर और बगीचा', [
        'Cow dung compost',
        'Vermicompost',
        'Cow dung gamla',
        'Seedling pots',
        'Garden manure packs',
      ]),
      sub('gomaya_decor', 'Decor & utility', 'सजावट व उपयोगी', [
        'Cow dung paint',
        'Eco Ganesh idols',
        'Lakshmi-Ganesh set',
        'Nameplate',
        'Gift hampers',
      ]),
    ],
  },
  {
    key: 'panchagavya',
    en: 'Panchagavya & Goseva',
    hi: 'पंचगव्य और गौसेवा',
    subcategories: [
      sub('cow_products', 'Cow-based products', 'गौ आधारित उत्पाद', [
        'Cow ghee',
        'Gomaya bhasma',
        'Panchagavya soap',
        'Herbal shampoo',
        'Ubtan',
        'Dant manjan',
      ]),
      sub('cow_household', 'Household', 'घरेलू', [
        'Floor cleaner',
        'Phenyl',
        'Dishwash gel',
        'Bio-enzyme cleaner',
        'Plant tonic',
      ]),
    ],
  },
  {
    key: 'prasad_bhog',
    en: 'Prasad & Bhog',
    hi: 'प्रसाद और भोग',
    subcategories: [
      sub('braj_sweets', 'Braj sweets', 'ब्रज की मिठाई', [
        'Mathura peda',
        'Kesar peda',
        'Makhan mishri',
        'Besan laddu',
        'Panjiri',
        'Peda gift box',
      ]),
      sub('bhog_dry', 'Bhog & dry offerings', 'भोग और सूखा प्रसाद', [
        'Makhana',
        'Mishri dana',
        'Batasha',
        'Elaichi dana',
        'Panchmeva',
        'Dry fruits',
      ]),
      sub('vrat_food', 'Vrat food', 'व्रत का भोजन', [
        'Vrat namkeen',
        'Sabudana',
        'Kuttu flour',
        'Singhara flour',
        'Sendha namak',
        'Travel prasad box',
      ]),
    ],
  },
  {
    key: 'flowers_garland',
    en: 'Flowers & Garlands',
    hi: 'फूल और माला',
    subcategories: [
      sub('fresh_dried', 'Fresh & dried flowers', 'ताज़े और सूखे फूल', [
        'Fresh tulsi leaves',
        'Rose petals',
        'Marigold',
        'Lotus',
        'Bel patra',
        'Dried flower mix',
      ]),
      sub('garlands_decor', 'Garlands & decor', 'माला और सजावट', [
        'Fresh flower mala',
        'Tulsi mala for deity',
        'Vaijayanti mala',
        'Gajra',
        'Flower chadar',
        'Festival flower kit',
      ]),
    ],
  },
  {
    key: 'clothing_textiles',
    en: 'Clothing & Textiles',
    hi: 'वस्त्र और कपड़े',
    subcategories: [
      sub('for_devotees', 'For devotees', 'भक्तों के लिए', [
        'Dhoti-kurta set',
        'Angavastram',
        'Gamcha',
        'Shawl',
        'Radhe Radhe cap',
        "Children's Krishna dress",
      ]),
      sub('for_deity', 'For deity & mandir', 'ठाकुर जी और मंदिर के लिए', [
        'Deity vastra',
        'Singhasan cloth',
        'Altar cloth',
        'Chowki cover',
        'Jhula canopy',
      ]),
      sub('textile_accessories', 'Bags & accessories', 'झोला और सहायक', [
        'Jhola',
        'Mala bag',
        'Gomukhi',
        'Puja pouch',
        'Yatra bag',
        'Prasad carry bag',
      ]),
    ],
  },
  {
    key: 'home_mandir',
    en: 'Home Mandir & Decor',
    hi: 'घर का मंदिर और सजावट',
    subcategories: [
      sub('mandir_structures', 'Mandir', 'मंदिर', [
        'Wooden mandir',
        'Marble mandir',
        'Wall-mounted mandir',
        'Folding travel mandir',
        'Singhasan',
      ]),
      sub('mandir_lighting', 'Decoration & lighting', 'सजावट और रोशनी', [
        'Mandir backdrop',
        'Battery diya',
        'Hanging lamp',
        'Bell string',
        'Toran',
        'Rangoli colours',
      ]),
      sub('mandir_care', 'Maintenance', 'रख-रखाव', [
        'Brass polish',
        'Silver polish',
        'Idol cleaning cloth',
        'Puja samagri box',
        'Diya tray',
      ]),
    ],
  },
  {
    key: 'books_music',
    en: 'Books & Music',
    hi: 'पुस्तक और संगीत',
    subcategories: [
      sub('books', 'Books & scriptures', 'पुस्तक और ग्रंथ', [
        'Bhagavad Gita',
        'Srimad Bhagavatam',
        'Gita Govinda',
        'Chaurasi Kos Parikrama guide',
        'Aarti sangrah',
        'Bhajan book',
        'Panchang',
      ]),
      sub('audio_instruments', 'Audio & instruments', 'ऑडियो और वाद्य', [
        'Bhajan audio',
        'Japa audio player',
        'Dholak',
        'Harmonium',
        'Bansuri',
        'Kartal',
        'Conch',
      ]),
      sub('learning', 'Learning aids', 'सीखने की सामग्री', [
        'Krishna flashcards',
        'Shloka cards',
        'Kids puzzle',
        'Story cards',
        'Tithi calendar',
      ]),
    ],
  },
  {
    key: 'festival_kits',
    en: 'Festival Kits',
    hi: 'त्योहार किट',
    subcategories: [
      sub('krishna_festivals', 'Krishna festivals', 'कृष्ण उत्सव', [
        'Janmashtami puja kit',
        'Jhulan Yatra kit',
        'Radhashtami kit',
        'Braj Holi colour kit',
        'Govardhan Puja kit',
        'Kartik Deepdan kit',
      ]),
      sub('hindu_festivals', 'Other festivals', 'अन्य त्योहार', [
        'Diwali Lakshmi-Ganesh kit',
        'Navratri kit',
        'Shivratri kit',
        'Karwa Chauth kit',
        'Raksha Bandhan kit',
        'Tulsi Vivah kit',
      ]),
      sub('life_ceremonies', 'Life ceremonies', 'संस्कार', [
        'Griha Pravesh kit',
        'Vivah puja kit',
        'Naamkaran kit',
        'Mundan kit',
        'Vehicle puja kit',
      ]),
    ],
  },
  {
    key: 'gifts_hampers',
    en: 'Gifts & Hampers',
    hi: 'उपहार और हैम्पर',
    subcategories: [
      sub('small_gifts', 'Small gifts', 'छोटे उपहार', [
        'Radhe Radhe keychain',
        'Fridge magnet',
        'Bookmark',
        'Mini morpankh',
        'Pocket Gita',
      ]),
      sub('gift_sets', 'Gift sets', 'उपहार सेट', [
        'Tulsi mala gift set',
        'Krishna shringar gift set',
        'Prasad gift box',
        'Vrindavan souvenir box',
        'Premium brass gift set',
      ]),
      sub('custom_gifts', 'Personalised', 'व्यक्तिगत', [
        'Personalised nameplate',
        'Engraved puja thali',
        'Custom photo frame',
        'Printed jhola',
      ]),
    ],
  },
  {
    key: 'yatra_essentials',
    en: 'Yatra Essentials',
    hi: 'यात्रा ज़रूरतें',
    subcategories: [
      sub('travel_products', 'Travel products', 'यात्रा सामान', [
        'Yatra bag',
        'Shoe bag',
        'Water bottle',
        'Travel aasan',
        'Pocket mandir',
        'Umbrella',
        'Walking stick',
        'First-aid pouch',
      ]),
      sub('visitor_services', 'Guides & maps', 'गाइड और नक्शे', [
        'Printed temple route map',
        'Braj parikrama guide',
        'Audio guide',
        'Itinerary PDF',
      ]),
    ],
  },
  {
    key: 'temple_supplies',
    en: 'Temple Supplies (Bulk)',
    hi: 'मंदिर आपूर्ति (थोक)',
    subcategories: [
      sub('bulk_consumables', 'Bulk consumables', 'थोक सामग्री', [
        'Bulk cotton wicks',
        'Ghee for lamps',
        'Camphor',
        'Agarbatti',
        'Prasad packaging',
        'Leaf bowls',
      ]),
      sub('temple_equipment', 'Equipment', 'उपकरण', [
        'Large brass lamps',
        'Aarti stands',
        'Large bells',
        'Water dispensers',
        'Shoe token tags',
      ]),
    ],
  },
  {
    key: 'regional',
    en: 'Regional Collections',
    hi: 'क्षेत्रीय संग्रह',
    subcategories: [
      sub('braj_collection', 'Braj', 'ब्रज', [
        'Braj Raj souvenir',
        'Mathura peda',
        'Vrindavan-style poshak',
        'Vaishnav tilak items',
      ]),
      sub('other_regional', 'Other regions', 'अन्य क्षेत्र', [
        'South Indian lamps',
        'Bengali puja items',
        'Gujarati festival thali',
        'Rajasthani textiles',
      ]),
    ],
  },
  {
    key: 'eco_handmade',
    en: 'Eco & Handmade',
    hi: 'इको और हस्तनिर्मित',
    subcategories: [
      sub('eco_artisan', 'Eco & artisan', 'इको और कारीगरी', [
        'Clay diyas',
        'Terracotta idols',
        'Seed paper cards',
        'Recycled flower incense',
        'Handmade brassware',
        'Bamboo baskets',
      ]),
    ],
  },
  {
    key: 'other',
    en: 'Other',
    hi: 'अन्य',
    subcategories: [],
  },
];

export const PRODUCT_CATEGORIES = STORE_CATALOGUE.map((c) => c.key);
export const PRODUCT_SUBCATEGORIES = STORE_CATALOGUE.flatMap((c) =>
  c.subcategories.map((s) => s.key),
);

/** True when `subcategory` belongs to `category`. */
export function subcategoryFits(category: string, subcategory: string): boolean {
  return (
    STORE_CATALOGUE.find((c) => c.key === category)?.subcategories.some(
      (s) => s.key === subcategory,
    ) ?? false
  );
}

/** Categories used before the master catalogue → their new key. */
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  pooja_thali: 'puja_utensils',
  diya_dhoop: 'puja_samagri',
  garland: 'flowers_garland',
  prasad: 'prasad_bhog',
  poshak: 'krishna_shringar',
  tilak_mala: 'mala_beads',
  idols: 'idols_murtis',
  books: 'books_music',
};
