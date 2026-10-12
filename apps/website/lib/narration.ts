import type { JourneyStop, Vehicle, Yatra } from './journey';
import { STOP_HI } from './journey-hi';

export type VoiceLang = 'en' | 'hi';

const VEHICLE_HI: Record<string, string> = {
  erickshaw: 'ई-रिक्शा से',
  auto: 'ऑटो से',
  cab: 'कैब से',
  walk: 'पैदल',
};

const KIND_HI: Record<JourneyStop['kind'], string> = {
  Station: 'स्टेशन',
  Temple: 'मंदिर',
  Ghat: 'घाट',
  Kund: 'कुंड',
  Garden: 'वन',
};

function km(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function minutes(stop: JourneyStop, v: Vehicle): number {
  return Math.max(2, Math.round((stop.kmFromPrev / v.kmh) * 60));
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1] ?? ''}`;
}

function listHi(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} और ${items[items.length - 1] ?? ''}`;
}

function totalKm(y: Yatra): number {
  return y.stops.reduce((sum, s) => sum + s.kmFromPrev, 0);
}

/** Every line is built only from the journey data — the guide never adds facts or times of its own. */
export function welcomeLine(y: Yatra, v: Vehicle, lang: VoiceLang): string {
  const first = y.stops[0];
  if (lang === 'hi') {
    return `राधे राधे! ${y.hiName} में आपका स्वागत है। हम ${String(y.stops.length)} पड़ावों पर जाएँगे, कुल लगभग ${km(totalKm(y))} किलोमीटर। यात्रा ${first?.hiName ?? ''} से शुरू होती है।`;
  }
  return `Radhe Radhe! Welcome to the ${y.name}. We will visit ${String(y.stops.length)} stops, about ${km(totalKm(y))} kilometres in all, travelling by ${v.name.toLowerCase()}. We begin at ${first?.name ?? ''}.`;
}

export function departLine(next: JourneyStop, v: Vehicle, lang: VoiceLang): string {
  const m = minutes(next, v);
  if (lang === 'hi') {
    return `अब हम ${next.hiName} की ओर चलते हैं — लगभग ${km(next.kmFromPrev)} किलोमीटर, ${VEHICLE_HI[v.id] ?? ''} करीब ${String(m)} मिनट।`;
  }
  const how = v.id === 'walk' ? 'on foot' : `by ${v.name.toLowerCase()}`;
  return `Next, we head to ${next.name}, about ${km(next.kmFromPrev)} kilometres away — roughly ${String(m)} minutes ${how}.`;
}

export function arriveLine(stop: JourneyStop, isLast: boolean, lang: VoiceLang): string {
  const seasonal = stop.hours.toLowerCase().includes('live timings');
  if (lang === 'hi') {
    const hi = STOP_HI[stop.id];
    const hl = hi?.highlights.slice(0, 3) ?? [];
    const parts = [
      `हम ${stop.hiName} पहुँच गए हैं।`,
      hi ? hi.about : `यह एक ${KIND_HI[stop.kind]} है।`,
      hl.length ? `यहाँ की विशेषताएँ: ${listHi(hl)}।` : '',
      `यहाँ लगभग ${String(stop.visitMins)} मिनट रुकें।`,
      seasonal ? 'दर्शन का समय मौसम के अनुसार बदलता है, आज का समय ऐप में देखें।' : '',
      hi?.tips[0] ? `यात्री सुझाव: ${hi.tips[0]}।` : '',
      isLast ? 'आपकी यात्रा पूरी हुई। तीर्थ नाउ के साथ यात्रा करने के लिए धन्यवाद। राधे राधे!' : '',
    ];
    return parts.filter(Boolean).join(' ');
  }
  const parts = [
    `We have arrived at ${stop.name}.`,
    stop.about,
    stop.highlights.length ? `Highlights here: ${list(stop.highlights.slice(0, 3))}.` : '',
    `Plan about ${String(stop.visitMins)} minutes here.`,
    seasonal ? 'Darshan timings change with the season, so check today’s timings in the app.' : '',
    stop.tips[0] ? `Pilgrim tip: ${stop.tips[0]}.` : '',
    isLast ? 'That completes our yatra. Thank you for travelling with Tirth Now. Radhe Radhe!' : '',
  ];
  return parts.filter(Boolean).join(' ').replace(/\.\./g, '.');
}

function pickVoice(lang: VoiceLang): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  if (lang === 'hi') return voices.find((v) => v.lang.toLowerCase().startsWith('hi'));
  return (
    voices.find((v) => v.lang === 'en-IN') ??
    voices.find((v) => v.lang.toLowerCase().startsWith('en-gb')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('en'))
  );
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}

/**
 * Speaks a line with the browser's built-in voice (no account or key needed).
 * Resolves when the line finishes, or after a safety timeout because some
 * browsers never fire `end` for long utterances.
 */
export function speak(
  text: string,
  lang: VoiceLang,
  rate: number,
  onStart: () => void,
): Promise<void> {
  const fallbackMs = Math.max(3500, (text.length * 75) / rate);
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      resolve();
    };
    // Show the caption straight away, so the guide still works where audio is unavailable.
    onStart();
    window.setTimeout(finish, fallbackMs + 1500);
    if (!speechSupported()) {
      window.setTimeout(finish, fallbackMs);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    const voice = pickVoice(lang);
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = 1;
    u.onend = finish;
    // No usable voice: give the reader time with the caption instead of skipping ahead.
    u.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') finish();
      else window.setTimeout(finish, fallbackMs);
    };
    window.speechSynthesis.speak(u);
  });
}
