export type StopKind = 'Station' | 'Temple' | 'Ghat' | 'Kund' | 'Garden';

export interface JourneyStop {
  id: string;
  name: string;
  hiName: string;
  kind: StopKind;
  /** Position on the illustrative 1000×700 map canvas (not to scale). */
  x: number;
  y: number;
  visitMins: number;
  hours: string;
  difficulty: 'Easy' | 'Moderate';
  about: string;
  highlights: string[];
  tips: string[];
  /** Road distance from the previous stop, km (sample estimate). */
  kmFromPrev: number;
}

export interface Yatra {
  id: string;
  name: string;
  hiName: string;
  area: string;
  stops: JourneyStop[];
}

export interface Vehicle {
  id: string;
  name: string;
  icon: string;
  kmh: number;
  /** Shared fare per seat per leg, in paise (sample). */
  seatPaise: number;
  /** Full-vehicle fare per km, in paise (sample). */
  perKmPaise: number;
}

export const VEHICLES: Vehicle[] = [
  { id: 'erickshaw', name: 'E-Rickshaw', icon: '🛺', kmh: 14, seatPaise: 1000, perKmPaise: 1500 },
  { id: 'auto', name: 'Auto', icon: '🛺', kmh: 20, seatPaise: 2000, perKmPaise: 2000 },
  { id: 'cab', name: 'Cab', icon: '🚕', kmh: 26, seatPaise: 0, perKmPaise: 2500 },
  { id: 'walk', name: 'On foot', icon: '🚶', kmh: 4, seatPaise: 0, perKmPaise: 0 },
];

const LIVE_TIMINGS = 'Changes by season — live timings in app';

export const YATRAS: Yatra[] = [
  {
    id: 'vrindavan',
    name: 'Vrindavan Darshan Yatra',
    hiName: 'वृन्दावन दर्शन यात्रा',
    area: 'Vrindavan',
    stops: [
      {
        id: 'vrn-station',
        name: 'Vrindavan Railway Station',
        hiName: 'वृन्दावन रेलवे स्टेशन',
        kind: 'Station',
        x: 170,
        y: 560,
        visitMins: 10,
        hours: 'Open 24×7',
        difficulty: 'Easy',
        about:
          'Small terminal station on the Mathura–Vrindavan line, a short ride from the temple lanes.',
        highlights: [
          'E-rickshaws wait just outside the exit',
          'Prepaid fares shown in the app',
          'Cloakroom details in the app',
        ],
        tips: [
          'Agree the fare before you sit, or book in the app',
          'Carry a small bag — temple lanes are narrow',
          'Keep water; mornings get hot from April',
        ],
        kmFromPrev: 0,
      },
      {
        id: 'banke-bihari',
        name: 'Shri Banke Bihari Mandir',
        hiName: 'श्री बांके बिहारी मंदिर',
        kind: 'Temple',
        x: 470,
        y: 300,
        visitMins: 45,
        hours: LIVE_TIMINGS,
        difficulty: 'Moderate',
        about:
          'Vrindavan’s most visited temple, where the curtain is drawn every few minutes during darshan.',
        highlights: [
          'Curtain (parda) darshan tradition',
          'Phoolon wali Holi celebrations',
          'Old-town lanes around the temple',
        ],
        tips: [
          'Weekends and festivals are very crowded',
          'Footwear stands near the entry lanes',
          'Keep phones and bags secure',
        ],
        kmFromPrev: 3.2,
      },
      {
        id: 'nidhivan',
        name: 'Nidhivan',
        hiName: 'निधिवन',
        kind: 'Garden',
        x: 560,
        y: 210,
        visitMins: 30,
        hours: 'Daytime only — closes before dark',
        difficulty: 'Easy',
        about:
          'A sacred grove of twisted tulsi trees linked to the Raas Leela; visitors leave before nightfall.',
        highlights: [
          'Rang Mahal shrine',
          'Tulsi grove with intertwined trees',
          'Swami Haridas samadhi',
        ],
        tips: [
          'Watch out for monkeys — keep spectacles and phones tucked away',
          'Guides are available at the gate',
        ],
        kmFromPrev: 0.6,
      },
      {
        id: 'radha-raman',
        name: 'Shri Radha Raman Mandir',
        hiName: 'श्री राधा रमण मंदिर',
        kind: 'Temple',
        x: 650,
        y: 320,
        visitMins: 30,
        hours: LIVE_TIMINGS,
        difficulty: 'Easy',
        about:
          'One of the seven major Goswami temples of Vrindavan, known for its self-manifested deity.',
        highlights: [
          'Gaudiya Vaishnava heritage',
          'Intimate courtyard darshan',
          'Close to Nidhivan on foot',
        ],
        tips: ['Combine with Nidhivan on foot', 'Quieter in the late morning'],
        kmFromPrev: 0.7,
      },
      {
        id: 'keshi-ghat',
        name: 'Keshi Ghat',
        hiName: 'केशी घाट',
        kind: 'Ghat',
        x: 770,
        y: 170,
        visitMins: 40,
        hours: 'Open all day · evening Yamuna aarti',
        difficulty: 'Easy',
        about:
          'The best-known ghat on the Yamuna in Vrindavan, with red sandstone pavilions and boat rides.',
        highlights: [
          'Evening Yamuna aarti',
          'Boat rides at sunset',
          'Historic sandstone architecture',
        ],
        tips: ['Agree boat fares in advance', 'Steps can be slippery near the water'],
        kmFromPrev: 1.4,
      },
      {
        id: 'iskcon',
        name: 'ISKCON Krishna Balaram Mandir',
        hiName: 'इस्कॉन कृष्ण बलराम मंदिर',
        kind: 'Temple',
        x: 640,
        y: 520,
        visitMins: 45,
        hours: LIVE_TIMINGS,
        difficulty: 'Easy',
        about:
          'The ISKCON temple on Raman Reti, with kirtan through the day and a large guesthouse.',
        highlights: [
          'Kirtan and aartis through the day',
          'Samadhi of Srila Prabhupada',
          'Govinda’s restaurant nearby',
        ],
        tips: ['Bags and phones may need to be deposited', 'Good stop for a sattvic meal'],
        kmFromPrev: 3.0,
      },
      {
        id: 'prem-mandir',
        name: 'Prem Mandir',
        hiName: 'प्रेम मंदिर',
        kind: 'Temple',
        x: 810,
        y: 600,
        visitMins: 60,
        hours: LIVE_TIMINGS,
        difficulty: 'Easy',
        about:
          'A white marble temple with large gardens, famous for its colour-changing evening lights.',
        highlights: [
          'Illuminated temple after sunset',
          'Leela tableaux in the gardens',
          'Musical fountain show',
        ],
        tips: [
          'Reach before sunset to see the lights come on',
          'Wide paths — easy for elders and wheelchairs',
        ],
        kmFromPrev: 1.2,
      },
    ],
  },
  {
    id: 'mathura',
    name: 'Mathura Janmabhoomi Yatra',
    hiName: 'मथुरा जन्मभूमि यात्रा',
    area: 'Mathura',
    stops: [
      {
        id: 'mathura-jn',
        name: 'Mathura Junction',
        hiName: 'मथुरा जंक्शन',
        kind: 'Station',
        x: 200,
        y: 520,
        visitMins: 10,
        hours: 'Open 24×7',
        difficulty: 'Easy',
        about: 'The main railway junction for Braj, with trains from Delhi, Agra and beyond.',
        highlights: [
          'Prepaid auto and e-rickshaw stands',
          'Cloakroom on the platform',
          'Connections to Vrindavan',
        ],
        tips: [
          'Book your onward ride in the app before you arrive',
          'Mornings are the coolest time to travel',
        ],
        kmFromPrev: 0,
      },
      {
        id: 'janmabhoomi',
        name: 'Shri Krishna Janmabhoomi',
        hiName: 'श्री कृष्ण जन्मभूमि',
        kind: 'Temple',
        x: 460,
        y: 330,
        visitMins: 60,
        hours: LIVE_TIMINGS,
        difficulty: 'Moderate',
        about:
          'The temple complex revered as the birthplace of Shri Krishna, the heart of Mathura.',
        highlights: ['Garbh Griha shrine', 'Bhagavata Bhawan', 'Janmashtami celebrations'],
        tips: [
          'Strict security — phones, bags and pens are not allowed inside',
          'Lockers are available near the entry',
        ],
        kmFromPrev: 2.5,
      },
      {
        id: 'dwarkadhish',
        name: 'Dwarkadhish Temple',
        hiName: 'द्वारकाधीश मंदिर',
        kind: 'Temple',
        x: 640,
        y: 250,
        visitMins: 40,
        hours: LIVE_TIMINGS,
        difficulty: 'Easy',
        about:
          'A 19th-century temple in the old city, known for its carved façade and swing festivals.',
        highlights: [
          'Painted ceilings and carvings',
          'Jhula (swing) festival in Shravan',
          'Old-city bazaar around it',
        ],
        tips: ['Walk from here to Vishram Ghat', 'Bazaar lanes are busy in the evening'],
        kmFromPrev: 2.0,
      },
      {
        id: 'vishram-ghat',
        name: 'Vishram Ghat',
        hiName: 'विश्राम घाट',
        kind: 'Ghat',
        x: 790,
        y: 330,
        visitMins: 45,
        hours: 'Open all day · evening Yamuna aarti',
        difficulty: 'Easy',
        about:
          'The principal ghat of Mathura on the Yamuna, where the evening aarti draws large crowds.',
        highlights: [
          'Evening Yamuna aarti',
          'Boat rides along the ghats',
          'Deep-daan (lamp offering)',
        ],
        tips: ['Arrive early for a good spot at aarti', 'Agree boat fares in advance'],
        kmFromPrev: 0.5,
      },
    ],
  },
  {
    id: 'govardhan',
    name: 'Govardhan Parikrama',
    hiName: 'गोवर्धन परिक्रमा',
    area: 'Govardhan',
    stops: [
      {
        id: 'daan-ghati',
        name: 'Daan Ghati Mandir',
        hiName: 'दान घाटी मंदिर',
        kind: 'Temple',
        x: 500,
        y: 600,
        visitMins: 30,
        hours: LIVE_TIMINGS,
        difficulty: 'Easy',
        about:
          'The traditional starting point of the Govardhan parikrama, with a temple to Giriraj ji.',
        highlights: [
          'Milk abhishek of Giriraj ji',
          'Start of the 21 km path',
          'Shops for parikrama supplies',
        ],
        tips: ['Start early in the morning in summer', 'Walk barefoot only if you are used to it'],
        kmFromPrev: 0,
      },
      {
        id: 'radha-kund',
        name: 'Radha Kund & Shyam Kund',
        hiName: 'राधा कुंड और श्याम कुंड',
        kind: 'Kund',
        x: 230,
        y: 320,
        visitMins: 45,
        hours: 'Open all day',
        difficulty: 'Moderate',
        about: 'Two sacred ponds side by side, among the holiest places on the parikrama.',
        highlights: [
          'Midnight snan on Ahoi Ashtami',
          'Many small temples around the kunds',
          'Rest points with shade',
        ],
        tips: ['Rest here before the next stretch', 'Carry water and some fruit'],
        kmFromPrev: 7.5,
      },
      {
        id: 'kusum-sarovar',
        name: 'Kusum Sarovar',
        hiName: 'कुसुम सरोवर',
        kind: 'Kund',
        x: 380,
        y: 140,
        visitMins: 30,
        hours: 'Open all day',
        difficulty: 'Easy',
        about:
          'A sandstone tank with chhatris built in the 18th century, one of the most beautiful spots on the route.',
        highlights: ['Sandstone chhatris and steps', 'Sunset views', 'Quiet spot to rest'],
        tips: ['Good photo stop', 'Steps down to the water are steep'],
        kmFromPrev: 3.5,
      },
      {
        id: 'mukharvind',
        name: 'Jatipura Mukharvind',
        hiName: 'जतीपुरा मुखारविंद',
        kind: 'Temple',
        x: 760,
        y: 230,
        visitMins: 30,
        hours: LIVE_TIMINGS,
        difficulty: 'Moderate',
        about:
          'The place revered as the face (mukharvind) of Giriraj ji on the southern side of the hill.',
        highlights: ['Milk abhishek', 'Pushtimarg heritage', 'Busy on Guru Purnima'],
        tips: ['Crowded on Purnima and Sundays', 'E-rickshaws available for elders'],
        kmFromPrev: 5.0,
      },
      {
        id: 'puchhri',
        name: 'Puchhri ka Lautha',
        hiName: 'पूँछरी का लौठा',
        kind: 'Temple',
        x: 820,
        y: 520,
        visitMins: 20,
        hours: LIVE_TIMINGS,
        difficulty: 'Easy',
        about:
          'A small shrine at the tail end of the hill, said to record each pilgrim’s parikrama.',
        highlights: [
          'Traditional stop to “register” the parikrama',
          'Last stretch back to Daan Ghati',
        ],
        tips: ['Last stretch — pace yourself', 'Rest points mapped in the app'],
        kmFromPrev: 2.5,
      },
    ],
  },
];

export function rupees(paise: number): string {
  return `₹${new Intl.NumberFormat('en-IN').format(Math.round(paise / 100))}`;
}
