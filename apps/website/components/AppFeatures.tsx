'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { Lang } from '@/lib/content';
import { APK_URL } from '@/lib/download';
import { Reveal, SectionHead } from './motion';

type Tr = { en: string; hi: string };

interface AppFeature {
  id: string;
  group: 'darshan' | 'plan' | 'family' | 'book' | 'community';
  icon: string;
  title: Tr;
  text: Tr;
  points: Tr[];
  shot: string;
  /** Where to try it on the website, if it also lives here. */
  web?: string;
}

/** Every feature of the TirthNow app, with a real screen from the app. */
const FEATURES: AppFeature[] = [
  {
    id: 'crowd',
    group: 'darshan',
    icon: '👥',
    title: { en: 'Live crowd & aarti at a glance', hi: 'लाइव भीड़ और आरती एक नज़र में' },
    text: {
      en: 'Home shows how busy the temples are, the next aarti and your trip status in one row.',
      hi: 'होम पर मंदिरों की भीड़, अगली आरती और आपकी यात्रा की स्थिति एक साथ।',
    },
    points: [
      { en: 'Crowd level per temple', hi: 'हर मंदिर की भीड़' },
      { en: 'Pilgrims around you', hi: 'आसपास के यात्री' },
      { en: 'Trip in progress card', hi: 'जारी यात्रा का कार्ड' },
    ],
    shot: 'home-cards',
  },
  {
    id: 'aarti',
    group: 'darshan',
    icon: '🪔',
    title: { en: 'Aarti with lyrics & audio', hi: 'बोल और ऑडियो के साथ आरती' },
    text: {
      en: 'Read the complete aarti of each temple and listen along. Aarti times come only from the temple schedule.',
      hi: 'हर मंदिर की पूरी आरती पढ़ें और साथ में सुनें। आरती का समय केवल मंदिर की सूची से।',
    },
    points: [
      { en: 'Play, pause, replay, repeat', hi: 'चलाएँ, रोकें, दोहराएँ' },
      { en: 'Large readable Hindi text', hi: 'बड़े अक्षरों में हिंदी' },
      { en: 'Aarti reminders', hi: 'आरती रिमाइंडर' },
    ],
    shot: 'aarti',
  },
  {
    id: 'temples',
    group: 'darshan',
    icon: '🛕',
    title: { en: '30 temples across Braj', hi: 'पूरे ब्रज के 30 मंदिर' },
    text: {
      en: 'Temple pages with live countdown to the next aarti, crowd, directions, reviews and dress tips.',
      hi: 'अगली आरती की उलटी गिनती, भीड़, रास्ता, समीक्षाएँ और पहनावे के सुझाव।',
    },
    points: [
      { en: 'Vrindavan, Mathura, Govardhan…', hi: 'वृंदावन, मथुरा, गोवर्धन…' },
      { en: 'Directions & share', hi: 'रास्ता और शेयर' },
    ],
    shot: 'temple',
  },
  {
    id: 'pooja',
    group: 'darshan',
    icon: '🌼',
    title: { en: 'Pooja items', hi: 'पूजा सामग्री' },
    text: {
      en: 'Thali, diya, agarbatti, garlands, prasad, tilak, tulsi mala and Laddu Gopal poshak, by ritual.',
      hi: 'थाली, दीया, अगरबत्ती, माला, प्रसाद, तिलक, तुलसी माला और लड्डू गोपाल पोशाक।',
    },
    points: [{ en: 'Browse by category', hi: 'श्रेणी के अनुसार' }],
    shot: 'pooja',
  },
  {
    id: 'guide',
    group: 'plan',
    icon: '🎙️',
    title: { en: 'AI Braj Guide with voice', hi: 'आवाज़ वाला AI ब्रज गाइड' },
    text: {
      en: 'Ask by voice or text in Hindi or English and hear the answer spoken back. Scan a temple with your camera.',
      hi: 'हिंदी या अंग्रेज़ी में बोलकर या लिखकर पूछें और उत्तर सुनें। कैमरे से मंदिर पहचानें।',
    },
    points: [
      { en: 'Spoken replies & translation', hi: 'बोलकर उत्तर और अनुवाद' },
      { en: 'Temple photo recognition', hi: 'फ़ोटो से मंदिर पहचान' },
    ],
    shot: 'guide',
  },
  {
    id: 'planner',
    group: 'plan',
    icon: '🗺️',
    title: { en: 'Group trip planner + PDF', hi: 'समूह यात्रा योजना + PDF' },
    text: {
      en: 'Plan for yourself, your family or a whole group: members, stay, train or bus, then an AI or custom day-by-day plan.',
      hi: 'अपने, परिवार या पूरे समूह के लिए: सदस्य, ठहरना, ट्रेन या बस, फिर AI या अपनी योजना।',
    },
    points: [
      { en: 'Built around real aarti times', hi: 'असली आरती समय के अनुसार' },
      { en: 'Branded PDF to download', hi: 'डाउनलोड करने योग्य PDF' },
    ],
    shot: 'planner',
  },
  {
    id: 'journey',
    group: 'plan',
    icon: '🛺',
    title: { en: 'Yatra Journey', hi: 'यात्रा जर्नी' },
    text: {
      en: 'Ride a Vrindavan, Mathura or Govardhan yatra stop by stop with a voice guide, fares and darshan tips.',
      hi: 'वृंदावन, मथुरा या गोवर्धन यात्रा पड़ाव-दर-पड़ाव, वॉइस गाइड, किराया और सुझावों के साथ।',
    },
    points: [
      { en: 'E-rickshaw, auto, cab or on foot', hi: 'ई-रिक्शा, ऑटो, कैब या पैदल' },
      { en: 'Hindi & English narration', hi: 'हिंदी और अंग्रेज़ी में' },
    ],
    shot: 'journey',
    web: '/journey/',
  },
  {
    id: 'trips',
    group: 'family',
    icon: '🧭',
    title: { en: 'Trip start & end updates', hi: 'यात्रा शुरू और पूरी होने की सूचना' },
    text: {
      en: '“Your TirthNow pilgrimage has started. We wish you a safe and blessed journey!” Every trip is kept in your history.',
      hi: '“आपकी TirthNow तीर्थयात्रा शुरू हो गई है। आपकी यात्रा सुरक्षित और मंगलमय हो!” हर यात्रा इतिहास में।',
    },
    points: [
      { en: 'Notifications to you and family', hi: 'आपको और परिवार को सूचना' },
      { en: 'Trip history', hi: 'यात्रा इतिहास' },
    ],
    shot: 'trips',
  },
  {
    id: 'family',
    group: 'family',
    icon: '👨‍👩‍👧',
    title: { en: 'Family live location', hi: 'परिवार के साथ लाइव लोकेशन' },
    text: {
      en: 'Family at home can follow your trip on a map — only if you invite them and turn sharing on. Stop any time.',
      hi: 'घर पर परिवार नक्शे पर आपकी यात्रा देख सकता है — केवल आपकी अनुमति से। कभी भी बंद करें।',
    },
    points: [
      { en: 'Join with a family code', hi: 'परिवार कोड से जुड़ें' },
      { en: 'Start, pause, stop sharing', hi: 'शेयर शुरू, रोकें, बंद करें' },
    ],
    shot: 'family',
  },
  {
    id: 'whatsapp',
    group: 'family',
    icon: '💬',
    title: { en: 'Share on WhatsApp', hi: 'व्हाट्सऐप पर शेयर' },
    text: {
      en: 'Send your trip and a secure tracking link to family on WhatsApp in one tap.',
      hi: 'एक टैप में परिवार को व्हाट्सऐप पर अपनी यात्रा और सुरक्षित ट्रैकिंग लिंक भेजें।',
    },
    points: [{ en: 'Link stops when the trip ends', hi: 'यात्रा पूरी होते ही लिंक बंद' }],
    shot: 'notification',
  },
  {
    id: 'sos',
    group: 'family',
    icon: '🆘',
    title: { en: 'SOS safety', hi: 'SOS सुरक्षा' },
    text: {
      en: 'Press and hold to alert your emergency contacts with your live location. Helplines and the nearest police and hospital.',
      hi: 'दबाकर रखें: आपकी लाइव लोकेशन के साथ परिवार को अलर्ट। हेल्पलाइन और नज़दीकी पुलिस व अस्पताल।',
    },
    points: [{ en: 'Works without signing in', hi: 'बिना लॉगिन भी' }],
    shot: 'sos',
  },
  {
    id: 'stays',
    group: 'book',
    icon: '🏨',
    title: { en: 'Stays near the temples', hi: 'मंदिरों के पास ठहरना' },
    text: {
      en: 'Dharamshalas, guest houses and hotels with real rooms and prices, paid securely.',
      hi: 'धर्मशाला, गेस्ट हाउस और होटल, असली कमरे और कीमतें, सुरक्षित भुगतान।',
    },
    points: [{ en: 'Free cancellation where offered', hi: 'जहाँ उपलब्ध, मुफ़्त रद्दीकरण' }],
    shot: 'stays',
  },
  {
    id: 'food',
    group: 'book',
    icon: '🍛',
    title: { en: 'Sattvik food', hi: 'सात्विक भोजन' },
    text: {
      en: 'Pure-veg and sattvik restaurants, thalis and prasad, ordered in the app.',
      hi: 'शुद्ध शाकाहारी और सात्विक भोजनालय, थाली और प्रसाद, ऐप से ऑर्डर।',
    },
    points: [{ en: 'Pure veg filter', hi: 'शुद्ध शाकाहारी' }],
    shot: 'food',
  },
  {
    id: 'cabs',
    group: 'book',
    icon: '🚕',
    title: { en: 'Cabs & e-rickshaws', hi: 'कैब और ई-रिक्शा' },
    text: {
      en: 'Fixed fares between temples, stations and your stay. No haggling.',
      hi: 'मंदिरों, स्टेशन और ठहरने की जगह के बीच तय किराया। मोलभाव नहीं।',
    },
    points: [{ en: 'Fares shown before you book', hi: 'बुकिंग से पहले किराया' }],
    shot: 'cabs',
  },
  {
    id: 'reels',
    group: 'community',
    icon: '🎬',
    title: { en: 'Devotional reels', hi: 'भक्ति रील्स' },
    text: {
      en: 'Watch darshan, aarti and yatra moments. Like, comment, share, save and follow creators.',
      hi: 'दर्शन, आरती और यात्रा के पल देखें। लाइक, टिप्पणी, शेयर, सेव और फ़ॉलो करें।',
    },
    points: [
      { en: 'For you & Following feeds', hi: 'फ़ॉर यू और फ़ॉलोइंग' },
      { en: 'Report & moderation', hi: 'रिपोर्ट और मॉडरेशन' },
    ],
    shot: 'reels',
  },
  {
    id: 'create',
    group: 'community',
    icon: '✂️',
    title: { en: 'Create & edit reels', hi: 'रील बनाएँ और एडिट करें' },
    text: {
      en: 'Record or upload a video, then trim, add filters, speed, text and sound before you share.',
      hi: 'वीडियो रिकॉर्ड या अपलोड करें, फिर ट्रिम, फ़िल्टर, गति, टेक्स्ट और आवाज़ जोड़ें।',
    },
    points: [{ en: 'Cover, caption, hashtags, temple tag', hi: 'कवर, कैप्शन, हैशटैग, मंदिर टैग' }],
    shot: 'composer',
  },
  {
    id: 'people',
    group: 'community',
    icon: '🙏',
    title: { en: 'People & profiles', hi: 'लोग और प्रोफ़ाइल' },
    text: {
      en: 'Create your profile with a photo, follow creators and see pilgrims in Braj.',
      hi: 'फ़ोटो के साथ प्रोफ़ाइल बनाएँ, क्रिएटर फ़ॉलो करें और ब्रज के यात्रियों को देखें।',
    },
    points: [{ en: 'Your name on your reels', hi: 'आपकी रील्स पर आपका नाम' }],
    shot: 'people',
  },
];

const GROUPS: { id: AppFeature['group'] | 'all'; label: Tr }[] = [
  { id: 'all', label: { en: 'All features', hi: 'सभी सुविधाएँ' } },
  { id: 'darshan', label: { en: 'Darshan & aarti', hi: 'दर्शन और आरती' } },
  { id: 'plan', label: { en: 'Guide & planning', hi: 'गाइड और योजना' } },
  { id: 'family', label: { en: 'Family & safety', hi: 'परिवार और सुरक्षा' } },
  { id: 'book', label: { en: 'Stay, food, cabs', hi: 'ठहरना, भोजन, कैब' } },
  { id: 'community', label: { en: 'Reels & community', hi: 'रील्स और समुदाय' } },
];

/** "Everything in the app": every feature, with a real screen and a download button. */
export function AppFeatures({ lang }: { lang: Lang }) {
  const [group, setGroup] = useState<(typeof GROUPS)[number]['id']>('all');
  const [active, setActive] = useState(FEATURES[0]?.id ?? '');
  const list = FEATURES.filter((f) => group === 'all' || f.group === group);
  const cur = FEATURES.find((f) => f.id === active) ?? list[0] ?? FEATURES[0];
  const t = (x: Tr) => x[lang];
  if (!cur) return null;
  return (
    <section className="appf" id="app">
      <SectionHead
        kicker={lang === 'hi' ? 'ऐप में सब कुछ' : 'Everything in the app'}
        title={lang === 'hi' ? 'एक ऐप, पूरी तीर्थयात्रा' : 'One app for the whole pilgrimage'}
        sub={
          lang === 'hi'
            ? `${String(FEATURES.length)} सुविधाएँ: दर्शन से लेकर परिवार की सुरक्षा तक। कोई भी सुविधा चुनें और ऐप की असली स्क्रीन देखें।`
            : `${String(FEATURES.length)} features, from darshan to family safety. Pick one to see the real app screen.`
        }
      />
      <div className="appf-tabs" role="tablist">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={group === g.id}
            className={group === g.id ? 'on' : ''}
            onClick={() => {
              setGroup(g.id);
              const first = FEATURES.find((f) => g.id === 'all' || f.group === g.id);
              if (first) setActive(first.id);
            }}
          >
            {t(g.label)}
          </button>
        ))}
      </div>
      <div className="appf-body">
        <ul className="appf-list">
          {list.map((f) => (
            <li key={f.id}>
              <button
                className={f.id === cur.id ? 'on' : ''}
                onClick={() => {
                  setActive(f.id);
                }}
              >
                <span className="ic" aria-hidden>
                  {f.icon}
                </span>
                <span>
                  <b>{t(f.title)}</b>
                  <small>{t(f.text)}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="appf-stage">
          <AnimatePresence mode="wait">
            <motion.div
              key={cur.id}
              className="appf-card"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <div className="device appf-phone">
                <img src={`/images/app/${cur.shot}.webp`} alt={t(cur.title)} />
              </div>
              <div className="appf-copy">
                <span className="appf-ic" aria-hidden>
                  {cur.icon}
                </span>
                <h3>{t(cur.title)}</h3>
                <p>{t(cur.text)}</p>
                <ul>
                  {cur.points.map((p) => (
                    <li key={p.en}>{t(p)}</li>
                  ))}
                </ul>
                <div className="appf-cta">
                  <a className="btn" href={APK_URL}>
                    ⬇ {lang === 'hi' ? 'ऐप डाउनलोड करें' : 'Download the app'}
                  </a>
                  {cur.web ? (
                    <a className="btn ghost" href={cur.web}>
                      {lang === 'hi' ? 'वेबसाइट पर आज़माएँ' : 'Try it on the website'}
                    </a>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <Reveal>
        <div className="appf-strip">
          {FEATURES.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setActive(f.id);
              }}
              className="device mini"
              aria-label={t(f.title)}
            >
              <img src={`/images/app/${f.shot}.webp`} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/** Floating "Download app" button, visible on every scroll position. */
export function DownloadFab({ lang }: { lang: Lang }) {
  return (
    <a className="dl-fab" href="#download">
      <span aria-hidden>⬇</span> {lang === 'hi' ? 'ऐप डाउनलोड करें' : 'Download app'}
    </a>
  );
}
