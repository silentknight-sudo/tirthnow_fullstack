export type Lang = 'en' | 'hi';

export interface Feature {
  id: string;
  icon: IconName;
  title: string;
  body: string;
  points: string[];
}

export type IconName =
  | 'temple'
  | 'bell'
  | 'bed'
  | 'car'
  | 'thali'
  | 'boat'
  | 'spark'
  | 'map'
  | 'shield'
  | 'reel'
  | 'mic'
  | 'camera'
  | 'cloud'
  | 'train'
  | 'star'
  | 'lotus';

export interface Content {
  nav: {
    features: string;
    guide: string;
    safety: string;
    partners: string;
    faq: string;
    cta: string;
  };
  hero: {
    kicker: string;
    title: [string, string];
    sub: string;
    primary: string;
    secondary: string;
    scroll: string;
  };
  showcase: { kicker: string; title: string; sub: string };
  journey: { kicker: string; title: string; sub: string; stops: { name: string; note: string }[] };
  aarti: {
    kicker: string;
    title: string;
    sub: string;
    next: string;
    startsIn: string;
    remind: string;
    reminded: string;
    sample: string;
    temples: { temple: string; aarti: string; time: string }[];
  };
  features: { kicker: string; title: string; sub: string; items: Feature[] };
  guide: {
    kicker: string;
    title: string;
    sub: string;
    points: string[];
    chat: { from: 'user' | 'guide'; text: string; source?: string }[];
    typing: string;
    placeholder: string;
  };
  planner: {
    kicker: string;
    title: string;
    sub: string;
    day: string;
    items: { time: string; kind: string; title: string; note: string }[];
    pdf: string;
    share: string;
  };
  safety: {
    kicker: string;
    title: string;
    sub: string;
    steps: { title: string; body: string }[];
    button: string;
    hint: string;
  };
  reels: { kicker: string; title: string; sub: string; captions: string[] };
  stats: { value: number; suffix: string; label: string }[];
  partners: {
    kicker: string;
    title: string;
    sub: string;
    points: { title: string; body: string }[];
    cta: string;
  };
  faq: { kicker: string; title: string; items: { q: string; a: string }[] };
  download: { title: string; sub: string; android: string; ios: string; soon: string };
  footer: { tagline: string; rights: string; made: string };
}

const en: Content = {
  nav: {
    features: 'Features',
    guide: 'AI Guide',
    safety: 'Safety',
    partners: 'Partners',
    faq: 'FAQ',
    cta: 'Get the app',
  },
  hero: {
    kicker: 'Braj · Mathura · Vrindavan',
    title: ['Every tirth,', 'right now.'],
    sub: 'Live aarti times, darshan, stays, rides, prasad-worthy food and an AI guide that speaks your language — one calm companion for your whole yatra.',
    primary: 'Get early access',
    secondary: 'See how it works',
    scroll: 'Scroll to begin the yatra',
  },
  showcase: {
    kicker: 'Inside the app',
    title: 'Designed for the devotee',
    sub: 'Calm screens, big type and Braj colours — from live aarti to booking a room to calling for help.',
  },
  journey: {
    kicker: 'The yatra',
    title: 'One path through all of Braj',
    sub: 'Plan, travel and pray across the holy towns without juggling ten apps.',
    stops: [
      { name: 'Mathura', note: 'Shri Krishna Janmabhoomi and Vishram Ghat' },
      { name: 'Vrindavan', note: 'Banke Bihari, ISKCON, Prem Mandir, Keshi Ghat' },
      { name: 'Govardhan', note: '21 km parikrama with resting points mapped' },
      { name: 'Barsana', note: 'Radha Rani Temple and Lathmar Holi' },
      { name: 'Nandgaon', note: 'Nand Bhawan on the hilltop' },
      { name: 'Gokul', note: 'Raman Reti and the Yamuna ghats' },
    ],
  },
  aarti: {
    kicker: 'Never miss darshan',
    title: 'Aarti times you can trust',
    sub: 'Times come from each temple’s schedule — summer and winter timings, festival changes — and count down live. Set a reminder and we nudge you before the curtains open.',
    next: 'Next aarti',
    startsIn: 'starts in',
    remind: 'Remind me 30 min before',
    reminded: 'Reminder set',
    sample: 'Sample schedule for illustration',
    temples: [
      { temple: 'ISKCON Krishna Balaram', aarti: 'Mangala Arati', time: '04:30' },
      { temple: 'Shri Banke Bihari', aarti: 'Shringar Aarti', time: '07:45' },
      { temple: 'Prem Mandir', aarti: 'Rajbhog Aarti', time: '12:00' },
      { temple: 'ISKCON Krishna Balaram', aarti: 'Sandhya Arati', time: '18:30' },
      { temple: 'Shri Krishna Janmabhoomi', aarti: 'Sandhya Aarti', time: '19:00' },
      { temple: 'Shri Banke Bihari', aarti: 'Shayan Aarti', time: '21:25' },
    ],
  },
  features: {
    kicker: 'Everything for the yatra',
    title: 'One app. Every need on the path.',
    sub: 'Built with temple-town realities in mind: crowds, heat, patchy networks, elders in the family and two languages.',
    items: [
      {
        id: 'temples',
        icon: 'temple',
        title: 'Temples & darshan',
        body: 'Every major temple with history, dress code, crowd level and directions.',
        points: ['Hindi & English', 'Nearby temples on the map', 'Festival calendar'],
      },
      {
        id: 'reminders',
        icon: 'bell',
        title: 'Aarti reminders',
        body: 'Pick an aarti once; get a gentle push before it begins, every day.',
        points: ['Live countdowns', 'Season-aware timings', 'Quiet when you opt out'],
      },
      {
        id: 'stays',
        icon: 'bed',
        title: 'Stays near the mandir',
        body: 'Dharamshalas and hotels with real-time rooms and clear cancellation rules.',
        points: ['Instant confirmation', 'Free cancellation windows', 'Verified reviews only'],
      },
      {
        id: 'cabs',
        icon: 'car',
        title: 'Cabs & e-rickshaws',
        body: 'Fixed-route and metered fares shown upfront, with live driver tracking.',
        points: ['Night fares stated', 'Driver details on accept', 'Track on the map'],
      },
      {
        id: 'food',
        icon: 'thali',
        title: 'Sattvic food',
        body: 'Pure-veg bhojanalayas and thalis, ordered ahead to skip the queue.',
        points: ['Open-now filter', 'No onion-garlic options', 'Pay in the app'],
      },
      {
        id: 'experiences',
        icon: 'boat',
        title: 'Experiences',
        body: 'Yamuna boat rides, guided parikramas and evening aarti walks.',
        points: ['Seat-by-seat slots', 'Local guides', 'Group bookings'],
      },
      {
        id: 'guide',
        icon: 'spark',
        title: 'AI Braj Guide',
        body: 'Ask anything — stories, customs, what to wear — and get cited answers.',
        points: ['Speaks Hindi & Hinglish', 'Never guesses aarti times', 'Sources you can check'],
      },
      {
        id: 'planner',
        icon: 'map',
        title: 'Trip planner',
        body: 'A day-by-day plan around real aarti times, heat and your pace.',
        points: ['Elder & wheelchair friendly', 'Share or download PDF', 'Edit any stop'],
      },
      {
        id: 'sos',
        icon: 'shield',
        title: 'SOS & safety',
        body: 'One long-press alerts family by SMS, WhatsApp and push with your live location.',
        points: ['Nearest police & hospital', 'Works for guest users', 'Cancel within 2 minutes'],
      },
      {
        id: 'reels',
        icon: 'reel',
        title: 'Bhakti reels',
        body: 'Short videos of aarti, festivals and ghats from fellow pilgrims.',
        points: ['Follow creators', 'Save for later', 'Moderated with care'],
      },
      {
        id: 'voice',
        icon: 'mic',
        title: 'Voice & photo',
        body: 'Speak your question, hear the answer, or point the camera at a temple.',
        points: ['Hindi voice', 'Answers read aloud', 'Recognise temples'],
      },
      {
        id: 'weather',
        icon: 'cloud',
        title: 'Weather & trains',
        body: 'Heat, fog and rain advisories plus trains to Mathura Junction.',
        points: ['5-day forecast', 'Best time to walk', 'IRCTC deep links'],
      },
    ],
  },
  guide: {
    kicker: 'AI Braj Guide',
    title: 'A guide who knows every gali',
    sub: 'Built on a library of approved temple texts and our live schedules. It cites sources, answers in your language and hands aarti questions to the temple calendar — never to guesswork.',
    points: [
      'Answers with sources',
      'Aarti times straight from temple schedules',
      'Hindi, English or Hinglish — by text or voice',
    ],
    chat: [
      { from: 'user', text: 'ISKCON Vrindavan mein aaj sandhya aarti kab hai?' },
      {
        from: 'guide',
        text: 'Aaj Sandhya Arati 18:30 IST par hai. Thoda pehle pahunchiye — 6 baje ke baad bheed badhti hai.',
        source: 'Temple schedule',
      },
      { from: 'user', text: 'What should I wear for Banke Bihari darshan?' },
      {
        from: 'guide',
        text: 'Modest, comfortable clothes; footwear is left outside. Carry a small bag — the courtyard gets crowded during darshan. [1]',
        source: '[1] Banke Bihari — temple guide',
      },
    ],
    typing: 'Guide is typing',
    placeholder: 'Ask about temples, aarti, stays…',
  },
  planner: {
    kicker: 'Trip planner',
    title: 'Your yatra, planned in seconds',
    sub: 'Tell us your dates, pace and who is travelling. The planner builds each day around real aarti times, rests through the afternoon heat and estimates travel between stops.',
    day: 'Day 1 · Vrindavan',
    items: [
      {
        time: '07:45',
        kind: 'Aarti',
        title: 'Shringar Aarti — Shri Banke Bihari',
        note: 'From the temple schedule',
      },
      {
        time: '09:15',
        kind: 'Temple',
        title: 'ISKCON Krishna Balaram Mandir',
        note: '12 min by e-rickshaw',
      },
      { time: '13:00', kind: 'Meal', title: 'Sattvic thali lunch', note: '₹250 per person' },
      {
        time: '14:30',
        kind: 'Rest',
        title: 'Rest through the afternoon heat',
        note: 'Heat advisory: 39°C',
      },
      { time: '18:30', kind: 'Aarti', title: 'Sandhya Arati — ISKCON', note: 'Arrive by 18:10' },
    ],
    pdf: 'Download PDF',
    share: 'Share with family',
  },
  safety: {
    kicker: 'Safety first',
    title: 'Help is one long-press away',
    sub: 'Crowds swell on festival days. SOS keeps your family and the nearest help one tap from you — even with a weak signal.',
    steps: [
      { title: 'Press and hold', body: 'A 5-second countdown prevents accidental alerts.' },
      {
        title: 'Family is alerted',
        body: 'SMS, WhatsApp and push go to your emergency contacts with a live-location link.',
      },
      {
        title: 'Help nearby',
        body: 'Nearest police station and hospital with one-tap calling, and 112 always on screen.',
      },
      { title: 'All clear', body: 'Mark yourself safe and everyone is told immediately.' },
    ],
    button: 'SOS',
    hint: 'Press & hold',
  },
  reels: {
    kicker: 'Bhakti reels',
    title: 'Feel the yatra before you arrive',
    sub: 'Aarti, Holi in Barsana, boat rides at dusk — short videos from pilgrims, ranked fresh and kept respectful.',
    captions: [
      'Evening aarti at Keshi Ghat',
      'Phoolon wali Holi, Banke Bihari',
      'Govardhan parikrama at dawn',
      'Lathmar Holi, Barsana',
      'Yamuna boat ride',
    ],
  },
  stats: [
    { value: 6, suffix: '', label: 'holy towns of Braj' },
    { value: 2, suffix: '', label: 'languages, Hindi & English' },
    { value: 4, suffix: '', label: 'ways to book: stays, cabs, food, experiences' },
    { value: 24, suffix: '×7', label: 'SOS with live location' },
  ],
  partners: {
    kicker: 'For partners',
    title: 'Grow with pilgrims who are already here',
    sub: 'Hotels, dharamshalas, cab owners, bhojanalayas and guides — list once, get bookings, get paid on time.',
    points: [
      {
        title: 'Simple onboarding',
        body: 'KYC and bank details in one flow; your staff get their own logins.',
      },
      {
        title: 'Live inventory',
        body: 'Room calendars, cab fares, menus and slots that update instantly.',
      },
      {
        title: 'Transparent payouts',
        body: 'Clear commission, GST shown, monthly statements and scheduled payouts.',
      },
      {
        title: 'Real reviews',
        body: 'Only guests who completed a booking can review — and you can reply.',
      },
    ],
    cta: 'Become a partner',
  },
  faq: {
    kicker: 'Questions',
    title: 'Good to know',
    items: [
      {
        q: 'Where do aarti times come from?',
        a: 'From each temple’s published schedule, including summer and winter timings and festival changes. The AI guide and planner read the same schedule — they never estimate times.',
      },
      {
        q: 'Does it work in Hindi?',
        a: 'Yes. The whole app, notifications and the AI guide work in Hindi and English, and the guide understands Hinglish and voice.',
      },
      {
        q: 'What happens when I press SOS?',
        a: 'After a short countdown, your emergency contacts get an SMS, WhatsApp and app alert with a live-location link, and you see the nearest police and hospital. You can cancel within two minutes.',
      },
      {
        q: 'How do refunds work?',
        a: 'Each listing shows its cancellation policy before you pay. Refunds go back to your original payment method, and the app shows exactly how much is returned.',
      },
      {
        q: 'Can I use it without an account?',
        a: 'Yes — browse, ask the guide and use SOS as a guest. Sign in with your phone number to book.',
      },
    ],
  },
  download: {
    title: 'Begin your yatra with Tirth Now',
    sub: 'The app is coming soon to Android and iPhone.',
    android: 'Google Play',
    ios: 'App Store',
    soon: 'Coming soon',
  },
  footer: {
    tagline: 'A calm companion for every pilgrim in Braj.',
    rights: 'All rights reserved.',
    made: 'Made with devotion in Braj.',
  },
};

const hi: Content = {
  nav: {
    features: 'सुविधाएँ',
    guide: 'AI गाइड',
    safety: 'सुरक्षा',
    partners: 'पार्टनर',
    faq: 'सवाल',
    cta: 'ऐप पाएँ',
  },
  hero: {
    kicker: 'ब्रज · मथुरा · वृन्दावन',
    title: ['हर तीर्थ,', 'अभी।'],
    sub: 'आरती के सही समय, दर्शन, ठहरने की जगह, सवारी, सात्विक भोजन और आपकी भाषा बोलने वाला AI गाइड — पूरी यात्रा का एक शांत साथी।',
    primary: 'जल्दी पहुँच पाएँ',
    secondary: 'देखें कैसे काम करता है',
    scroll: 'यात्रा शुरू करने के लिए स्क्रॉल करें',
  },
  showcase: {
    kicker: 'ऐप के अंदर',
    title: 'भक्तों के लिए बना',
    sub: 'शांत स्क्रीन, बड़े अक्षर और ब्रज के रंग — लाइव आरती से कमरा बुक करने और मदद बुलाने तक।',
  },
  journey: {
    kicker: 'यात्रा',
    title: 'पूरे ब्रज की एक राह',
    sub: 'दस ऐप बदले बिना पवित्र नगरों में योजना बनाइए, घूमिए और दर्शन कीजिए।',
    stops: [
      { name: 'मथुरा', note: 'श्री कृष्ण जन्मभूमि और विश्राम घाट' },
      { name: 'वृन्दावन', note: 'बांके बिहारी, इस्कॉन, प्रेम मंदिर, केशी घाट' },
      { name: 'गोवर्धन', note: '21 किमी परिक्रमा, विश्राम स्थल नक्शे पर' },
      { name: 'बरसाना', note: 'राधा रानी मंदिर और लठमार होली' },
      { name: 'नंदगाँव', note: 'पहाड़ी पर नंद भवन' },
      { name: 'गोकुल', note: 'रमण रेती और यमुना घाट' },
    ],
  },
  aarti: {
    kicker: 'दर्शन कभी न छूटें',
    title: 'आरती का समय, जिस पर भरोसा हो',
    sub: 'समय हर मंदिर की सूची से आता है — गर्मी-सर्दी के बदलाव और त्योहारों सहित — और लाइव गिनती चलती है। रिमाइंडर लगाइए, पट खुलने से पहले हम याद दिला देंगे।',
    next: 'अगली आरती',
    startsIn: 'शुरू होने में',
    remind: '30 मिनट पहले याद दिलाएँ',
    reminded: 'रिमाइंडर लग गया',
    sample: 'उदाहरण के लिए नमूना समय-सारणी',
    temples: [
      { temple: 'इस्कॉन कृष्ण बलराम', aarti: 'मंगला आरती', time: '04:30' },
      { temple: 'श्री बांके बिहारी', aarti: 'श्रृंगार आरती', time: '07:45' },
      { temple: 'प्रेम मंदिर', aarti: 'राजभोग आरती', time: '12:00' },
      { temple: 'इस्कॉन कृष्ण बलराम', aarti: 'संध्या आरती', time: '18:30' },
      { temple: 'श्री कृष्ण जन्मभूमि', aarti: 'संध्या आरती', time: '19:00' },
      { temple: 'श्री बांके बिहारी', aarti: 'शयन आरती', time: '21:25' },
    ],
  },
  features: {
    kicker: 'यात्रा की हर ज़रूरत',
    title: 'एक ऐप। राह की हर ज़रूरत।',
    sub: 'तीर्थ नगरों की सच्चाई को ध्यान में रखकर बना: भीड़, गर्मी, कमज़ोर नेटवर्क, परिवार के बुज़ुर्ग और दो भाषाएँ।',
    items: [
      {
        id: 'temples',
        icon: 'temple',
        title: 'मंदिर और दर्शन',
        body: 'हर प्रमुख मंदिर का इतिहास, वेशभूषा, भीड़ और रास्ता।',
        points: ['हिंदी और अंग्रेज़ी', 'नक्शे पर पास के मंदिर', 'त्योहार कैलेंडर'],
      },
      {
        id: 'reminders',
        icon: 'bell',
        title: 'आरती रिमाइंडर',
        body: 'एक बार आरती चुनें; रोज़ शुरू होने से पहले हल्की-सी याद।',
        points: ['लाइव काउंटडाउन', 'मौसम के अनुसार समय', 'जब चाहें बंद करें'],
      },
      {
        id: 'stays',
        icon: 'bed',
        title: 'मंदिर के पास ठहरना',
        body: 'धर्मशालाएँ और होटल — उपलब्ध कमरे और साफ़ रद्दीकरण नियम।',
        points: ['तुरंत पुष्टि', 'मुफ़्त रद्दीकरण अवधि', 'सिर्फ़ सत्यापित समीक्षाएँ'],
      },
      {
        id: 'cabs',
        icon: 'car',
        title: 'कैब और ई-रिक्शा',
        body: 'तय रूट और मीटर किराया पहले से, ड्राइवर की लाइव लोकेशन।',
        points: ['रात का किराया साफ़', 'स्वीकार होते ही ड्राइवर की जानकारी', 'नक्शे पर ट्रैक करें'],
      },
      {
        id: 'food',
        icon: 'thali',
        title: 'सात्विक भोजन',
        body: 'शुद्ध शाकाहारी भोजनालय और थालियाँ, पहले से ऑर्डर करें।',
        points: ['अभी खुला फ़िल्टर', 'बिना प्याज़-लहसुन विकल्प', 'ऐप में भुगतान'],
      },
      {
        id: 'experiences',
        icon: 'boat',
        title: 'अनुभव',
        body: 'यमुना नौका विहार, गाइडेड परिक्रमा और संध्या आरती वॉक।',
        points: ['सीट के हिसाब से स्लॉट', 'स्थानीय गाइड', 'समूह बुकिंग'],
      },
      {
        id: 'guide',
        icon: 'spark',
        title: 'AI ब्रज गाइड',
        body: 'कथाएँ, परंपराएँ, क्या पहनें — कुछ भी पूछिए, स्रोत सहित उत्तर।',
        points: ['हिंदी और हिंग्लिश', 'आरती का समय कभी अनुमान नहीं', 'जाँचने योग्य स्रोत'],
      },
      {
        id: 'planner',
        icon: 'map',
        title: 'यात्रा योजनाकार',
        body: 'असली आरती समय, गर्मी और आपकी गति के हिसाब से दिन-ब-दिन योजना।',
        points: ['बुज़ुर्ग और व्हीलचेयर अनुकूल', 'शेयर करें या PDF लें', 'हर पड़ाव बदलें'],
      },
      {
        id: 'sos',
        icon: 'shield',
        title: 'SOS और सुरक्षा',
        body: 'एक लंबा दबाव — परिवार को SMS, WhatsApp और पुश से आपकी लाइव लोकेशन।',
        points: ['पास का थाना और अस्पताल', 'मेहमान उपयोगकर्ताओं के लिए भी', '2 मिनट में रद्द करें'],
      },
      {
        id: 'reels',
        icon: 'reel',
        title: 'भक्ति रील्स',
        body: 'साथी यात्रियों के आरती, त्योहार और घाटों के छोटे वीडियो।',
        points: ['क्रिएटर्स को फ़ॉलो करें', 'बाद के लिए सेव करें', 'सावधानी से मॉडरेट'],
      },
      {
        id: 'voice',
        icon: 'mic',
        title: 'आवाज़ और फ़ोटो',
        body: 'बोलकर पूछिए, जवाब सुनिए, या कैमरा मंदिर की ओर कीजिए।',
        points: ['हिंदी आवाज़', 'जवाब पढ़कर सुनाए', 'मंदिर पहचानें'],
      },
      {
        id: 'weather',
        icon: 'cloud',
        title: 'मौसम और ट्रेन',
        body: 'गर्मी, कोहरा और बारिश की सलाह, मथुरा जंक्शन की ट्रेनें।',
        points: ['5 दिन का पूर्वानुमान', 'चलने का सही समय', 'IRCTC लिंक'],
      },
    ],
  },
  guide: {
    kicker: 'AI ब्रज गाइड',
    title: 'हर गली जानने वाला गाइड',
    sub: 'स्वीकृत मंदिर ग्रंथों और हमारी लाइव समय-सारणी पर आधारित। स्रोत बताता है, आपकी भाषा में बोलता है और आरती के सवाल मंदिर कैलेंडर से ही हल करता है — अनुमान से नहीं।',
    points: [
      'स्रोत सहित उत्तर',
      'आरती का समय सीधे मंदिर सूची से',
      'हिंदी, अंग्रेज़ी या हिंग्लिश — लिखकर या बोलकर',
    ],
    chat: [
      { from: 'user', text: 'इस्कॉन वृन्दावन में आज संध्या आरती कब है?' },
      {
        from: 'guide',
        text: 'आज संध्या आरती शाम 6:30 बजे है। थोड़ा पहले पहुँचिए — 6 बजे के बाद भीड़ बढ़ती है।',
        source: 'मंदिर की समय-सारणी',
      },
      { from: 'user', text: 'बांके बिहारी दर्शन के लिए क्या पहनें?' },
      {
        from: 'guide',
        text: 'सादे, आरामदायक कपड़े; जूते-चप्पल बाहर रखें। छोटा बैग रखें — दर्शन के समय आँगन में भीड़ होती है। [1]',
        source: '[1] बांके बिहारी — मंदिर गाइड',
      },
    ],
    typing: 'गाइड लिख रहा है',
    placeholder: 'मंदिर, आरती, ठहरने के बारे में पूछें…',
  },
  planner: {
    kicker: 'यात्रा योजनाकार',
    title: 'आपकी यात्रा, कुछ ही पलों में तैयार',
    sub: 'तारीख़, गति और साथ कौन है — बताइए। योजनाकार असली आरती समय के हिसाब से दिन बनाता है, दोपहर की गर्मी में आराम रखता है और पड़ावों के बीच का समय बताता है।',
    day: 'दिन 1 · वृन्दावन',
    items: [
      {
        time: '07:45',
        kind: 'आरती',
        title: 'श्रृंगार आरती — श्री बांके बिहारी',
        note: 'मंदिर की समय-सारणी से',
      },
      {
        time: '09:15',
        kind: 'मंदिर',
        title: 'इस्कॉन कृष्ण बलराम मंदिर',
        note: 'ई-रिक्शा से 12 मिनट',
      },
      { time: '13:00', kind: 'भोजन', title: 'सात्विक थाली', note: '₹250 प्रति व्यक्ति' },
      {
        time: '14:30',
        kind: 'आराम',
        title: 'दोपहर की गर्मी में आराम',
        note: 'गर्मी की चेतावनी: 39°C',
      },
      { time: '18:30', kind: 'आरती', title: 'संध्या आरती — इस्कॉन', note: '6:10 तक पहुँचें' },
    ],
    pdf: 'PDF डाउनलोड',
    share: 'परिवार से शेयर करें',
  },
  safety: {
    kicker: 'सुरक्षा पहले',
    title: 'मदद बस एक लंबे दबाव की दूरी पर',
    sub: 'त्योहारों पर भीड़ बहुत बढ़ जाती है। SOS से परिवार और पास की मदद हमेशा एक टैप पर — कमज़ोर सिग्नल में भी।',
    steps: [
      { title: 'दबाकर रखें', body: '5 सेकंड की गिनती ग़लती से अलर्ट जाने से रोकती है।' },
      {
        title: 'परिवार को सूचना',
        body: 'आपके आपात संपर्कों को लाइव लोकेशन लिंक के साथ SMS, WhatsApp और पुश।',
      },
      {
        title: 'पास में मदद',
        body: 'सबसे पास का थाना और अस्पताल, एक टैप पर कॉल; 112 हमेशा स्क्रीन पर।',
      },
      { title: 'सब ठीक', body: 'ख़ुद को सुरक्षित बताइए, सबको तुरंत सूचना।' },
    ],
    button: 'SOS',
    hint: 'दबाकर रखें',
  },
  reels: {
    kicker: 'भक्ति रील्स',
    title: 'पहुँचने से पहले यात्रा महसूस करें',
    sub: 'आरती, बरसाना की होली, साँझ का नौका विहार — यात्रियों के छोटे वीडियो, ताज़ा और मर्यादित।',
    captions: [
      'केशी घाट पर संध्या आरती',
      'फूलों वाली होली, बांके बिहारी',
      'भोर में गोवर्धन परिक्रमा',
      'लठमार होली, बरसाना',
      'यमुना नौका विहार',
    ],
  },
  stats: [
    { value: 6, suffix: '', label: 'ब्रज के पवित्र नगर' },
    { value: 2, suffix: '', label: 'भाषाएँ, हिंदी और अंग्रेज़ी' },
    { value: 4, suffix: '', label: 'बुकिंग: ठहराव, कैब, भोजन, अनुभव' },
    { value: 24, suffix: '×7', label: 'लाइव लोकेशन के साथ SOS' },
  ],
  partners: {
    kicker: 'पार्टनर्स के लिए',
    title: 'यहाँ आ चुके यात्रियों के साथ बढ़ें',
    sub: 'होटल, धर्मशालाएँ, कैब मालिक, भोजनालय और गाइड — एक बार लिस्ट करें, बुकिंग पाएँ, समय पर भुगतान पाएँ।',
    points: [
      {
        title: 'आसान शुरुआत',
        body: 'KYC और बैंक विवरण एक ही प्रक्रिया में; आपके स्टाफ़ के अलग लॉगिन।',
      },
      {
        title: 'लाइव इन्वेंटरी',
        body: 'कमरों का कैलेंडर, कैब किराया, मेन्यू और स्लॉट तुरंत अपडेट।',
      },
      {
        title: 'पारदर्शी भुगतान',
        body: 'साफ़ कमीशन, GST दिखाया गया, मासिक स्टेटमेंट और तय भुगतान।',
      },
      {
        title: 'असली समीक्षाएँ',
        body: 'सिर्फ़ बुकिंग पूरी करने वाले मेहमान समीक्षा कर सकते हैं — और आप जवाब दे सकते हैं।',
      },
    ],
    cta: 'पार्टनर बनें',
  },
  faq: {
    kicker: 'सवाल',
    title: 'जानने योग्य बातें',
    items: [
      {
        q: 'आरती का समय कहाँ से आता है?',
        a: 'हर मंदिर की प्रकाशित समय-सारणी से — गर्मी-सर्दी के समय और त्योहारों के बदलाव सहित। AI गाइड और योजनाकार भी यही सूची पढ़ते हैं, कभी अनुमान नहीं लगाते।',
      },
      {
        q: 'क्या यह हिंदी में चलता है?',
        a: 'हाँ। पूरा ऐप, सूचनाएँ और AI गाइड हिंदी और अंग्रेज़ी में हैं, और गाइड हिंग्लिश व आवाज़ भी समझता है।',
      },
      {
        q: 'SOS दबाने पर क्या होता है?',
        a: 'छोटी गिनती के बाद आपके आपात संपर्कों को लाइव लोकेशन लिंक के साथ SMS, WhatsApp और ऐप अलर्ट जाता है, और आपको पास का थाना व अस्पताल दिखता है। दो मिनट में रद्द कर सकते हैं।',
      },
      {
        q: 'रिफ़ंड कैसे मिलता है?',
        a: 'हर लिस्टिंग भुगतान से पहले रद्दीकरण नियम दिखाती है। रिफ़ंड उसी भुगतान माध्यम में लौटता है, और ऐप ठीक-ठीक राशि बताता है।',
      },
      {
        q: 'क्या बिना अकाउंट के इस्तेमाल कर सकते हैं?',
        a: 'हाँ — मेहमान के रूप में देखें, गाइड से पूछें और SOS इस्तेमाल करें। बुकिंग के लिए फ़ोन नंबर से साइन इन करें।',
      },
    ],
  },
  download: {
    title: 'तीर्थ नाउ के साथ यात्रा शुरू करें',
    sub: 'ऐप जल्द ही Android और iPhone पर।',
    android: 'Google Play',
    ios: 'App Store',
    soon: 'जल्द आ रहा है',
  },
  footer: {
    tagline: 'ब्रज के हर यात्री का शांत साथी।',
    rights: 'सर्वाधिकार सुरक्षित।',
    made: 'ब्रज में श्रद्धा से बनाया गया।',
  },
};

export const CONTENT: Record<Lang, Content> = { en, hi };
