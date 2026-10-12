import type { IconName, Lang } from './content';

export interface YatraPackage {
  id: string;
  name: string;
  duration: string;
  tag: string;
  stops: string[];
  includes: string[];
  /** Sample starting price per person, in integer paise. */
  fromPaise: number;
}

export interface DarshanService {
  icon: IconName;
  title: string;
  body: string;
}

export interface YatraContent {
  packages: {
    kicker: string;
    title: string;
    sub: string;
    filters: { all: string; day: string; multi: string; parikrama: string };
    from: string;
    perPerson: string;
    book: string;
    stops: string;
    includes: string;
    sample: string;
    items: (YatraPackage & { kind: 'day' | 'multi' | 'parikrama' })[];
  };
  darshan: {
    kicker: string;
    title: string;
    sub: string;
    live: string;
    liveNow: string;
    items: DarshanService[];
  };
  local: {
    kicker: string;
    title: string;
    sub: string;
    items: DarshanService[];
  };
}

const en: YatraContent = {
  packages: {
    kicker: 'Yatra packages',
    title: 'Ready-made yatras across Braj',
    sub: 'Pick a package, choose your date and travel with a verified guide. Transport, darshan timings and meals are planned for you.',
    filters: { all: 'All', day: 'One day', multi: 'Multi-day', parikrama: 'Parikrama' },
    from: 'from',
    perPerson: 'per person',
    book: 'Book this yatra',
    stops: 'Stops',
    includes: 'Includes',
    sample: 'Sample packages and prices for illustration',
    items: [
      {
        id: 'mv-1day',
        kind: 'day',
        name: 'Mathura–Vrindavan Darshan',
        duration: '1 day',
        tag: 'Most booked',
        stops: [
          'Shri Krishna Janmabhoomi',
          'Vishram Ghat',
          'Banke Bihari',
          'ISKCON',
          'Prem Mandir (evening)',
        ],
        includes: ['AC cab', 'Local guide', 'Sattvic lunch'],
        fromPaise: 149900,
      },
      {
        id: 'vrindavan-heritage',
        kind: 'day',
        name: 'Vrindavan Heritage Walk',
        duration: '6 hours',
        tag: 'On foot',
        stops: ['Radha Raman', 'Nidhivan', 'Seva Kunj', 'Keshi Ghat aarti', 'Yamuna boat ride'],
        includes: ['Walking guide', 'Boat ride', 'Prasad'],
        fromPaise: 79900,
      },
      {
        id: 'braj-3day',
        kind: 'multi',
        name: 'Braj Darshan',
        duration: '3 days · 2 nights',
        tag: 'Family favourite',
        stops: ['Mathura', 'Vrindavan', 'Gokul', 'Govardhan', 'Barsana', 'Nandgaon'],
        includes: ['Dharamshala stay', 'AC cab', 'Guide', 'All meals'],
        fromPaise: 699900,
      },
      {
        id: 'holi-barsana',
        kind: 'multi',
        name: 'Braj Holi Utsav',
        duration: '4 days · 3 nights',
        tag: 'Festival',
        stops: [
          'Lathmar Holi, Barsana',
          'Nandgaon',
          'Phoolon wali Holi, Banke Bihari',
          'Dauji Huranga',
        ],
        includes: ['Stay near venues', 'Reserved viewing spots', 'Guide', 'Meals'],
        fromPaise: 1199900,
      },
      {
        id: 'govardhan',
        kind: 'parikrama',
        name: 'Govardhan Parikrama',
        duration: '1 day · 21 km',
        tag: 'Elder friendly',
        stops: ['Daan Ghati', 'Radha Kund', 'Shyam Kund', 'Kusum Sarovar', 'Mukharvind'],
        includes: ['Parikrama guide', 'E-rickshaw option', 'Rest points', 'Water & fruit'],
        fromPaise: 99900,
      },
      {
        id: '84-kos',
        kind: 'parikrama',
        name: 'Braj 84 Kos Yatra',
        duration: '7 days · 6 nights',
        tag: 'Complete Braj',
        stops: ['Mathura', 'Madhuvan', 'Kamyavan', 'Barsana', 'Nandgaon', 'Govardhan', 'Vrindavan'],
        includes: ['Stays on route', 'Coach & cab', 'Pandit for sankalp', 'All meals'],
        fromPaise: 2499900,
      },
    ],
  },
  darshan: {
    kicker: 'From anywhere',
    title: 'Live darshan & puja seva',
    sub: 'Can’t travel right now? Join aarti live from Braj, take a 360° temple tour or book a puja performed in your family’s name.',
    live: 'Live',
    liveNow: 'Mangala Aarti · streaming now',
    items: [
      {
        icon: 'reel',
        title: 'Live aarti',
        body: 'Watch daily aartis from major temples, with reminders before each stream.',
      },
      {
        icon: 'camera',
        title: '360° temple tours',
        body: 'Walk through sanctums and courtyards in immersive views before you visit.',
      },
      {
        icon: 'lotus',
        title: 'Puja & seva booking',
        body: 'Book abhishek, bhog or deep-daan; get a video and prasad by post.',
      },
      {
        icon: 'star',
        title: 'Sankalp in your name',
        body: 'A pandit takes sankalp with your family’s names and gotra.',
      },
    ],
  },
  local: {
    kicker: 'On the ground',
    title: 'Guides, homestays & green rides',
    sub: 'Everything local, verified and bookable in one place.',
    items: [
      {
        icon: 'map',
        title: 'Licensed guides',
        body: 'Hindi and English speaking guides, rated by pilgrims, by the hour or day.',
      },
      {
        icon: 'bed',
        title: 'Homestays',
        body: 'Stay with Braj families — home-cooked sattvic food and walking distance to temples.',
      },
      {
        icon: 'car',
        title: 'E-rickshaw & e-cab',
        body: 'Book electric rides with fixed fares between temples and ghats.',
      },
      {
        icon: 'train',
        title: 'Station & airport pickup',
        body: 'Pickup from Mathura Junction, Agra or Delhi, timed to your train or flight.',
      },
    ],
  },
};

const hi: YatraContent = {
  packages: {
    kicker: 'यात्रा पैकेज',
    title: 'पूरे ब्रज की तैयार यात्राएँ',
    sub: 'पैकेज चुनें, तारीख़ तय करें और सत्यापित गाइड के साथ यात्रा करें। सवारी, दर्शन का समय और भोजन — सब पहले से तय।',
    filters: { all: 'सभी', day: 'एक दिन', multi: 'कई दिन', parikrama: 'परिक्रमा' },
    from: 'शुरुआत',
    perPerson: 'प्रति व्यक्ति',
    book: 'यह यात्रा बुक करें',
    stops: 'पड़ाव',
    includes: 'शामिल',
    sample: 'उदाहरण के लिए नमूना पैकेज और कीमतें',
    items: [
      {
        id: 'mv-1day',
        kind: 'day',
        name: 'मथुरा–वृन्दावन दर्शन',
        duration: '1 दिन',
        tag: 'सबसे लोकप्रिय',
        stops: [
          'श्री कृष्ण जन्मभूमि',
          'विश्राम घाट',
          'बांके बिहारी',
          'इस्कॉन',
          'प्रेम मंदिर (शाम)',
        ],
        includes: ['AC कैब', 'स्थानीय गाइड', 'सात्विक भोजन'],
        fromPaise: 149900,
      },
      {
        id: 'vrindavan-heritage',
        kind: 'day',
        name: 'वृन्दावन विरासत पदयात्रा',
        duration: '6 घंटे',
        tag: 'पैदल',
        stops: ['राधा रमण', 'निधिवन', 'सेवा कुंज', 'केशी घाट आरती', 'यमुना नौका विहार'],
        includes: ['पैदल गाइड', 'नौका विहार', 'प्रसाद'],
        fromPaise: 79900,
      },
      {
        id: 'braj-3day',
        kind: 'multi',
        name: 'ब्रज दर्शन',
        duration: '3 दिन · 2 रात',
        tag: 'परिवारों की पसंद',
        stops: ['मथुरा', 'वृन्दावन', 'गोकुल', 'गोवर्धन', 'बरसाना', 'नंदगाँव'],
        includes: ['धर्मशाला में ठहरना', 'AC कैब', 'गाइड', 'सभी भोजन'],
        fromPaise: 699900,
      },
      {
        id: 'holi-barsana',
        kind: 'multi',
        name: 'ब्रज होली उत्सव',
        duration: '4 दिन · 3 रात',
        tag: 'त्योहार',
        stops: ['लठमार होली, बरसाना', 'नंदगाँव', 'फूलों वाली होली, बांके बिहारी', 'दाऊजी हुरंगा'],
        includes: ['आयोजन स्थल के पास ठहरना', 'आरक्षित दर्शन स्थान', 'गाइड', 'भोजन'],
        fromPaise: 1199900,
      },
      {
        id: 'govardhan',
        kind: 'parikrama',
        name: 'गोवर्धन परिक्रमा',
        duration: '1 दिन · 21 किमी',
        tag: 'बुज़ुर्गों के अनुकूल',
        stops: ['दान घाटी', 'राधा कुंड', 'श्याम कुंड', 'कुसुम सरोवर', 'मुखारविंद'],
        includes: ['परिक्रमा गाइड', 'ई-रिक्शा विकल्प', 'विश्राम स्थल', 'पानी और फल'],
        fromPaise: 99900,
      },
      {
        id: '84-kos',
        kind: 'parikrama',
        name: 'ब्रज 84 कोस यात्रा',
        duration: '7 दिन · 6 रात',
        tag: 'संपूर्ण ब्रज',
        stops: ['मथुरा', 'मधुवन', 'काम्यवन', 'बरसाना', 'नंदगाँव', 'गोवर्धन', 'वृन्दावन'],
        includes: ['रास्ते में ठहरना', 'बस और कैब', 'संकल्प के लिए पंडित', 'सभी भोजन'],
        fromPaise: 2499900,
      },
    ],
  },
  darshan: {
    kicker: 'कहीं से भी',
    title: 'लाइव दर्शन और पूजा सेवा',
    sub: 'अभी यात्रा नहीं कर सकते? ब्रज से लाइव आरती देखें, 360° मंदिर दर्शन करें या अपने परिवार के नाम से पूजा बुक करें।',
    live: 'लाइव',
    liveNow: 'मंगला आरती · अभी प्रसारण',
    items: [
      {
        icon: 'reel',
        title: 'लाइव आरती',
        body: 'प्रमुख मंदिरों की रोज़ की आरती देखें, हर प्रसारण से पहले रिमाइंडर।',
      },
      {
        icon: 'camera',
        title: '360° मंदिर दर्शन',
        body: 'यात्रा से पहले गर्भगृह और आँगन का पूरा दृश्य देखें।',
      },
      {
        icon: 'lotus',
        title: 'पूजा और सेवा बुकिंग',
        body: 'अभिषेक, भोग या दीप-दान बुक करें; वीडियो और डाक से प्रसाद पाएँ।',
      },
      {
        icon: 'star',
        title: 'आपके नाम से संकल्प',
        body: 'पंडित जी आपके परिवार के नाम और गोत्र से संकल्प लेते हैं।',
      },
    ],
  },
  local: {
    kicker: 'ज़मीनी सेवाएँ',
    title: 'गाइड, होमस्टे और ई-सवारी',
    sub: 'सब कुछ स्थानीय, सत्यापित और एक ही जगह बुक करने योग्य।',
    items: [
      {
        icon: 'map',
        title: 'लाइसेंसधारी गाइड',
        body: 'हिंदी और अंग्रेज़ी बोलने वाले, यात्रियों द्वारा रेटेड — घंटे या दिन के हिसाब से।',
      },
      {
        icon: 'bed',
        title: 'होमस्टे',
        body: 'ब्रज परिवारों के साथ ठहरें — घर का सात्विक भोजन, मंदिर पैदल दूरी पर।',
      },
      {
        icon: 'car',
        title: 'ई-रिक्शा और ई-कैब',
        body: 'मंदिरों और घाटों के बीच तय किराये पर इलेक्ट्रिक सवारी।',
      },
      {
        icon: 'train',
        title: 'स्टेशन और एयरपोर्ट पिकअप',
        body: 'मथुरा जंक्शन, आगरा या दिल्ली से, आपकी ट्रेन या फ़्लाइट के समय पर।',
      },
    ],
  },
};

export const YATRA: Record<Lang, YatraContent> = { en, hi };

/** Formats integer paise as Indian rupees for display only. */
export function formatRupees(paise: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(paise / 100));
}
