'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  arriveLine,
  departLine,
  speak,
  speechSupported,
  stopSpeaking,
  welcomeLine,
  type VoiceLang,
} from '@/lib/narration';
import { STOP_HI } from '@/lib/journey-hi';
import {
  VEHICLES,
  YATRAS,
  rupees,
  type JourneyStop,
  type Vehicle,
  type Yatra,
} from '@/lib/journey';

const W = 1000;
const H = 700;
const KIND_ICON: Record<JourneyStop['kind'], string> = {
  Station: '🚉',
  Temple: '🛕',
  Ghat: '🪔',
  Kund: '💧',
  Garden: '🌿',
};

interface Pos {
  x: number;
  y: number;
  angle: number;
}

/** Curved leg between two stops, bending alternately left and right. */
function legPath(a: JourneyStop, b: JourneyStop, i: number): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const bend = (i % 2 === 0 ? 0.22 : -0.22) * Math.hypot(dx, dy);
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * bend;
  const cy = my + (dx / len) * bend;
  return `M${String(a.x)} ${String(a.y)} Q${String(cx)} ${String(cy)} ${String(b.x)} ${String(b.y)}`;
}

/** Real milliseconds for a leg: 1 simulated minute = 120 ms at 1×. */
function legMs(km: number, v: Vehicle, mult: number): number {
  const minutes = (km / v.kmh) * 60;
  return Math.max(1600, Math.min(9000, minutes * 120)) / mult;
}

export function YatraJourney() {
  const [yatraId, setYatraId] = useState(YATRAS[0]?.id ?? '');
  const yatra: Yatra = YATRAS.find((y) => y.id === yatraId) ?? (YATRAS[0] as Yatra);
  const stops = yatra.stops;
  const [vehicleId, setVehicleId] = useState(VEHICLES[0]?.id ?? '');
  const vehicle: Vehicle = VEHICLES.find((v) => v.id === vehicleId) ?? (VEHICLES[0] as Vehicle);

  const [idx, setIdx] = useState(0); // last stop reached
  const [moving, setMoving] = useState(false);
  const [auto, setAuto] = useState(false);
  const [follow, setFollow] = useState(true);
  const [mult, setMult] = useState(1);
  const [fare, setFare] = useState(0);
  const [kmDone, setKmDone] = useState(0);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const first = stops[0] as JourneyStop;
  const [pos, setPos] = useState<Pos>({ x: first.x, y: first.y, angle: 0 });

  // Voice guide
  const [voiceOn, setVoiceOn] = useState(true);
  const [voiceLang, setVoiceLang] = useState<VoiceLang>('en');
  const [caption, setCaption] = useState('');
  const [narrating, setNarrating] = useState(false);
  const [canSpeak, setCanSpeak] = useState(true);
  const pending = useRef(0);
  const voiceRef = useRef<{ on: boolean; lang: VoiceLang; rate: number }>({
    on: true,
    lang: 'en',
    rate: 1,
  });
  useEffect(() => {
    voiceRef.current = {
      on: voiceOn,
      lang: voiceLang,
      rate: Math.min(1.35, 0.95 + (mult - 1) * 0.12),
    };
  }, [voiceOn, voiceLang, mult]);
  useEffect(() => {
    setCanSpeak(speechSupported());
    // Some browsers load voices lazily.
    if (speechSupported()) window.speechSynthesis.getVoices();
    return () => {
      stopSpeaking();
    };
  }, []);

  const say = useCallback(async (text: string) => {
    const v = voiceRef.current;
    if (!v.on) {
      setCaption(text);
      return;
    }
    pending.current += 1;
    setNarrating(true);
    await speak(text, v.lang, v.rate, () => {
      setCaption(text);
    });
    pending.current = Math.max(0, pending.current - 1);
    setNarrating(pending.current > 0);
  }, []);

  const silence = useCallback(() => {
    stopSpeaking();
    pending.current = 0;
    setNarrating(false);
  }, []);

  const legRefs = useRef<(SVGPathElement | null)[]>([]);
  const timers = useRef<number[]>([]);
  const legs = useMemo(
    () => stops.slice(1).map((b, i) => legPath(stops[i] as JourneyStop, b, i)),
    [stops],
  );

  const clearTimers = () => {
    timers.current.forEach((t) => {
      window.clearTimeout(t);
    });
    timers.current = [];
  };

  const placeAt = useCallback(
    (i: number) => {
      const s = stops[i];
      if (s) setPos((p) => ({ x: s.x, y: s.y, angle: p.angle }));
    },
    [stops],
  );

  const reset = useCallback(() => {
    clearTimers();
    silence();
    setCaption('');
    setMoving(false);
    setAuto(false);
    setIdx(0);
    setFare(0);
    setKmDone(0);
    setTipsOpen(false);
    placeAt(0);
  }, [placeAt, silence]);

  useEffect(() => {
    reset();
  }, [yatraId, reset]);

  // Animate the current leg.
  useEffect(() => {
    if (!moving) return;
    const path = legRefs.current[idx];
    const next = stops[idx + 1];
    if (!path || !next) {
      setMoving(false);
      return;
    }
    const total = path.getTotalLength();
    const duration = legMs(next.kmFromPrev, vehicle, mult);
    let raf = 0;
    let start = 0;
    const step = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const p = path.getPointAtLength(eased * total);
      const q = path.getPointAtLength(Math.min(total, eased * total + 2));
      const angle = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
      setPos({ x: p.x, y: p.y, angle });
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setMoving(false);
        setIdx((i) => i + 1);
        setKmDone((k) => k + next.kmFromPrev);
        setFare(
          (f) =>
            f +
            (vehicle.seatPaise > 0
              ? vehicle.seatPaise
              : Math.round(next.kmFromPrev * vehicle.perKmPaise)),
        );
        setPanelOpen(true);
        arriveRef.current(idx + 1);
      }
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [moving, idx, stops, vehicle, mult]);

  // Narration hooks, kept in refs so the animation effects stay stable.
  const arriveRef = useRef<(i: number) => void>(() => undefined);
  const departRef = useRef<() => void>(() => undefined);
  arriveRef.current = (i: number) => {
    const s = stops[i];
    if (s) void say(arriveLine(s, i === stops.length - 1, voiceLang));
  };
  departRef.current = () => {
    const n = stops[idx + 1];
    if (!n) return;
    void say(departLine(n, vehicle, voiceLang));
    setMoving(true);
  };

  // Auto-play: let the guide finish, dwell briefly, then continue.
  useEffect(() => {
    if (!auto || moving || narrating) return;
    if (idx >= stops.length - 1) {
      setAuto(false);
      return;
    }
    const t = window.setTimeout(() => {
      departRef.current();
    }, 1200 / mult);
    timers.current.push(t);
    return () => {
      window.clearTimeout(t);
    };
  }, [auto, moving, narrating, idx, stops.length, mult]);

  const goNext = () => {
    if (moving || idx >= stops.length - 1) return;
    departRef.current();
  };
  const goPrev = () => {
    if (moving || idx === 0) return;
    const cur = stops[idx];
    setIdx(idx - 1);
    setKmDone((k) => Math.max(0, k - (cur?.kmFromPrev ?? 0)));
    placeAt(idx - 1);
  };
  const toggleAuto = () => {
    if (idx >= stops.length - 1) {
      reset();
      window.setTimeout(() => {
        setAuto(true);
      }, 50);
      return;
    }
    if (auto) {
      setAuto(false);
      silence();
      return;
    }
    setAuto(true);
    if (idx === 0) void say(welcomeLine(yatra, vehicle, voiceLang));
  };

  const current = stops[idx] as JourneyStop;
  const hiText = voiceLang === 'hi' ? STOP_HI[current.id] : undefined;
  const isHi = hiText !== undefined;
  const text = {
    about: hiText?.about ?? current.about,
    hours: hiText?.hours ?? current.hours,
    highlights: hiText?.highlights ?? current.highlights,
    tips: hiText?.tips ?? current.tips,
  };
  const next = stops[idx + 1];
  const done = idx >= stops.length - 1 && !moving;
  const liveSpeed = moving ? vehicle.kmh : 0;

  // Camera: follow the vehicle, or fit the whole route.
  const camera = useMemo(() => {
    if (follow) {
      const z = 1.25;
      return { z, tx: W / 2 - pos.x * z, ty: H / 2 - pos.y * z };
    }
    const xs = stops.map((s) => s.x);
    const ys = stops.map((s) => s.y);
    const minX = Math.min(...xs) - 120;
    const maxX = Math.max(...xs) + 120;
    const minY = Math.min(...ys) - 120;
    const maxY = Math.max(...ys) + 120;
    const z = Math.min(W / (maxX - minX), H / (maxY - minY), 1.4);
    return { z, tx: W / 2 - ((minX + maxX) / 2) * z, ty: H / 2 - ((minY + maxY) / 2) * z };
  }, [follow, pos.x, pos.y, stops]);

  return (
    <div className="yj">
      {/* top bar */}
      <header className="yj-top">
        <a href="/" className="yj-back" aria-label="Back to Tirth Now">
          ← <span>Tirth Now</span>
        </a>
        <span className="yj-title">✦ {yatra.name}</span>
        <ol className="yj-steps">
          {stops.map((s, i) => (
            <li key={s.id} className={i < idx ? 'past' : i === idx ? 'now' : ''}>
              <span className="n">{i < idx ? '✓' : i + 1}</span>
              <span className="t">{s.name.replace(/^Shri /, '').split(' ')[0]}</span>
            </li>
          ))}
        </ol>
      </header>

      <div className="yj-body">
        {/* map */}
        <div className="yj-map">
          <svg
            viewBox={`0 0 ${String(W)} ${String(H)}`}
            preserveAspectRatio="xMidYMid slice"
            role="img"
            aria-label={`${yatra.name} route map`}
          >
            <defs>
              <pattern id="yj-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M40 0H0V40" fill="none" stroke="rgba(107,63,31,0.06)" strokeWidth="1" />
              </pattern>
              <radialGradient id="yj-glow">
                <stop offset="0%" stopColor="#ffb347" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#ffb347" stopOpacity="0" />
              </radialGradient>
            </defs>
            <g
              style={{
                transform: `translate(${String(camera.tx)}px, ${String(camera.ty)}px) scale(${String(camera.z)})`,
                transition: moving && follow ? 'none' : 'transform 0.8s cubic-bezier(.22,1,.36,1)',
              }}
            >
              <rect x={-1500} y={-1500} width={4000} height={3700} fill="#f3e8d0" />
              <rect x={-1500} y={-1500} width={4000} height={3700} fill="url(#yj-grid)" />
              {/* parks and fields */}
              <ellipse cx={120} cy={180} rx={160} ry={90} fill="#e4dcb8" opacity={0.6} />
              <ellipse cx={880} cy={640} rx={200} ry={90} fill="#e4dcb8" opacity={0.6} />
              <ellipse cx={420} cy={480} rx={120} ry={70} fill="#e8e0c0" opacity={0.6} />
              {/* Yamuna */}
              {yatra.id !== 'govardhan' ? (
                <>
                  <path
                    d="M1150 -100 C 950 120, 900 160, 860 260 S 980 460, 1150 620"
                    fill="none"
                    stroke="#9cc7d6"
                    strokeWidth={70}
                    strokeLinecap="round"
                    opacity={0.7}
                  />
                  <text x={930} y={420} className="yj-river">
                    Yamuna
                  </text>
                </>
              ) : (
                <>
                  <path
                    d="M300 520 C 260 380, 360 220, 520 230 S 760 330, 700 520 Z"
                    fill="#d9c38f"
                    opacity={0.55}
                  />
                  <text x={430} y={400} className="yj-river hill">
                    Giriraj Govardhan
                  </text>
                </>
              )}
              {/* minor roads */}
              <path
                d="M-200 420 L1200 380 M-200 120 L1200 200 M300 -200 L260 900 M720 -200 L760 900"
                stroke="#fff"
                strokeWidth={14}
                opacity={0.8}
              />
              <path
                d="M-200 420 L1200 380 M-200 120 L1200 200 M300 -200 L260 900 M720 -200 L760 900"
                stroke="rgba(107,63,31,0.08)"
                strokeWidth={16}
                fill="none"
              />

              {/* route */}
              {legs.map((d, i) => (
                <g key={d}>
                  <path
                    d={d}
                    fill="none"
                    stroke="rgba(107,63,31,0.18)"
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeDasharray="2 14"
                  />
                  <path
                    ref={(el) => {
                      legRefs.current[i] = el;
                    }}
                    d={d}
                    fill="none"
                    stroke={i < idx ? '#d9772b' : 'transparent'}
                    strokeWidth={7}
                    strokeLinecap="round"
                  />
                </g>
              ))}

              {/* stops */}
              {stops.map((s, i) => (
                <g
                  key={s.id}
                  className={`yj-stop${i === idx ? ' now' : ''}${i < idx ? ' past' : ''}`}
                  transform={`translate(${String(s.x)} ${String(s.y)})`}
                >
                  {i === idx ? <circle r={46} fill="url(#yj-glow)" /> : null}
                  <circle r={24} className="pin" />
                  <text y={8} textAnchor="middle" fontSize={22}>
                    {KIND_ICON[s.kind]}
                  </text>
                  <g transform="translate(0 46)">
                    <rect
                      x={-((s.name.length * 7 + 40) / 2)}
                      y={-16}
                      width={s.name.length * 7 + 40}
                      height={30}
                      rx={15}
                      className="label"
                    />
                    <text textAnchor="middle" y={4} className="label-t">
                      {String(i + 1)}. {s.name}
                    </text>
                  </g>
                </g>
              ))}

              {/* vehicle */}
              <g transform={`translate(${String(pos.x)} ${String(pos.y)})`}>
                <circle r={30} fill="url(#yj-glow)" />
                <circle r={20} fill="#3b2414" stroke="#ffd78a" strokeWidth={3} />
                <text
                  y={7}
                  textAnchor="middle"
                  fontSize={20}
                  transform={Math.abs(pos.angle) > 90 ? 'scale(-1 1)' : undefined}
                >
                  {vehicle.icon}
                </text>
              </g>
            </g>
          </svg>

          {/* voice guide caption */}
          <AnimatePresence>
            {caption ? (
              <motion.div
                key={caption}
                className={`yj-guide${narrating ? ' talking' : ''}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.3 }}
                aria-live="polite"
              >
                <span className="ava" aria-hidden="true">
                  🙏
                  <i />
                </span>
                <div>
                  <b>{voiceLang === 'hi' ? 'ब्रज गाइड' : 'Braj Guide'}</b>
                  <p>{caption}</p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* HUD */}
          <div className="yj-hud">
            <div className="speed">
              <strong>{liveSpeed}</strong>
              <small>km/h</small>
            </div>
            <div className="info">
              <b>
                {vehicle.icon} {vehicle.name}
              </b>
              <span>
                {vehicle.seatPaise > 0
                  ? `${rupees(vehicle.seatPaise)}/seat shared · ${rupees(vehicle.perKmPaise)}/km full`
                  : vehicle.perKmPaise > 0
                    ? `${rupees(vehicle.perKmPaise)}/km`
                    : 'Free — walk at your pace'}
              </span>
              <span className="trip">
                {kmDone.toFixed(1)} km · fare so far {rupees(fare)}
              </span>
            </div>
          </div>
          <div className="yj-enroute">
            ➤{' '}
            {moving && next ? (
              <>
                En-route to <b>{next.name}</b>
              </>
            ) : done ? (
              <b>Yatra complete 🙏</b>
            ) : (
              <>
                At <b>{current.name}</b>
              </>
            )}
          </div>
          <p className="yj-note">Illustrative map, not to scale · sample fares</p>
        </div>

        {/* stop panel */}
        <AnimatePresence mode="wait">
          <motion.aside
            key={current.id + String(panelOpen)}
            className={`yj-panel${panelOpen ? '' : ' closed'}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.35 }}
          >
            <div className="yj-panel-head">
              <span className="k">
                ● Stop {idx + 1} of {stops.length} · {current.kind}
              </span>
              <span className={`diff ${current.difficulty.toLowerCase()}`}>
                {current.difficulty}
              </span>
              <button
                className="collapse"
                onClick={() => {
                  setPanelOpen((o) => !o);
                }}
                aria-label={panelOpen ? 'Collapse details' : 'Expand details'}
              >
                {panelOpen ? '▾' : '▴'}
              </button>
            </div>
            <h2>{current.name}</h2>
            <p className="hi">{current.hiName}</p>
            {panelOpen ? (
              <>
                <div className="yj-facts">
                  <div>
                    <small>{isHi ? 'दर्शन का समय' : 'Visiting time'}</small>
                    <b>
                      {current.visitMins} {isHi ? 'मिनट' : 'mins'}
                    </b>
                  </div>
                  <div>
                    <small>{isHi ? 'समय' : 'Timing / hours'}</small>
                    <b>{text.hours}</b>
                  </div>
                </div>
                <p className="about">{text.about}</p>
                <p className="lbl">✦ {isHi ? 'मुख्य आकर्षण' : 'Sacred highlights'}</p>
                <ul className="hl">
                  {text.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
                <button
                  className="tips-toggle"
                  onClick={() => {
                    setTipsOpen((o) => !o);
                  }}
                  aria-expanded={tipsOpen}
                >
                  🛈 {isHi ? 'यात्री सुझाव' : 'Pilgrim tips'} ({text.tips.length}){' '}
                  <span>{tipsOpen ? '−' : '+'}</span>
                </button>
                <AnimatePresence initial={false}>
                  {tipsOpen ? (
                    <motion.ul
                      className="tips"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      {text.tips.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </motion.ul>
                  ) : null}
                </AnimatePresence>
              </>
            ) : null}
            <button
              className="yj-listen"
              onClick={() => {
                silence();
                void say(arriveLine(current, idx === stops.length - 1, voiceLang));
              }}
            >
              🔊 {voiceLang === 'hi' ? 'गाइड से सुनें' : 'Hear the guide'}
            </button>
            <button className="yj-continue" onClick={done ? reset : goNext} disabled={moving}>
              {done ? 'Start again ↺' : next ? `Continue to ${next.name} →` : ''}
            </button>
          </motion.aside>
        </AnimatePresence>
      </div>

      {/* controls */}
      <div className="yj-controls">
        <label className="yj-select">
          <span>🧭</span>
          <select
            value={yatraId}
            onChange={(e) => {
              setYatraId(e.target.value);
            }}
            aria-label="Choose yatra"
          >
            {YATRAS.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </label>
        <label className="yj-select">
          <span>{vehicle.icon}</span>
          <select
            value={vehicleId}
            onChange={(e) => {
              setVehicleId(e.target.value);
            }}
            disabled={moving}
            aria-label="Choose vehicle"
          >
            {VEHICLES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <div className="yj-play">
          <button onClick={goPrev} disabled={moving || idx === 0} aria-label="Previous stop">
            ⏮
          </button>
          <button className="main" onClick={toggleAuto}>
            {auto ? '❚❚ Pause' : done ? '↺ Replay' : '▶ Start Yatra'}
          </button>
          <button
            onClick={goNext}
            disabled={moving || idx >= stops.length - 1}
            aria-label="Next stop"
          >
            ⏭
          </button>
          <button onClick={reset} aria-label="Reset">
            ↺
          </button>
        </div>
        <div className="yj-toggles">
          <button
            className={voiceOn ? 'on' : ''}
            onClick={() => {
              if (voiceOn) silence();
              setVoiceOn((v) => !v);
            }}
            aria-pressed={voiceOn}
            title={canSpeak ? 'Voice guide' : 'Voice not supported in this browser — captions only'}
          >
            {voiceOn ? '🔊 Voice guide' : '🔇 Voice off'}
          </button>
          <div className="yj-speed" role="group" aria-label="Guide language">
            {(['en', 'hi'] as const).map((l) => (
              <button
                key={l}
                className={voiceLang === l ? 'on' : ''}
                onClick={() => {
                  silence();
                  setVoiceLang(l);
                }}
              >
                {l === 'en' ? 'EN' : 'हि'}
              </button>
            ))}
          </div>
          <button
            className={follow ? 'on' : ''}
            onClick={() => {
              setFollow((f) => !f);
            }}
            aria-pressed={follow}
          >
            {follow ? '◎ Close follow' : '⤢ Full route'}
          </button>
          <div className="yj-speed" role="group" aria-label="Playback speed">
            {[1, 2, 4].map((m) => (
              <button
                key={m}
                className={mult === m ? 'on' : ''}
                onClick={() => {
                  setMult(m);
                }}
              >
                {m}×
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
