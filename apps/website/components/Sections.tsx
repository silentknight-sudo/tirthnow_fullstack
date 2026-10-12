'use client';

import {
  AnimatePresence,
  motion,
  useInView,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Content, Lang } from '@/lib/content';
import { Icon } from './Icon';
import { CountUp, Reveal, SectionHead } from './motion';

/* ---------- Nav ---------- */

export function Nav({ c, lang, setLang }: { c: Content; lang: Lang; setLang: (l: Lang) => void }) {
  const { scrollYProgress, scrollY } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const [solid, setSolid] = useState(false);
  useEffect(
    () =>
      scrollY.on('change', (v) => {
        setSolid(v > 40);
      }),
    [scrollY],
  );
  return (
    <header className={`nav${solid ? ' solid' : ''}`}>
      <a href="#top" className="brand">
        <img src="/logo.png" alt="" width={40} height={40} />
        <span>Tirth Now</span>
      </a>
      <nav className="links">
        <a href="#features">{c.nav.features}</a>
        <a href="#guide">{c.nav.guide}</a>
        <a href="#safety">{c.nav.safety}</a>
        <a href="#partners">{c.nav.partners}</a>
        <a href="#faq">{c.nav.faq}</a>
      </nav>
      <div className="nav-actions">
        <button
          className="lang"
          onClick={() => {
            setLang(lang === 'en' ? 'hi' : 'en');
          }}
          aria-label="Switch language"
        >
          {lang === 'en' ? 'हिंदी' : 'English'}
        </button>
        <a className="btn small" href="#download">
          {c.nav.cta}
        </a>
      </div>
      <motion.div className="progress" style={{ scaleX: progress }} />
    </header>
  );
}

/* ---------- Hero ---------- */

export function Hero({ c }: { c: Content }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const logoScale = useTransform(scrollYProgress, [0, 1], [1, 1.9]);
  const logoRotate = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const logoOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -180]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const hillsBack = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const hillsFront = useTransform(scrollYProgress, [0, 1], [0, 260]);
  const sunY = useTransform(scrollYProgress, [0, 1], [0, 200]);

  return (
    <section className="hero" ref={ref} id="top">
      <motion.div className="sun" style={{ y: sunY }} />
      <div className="hero-inner">
        <motion.div
          className="hero-logo"
          style={{ scale: logoScale, rotate: logoRotate, opacity: logoOpacity }}
        >
          <motion.img
            src="/logo.png"
            alt="Tirth Now"
            initial={{ opacity: 0, scale: 0.8, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.div>
        <motion.div className="hero-text" style={{ y: textY, opacity: textOpacity }}>
          <motion.p
            className="kicker"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {c.hero.kicker}
          </motion.p>
          <h1>
            {c.hero.title.map((line, i) => (
              <motion.span
                key={line}
                className="line"
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.15, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              >
                {line}
              </motion.span>
            ))}
          </h1>
          <motion.p
            className="sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            {c.hero.sub}
          </motion.p>
          <motion.div
            className="cta-row"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05 }}
          >
            <a className="btn" href="#download">
              {c.hero.primary}
            </a>
            <a className="btn ghost" href="#journey">
              {c.hero.secondary}
            </a>
          </motion.div>
        </motion.div>
      </div>
      <motion.svg
        className="hills back"
        style={{ y: hillsBack }}
        viewBox="0 0 1440 260"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 200 C200 120 360 160 520 110 C700 60 860 150 1040 100 C1200 60 1320 120 1440 90 V260 H0Z" />
      </motion.svg>
      <motion.svg
        className="hills front"
        style={{ y: hillsFront }}
        viewBox="0 0 1440 260"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 230 C180 170 320 210 480 180 C640 150 760 70 880 120 L900 92 L920 120 C1060 170 1240 150 1440 190 V260 H0Z" />
        <path d="M884 120 V70 h32 V120 M892 70 L900 52 L908 70" className="temple" />
      </motion.svg>
      <motion.div
        className="scroll-cue"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        {c.hero.scroll} ↓
      </motion.div>
    </section>
  );
}

/* ---------- Journey: winding path drawn by scroll ---------- */

const STOP_POS: [number, number][] = [
  [150, 120],
  [470, 300],
  [190, 520],
  [520, 720],
  [210, 920],
  [480, 1110],
];

export function Journey({ c }: { c: Content }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 70%'] });
  const draw = useSpring(scrollYProgress, { stiffness: 80, damping: 25 });
  return (
    <section className="journey" id="journey" ref={ref}>
      <SectionHead kicker={c.journey.kicker} title={c.journey.title} sub={c.journey.sub} />
      <div className="journey-map">
        <svg viewBox="0 0 640 1240" aria-hidden="true">
          <path className="path-bg" d={JOURNEY_PATH} />
          <motion.path className="path-fg" d={JOURNEY_PATH} style={{ pathLength: draw }} />
        </svg>
        {c.journey.stops.map((s, i) => {
          const [x, y] = STOP_POS[i] ?? [0, 0];
          return (
            <motion.div
              key={s.name}
              className={`stop ${i % 2 === 0 ? 'left' : 'right'}`}
              style={{ left: `${String((x / 640) * 100)}%`, top: `${String((y / 1240) * 100)}%` }}
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-30% 0px' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="dot" />
              <div className="stop-card">
                <strong>{s.name}</strong>
                <span>{s.note}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

const JOURNEY_PATH =
  'M150 120 C 360 120, 520 180, 470 300 S 120 400, 190 520 S 560 600, 520 720 S 120 820, 210 920 S 520 1000, 480 1110';

/* ---------- Aarti countdown (IST) ---------- */

function istNow(): Date {
  const now = new Date();
  return new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 330 * 60000);
}

function nextAarti(temples: Content['aarti']['temples']): { idx: number; secs: number } {
  const ist = istNow();
  const nowSecs = ist.getHours() * 3600 + ist.getMinutes() * 60 + ist.getSeconds();
  let best = { idx: 0, secs: Number.POSITIVE_INFINITY };
  temples.forEach((t, idx) => {
    const [h = 0, m = 0] = t.time.split(':').map(Number);
    let diff = h * 3600 + m * 60 - nowSecs;
    if (diff <= 0) diff += 86400;
    if (diff < best.secs) best = { idx, secs: diff };
  });
  return best;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function Aarti({ c }: { c: Content }) {
  const [state, setState] = useState<{ idx: number; secs: number } | null>(null);
  const [reminded, setReminded] = useState<Set<number>>(new Set());
  useEffect(() => {
    const tick = () => {
      setState(nextAarti(c.aarti.temples));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      clearInterval(id);
    };
  }, [c.aarti.temples]);
  const next = state ? c.aarti.temples[state.idx] : undefined;
  const secs = state?.secs ?? 0;
  const parts = [Math.floor(secs / 3600), Math.floor((secs % 3600) / 60), secs % 60];

  return (
    <section className="aarti" id="aarti">
      <SectionHead kicker={c.aarti.kicker} title={c.aarti.title} sub={c.aarti.sub} />
      <div className="aarti-grid">
        <Reveal className="countdown-card">
          <div className="diya" aria-hidden="true">
            <span className="flame" />
          </div>
          <p className="kicker">{c.aarti.next}</p>
          <h3>{next?.aarti ?? '—'}</h3>
          <p className="muted">
            {next?.temple ?? ''} · {next?.time ?? ''} IST
          </p>
          <p className="starts">{c.aarti.startsIn}</p>
          <div className="clock" aria-live="polite">
            {parts.map((p, i) => (
              <span key={i} className="digit">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={p}
                    initial={{ y: -24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 24, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {pad(p)}
                  </motion.span>
                </AnimatePresence>
                <small>{['h', 'm', 's'][i]}</small>
              </span>
            ))}
          </div>
          <p className="sample">{c.aarti.sample}</p>
        </Reveal>
        <ul className="schedule">
          {c.aarti.temples.map((t, i) => (
            <Reveal key={`${t.temple}-${t.time}`} delay={i * 0.06}>
              <li className={state?.idx === i ? 'active' : ''}>
                <time>{t.time}</time>
                <div>
                  <strong>{t.aarti}</strong>
                  <span>{t.temple}</span>
                </div>
                <button
                  className={`remind${reminded.has(i) ? ' on' : ''}`}
                  onClick={() => {
                    setReminded((prev) => {
                      const n = new Set(prev);
                      if (n.has(i)) n.delete(i);
                      else n.add(i);
                      return n;
                    });
                  }}
                  aria-pressed={reminded.has(i)}
                  title={reminded.has(i) ? c.aarti.reminded : c.aarti.remind}
                >
                  <Icon name="bell" size={18} />
                </button>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Features: horizontal scroll inside sticky section ---------- */

export function Features({ c }: { c: Content }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const n = c.features.items.length;
  const x = useTransform(scrollYProgress, [0, 1], ['0%', `-${String(((n - 2.2) / n) * 100)}%`]);
  const smooth = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return (
    <section className="features" id="features" ref={ref} style={{ height: `${String(n * 38)}vh` }}>
      <div className="features-sticky">
        <SectionHead kicker={c.features.kicker} title={c.features.title} sub={c.features.sub} />
        <motion.div className="features-track" style={{ x }}>
          {c.features.items.map((f, i) => (
            <article key={f.id} className="feature-card">
              <span className="num">{pad(i + 1)}</span>
              <div className="icon-wrap">
                <Icon name={f.icon} size={34} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
              <ul>
                {f.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </article>
          ))}
        </motion.div>
        <div className="features-bar">
          <motion.span style={{ scaleX: smooth }} />
        </div>
      </div>
    </section>
  );
}

/* ---------- AI guide: chat that types itself ---------- */

export function Guide({ c }: { c: Content }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20%' });
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    setShown(0);
  }, [c]);
  useEffect(() => {
    if (!inView || shown >= c.guide.chat.length) return;
    const nextIsGuide = c.guide.chat[shown]?.from === 'guide';
    setTyping(nextIsGuide);
    const id = setTimeout(
      () => {
        setTyping(false);
        setShown((s) => s + 1);
      },
      nextIsGuide ? 1500 : 700,
    );
    return () => {
      clearTimeout(id);
    };
  }, [inView, shown, c]);

  return (
    <section className="guide" id="guide">
      <div className="guide-grid">
        <div>
          <SectionHead kicker={c.guide.kicker} title={c.guide.title} sub={c.guide.sub} />
          <ul className="ticks">
            {c.guide.points.map((p, i) => (
              <Reveal key={p} delay={i * 0.1}>
                <li>
                  <Icon name="spark" size={18} /> {p}
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
        <Reveal>
          <div className="phone" ref={ref}>
            <div className="phone-top">
              <img src="/logo.png" alt="" width={28} height={28} /> {c.guide.kicker}
            </div>
            <div className="chat">
              <AnimatePresence>
                {c.guide.chat.slice(0, shown).map((m, i) => (
                  <motion.div
                    key={`${String(i)}-${m.text}`}
                    className={`bubble ${m.from}`}
                    initial={{ opacity: 0, y: 16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    {m.text}
                    {m.source ? <span className="source">↳ {m.source}</span> : null}
                  </motion.div>
                ))}
                {typing ? (
                  <motion.div
                    key="typing"
                    className="bubble guide typing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    aria-label={c.guide.typing}
                  >
                    <i />
                    <i />
                    <i />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
            <div className="chat-input">
              <span>{c.guide.placeholder}</span>
              <Icon name="mic" size={18} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Planner timeline ---------- */

export function Planner({ c }: { c: Content }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 50%'] });
  return (
    <section className="planner">
      <div className="planner-grid">
        <Reveal>
          <div className="plan-card" ref={ref}>
            <div className="plan-head">
              <Icon name="map" size={20} /> {c.planner.day}
            </div>
            <div className="timeline">
              <motion.span className="tl-line" style={{ scaleY: scrollYProgress }} />
              {c.planner.items.map((it, i) => (
                <Reveal key={it.time} delay={i * 0.08} y={20}>
                  <div className={`tl-item kind-${String(i)}`}>
                    <time>{it.time}</time>
                    <div>
                      <span className="chip">{it.kind}</span>
                      <strong>{it.title}</strong>
                      <span className="muted">{it.note}</span>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="plan-actions">
              <span className="btn small">{c.planner.pdf}</span>
              <span className="btn small ghost">{c.planner.share}</span>
            </div>
          </div>
        </Reveal>
        <SectionHead kicker={c.planner.kicker} title={c.planner.title} sub={c.planner.sub} />
      </div>
    </section>
  );
}

/* ---------- Safety ---------- */

export function Safety({ c }: { c: Content }) {
  const [hold, setHold] = useState(false);
  return (
    <section className="safety" id="safety">
      <div className="safety-grid">
        <div>
          <SectionHead kicker={c.safety.kicker} title={c.safety.title} sub={c.safety.sub} light />
          <ol className="steps">
            {c.safety.steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.1}>
                <li>
                  <span className="step-n">{i + 1}</span>
                  <div>
                    <strong>{s.title}</strong>
                    <p>{s.body}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
        <div className="sos-wrap">
          <span className="ring r1" />
          <span className="ring r2" />
          <span className="ring r3" />
          <button
            className={`sos${hold ? ' holding' : ''}`}
            onPointerDown={() => {
              setHold(true);
            }}
            onPointerUp={() => {
              setHold(false);
            }}
            onPointerLeave={() => {
              setHold(false);
            }}
            aria-label={`${c.safety.button} — ${c.safety.hint}`}
          >
            <svg viewBox="0 0 100 100" className="sos-ring" aria-hidden="true">
              <circle cx="50" cy="50" r="46" />
            </svg>
            <strong>{c.safety.button}</strong>
            <span>{c.safety.hint}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Reels ---------- */

export function Reels({ c }: { c: Content }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 1], ['10%', '-30%']);
  return (
    <section className="reels" ref={ref}>
      <SectionHead kicker={c.reels.kicker} title={c.reels.title} sub={c.reels.sub} />
      <motion.div className="reel-row" style={{ x }}>
        {c.reels.captions.map((cap, i) => (
          <motion.div
            key={cap}
            className={`reel r${String(i)}`}
            whileHover={{ y: -10, rotate: i % 2 ? 1.5 : -1.5 }}
          >
            <span className="play">▶</span>
            <span className="cap">{cap}</span>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

/* ---------- Stats ---------- */

export function Stats({ c }: { c: Content }) {
  return (
    <section className="stats">
      {c.stats.map((s, i) => (
        <Reveal key={s.label} delay={i * 0.1} className="stat">
          <strong>
            <CountUp to={s.value} suffix={s.suffix} />
          </strong>
          <span>{s.label}</span>
        </Reveal>
      ))}
    </section>
  );
}

/* ---------- Partners ---------- */

export function Partners({ c }: { c: Content }) {
  return (
    <section className="partners" id="partners">
      <SectionHead kicker={c.partners.kicker} title={c.partners.title} sub={c.partners.sub} />
      <div className="partner-grid">
        {c.partners.points.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.1}>
            <div className="partner-card">
              <span className="num">{pad(i + 1)}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal>
        <div className="center">
          <a className="btn" href="#download">
            {c.partners.cta}
          </a>
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- FAQ ---------- */

export function Faq({ c }: { c: Content }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="faq" id="faq">
      <SectionHead kicker={c.faq.kicker} title={c.faq.title} />
      <div className="faq-list">
        {c.faq.items.map((it, i) => (
          <Reveal key={it.q} delay={i * 0.05}>
            <div className={`faq-item${open === i ? ' open' : ''}`}>
              <button
                onClick={() => {
                  setOpen(open === i ? null : i);
                }}
                aria-expanded={open === i}
              >
                {it.q}
                <span className="plus">+</span>
              </button>
              <AnimatePresence initial={false}>
                {open === i ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="faq-a"
                  >
                    <p>{it.a}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Download + footer ---------- */

export function Download({ c }: { c: Content }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const rotate = useTransform(scrollYProgress, [0, 1], [-90, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.5, 1]);
  return (
    <section className="download" id="download" ref={ref}>
      <motion.img src="/logo.png" alt="" width={180} height={180} style={{ rotate, scale }} />
      <SectionHead kicker="" title={c.download.title} sub={c.download.sub} />
      <div className="stores">
        {[c.download.android, c.download.ios].map((s) => (
          <div key={s} className="store">
            <small>{c.download.soon}</small>
            <strong>{s}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Footer({ c }: { c: Content }) {
  return (
    <footer className="footer">
      <div className="brand">
        <img src="/logo.png" alt="" width={36} height={36} />
        <span>Tirth Now</span>
      </div>
      <p>{c.footer.tagline}</p>
      <p className="muted">
        © {new Date().getFullYear()} Tirth Now. {c.footer.rights} · {c.footer.made}
      </p>
    </footer>
  );
}
