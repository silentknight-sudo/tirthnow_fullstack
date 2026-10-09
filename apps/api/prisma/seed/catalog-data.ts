/**
 * Sample catalog for local development. Aarti times are realistic but are NOT verified
 * temple timings — the content team must confirm them before launch (CLIENT_SETUP_TODO).
 */
import { type AartiKind, type PoiCategory } from '@prisma/client';

export interface CitySeed {
  slug: string;
  en: string;
  hi: string;
  lat: number;
  lng: number;
}

export type AartiSeed = [
  kind: AartiKind,
  en: string,
  hi: string,
  localTime: string,
  season?: 'summer' | 'winter',
];

export interface TempleSeed {
  city: string;
  slug: string;
  en: string;
  hi: string;
  lat: number;
  lng: number;
  tags: string[];
  description: string;
  aarti: AartiSeed[];
  crowd?: number;
}

export const CITIES: CitySeed[] = [
  { slug: 'mathura', en: 'Mathura', hi: 'मथुरा', lat: 27.4924, lng: 77.6737 },
  { slug: 'vrindavan', en: 'Vrindavan', hi: 'वृन्दावन', lat: 27.565, lng: 77.6593 },
  { slug: 'goverdhan', en: 'Goverdhan', hi: 'गोवर्धन', lat: 27.496, lng: 77.463 },
  { slug: 'barsana', en: 'Barsana', hi: 'बरसाना', lat: 27.649, lng: 77.379 },
  { slug: 'gokul', en: 'Gokul', hi: 'गोकुल', lat: 27.439, lng: 77.72 },
  { slug: 'nandgaon', en: 'Nandgaon', hi: 'नंदगाँव', lat: 27.711, lng: 77.386 },
];

const STANDARD: AartiSeed[] = [
  ['mangla', 'Mangla Aarti', 'मंगला आरती', '05:00'],
  ['shringar', 'Shringar Aarti', 'श्रृंगार आरती', '07:30'],
  ['rajbhog', 'Rajbhog Aarti', 'राजभोग आरती', '12:00'],
  ['utthapan', 'Utthapan Darshan', 'उत्थापन दर्शन', '16:00'],
  ['sandhya', 'Sandhya Aarti', 'संध्या आरती', '19:00'],
  ['shayan', 'Shayan Aarti', 'शयन आरती', '20:30'],
];

const PUSHTI: AartiSeed[] = [
  ['mangla', 'Mangla Darshan', 'मंगला दर्शन', '06:30'],
  ['shringar', 'Shringar Darshan', 'श्रृंगार दर्शन', '07:40'],
  ['other', 'Gwal Darshan', 'ग्वाल दर्शन', '08:15'],
  ['rajbhog', 'Rajbhog Darshan', 'राजभोग दर्शन', '10:30'],
  ['utthapan', 'Utthapan Darshan', 'उत्थापन दर्शन', '16:00'],
  ['other', 'Bhog Darshan', 'भोग दर्शन', '16:20'],
  ['sandhya', 'Sandhya Aarti', 'संध्या आरती', '18:30'],
  ['shayan', 'Shayan Darshan', 'शयन दर्शन', '19:00'],
];

const shift = (list: AartiSeed[], minutes: number): AartiSeed[] =>
  list.map(([k, en, hi, t, s]) => {
    const [h, m] = t.split(':').map(Number) as [number, number];
    const total = h * 60 + m + minutes;
    const time = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    return [k, en, hi, time, s];
  });

export const TEMPLES: TempleSeed[] = [
  // Mathura
  {
    city: 'mathura',
    slug: 'shri-krishna-janmabhoomi',
    en: 'Shri Krishna Janmabhoomi',
    hi: 'श्री कृष्ण जन्मभूमि',
    lat: 27.5046,
    lng: 77.6699,
    tags: ['krishna', 'janmashtami', 'must-visit'],
    crowd: 3,
    description:
      'Revered as the birthplace of Shri Krishna; the Garbha Griha and Bhagavata Bhavan sit within the complex.',
    aarti: STANDARD,
  },
  {
    city: 'mathura',
    slug: 'dwarkadhish-temple',
    en: 'Dwarkadhish Temple',
    hi: 'द्वारकाधीश मंदिर',
    lat: 27.5068,
    lng: 77.6812,
    tags: ['pushtimarg', 'jhoola', 'heritage'],
    crowd: 2,
    description:
      'A Pushtimarg haveli temple near Vishram Ghat, famous for its Jhoola festival during Shravan.',
    aarti: PUSHTI,
  },
  {
    city: 'mathura',
    slug: 'gita-mandir',
    en: 'Gita Mandir (Birla Mandir)',
    hi: 'गीता मंदिर (बिड़ला मंदिर)',
    lat: 27.5235,
    lng: 77.6633,
    tags: ['gita', 'architecture'],
    crowd: 1,
    description:
      'Temple on the Mathura–Vrindavan road with the full Bhagavad Gita inscribed on its pillars.',
    aarti: shift(STANDARD, 30),
  },
  {
    city: 'mathura',
    slug: 'bhuteshwar-mahadev',
    en: 'Bhuteshwar Mahadev Temple',
    hi: 'भूतेश्वर महादेव मंदिर',
    lat: 27.4963,
    lng: 77.6702,
    tags: ['shiva', 'shaktipeeth', 'kshetrapal'],
    crowd: 1,
    description: 'Ancient Shiva temple regarded as the guardian (Kshetrapal) of Mathura.',
    aarti: [
      ['mangla', 'Mangla Aarti', 'मंगला आरती', '04:30'],
      ['sandhya', 'Sandhya Aarti', 'संध्या आरती', '19:15'],
      ['shayan', 'Shayan Aarti', 'शयन आरती', '21:00'],
    ],
  },
  {
    city: 'mathura',
    slug: 'kesava-deo-temple',
    en: 'Kesava Deo Temple',
    hi: 'केशव देव मंदिर',
    lat: 27.5041,
    lng: 77.6688,
    tags: ['krishna', 'heritage'],
    crowd: 2,
    description: 'Temple of Shri Kesava Deo adjacent to the Janmabhoomi complex.',
    aarti: STANDARD,
  },

  // Vrindavan
  {
    city: 'vrindavan',
    slug: 'banke-bihari',
    en: 'Shri Banke Bihari Temple',
    hi: 'श्री बांके बिहारी मंदिर',
    lat: 27.5806,
    lng: 77.6996,
    tags: ['krishna', 'must-visit', 'crowded'],
    crowd: 4,
    description:
      'Vrindavan’s most visited temple; the curtain is drawn every few minutes during darshan. Mangla aarti is held only on Janmashtami.',
    aarti: [
      ['shringar', 'Shringar Aarti', 'श्रृंगार आरती', '07:45', 'summer'],
      ['rajbhog', 'Rajbhog Aarti', 'राजभोग आरती', '11:55', 'summer'],
      ['utthapan', 'Evening Darshan Opens', 'संध्या दर्शन', '17:30', 'summer'],
      ['shayan', 'Shayan Aarti', 'शयन आरती', '21:25', 'summer'],
      ['shringar', 'Shringar Aarti', 'श्रृंगार आरती', '08:45', 'winter'],
      ['rajbhog', 'Rajbhog Aarti', 'राजभोग आरती', '12:55', 'winter'],
      ['utthapan', 'Evening Darshan Opens', 'संध्या दर्शन', '16:30', 'winter'],
      ['shayan', 'Shayan Aarti', 'शयन आरती', '20:25', 'winter'],
    ],
  },
  {
    city: 'vrindavan',
    slug: 'iskcon-krishna-balaram-mandir',
    en: 'ISKCON Sri Sri Krishna Balaram Mandir',
    hi: 'इस्कॉन श्री श्री कृष्ण बलराम मंदिर',
    lat: 27.5717,
    lng: 77.6799,
    tags: ['iskcon', 'kirtan', 'prasadam'],
    crowd: 3,
    description:
      'ISKCON’s Vrindavan temple in Raman Reti with continuous kirtan and Srila Prabhupada’s samadhi.',
    aarti: [
      ['mangla', 'Mangala Arati', 'मंगल आरती', '04:30'],
      ['shringar', 'Shringar Darshan', 'श्रृंगार दर्शन', '07:15'],
      ['rajbhog', 'Raj Bhoga Arati', 'राजभोग आरती', '12:00'],
      ['utthapan', 'Utthapan Arati', 'उत्थापन आरती', '16:15'],
      ['sandhya', 'Sandhya Arati', 'संध्या आरती', '18:30'],
      ['shayan', 'Shayan Arati', 'शयन आरती', '20:30'],
    ],
  },
  {
    city: 'vrindavan',
    slug: 'prem-mandir',
    en: 'Prem Mandir',
    hi: 'प्रेम मंदिर',
    lat: 27.5703,
    lng: 77.6727,
    tags: ['radha-krishna', 'light-show', 'architecture'],
    crowd: 3,
    description: 'White Italian-marble temple with an evening light and fountain show.',
    aarti: [
      ['mangla', 'Morning Aarti', 'प्रातः आरती', '05:30'],
      ['rajbhog', 'Bhog Aarti', 'भोग आरती', '11:30'],
      ['sandhya', 'Evening Aarti', 'संध्या आरती', '17:30'],
      ['shayan', 'Shayan Aarti', 'शयन आरती', '20:00'],
    ],
  },
  {
    city: 'vrindavan',
    slug: 'radha-raman-temple',
    en: 'Shri Radha Raman Temple',
    hi: 'श्री राधा रमण मंदिर',
    lat: 27.5823,
    lng: 77.6983,
    tags: ['gaudiya', 'heritage', 'saligram'],
    crowd: 2,
    description:
      'Founded by Gopal Bhatta Goswami; the self-manifested deity has been worshipped here since 1542.',
    aarti: shift(STANDARD, -15),
  },
  {
    city: 'vrindavan',
    slug: 'radha-vallabh-temple',
    en: 'Shri Radha Vallabh Temple',
    hi: 'श्री राधा वल्लभ मंदिर',
    lat: 27.5815,
    lng: 77.6958,
    tags: ['radha-vallabh', 'samaj-gayan'],
    crowd: 2,
    description:
      'Seat of the Radha Vallabh Sampradaya, known for its samaj gayan devotional singing.',
    aarti: STANDARD,
  },

  // Goverdhan
  {
    city: 'goverdhan',
    slug: 'daan-ghati-temple',
    en: 'Daan Ghati Temple',
    hi: 'दानघाटी मंदिर',
    lat: 27.4963,
    lng: 77.4634,
    tags: ['giriraj', 'parikrama-start'],
    crowd: 3,
    description:
      'Most pilgrims begin the 21 km Goverdhan parikrama here with milk abhishek to Giriraj ji.',
    aarti: STANDARD,
  },
  {
    city: 'goverdhan',
    slug: 'mukharvind-jatipura',
    en: 'Mukharvind Temple, Jatipura',
    hi: 'मुखारविंद मंदिर, जतीपुरा',
    lat: 27.4734,
    lng: 77.4565,
    tags: ['giriraj', 'pushtimarg'],
    crowd: 2,
    description:
      'The Mukharvind (face) of Giriraj ji at Jatipura, central to the Pushtimarg tradition.',
    aarti: PUSHTI,
  },
  {
    city: 'goverdhan',
    slug: 'haridev-ji-temple',
    en: 'Shri Haridev Ji Temple',
    hi: 'श्री हरिदेव जी मंदिर',
    lat: 27.4984,
    lng: 77.4619,
    tags: ['heritage', 'manasi-ganga'],
    crowd: 1,
    description: 'Sixteenth-century red sandstone temple beside Manasi Ganga.',
    aarti: shift(STANDARD, 15),
  },
  {
    city: 'goverdhan',
    slug: 'radha-kund',
    en: 'Shri Radha Kund',
    hi: 'श्री राधा कुंड',
    lat: 27.5236,
    lng: 77.4893,
    tags: ['kund', 'ahoi-ashtami'],
    crowd: 2,
    description: 'Sacred kund where pilgrims bathe at midnight on Ahoi Ashtami.',
    aarti: [
      ['mangla', 'Mangla Aarti', 'मंगला आरती', '05:00'],
      ['sandhya', 'Kund Aarti', 'कुंड आरती', '18:45'],
    ],
  },
  {
    city: 'goverdhan',
    slug: 'chakleshwar-mahadev',
    en: 'Chakleshwar Mahadev Temple',
    hi: 'चकलेश्वर महादेव मंदिर',
    lat: 27.5012,
    lng: 77.4648,
    tags: ['shiva'],
    crowd: 1,
    description: 'Shiva temple on the banks of Manasi Ganga.',
    aarti: [
      ['mangla', 'Mangla Aarti', 'मंगला आरती', '05:00'],
      ['sandhya', 'Sandhya Aarti', 'संध्या आरती', '19:00'],
    ],
  },

  // Barsana
  {
    city: 'barsana',
    slug: 'shriji-temple',
    en: 'Shri Ladli Ji (Shriji) Temple',
    hi: 'श्री लाडली जी (श्रीजी) मंदिर',
    lat: 27.6497,
    lng: 77.3773,
    tags: ['radha', 'lathmar-holi', 'hilltop'],
    crowd: 3,
    description: 'Hilltop temple of Shri Radha Rani on Bhanugarh; centre of Lathmar Holi.',
    aarti: [
      ['mangla', 'Mangla Aarti', 'मंगला आरती', '05:00'],
      ['shringar', 'Shringar Aarti', 'श्रृंगार आरती', '08:00'],
      ['rajbhog', 'Rajbhog Aarti', 'राजभोग आरती', '12:00'],
      ['sandhya', 'Sandhya Aarti', 'संध्या आरती', '18:30'],
      ['shayan', 'Shayan Aarti', 'शयन आरती', '20:30'],
    ],
  },
  {
    city: 'barsana',
    slug: 'kirti-mandir',
    en: 'Kirti Mandir',
    hi: 'कीर्ति मंदिर',
    lat: 27.6452,
    lng: 77.3815,
    tags: ['radha', 'architecture'],
    crowd: 1,
    description: 'Temple dedicated to Kirti Maiya, mother of Shri Radha.',
    aarti: [
      ['mangla', 'Morning Aarti', 'प्रातः आरती', '06:00'],
      ['rajbhog', 'Bhog Aarti', 'भोग आरती', '11:45'],
      ['sandhya', 'Evening Aarti', 'संध्या आरती', '18:00'],
    ],
  },
  {
    city: 'barsana',
    slug: 'rangili-mahal',
    en: 'Rangili Mahal',
    hi: 'रंगीली महल',
    lat: 27.6431,
    lng: 77.3827,
    tags: ['radha', 'kirtan'],
    crowd: 1,
    description: 'Ashram temple at the foot of the Barsana hills.',
    aarti: shift(STANDARD, 30),
  },
  {
    city: 'barsana',
    slug: 'maan-mandir',
    en: 'Maan Mandir',
    hi: 'मान मंदिर',
    lat: 27.6519,
    lng: 77.3757,
    tags: ['radha', 'hilltop', 'gaushala'],
    crowd: 1,
    description: 'Hilltop shrine associated with Shri Radha’s maan leela.',
    aarti: [
      ['mangla', 'Mangla Aarti', 'मंगला आरती', '05:30'],
      ['sandhya', 'Sandhya Aarti', 'संध्या आरती', '18:30'],
    ],
  },
  {
    city: 'barsana',
    slug: 'mor-kuti',
    en: 'Mor Kuti',
    hi: 'मोर कुटी',
    lat: 27.6539,
    lng: 77.3748,
    tags: ['leela-sthal', 'peacocks'],
    crowd: 1,
    description: 'Leela sthal where Shri Krishna is said to have danced as a peacock for Radha.',
    aarti: [['sandhya', 'Sandhya Aarti', 'संध्या आरती', '18:15']],
  },

  // Gokul
  {
    city: 'gokul',
    slug: 'gokulnath-ji-temple',
    en: 'Shri Gokulnath Ji Temple',
    hi: 'श्री गोकुलनाथ जी मंदिर',
    lat: 27.4405,
    lng: 77.7215,
    tags: ['pushtimarg', 'heritage'],
    crowd: 1,
    description: 'Pushtimarg haveli in Gokul village.',
    aarti: PUSHTI,
  },
  {
    city: 'gokul',
    slug: 'nand-bhavan-gokul',
    en: 'Nand Bhavan (Chaurasi Khamba)',
    hi: 'नंद भवन (चौरासी खंभा)',
    lat: 27.4482,
    lng: 77.7309,
    tags: ['krishna-childhood', 'mahavan'],
    crowd: 2,
    description: 'The 84-pillared hall at Mahavan believed to be Nand Baba’s home.',
    aarti: STANDARD,
  },
  {
    city: 'gokul',
    slug: 'raman-bihari-ji',
    en: 'Shri Raman Bihari Ji, Raman Reti',
    hi: 'श्री रमण बिहारी जी, रमण रेती',
    lat: 27.4371,
    lng: 77.7178,
    tags: ['sand', 'krishna-childhood'],
    crowd: 1,
    description: 'Pilgrims roll in the sacred sand of Raman Reti where Krishna played as a child.',
    aarti: [
      ['mangla', 'Mangla Aarti', 'मंगला आरती', '05:30'],
      ['rajbhog', 'Rajbhog Aarti', 'राजभोग आरती', '11:30'],
      ['sandhya', 'Sandhya Aarti', 'संध्या आरती', '18:30'],
    ],
  },
  {
    city: 'gokul',
    slug: 'brahmand-bihari',
    en: 'Brahmand Bihari Temple, Brahmand Ghat',
    hi: 'ब्रह्मांड बिहारी मंदिर, ब्रह्मांड घाट',
    lat: 27.4503,
    lng: 77.7372,
    tags: ['yamuna', 'leela-sthal'],
    crowd: 1,
    description: 'Ghat where Yashoda saw the universe in little Krishna’s mouth.',
    aarti: [['sandhya', 'Yamuna Aarti', 'यमुना आरती', '18:30']],
  },
  {
    city: 'gokul',
    slug: 'thakurani-ghat',
    en: 'Thakurani Ghat',
    hi: 'ठकुरानी घाट',
    lat: 27.4416,
    lng: 77.7254,
    tags: ['yamuna', 'pushtimarg'],
    crowd: 1,
    description: 'Ghat where Shri Vallabhacharya received the Brahma Sambandha mantra.',
    aarti: [
      ['mangla', 'Morning Aarti', 'प्रातः आरती', '06:00'],
      ['sandhya', 'Yamuna Aarti', 'यमुना आरती', '18:30'],
    ],
  },

  // Nandgaon
  {
    city: 'nandgaon',
    slug: 'nand-bhawan-nandgaon',
    en: 'Nand Baba Temple (Nand Bhawan)',
    hi: 'नंद बाबा मंदिर (नंद भवन)',
    lat: 27.7118,
    lng: 77.3866,
    tags: ['krishna', 'hilltop', 'lathmar-holi'],
    crowd: 2,
    description:
      'Hilltop temple of Nand Baba and Yashoda Maiya, home of Lathmar Holi’s Nandgaon side.',
    aarti: STANDARD,
  },
  {
    city: 'nandgaon',
    slug: 'pan-sarovar',
    en: 'Pan Sarovar',
    hi: 'पान सरोवर',
    lat: 27.7083,
    lng: 77.3901,
    tags: ['kund', 'cows'],
    crowd: 1,
    description: 'Sarovar where Krishna watered the cows of Nandgaon.',
    aarti: [['sandhya', 'Sarovar Aarti', 'सरोवर आरती', '18:30']],
  },
  {
    city: 'nandgaon',
    slug: 'yashoda-kund',
    en: 'Yashoda Kund',
    hi: 'यशोदा कुंड',
    lat: 27.7097,
    lng: 77.3847,
    tags: ['kund'],
    crowd: 1,
    description: 'Kund named after Yashoda Maiya with a small shrine on its bank.',
    aarti: [
      ['mangla', 'Morning Aarti', 'प्रातः आरती', '06:00'],
      ['sandhya', 'Sandhya Aarti', 'संध्या आरती', '18:30'],
    ],
  },
  {
    city: 'nandgaon',
    slug: 'ter-kadamb',
    en: 'Ter Kadamb',
    hi: 'टेर कदंब',
    lat: 27.7154,
    lng: 77.3792,
    tags: ['grove', 'leela-sthal'],
    crowd: 1,
    description: 'Kadamb grove from where Krishna is said to have called (ter) his cows.',
    aarti: [['sandhya', 'Sandhya Aarti', 'संध्या आरती', '18:00']],
  },
  {
    city: 'nandgaon',
    slug: 'narsingh-ji-mandir-nandgaon',
    en: 'Shri Narsingh Ji Mandir',
    hi: 'श्री नरसिंह जी मंदिर',
    lat: 27.7125,
    lng: 77.3874,
    tags: ['narsingh'],
    crowd: 1,
    description: 'Small Narsingh temple on the Nandgaon hill.',
    aarti: [
      ['mangla', 'Mangla Aarti', 'मंगला आरती', '05:30'],
      ['sandhya', 'Sandhya Aarti', 'संध्या आरती', '19:00'],
    ],
  },
];

export interface PoiSeed {
  city: string;
  key: string;
  category: PoiCategory;
  en: string;
  hi: string;
  lat: number;
  lng: number;
  is24x7?: boolean;
  isEmergency?: boolean;
}

/** Phone numbers are intentionally omitted for real places; national helplines live in app_config. */
export const POIS: PoiSeed[] = [
  {
    city: 'mathura',
    key: 'mathura-district-hospital',
    category: 'hospital',
    en: 'District Hospital, Mathura',
    hi: 'जिला अस्पताल, मथुरा',
    lat: 27.4887,
    lng: 77.6823,
    is24x7: true,
    isEmergency: true,
  },
  {
    city: 'mathura',
    key: 'mathura-kotwali',
    category: 'police',
    en: 'Kotwali Police Station, Mathura',
    hi: 'कोतवाली थाना, मथुरा',
    lat: 27.5049,
    lng: 77.6787,
    is24x7: true,
    isEmergency: true,
  },
  {
    city: 'mathura',
    key: 'mathura-junction-parking',
    category: 'parking',
    en: 'Mathura Junction Parking',
    hi: 'मथुरा जंक्शन पार्किंग',
    lat: 27.4807,
    lng: 77.6732,
    is24x7: true,
  },
  {
    city: 'mathura',
    key: 'vishram-ghat',
    category: 'ghat',
    en: 'Vishram Ghat',
    hi: 'विश्राम घाट',
    lat: 27.5081,
    lng: 77.6857,
  },
  {
    city: 'vrindavan',
    key: 'vrindavan-chc',
    category: 'hospital',
    en: 'Community Health Centre, Vrindavan',
    hi: 'सामुदायिक स्वास्थ्य केंद्र, वृन्दावन',
    lat: 27.5762,
    lng: 77.6905,
    is24x7: true,
    isEmergency: true,
  },
  {
    city: 'vrindavan',
    key: 'vrindavan-police',
    category: 'police',
    en: 'Vrindavan Police Station',
    hi: 'वृन्दावन थाना',
    lat: 27.5793,
    lng: 77.6938,
    is24x7: true,
    isEmergency: true,
  },
  {
    city: 'vrindavan',
    key: 'banke-bihari-parking',
    category: 'parking',
    en: 'Parikrama Marg Parking (near Banke Bihari)',
    hi: 'परिक्रमा मार्ग पार्किंग',
    lat: 27.5822,
    lng: 77.7019,
  },
  {
    city: 'vrindavan',
    key: 'vrindavan-pharmacy',
    category: 'pharmacy',
    en: 'Medical Store, Chhatikara Road',
    hi: 'मेडिकल स्टोर, छटीकरा रोड',
    lat: 27.5689,
    lng: 77.6751,
  },
  {
    city: 'vrindavan',
    key: 'keshi-ghat',
    category: 'ghat',
    en: 'Keshi Ghat',
    hi: 'केशी घाट',
    lat: 27.5844,
    lng: 77.7004,
  },
  {
    city: 'goverdhan',
    key: 'goverdhan-police',
    category: 'police',
    en: 'Goverdhan Police Station',
    hi: 'गोवर्धन थाना',
    lat: 27.4979,
    lng: 77.4641,
    is24x7: true,
    isEmergency: true,
  },
  {
    city: 'goverdhan',
    key: 'goverdhan-phc',
    category: 'hospital',
    en: 'Primary Health Centre, Goverdhan',
    hi: 'प्राथमिक स्वास्थ्य केंद्र, गोवर्धन',
    lat: 27.4941,
    lng: 77.4602,
    isEmergency: true,
  },
  {
    city: 'barsana',
    key: 'barsana-police',
    category: 'police',
    en: 'Barsana Police Station',
    hi: 'बरसाना थाना',
    lat: 27.6466,
    lng: 77.3801,
    is24x7: true,
    isEmergency: true,
  },
  {
    city: 'gokul',
    key: 'gokul-police',
    category: 'police',
    en: 'Mahavan Police Station',
    hi: 'महावन थाना',
    lat: 27.4461,
    lng: 77.7366,
    is24x7: true,
    isEmergency: true,
  },
  {
    city: 'nandgaon',
    key: 'nandgaon-police',
    category: 'police',
    en: 'Nandgaon Police Chowki',
    hi: 'नंदगाँव पुलिस चौकी',
    lat: 27.7101,
    lng: 77.3882,
    isEmergency: true,
  },
];
