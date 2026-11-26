/**
 * "About" content for every seeded temple: when it was built, why it is famous, what is
 * special, and roughly how many pilgrims come each year. Visitor numbers are public
 * estimates and must be confirmed by the content team (docs/CLIENT_SETUP_TODO.md).
 */
type Pair = [en: string, hi: string];

export interface TempleFactsSeed {
  built: Pair;
  famous: Pair;
  highlights: Pair[];
  visitors: Pair;
  prohibited?: Pair[];
}

/** Rules that apply at almost every Braj temple. */
export const COMMON_PROHIBITED: Pair[] = [
  ['Leather items (belts, wallets, bags)', 'चमड़े की वस्तुएँ (बेल्ट, पर्स, बैग)'],
  ['Shoes and socks inside the temple', 'मंदिर के अंदर जूते-चप्पल और मोज़े'],
  ['Photography or video in the sanctum', 'गर्भगृह में फोटो या वीडियो'],
  ['Tobacco, alcohol and non-vegetarian food', 'तंबाकू, शराब और मांसाहारी भोजन'],
];

export const TEMPLE_FACTS: Record<string, TempleFactsSeed> = {
  'shri-krishna-janmabhoomi': {
    built: [
      'Present temple complex built 1951–1982; the site has held Krishna temples for over 2,000 years.',
      'वर्तमान मंदिर परिसर 1951–1982 में बना; यहाँ 2,000 से अधिक वर्षों से कृष्ण मंदिर रहे हैं।',
    ],
    famous: [
      'Believed to be the exact prison cell where Shri Krishna was born to Devaki and Vasudev.',
      'माना जाता है कि यही वह कारागार है जहाँ देवकी और वसुदेव के घर श्री कृष्ण का जन्म हुआ।',
    ],
    highlights: [
      ['Garbha Griha — the birth cell of Shri Krishna', 'गर्भगृह — श्री कृष्ण का जन्म स्थान'],
      [
        'Bhagavata Bhavan with murals of Krishna leela',
        'भागवत भवन, कृष्ण लीला के भित्ति चित्रों के साथ',
      ],
      [
        'Midnight Janmashtami celebration watched by lakhs',
        'आधी रात का जन्माष्टमी उत्सव, लाखों भक्त',
      ],
    ],
    visitors: ['About 1 crore pilgrims a year', 'हर साल लगभग 1 करोड़ श्रद्धालु'],
    prohibited: [
      [
        'Mobile phones, cameras and bags (lockers outside)',
        'मोबाइल, कैमरा और बैग (बाहर लॉकर उपलब्ध)',
      ],
      ['Leather items', 'चमड़े की वस्तुएँ'],
      ['Shoes inside the complex', 'परिसर के अंदर जूते-चप्पल'],
      ['Food, tobacco and lighters', 'खाने का सामान, तंबाकू और लाइटर'],
    ],
  },
  'dwarkadhish-temple': {
    built: [
      'Built in 1814 by Seth Gokul Das Parikh, treasurer of the Gwalior state.',
      '1814 में ग्वालियर राज्य के खजांची सेठ गोकुल दास पारिख ने बनवाया।',
    ],
    famous: [
      'Mathura’s main Pushtimarg haveli, loved for its silver and golden jhoolas in Shravan.',
      'मथुरा की प्रमुख पुष्टिमार्गीय हवेली, सावन में चाँदी-सोने के झूलों के लिए प्रसिद्ध।',
    ],
    highlights: [
      ['Rajasthani-style carved haveli architecture', 'राजस्थानी शैली की नक्काशीदार हवेली'],
      ['Jhoola festival through Shravan month', 'पूरे सावन झूला उत्सव'],
      ['A short walk from Vishram Ghat on the Yamuna', 'यमुना के विश्राम घाट से पैदल दूरी'],
    ],
    visitors: ['About 30 lakh pilgrims a year', 'हर साल लगभग 30 लाख श्रद्धालु'],
  },
  'gita-mandir': {
    built: [
      'Built by the Birla family and opened in 1946.',
      'बिड़ला परिवार द्वारा निर्मित, 1946 में खुला।',
    ],
    famous: [
      'The entire Bhagavad Gita is inscribed on its pillars and walls.',
      'इसके स्तंभों और दीवारों पर पूरी भगवद् गीता अंकित है।',
    ],
    highlights: [
      ['Gita Stambh carved with all 700 verses', 'गीता स्तंभ पर सभी 700 श्लोक'],
      [
        'Krishna as Arjuna’s charioteer in the main sanctum',
        'गर्भगृह में अर्जुन के सारथी श्री कृष्ण',
      ],
      ['Peaceful gardens, easy parking', 'शांत बगीचे, आसान पार्किंग'],
    ],
    visitors: ['About 10 lakh visitors a year', 'हर साल लगभग 10 लाख दर्शनार्थी'],
  },
  'bhuteshwar-mahadev': {
    built: [
      'Ancient shrine mentioned in the Puranas; present structure is several centuries old.',
      'पुराणों में वर्णित प्राचीन मंदिर; वर्तमान ढाँचा कई सदियों पुराना।',
    ],
    famous: [
      'Lord Shiva here is the Kshetrapal — guardian of Mathura — and it is also counted a Shaktipeeth.',
      'यहाँ भगवान शिव मथुरा के क्षेत्रपाल हैं, और इसे शक्तिपीठ भी माना जाता है।',
    ],
    highlights: [
      ['Pilgrims begin a Mathura yatra with darshan here', 'मथुरा यात्रा की शुरुआत यहीं दर्शन से'],
      ['Underground shrine of Patal Devi', 'पाताल देवी का भूमिगत मंदिर'],
      ['Grand Mahashivratri and Shravan Mondays', 'भव्य महाशिवरात्रि और सावन के सोमवार'],
    ],
    visitors: ['About 5 lakh pilgrims a year', 'हर साल लगभग 5 लाख श्रद्धालु'],
  },
  'kesava-deo-temple': {
    built: [
      'Present temple built in the 20th century; the Keshav Dev deity has a recorded history of many centuries.',
      'वर्तमान मंदिर 20वीं सदी में बना; केशव देव विग्रह का इतिहास कई सदियों पुराना है।',
    ],
    famous: [
      'Stands beside the Janmabhoomi; Keshav Dev is worshipped as the presiding deity of Mathura.',
      'जन्मभूमि के पास स्थित; केशव देव को मथुरा के प्रधान देवता के रूप में पूजा जाता है।',
    ],
    highlights: [
      ['Part of the Janmabhoomi darshan circuit', 'जन्मभूमि दर्शन परिक्रमा का हिस्सा'],
      ['Quiet darshan away from big crowds', 'भीड़ से दूर शांत दर्शन'],
      ['Annakut celebrated after Diwali', 'दीपावली के बाद अन्नकूट उत्सव'],
    ],
    visitors: ['About 20 lakh pilgrims a year', 'हर साल लगभग 20 लाख श्रद्धालु'],
  },
  'banke-bihari': {
    built: [
      'Present temple built in 1864; the deity was revealed by Swami Haridas at Nidhivan in the 16th century.',
      'वर्तमान मंदिर 1864 में बना; 16वीं सदी में स्वामी हरिदास जी ने निधिवन में ठाकुर जी को प्रकट किया।',
    ],
    famous: [
      'Thakur ji’s gaze is said to be so captivating that the curtain is drawn every few minutes.',
      'ठाकुर जी की दृष्टि इतनी मोहक मानी जाती है कि हर कुछ मिनट में पर्दा डाला जाता है।',
    ],
    highlights: [
      [
        'No bells or conch — Thakur ji is served like a child',
        'घंटी-शंख नहीं — ठाकुर जी की बाल सेवा',
      ],
      ['Mangla aarti only once a year, on Janmashtami', 'मंगला आरती साल में एक बार, जन्माष्टमी पर'],
      ['Charan darshan only on Akshaya Tritiya', 'चरण दर्शन केवल अक्षय तृतीया पर'],
    ],
    visitors: [
      'Over 1.5 crore pilgrims a year; 50,000+ on a normal day',
      'हर साल 1.5 करोड़ से अधिक; सामान्य दिन में 50,000+',
    ],
    prohibited: [
      ['Leather items', 'चमड़े की वस्तुएँ'],
      [
        'Shoes in the lanes near the gate (shoe stands outside)',
        'द्वार के पास जूते (बाहर जूता घर)',
      ],
      ['Photography and video inside', 'अंदर फोटो और वीडियो'],
      ['Large bags; keep children close in the crowd', 'बड़े बैग; भीड़ में बच्चों को पास रखें'],
    ],
  },
  'iskcon-krishna-balaram-mandir': {
    built: [
      'Opened in 1975 by A.C. Bhaktivedanta Swami Prabhupada.',
      '1975 में श्रील प्रभुपाद (ए.सी. भक्तिवेदांत स्वामी) ने खोला।',
    ],
    famous: [
      'ISKCON’s first temple in India; kirtan of the Hare Krishna mahamantra runs all day.',
      'भारत में इस्कॉन का पहला मंदिर; पूरे दिन हरे कृष्ण महामंत्र कीर्तन।',
    ],
    highlights: [
      ['Samadhi of Srila Prabhupada in white marble', 'सफ़ेद संगमरमर में श्रील प्रभुपाद की समाधि'],
      [
        'Three altars: Krishna-Balaram, Radha-Shyamasundar, Gaura-Nitai',
        'तीन वेदियाँ: कृष्ण-बलराम, राधा-श्यामसुंदर, गौर-निताई',
      ],
      ['Clean prasad hall and guesthouse', 'साफ़ प्रसाद हॉल और अतिथि भवन'],
    ],
    visitors: ['About 50 lakh visitors a year', 'हर साल लगभग 50 लाख दर्शनार्थी'],
  },
  'prem-mandir': {
    built: [
      'Built 2001–2012 by Jagadguru Kripalu Parishat; inaugurated in February 2012.',
      '2001–2012 में जगद्गुरु कृपालु परिषद ने बनवाया; फरवरी 2012 में उद्घाटन।',
    ],
    famous: [
      'A white Italian-marble temple that glows in changing colours every evening.',
      'सफ़ेद इतालवी संगमरमर का मंदिर, जो हर शाम रंग बदलती रोशनी में चमकता है।',
    ],
    highlights: [
      ['Evening light and musical fountain show', 'शाम का लाइट और म्यूज़िकल फव्वारा शो'],
      [
        'Life-size tableaux of Govardhan leela and Raas leela',
        'गोवर्धन लीला और रास लीला की आदमकद झाँकियाँ',
      ],
      ['Spread over 54 acres with wide gardens', '54 एकड़ में फैले बगीचे'],
    ],
    visitors: ['About 80 lakh visitors a year', 'हर साल लगभग 80 लाख दर्शनार्थी'],
  },
  'radha-raman-temple': {
    built: [
      'Founded in 1542 by Gopal Bhatt Goswami; the present temple dates to 1826.',
      '1542 में गोपाल भट्ट गोस्वामी द्वारा स्थापित; वर्तमान मंदिर 1826 का।',
    ],
    famous: [
      'The deity self-manifested from a shaligram shila and has been served for nearly 500 years.',
      'ठाकुर जी शालिग्राम शिला से स्वयं प्रकट हुए और लगभग 500 वर्षों से सेवित हैं।',
    ],
    highlights: [
      [
        'One of the seven main Goswami temples of Vrindavan',
        'वृंदावन के सात प्रमुख गोस्वामी मंदिरों में से एक',
      ],
      [
        'Kitchen fire said to be burning since 1542',
        'रसोई की अग्नि 1542 से प्रज्वलित मानी जाती है',
      ],
      ['Grand Radha Raman prakatya utsav in Vaishakh', 'वैशाख में भव्य राधा रमण प्राकट्य उत्सव'],
    ],
    visitors: ['About 20 lakh pilgrims a year', 'हर साल लगभग 20 लाख श्रद्धालु'],
  },
  'radha-vallabh-temple': {
    built: [
      'Founded by Shri Hit Harivansh Mahaprabhu in 1535; the old red-sandstone temple is from 1585.',
      '1535 में श्री हित हरिवंश महाप्रभु द्वारा स्थापित; पुराना लाल पत्थर का मंदिर 1585 का।',
    ],
    famous: [
      'Radha Rani is present as a crown beside Krishna — the heart of the Radha Vallabh sampradaya.',
      'राधा रानी यहाँ कृष्ण के पास मुकुट रूप में विराजती हैं — राधावल्लभ संप्रदाय का केंद्र।',
    ],
    highlights: [
      ['Samaj gayan — devotional singing at every aarti', 'हर आरती पर समाज गायन'],
      ['Rare Mughal-era temple architecture', 'मुग़लकालीन दुर्लभ मंदिर स्थापत्य'],
      ['Khichdi utsav in winter', 'सर्दियों में खिचड़ी उत्सव'],
    ],
    visitors: ['About 15 lakh pilgrims a year', 'हर साल लगभग 15 लाख श्रद्धालु'],
  },
  'daan-ghati-temple': {
    built: [
      'Centuries-old shrine at the start of the Govardhan parikrama; rebuilt in the modern era.',
      'गोवर्धन परिक्रमा के आरंभ में सदियों पुराना मंदिर; आधुनिक काल में पुनर्निर्मित।',
    ],
    famous: [
      'Pilgrims begin and end the 21 km Govardhan parikrama here after offering milk to Giriraj ji.',
      'श्रद्धालु गिरिराज जी को दूध अर्पित कर यहीं से 21 किमी गोवर्धन परिक्रमा शुरू और पूरी करते हैं।',
    ],
    highlights: [
      ['Dugdh abhishek of Giriraj shila', 'गिरिराज शिला का दुग्ध अभिषेक'],
      ['Where Krishna collected “daan” (toll) from the gopis', 'जहाँ कृष्ण ने गोपियों से दान लिया'],
      ['Huge crowds on Guru Purnima (Mudiya Purnima)', 'गुरु पूर्णिमा (मुड़िया पूनो) पर भारी भीड़'],
    ],
    visitors: ['About 1 crore parikrama pilgrims a year', 'हर साल लगभग 1 करोड़ परिक्रमार्थी'],
  },
  'mukharvind-jatipura': {
    built: [
      'Revered since the 15th century, when Shri Vallabhacharya established seva of Shrinathji here.',
      '15वीं सदी से पूजित, जब श्री वल्लभाचार्य ने यहाँ श्रीनाथजी की सेवा स्थापित की।',
    ],
    famous: [
      'The “mukharvind” (face) of Giriraj ji, where Shrinathji first appeared from Govardhan hill.',
      'गिरिराज जी का मुखारविंद, जहाँ श्रीनाथजी गोवर्धन पर्वत से पहली बार प्रकट हुए।',
    ],
    highlights: [
      ['Chappan bhog offered on special days', 'विशेष दिनों पर छप्पन भोग'],
      ['Important stop on the Govardhan parikrama', 'गोवर्धन परिक्रमा का महत्वपूर्ण पड़ाव'],
      ['Annakut after Diwali', 'दीपावली के बाद अन्नकूट'],
    ],
    visitors: ['About 50 lakh pilgrims a year', 'हर साल लगभग 50 लाख श्रद्धालु'],
  },
  'haridev-ji-temple': {
    built: [
      'Built in the 16th century by Raja Bhagwan Das of Amber in red sandstone.',
      '16वीं सदी में आमेर के राजा भगवान दास ने लाल पत्थर से बनवाया।',
    ],
    famous: [
      'The presiding deity of Govardhan town, beside the sacred Manasi Ganga lake.',
      'मानसी गंगा के तट पर स्थित, गोवर्धन नगर के प्रधान देवता।',
    ],
    highlights: [
      ['Grand Mughal-era sandstone architecture', 'मुग़लकालीन भव्य बलुआ पत्थर स्थापत्य'],
      [
        'Deity installed by Vajranabh, Krishna’s great-grandson (tradition)',
        'परंपरा अनुसार कृष्ण के प्रपौत्र वज्रनाभ द्वारा स्थापित',
      ],
      ['Diwali deepdan at Manasi Ganga', 'मानसी गंगा पर दीपावली दीपदान'],
    ],
    visitors: ['About 20 lakh pilgrims a year', 'हर साल लगभग 20 लाख श्रद्धालु'],
  },
  'radha-kund': {
    built: [
      'Sacred since Krishna’s time; the stone ghats were built in the 16th–18th centuries.',
      'कृष्ण काल से पवित्र; पत्थर के घाट 16वीं–18वीं सदी में बने।',
    ],
    famous: [
      'Considered the holiest place in Braj for devotees of Radha; created by Shri Radha herself.',
      'राधा भक्तों के लिए ब्रज का सबसे पवित्र स्थान; स्वयं श्री राधा द्वारा प्रकट।',
    ],
    highlights: [
      [
        'Midnight holy dip on Ahoi Ashtami (Bahulashtami)',
        'अहोई अष्टमी की आधी रात का पवित्र स्नान',
      ],
      ['Shyam Kund right beside it', 'साथ ही श्याम कुंड'],
      [
        'Bhajan kutirs of the Goswamis around the kund',
        'कुंड के चारों ओर गोस्वामियों की भजन कुटियाँ',
      ],
    ],
    visitors: ['About 30 lakh pilgrims a year', 'हर साल लगभग 30 लाख श्रद्धालु'],
    prohibited: [
      ['Soap or shampoo in the kund', 'कुंड में साबुन या शैम्पू'],
      ['Leather items and shoes at the ghats', 'घाट पर चमड़े की वस्तुएँ और जूते'],
      ['Throwing plastic or flowers in the water', 'पानी में प्लास्टिक या फूल डालना'],
    ],
  },
  'chakleshwar-mahadev': {
    built: [
      'An ancient Shiva shrine; tradition says Krishna himself prayed here.',
      'प्राचीन शिव मंदिर; परंपरा अनुसार स्वयं कृष्ण ने यहाँ पूजा की।',
    ],
    famous: [
      'Shiva is worshipped as the protector of Govardhan, on the bank of Manasi Ganga.',
      'मानसी गंगा के तट पर, शिव गोवर्धन के रक्षक रूप में पूजित।',
    ],
    highlights: [
      ['Five Shivlingas in one sanctum', 'एक गर्भगृह में पाँच शिवलिंग'],
      ['Close to Sanatan Goswami’s bhajan kutir', 'सनातन गोस्वामी की भजन कुटी के पास'],
      ['Shravan Mondays and Mahashivratri', 'सावन सोमवार और महाशिवरात्रि'],
    ],
    visitors: ['About 5 lakh pilgrims a year', 'हर साल लगभग 5 लाख श्रद्धालु'],
  },
  'shriji-temple': {
    built: [
      'Built in 1675 by Raja Bir Singh Deo of Orchha on Bhanugarh hill.',
      '1675 में ओरछा के राजा बीर सिंह देव ने भानुगढ़ पहाड़ी पर बनवाया।',
    ],
    famous: [
      'The palace-temple of Shri Radha Rani in her home town, Barsana, and the heart of Lathmar Holi.',
      'श्री राधा रानी के गाँव बरसाना में उनका महल-मंदिर, और लट्ठमार होली का केंद्र।',
    ],
    highlights: [
      ['About 200 steps up to the hilltop', 'पहाड़ी तक लगभग 200 सीढ़ियाँ'],
      ['Lathmar Holi and Radhashtami festivals', 'लट्ठमार होली और राधाष्टमी उत्सव'],
      [
        'Red-sandstone and marble palace with panoramic views',
        'लाल पत्थर और संगमरमर का महल, सुंदर दृश्य',
      ],
    ],
    visitors: ['About 50 lakh pilgrims a year', 'हर साल लगभग 50 लाख श्रद्धालु'],
  },
  'kirti-mandir': {
    built: [
      'Built by Jagadguru Kripalu Parishat and inaugurated in 2019.',
      'जगद्गुरु कृपालु परिषद द्वारा निर्मित, 2019 में उद्घाटन।',
    ],
    famous: [
      'The only temple dedicated to Kirti Maiya, mother of Shri Radha, holding baby Radha in her lap.',
      'श्री राधा की माता कीर्ति मैया को समर्पित एकमात्र मंदिर, गोद में बाल राधा।',
    ],
    highlights: [
      ['Carved marble and pink stone architecture', 'नक्काशीदार संगमरमर और गुलाबी पत्थर'],
      ['Leela tableaux of Radha’s childhood', 'राधा जी की बाल लीला झाँकियाँ'],
      ['Clean, spacious and less crowded', 'साफ़, खुला और कम भीड़'],
    ],
    visitors: ['About 10 lakh visitors a year', 'हर साल लगभग 10 लाख दर्शनार्थी'],
  },
  'rangili-mahal': {
    built: [
      'Ashram of Jagadguru Kripalu Ji Maharaj, developed from the 1990s.',
      'जगद्गुरु कृपालु जी महाराज का आश्रम, 1990 के दशक से विकसित।',
    ],
    famous: [
      'A peaceful ashram temple at the foot of the Barsana hills known for satsang and kirtan.',
      'बरसाना पहाड़ियों की तलहटी में शांत आश्रम मंदिर, सत्संग और कीर्तन के लिए प्रसिद्ध।',
    ],
    highlights: [
      ['Daily kirtan and pravachan', 'दैनिक कीर्तन और प्रवचन'],
      ['Gardens and deity of Radha Krishna', 'बगीचे और राधा कृष्ण विग्रह'],
      ['Charity programmes for local families', 'स्थानीय परिवारों के लिए सेवा कार्यक्रम'],
    ],
    visitors: ['About 3 lakh visitors a year', 'हर साल लगभग 3 लाख दर्शनार्थी'],
  },
  'maan-mandir': {
    built: [
      'Ancient leela sthal on Brahmachal hill; restored as an ashram by Shri Ramesh Baba from 1950s.',
      'ब्रह्मांचल पहाड़ी पर प्राचीन लीला स्थल; 1950 के दशक से श्री रमेश बाबा द्वारा आश्रम रूप में संरक्षित।',
    ],
    famous: [
      'The place of Radha’s maan leela, where Krishna pleaded with her to give up her sulk.',
      'राधा जी की मान लीला का स्थान, जहाँ कृष्ण ने उन्हें मनाया।',
    ],
    highlights: [
      ['Hilltop views over Barsana', 'बरसाना का पहाड़ी दृश्य'],
      ['Large gaushala run by the ashram', 'आश्रम द्वारा चलाई जाने वाली बड़ी गौशाला'],
      ['Daily satsang and Braj parikrama camps', 'दैनिक सत्संग और ब्रज परिक्रमा शिविर'],
    ],
    visitors: ['About 5 lakh visitors a year', 'हर साल लगभग 5 लाख दर्शनार्थी'],
  },
  'mor-kuti': {
    built: [
      'Small leela shrine on the Barsana hills, cared for by local sadhus for generations.',
      'बरसाना पहाड़ियों पर छोटा लीला स्थल, पीढ़ियों से स्थानीय साधुओं द्वारा सेवित।',
    ],
    famous: [
      'Where Krishna danced as a peacock to please Radha — peacocks still gather here.',
      'जहाँ कृष्ण ने राधा को प्रसन्न करने के लिए मोर बनकर नृत्य किया — आज भी यहाँ मोर आते हैं।',
    ],
    highlights: [
      ['Peacocks fed by pilgrims every morning', 'हर सुबह भक्त मोरों को दाना डालते हैं'],
      [
        'Quiet hill walk between Shriji and Maan Mandir',
        'श्रीजी और मान मंदिर के बीच शांत पहाड़ी मार्ग',
      ],
      ['Beautiful at sunrise', 'सूर्योदय पर बहुत सुंदर'],
    ],
    visitors: ['About 2 lakh visitors a year', 'हर साल लगभग 2 लाख दर्शनार्थी'],
  },
  'gokulnath-ji-temple': {
    built: [
      'Pushtimarg haveli founded in the 16th century by the descendants of Shri Vallabhacharya.',
      '16वीं सदी में श्री वल्लभाचार्य के वंशजों द्वारा स्थापित पुष्टिमार्गीय हवेली।',
    ],
    famous: [
      'The main haveli of Gokul, where Krishna spent his childhood with Nand and Yashoda.',
      'गोकुल की प्रमुख हवेली, जहाँ कृष्ण ने नंद-यशोदा के साथ बचपन बिताया।',
    ],
    highlights: [
      [
        'Pushtimarg darshan with seasonal shringar',
        'मौसम के अनुसार श्रृंगार के साथ पुष्टिमार्गीय दर्शन',
      ],
      ['Nand Utsav the day after Janmashtami', 'जन्माष्टमी के अगले दिन नंद उत्सव'],
      ['Near the Yamuna ghats of Gokul', 'गोकुल के यमुना घाटों के पास'],
    ],
    visitors: ['About 10 lakh pilgrims a year', 'हर साल लगभग 10 लाख श्रद्धालु'],
  },
  'nand-bhavan-gokul': {
    built: [
      'Ancient hall at Mahavan; the 84 carved pillars are traditionally linked to Nand Baba’s home.',
      'महावन का प्राचीन भवन; 84 नक्काशीदार खंभे परंपरा से नंद बाबा के घर से जुड़े हैं।',
    ],
    famous: [
      'Known as Chaurasi Khamba — believed to be where baby Krishna and Balaram were raised.',
      'चौरासी खंभा के नाम से प्रसिद्ध — जहाँ बाल कृष्ण और बलराम पले-बढ़े।',
    ],
    highlights: [
      ['84 pillars, each said to be different', '84 खंभे, हर एक अलग'],
      ['Cradle (palna) darshan of baby Krishna', 'बाल कृष्ण का पालना दर्शन'],
      ['Putana vadh and Trinavarta leela sites nearby', 'पास में पूतना वध और तृणावर्त लीला स्थल'],
    ],
    visitors: ['About 8 lakh pilgrims a year', 'हर साल लगभग 8 लाख श्रद्धालु'],
  },
  'raman-bihari-ji': {
    built: [
      'Ashram temple at Raman Reti established in the early 20th century.',
      '20वीं सदी की शुरुआत में स्थापित रमण रेती का आश्रम मंदिर।',
    ],
    famous: [
      'Pilgrims roll in the soft sand where little Krishna and Balaram played.',
      'भक्त उस कोमल रेत में लोटते हैं जहाँ बाल कृष्ण और बलराम खेलते थे।',
    ],
    highlights: [
      ['Holy sand of Raman Reti', 'रमण रेती की पवित्र रज'],
      ['Deer park and peacocks in the ashram', 'आश्रम में हिरण पार्क और मोर'],
      ['Peaceful riverside setting', 'नदी किनारे शांत वातावरण'],
    ],
    visitors: ['About 5 lakh pilgrims a year', 'हर साल लगभग 5 लाख श्रद्धालु'],
  },
  'brahmand-bihari': {
    built: [
      'Ancient ghat shrine on the Yamuna at Mahavan; present temple is a few centuries old.',
      'महावन में यमुना पर प्राचीन घाट मंदिर; वर्तमान मंदिर कुछ सदियों पुराना।',
    ],
    famous: [
      'Where Yashoda looked into baby Krishna’s mouth and saw the whole universe.',
      'जहाँ यशोदा ने बाल कृष्ण के मुख में पूरा ब्रह्मांड देखा।',
    ],
    highlights: [
      [
        'Pilgrims taste the ghat’s clay as prasad (tradition)',
        'परंपरा अनुसार भक्त घाट की मिट्टी को प्रसाद मानते हैं',
      ],
      ['Quiet Yamuna ghat for aachman', 'आचमन के लिए शांत यमुना घाट'],
      ['Easy stop on the Gokul–Mahavan route', 'गोकुल–महावन मार्ग पर आसान पड़ाव'],
    ],
    visitors: ['About 3 lakh pilgrims a year', 'हर साल लगभग 3 लाख श्रद्धालु'],
  },
  'thakurani-ghat': {
    built: [
      'Sacred to Pushtimarg since 1494, when Shri Vallabhacharya came to Gokul.',
      '1494 से पुष्टिमार्ग के लिए पवित्र, जब श्री वल्लभाचार्य गोकुल आए।',
    ],
    famous: [
      'Shri Vallabhacharya received the Brahma Sambandha mantra from Krishna here.',
      'यहीं श्री वल्लभाचार्य को कृष्ण से ब्रह्म संबंध मंत्र प्राप्त हुआ।',
    ],
    highlights: [
      ['Yamuna snan and deepdan', 'यमुना स्नान और दीपदान'],
      ['Baithak of Shri Vallabhacharya', 'श्री वल्लभाचार्य की बैठक'],
      ['Evening Yamuna aarti', 'शाम की यमुना आरती'],
    ],
    visitors: ['About 3 lakh pilgrims a year', 'हर साल लगभग 3 लाख श्रद्धालु'],
  },
  'nand-bhawan-nandgaon': {
    built: [
      'Present hilltop temple built in the 18th century by Raja Roop Singh of Bharatpur.',
      'वर्तमान पहाड़ी मंदिर 18वीं सदी में भरतपुर के राजा रूप सिंह ने बनवाया।',
    ],
    famous: [
      'Home of Nand Baba and Yashoda where Krishna grew up; the men of Nandgaon play Lathmar Holi in Barsana.',
      'नंद बाबा और यशोदा का घर जहाँ कृष्ण बड़े हुए; नंदगाँव के हुरियारे बरसाना में लट्ठमार होली खेलते हैं।',
    ],
    highlights: [
      [
        'Whole family darshan: Nand, Yashoda, Krishna, Balaram',
        'पूरे परिवार के दर्शन: नंद, यशोदा, कृष्ण, बलराम',
      ],
      ['Nandgaon Lathmar Holi the day after Barsana', 'बरसाना के अगले दिन नंदगाँव की लट्ठमार होली'],
      ['Views of Barsana from Nandishwar hill', 'नंदीश्वर पहाड़ी से बरसाना का दृश्य'],
    ],
    visitors: ['About 20 lakh pilgrims a year', 'हर साल लगभग 20 लाख श्रद्धालु'],
  },
  'pan-sarovar': {
    built: [
      'Ancient sarovar; stone ghats added by Braj kings in later centuries.',
      'प्राचीन सरोवर; बाद की सदियों में ब्रज के राजाओं ने पत्थर के घाट बनवाए।',
    ],
    famous: [
      'Where Krishna brought the cows of Nandgaon to drink water after grazing.',
      'जहाँ कृष्ण चराने के बाद नंदगाँव की गायों को पानी पिलाने लाते थे।',
    ],
    highlights: [
      ['Peaceful ghats under old trees', 'पुराने पेड़ों के नीचे शांत घाट'],
      ['Stop on the Nandgaon parikrama', 'नंदगाँव परिक्रमा का पड़ाव'],
      ['Good spot for quiet japa', 'शांत जप के लिए अच्छा स्थान'],
    ],
    visitors: ['About 1 lakh pilgrims a year', 'हर साल लगभग 1 लाख श्रद्धालु'],
  },
  'yashoda-kund': {
    built: [
      'Ancient kund of Nandgaon; the small shrine on its bank was built in the last few centuries.',
      'नंदगाँव का प्राचीन कुंड; किनारे का छोटा मंदिर पिछली कुछ सदियों में बना।',
    ],
    famous: [
      'Yashoda Maiya is said to have bathed here and played with little Krishna on its bank.',
      'माना जाता है कि यशोदा मैया यहाँ स्नान करती थीं और किनारे पर बाल कृष्ण के साथ खेलती थीं।',
    ],
    highlights: [
      ['Shrine of Yashoda with baby Krishna', 'बाल कृष्ण के साथ यशोदा मैया का मंदिर'],
      ['Nrisingh shrine nearby', 'पास में नृसिंह मंदिर'],
      ['Calm, uncrowded kund', 'शांत, भीड़-रहित कुंड'],
    ],
    visitors: ['About 1 lakh pilgrims a year', 'हर साल लगभग 1 लाख श्रद्धालु'],
  },
  'ter-kadamb': {
    built: [
      'Natural kadamb grove revered for centuries; Rupa Goswami did bhajan here in the 16th century.',
      'सदियों से पूजित कदंब वन; 16वीं सदी में रूप गोस्वामी ने यहाँ भजन किया।',
    ],
    famous: [
      'Krishna climbed a kadamb tree here and called (“ter”) his cows with his flute.',
      'कृष्ण यहाँ कदंब के पेड़ पर चढ़कर बाँसुरी से अपनी गायों को टेरते (पुकारते) थे।',
    ],
    highlights: [
      ['Bhajan kutir of Shri Rupa Goswami', 'श्री रूप गोस्वामी की भजन कुटी'],
      ['Shaded grove ideal for meditation', 'ध्यान के लिए छायादार वन'],
      ['Stop on the Nandgaon parikrama', 'नंदगाँव परिक्रमा का पड़ाव'],
    ],
    visitors: ['About 1 lakh pilgrims a year', 'हर साल लगभग 1 लाख श्रद्धालु'],
  },
  'narsingh-ji-mandir-nandgaon': {
    built: [
      'Small hill shrine of Nandgaon, served by local families for generations.',
      'नंदगाँव पहाड़ी का छोटा मंदिर, पीढ़ियों से स्थानीय परिवारों द्वारा सेवित।',
    ],
    famous: [
      'Lord Narsingh is worshipped as the protector of Nandgaon village.',
      'भगवान नृसिंह नंदगाँव गाँव के रक्षक रूप में पूजित।',
    ],
    highlights: [
      ['Narsingh Jayanti celebrations', 'नृसिंह जयंती उत्सव'],
      ['Close to Nand Bhawan', 'नंद भवन के पास'],
      ['Short, easy climb', 'छोटी, आसान चढ़ाई'],
    ],
    visitors: ['About 50,000 pilgrims a year', 'हर साल लगभग 50,000 श्रद्धालु'],
  },
};
