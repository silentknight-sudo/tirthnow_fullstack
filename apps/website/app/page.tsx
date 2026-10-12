'use client';

import { MotionConfig } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CONTENT, type Lang } from '@/lib/content';
import {
  Aarti,
  Download,
  Faq,
  Features,
  Footer,
  Guide,
  Hero,
  Journey,
  Nav,
  Partners,
  Planner,
  Reels,
  Safety,
  Showcase,
  Stats,
} from '@/components/Sections';

export default function Home() {
  const [lang, setLang] = useState<Lang>('en');
  const c = CONTENT[lang];
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <MotionConfig reducedMotion="user">
      <Nav c={c} lang={lang} setLang={setLang} />
      <main className={lang === 'hi' ? 'hi' : undefined}>
        <Hero c={c} />
        <Showcase c={c} />
        <Journey c={c} />
        <Aarti c={c} />
        <Features c={c} />
        <Guide c={c} />
        <Planner c={c} />
        <Safety c={c} />
        <Reels c={c} />
        <Stats c={c} />
        <Partners c={c} />
        <Faq c={c} />
        <Download c={c} />
      </main>
      <Footer c={c} />
    </MotionConfig>
  );
}
