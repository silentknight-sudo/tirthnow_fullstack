'use client';

import { motion, useInView, useMotionValue, animate } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';

export function Reveal({
  children,
  delay = 0,
  y = 40,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHead({
  kicker,
  title,
  sub,
  light,
}: {
  kicker: string;
  title: string;
  sub?: string;
  light?: boolean;
}) {
  return (
    <div className={`section-head${light ? ' light' : ''}`}>
      <Reveal>
        <p className="kicker">{kicker}</p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2>{title}</h2>
      </Reveal>
      {sub ? (
        <Reveal delay={0.16}>
          <p className="sub">{sub}</p>
        </Reveal>
      ) : null}
    </div>
  );
}

export function CountUp({ to, suffix }: { to: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, { duration: 1.6, ease: 'easeOut' });
    const unsub = mv.on('change', (v) => {
      if (ref.current) ref.current.textContent = `${String(Math.round(v))}${suffix}`;
    });
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, mv, to, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}
