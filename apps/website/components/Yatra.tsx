'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { Lang } from '@/lib/content';
import { YATRA, formatRupees, type YatraContent } from '@/lib/yatra';
import { Icon } from './Icon';
import { Reveal, SectionHead } from './motion';

type Kind = 'all' | YatraContent['packages']['items'][number]['kind'];

export function YatraPackages({ lang }: { lang: Lang }) {
  const y = YATRA[lang].packages;
  const [kind, setKind] = useState<Kind>('all');
  const items = y.items.filter((p) => kind === 'all' || p.kind === kind);
  const kinds: Kind[] = ['all', 'day', 'multi', 'parikrama'];

  return (
    <section className="yatra" id="yatra">
      <SectionHead kicker={y.kicker} title={y.title} sub={y.sub} />
      <div className="yatra-filters" role="tablist">
        {kinds.map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={kind === k}
            className={kind === k ? 'on' : ''}
            onClick={() => {
              setKind(k);
            }}
          >
            {y.filters[k]}
          </button>
        ))}
      </div>
      <motion.div className="yatra-grid" layout>
        <AnimatePresence mode="popLayout">
          {items.map((p) => (
            <motion.article
              key={p.id}
              className="yatra-card"
              layout
              initial={{ opacity: 0, scale: 0.94, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }}
            >
              <div className="yatra-top">
                <span className="tag">{p.tag}</span>
                <span className="dur">{p.duration}</span>
              </div>
              <h3>{p.name}</h3>
              <p className="label">{y.stops}</p>
              <ol className="route">
                {p.stops.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <p className="label">{y.includes}</p>
              <ul className="incl">
                {p.includes.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <div className="yatra-foot">
                <div>
                  <small>{y.from}</small>
                  <strong>{formatRupees(p.fromPaise, lang)}</strong>
                  <small>{y.perPerson}</small>
                </div>
                <a className="btn small" href="#download">
                  {y.book}
                </a>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.div>
      <div className="center">
        <a className="btn" href="/journey/">
          {lang === 'hi' ? 'इंटरैक्टिव यात्रा देखें →' : 'Try the interactive yatra journey →'}
        </a>
      </div>
      <p className="yatra-sample">{y.sample}</p>
    </section>
  );
}

export function LiveDarshan({ lang }: { lang: Lang }) {
  const d = YATRA[lang].darshan;
  const l = YATRA[lang].local;
  return (
    <>
      <section className="darshan">
        <div className="darshan-grid">
          <Reveal>
            <div className="live-frame">
              <span className="live-badge">
                <i /> {d.live}
              </span>
              <div className="live-glow" />
              <motion.div
                className="live-diya"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ repeat: Infinity, duration: 2.4 }}
              >
                <span className="flame" />
              </motion.div>
              <p className="live-cap">{d.liveNow}</p>
            </div>
          </Reveal>
          <div>
            <SectionHead kicker={d.kicker} title={d.title} sub={d.sub} light />
            <div className="svc-grid">
              {d.items.map((s, i) => (
                <Reveal key={s.title} delay={i * 0.08}>
                  <div className="svc dark">
                    <Icon name={s.icon} size={24} />
                    <strong>{s.title}</strong>
                    <p>{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="local">
        <SectionHead kicker={l.kicker} title={l.title} sub={l.sub} />
        <div className="local-grid">
          {l.items.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <div className="svc">
                <div className="icon-wrap">
                  <Icon name={s.icon} size={28} />
                </div>
                <strong>{s.title}</strong>
                <p>{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
