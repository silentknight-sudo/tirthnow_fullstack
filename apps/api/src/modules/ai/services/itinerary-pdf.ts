import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { type Lang } from '@tirth-now/shared-types';
import PDFDocument from 'pdfkit';
import { type ItineraryResponse } from './itineraries.service';

/** Brand palette (ADR-0018). */
const C = {
  navy: '#1B2A4E',
  navySoft: '#2C3E6B',
  saffron: '#FF9933',
  saffronSoft: '#FFF3E4',
  ink: '#1F2333',
  muted: '#6B7083',
  line: '#E7E2D9',
  paper: '#FFFCF7',
  zebra: '#FAF6EF',
};

const KIND_COLOR: Record<string, string> = {
  aarti: '#E8590C',
  temple: '#1B2A4E',
  meal: '#2F9E44',
  rest: '#7048E8',
  travel: '#1C7ED6',
  stay: '#C2255C',
  explore: '#0C8599',
  custom: '#F08C00',
};

const ASSETS = [join(__dirname, '..', '..', '..', '..', 'assets'), join(process.cwd(), 'assets')];
const asset = (name: string) => ASSETS.map((d) => join(d, name)).find((p) => existsSync(p));

const L = {
  en: {
    itinerary: 'YATRA ITINERARY',
    dates: 'Dates',
    days: 'Days',
    pilgrims: 'Pilgrims',
    budget: 'Est. cost',
    pace: 'Pace',
    group: 'Yatra group',
    name: 'Name',
    age: 'Age',
    role: 'Role',
    phone: 'Phone',
    stay: 'Stay',
    travel: 'Travel',
    rooms: 'room(s)',
    perNight: '/ room / night',
    checkIn: 'Check-in',
    arrive: 'Arrive',
    depart: 'Depart',
    local: 'Getting around',
    day: 'DAY',
    notes: 'Notes',
    address: 'Address',
    perPerson: 'per person',
    travelMin: (m: number) => `~${String(m)} min travel`,
    footer: 'Planned with TirthNow · Every tirth, right now',
    disclaimer:
      'Aarti and darshan times come from temple schedules and can change on festival days. Please confirm locally.',
    custom: 'Custom plan',
    ai: 'AI-assisted plan',
  },
  hi: {
    itinerary: 'यात्रा कार्यक्रम',
    dates: 'तिथियाँ',
    days: 'दिन',
    pilgrims: 'यात्री',
    budget: 'अनुमानित ख़र्च',
    pace: 'गति',
    group: 'यात्रा समूह',
    name: 'नाम',
    age: 'आयु',
    role: 'भूमिका',
    phone: 'फ़ोन',
    stay: 'ठहरना',
    travel: 'यात्रा',
    rooms: 'कमरे',
    perNight: '/ कमरा / रात',
    checkIn: 'चेक-इन',
    arrive: 'आगमन',
    depart: 'वापसी',
    local: 'स्थानीय साधन',
    day: 'दिन',
    notes: 'नोट्स',
    address: 'पता',
    perPerson: 'प्रति व्यक्ति',
    travelMin: (m: number) => `~${String(m)} मिनट यात्रा`,
    footer: 'TirthNow के साथ योजना · हर तीर्थ, आपके साथ',
    disclaimer:
      'आरती और दर्शन के समय मंदिर की सूची से लिए गए हैं; त्योहारों पर बदल सकते हैं। कृपया स्थानीय रूप से पुष्टि करें।',
    custom: 'आपकी अपनी योजना',
    ai: 'AI सहायता से योजना',
  },
};

const ROLE: Record<string, { en: string; hi: string }> = {
  organiser: { en: 'Organiser', hi: 'आयोजक' },
  member: { en: 'Member', hi: 'सदस्य' },
  elder: { en: 'Elder', hi: 'बुज़ुर्ग' },
  child: { en: 'Child', hi: 'बच्चा' },
};
const MODE: Record<string, { en: string; hi: string }> = {
  train: { en: 'Train', hi: 'ट्रेन' },
  bus: { en: 'Bus', hi: 'बस' },
  car: { en: 'Car', hi: 'कार' },
  flight: { en: 'Flight', hi: 'फ़्लाइट' },
  other: { en: 'Other', hi: 'अन्य' },
  e_rickshaw: { en: 'E-rickshaw', hi: 'ई-रिक्शा' },
  cab: { en: 'Cab', hi: 'कैब' },
  walk: { en: 'On foot', hi: 'पैदल' },
  own_vehicle: { en: 'Own vehicle', hi: 'अपना वाहन' },
};
const PACE: Record<string, { en: string; hi: string }> = {
  relaxed: { en: 'Relaxed', hi: 'आराम से' },
  normal: { en: 'Moderate', hi: 'सामान्य' },
  packed: { en: 'Packed', hi: 'व्यस्त' },
};

const DEVANAGARI = /[ऀ-ॿ]/;

export function renderItineraryPdf(r: ItineraryResponse, lang: Lang): Promise<Buffer> {
  const tx = lang === 'hi' ? L.hi : L.en;
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 56, left: 40, right: 40 },
    bufferPages: true,
    info: { Title: r.title, Author: 'TirthNow', Subject: 'Yatra itinerary' },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) =>
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    }),
  );

  // Fonts (bundled, OFL). Fall back to built-ins if missing.
  const reg = (name: string, file: string, fallback: string) => {
    const p = asset(`fonts/${file}`);
    doc.registerFont(name, p ?? fallback);
  };
  // Noto Sans Devanagari merged with Noto Sans: one font draws Hindi, English and ₹.
  reg('sans', 'NotoSansIndic-Regular.ttf', 'Helvetica');
  reg('sans-b', 'NotoSansIndic-Bold.ttf', 'Helvetica-Bold');
  reg('deva', 'NotoSansIndic-Regular.ttf', 'Helvetica');
  reg('deva-b', 'NotoSansIndic-Bold.ttf', 'Helvetica-Bold');
  reg('brand', 'Poppins-Bold.ttf', 'Helvetica-Bold');
  reg('brand-sb', 'Poppins-SemiBold.ttf', 'Helvetica-Bold');
  reg('display', 'CormorantGaramond-Bold.ttf', 'Times-Bold');
  const logo = asset('logo.png');

  /** Picks a font that can draw the text (Devanagari or Latin). */
  const f = (text: string, bold = false) =>
    DEVANAGARI.test(text) ? (bold ? 'deva-b' : 'deva') : bold ? 'sans-b' : 'sans';

  const W = doc.page.width;
  const H = doc.page.height;
  const M = 40;
  const CW = W - 2 * M;

  const watermark = () => {
    doc.save();
    doc.rect(0, 0, W, H).fill(C.paper);
    doc.opacity(0.045);
    doc.rotate(-32, { origin: [W / 2, H / 2] });
    doc
      .font('brand')
      .fontSize(110)
      .fillColor(C.navy)
      .text('TirthNow', 0, H / 2 - 70, { width: W, align: 'center', lineBreak: false });
    doc.restore();
    if (logo) {
      doc.save();
      doc.opacity(0.05);
      doc.image(logo, W / 2 - 90, H / 2 + 40, { width: 180 });
      doc.restore();
    }
    doc.opacity(1);
  };
  watermark();
  doc.on('pageAdded', () => {
    watermark();
    // Slim brand bar on continuation pages.
    doc.rect(0, 0, W, 6).fill(C.saffron);
    doc.y = 40;
  });

  const ensure = (h: number) => {
    if (doc.y + h > H - 70) doc.addPage();
  };

  // ── Hero header ────────────────────────────────────────────────────────
  const heroH = 168;
  doc.rect(0, 0, W, heroH).fill(C.navy);
  doc
    .save()
    .circle(W - 60, 30, 120)
    .fillOpacity(0.08)
    .fill('#FFFFFF')
    .restore();
  doc.rect(0, heroH, W, 5).fill(C.saffron);
  if (logo) {
    doc.circle(M + 24, 44, 24).fill('#FFFFFF');
    doc.image(logo, M + 6, 26, { width: 36 });
  }
  doc
    .font('brand')
    .fontSize(22)
    .fillColor('#FFFFFF')
    .text('Tirth', M + 58, 30, { continued: true });
  doc.fillColor(C.saffron).text('Now');
  doc
    .font(f(tx.itinerary, true))
    .fontSize(8.5)
    .fillColor('#C9D1E6')
    .text(tx.itinerary, M + 58, 58, { characterSpacing: lang === 'hi' ? 0 : 2 });
  doc
    .font(DEVANAGARI.test(r.title) ? 'deva-b' : 'display')
    .fontSize(DEVANAGARI.test(r.title) ? 24 : 30)
    .fillColor('#FFFFFF')
    .text(r.title, M, 88, { width: CW - 120, height: 44, ellipsis: true });
  const end = new Date(`${r.startDate}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + r.days - 1);
  const fmtDate = (d: Date) =>
    d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  const range = `${fmtDate(new Date(`${r.startDate}T00:00:00Z`))} – ${fmtDate(end)}`;
  doc.font(f(range)).fontSize(10.5).fillColor('#E6EAF5').text(range, M, 136);
  const badge = r.trip.mode === 'custom' ? tx.custom : tx.ai;
  doc.font(f(badge, true)).fontSize(8.5);
  const bw = doc.widthOfString(badge) + 20;
  doc.roundedRect(W - M - bw, 134, bw, 18, 9).fill(C.saffron);
  doc.fillColor(C.navy).text(badge, W - M - bw, 137.5, { width: bw, align: 'center' });

  // ── Summary cards ──────────────────────────────────────────────────────
  doc.y = heroH + 22;
  const perPerson = r.partySize > 0 ? Math.round(r.estimatedCostPaise / r.partySize) : 0;
  const rupees = (p: number) => `₹${Math.round(p / 100).toLocaleString('en-IN')}`;
  const cards: [string, string, string?][] = [
    [tx.days, String(r.days)],
    [tx.pilgrims, String(r.partySize)],
    [tx.pace, (PACE[r.trip.pace] ?? PACE.normal)?.[lang] ?? r.trip.pace],
    [tx.budget, rupees(r.estimatedCostPaise), `${rupees(perPerson)} ${tx.perPerson}`],
  ];
  const gap = 10;
  const cw = (CW - gap * 3) / 4;
  const cy = doc.y;
  cards.forEach(([k, v, sub], i) => {
    const x = M + i * (cw + gap);
    doc.roundedRect(x, cy, cw, 62, 10).fillAndStroke('#FFFFFF', C.line);
    doc.rect(x, cy + 10, 3, 42).fill(C.saffron);
    doc
      .font(f(k))
      .fontSize(8.5)
      .fillColor(C.muted)
      .text(k.toUpperCase(), x + 12, cy + 10, {
        width: cw - 18,
      });
    doc
      .font(DEVANAGARI.test(v) ? 'deva-b' : v.includes('₹') ? 'sans-b' : 'brand')
      .fontSize(17)
      .fillColor(C.navy)
      .text(v, x + 12, cy + 24, { width: cw - 18, lineBreak: false, ellipsis: true });
    if (sub)
      doc
        .font(f(sub))
        .fontSize(7.5)
        .fillColor(C.muted)
        .text(sub, x + 12, cy + 46, { width: cw - 18, lineBreak: false, ellipsis: true });
  });
  doc.y = cy + 62 + 20;

  const sectionTitle = (title: string) => {
    ensure(40);
    const y = doc.y;
    doc
      .font(DEVANAGARI.test(title) ? 'deva-b' : 'brand-sb')
      .fontSize(13)
      .fillColor(C.navy);
    doc.text(title, M, y);
    doc
      .moveTo(M, doc.y + 3)
      .lineTo(M + 36, doc.y + 3)
      .lineWidth(2.5)
      .strokeColor(C.saffron)
      .stroke();
    doc.y += 12;
  };

  // ── Group members ──────────────────────────────────────────────────────
  const members = r.trip.members;
  if (members.length) {
    sectionTitle(r.trip.groupName ? `${tx.group} · ${r.trip.groupName}` : tx.group);
    const cols = [
      { k: '#', w: 26 },
      { k: tx.name, w: CW * 0.4 },
      { k: tx.age, w: 50 },
      { k: tx.role, w: 90 },
      { k: tx.phone, w: 0 },
    ];
    const fixed = cols.reduce((s, c) => s + c.w, 0);
    const last = cols[cols.length - 1];
    if (last) last.w = CW - fixed;
    const row = (vals: string[], y: number, head: boolean, zebra: boolean) => {
      if (head) doc.roundedRect(M, y, CW, 22, 6).fill(C.navy);
      else if (zebra) doc.rect(M, y, CW, 22).fill(C.zebra);
      let x = M + 8;
      vals.forEach((v, i) => {
        const w = (cols[i]?.w ?? 40) - 8;
        doc
          .font(f(v, head))
          .fontSize(head ? 8.5 : 9.5)
          .fillColor(head ? '#FFFFFF' : C.ink)
          .text(v, x, y + 6, { width: w, lineBreak: false, ellipsis: true });
        x += cols[i]?.w ?? 40;
      });
    };
    ensure(26);
    const hy = doc.y;
    row(
      cols.map((c) => c.k),
      hy,
      true,
      false,
    );
    doc.y = hy + 24;
    members.forEach((m, i) => {
      ensure(24);
      const ry = doc.y;
      row(
        [
          String(i + 1),
          m.name,
          m.age === undefined ? '—' : String(m.age),
          m.role ? (ROLE[m.role]?.[lang] ?? m.role) : '—',
          m.phone ?? '—',
        ],
        ry,
        false,
        i % 2 === 1,
      );
      doc.y = ry + 22;
    });
    doc.y += 16;
  }

  // ── Stay and travel cards ──────────────────────────────────────────────
  const stay = r.trip.stay;
  const travel = r.trip.travel;
  if (stay || travel) {
    ensure(120);
    const y0 = doc.y;
    const both = !!stay && !!travel;
    const w = both ? (CW - 12) / 2 : CW;
    const card = (x: number, title: string, accent: string, lines: [string, string][]) => {
      const h = 34 + lines.length * 17 + 8;
      doc.roundedRect(x, y0, w, h, 12).fillAndStroke('#FFFFFF', C.line);
      doc.roundedRect(x, y0, w, 26, 12).fill(accent);
      doc.rect(x, y0 + 14, w, 12).fill(accent);
      doc
        .font(DEVANAGARI.test(title) ? 'deva-b' : 'brand-sb')
        .fontSize(10.5)
        .fillColor('#FFFFFF')
        .text(title, x + 12, y0 + 7);
      let y = y0 + 34;
      for (const [k, v] of lines) {
        doc
          .font(f(k))
          .fontSize(8.5)
          .fillColor(C.muted)
          .text(k, x + 12, y, { width: 82 });
        doc
          .font(f(v, true))
          .fontSize(9.5)
          .fillColor(C.ink)
          .text(v, x + 96, y, { width: w - 108, lineBreak: false, ellipsis: true });
        y += 17;
      }
      return h;
    };
    let h1 = 0;
    let h2 = 0;
    if (stay) {
      const lines: [string, string][] = [[tx.name, stay.name]];
      if (stay.rooms) lines.push([tx.rooms, String(stay.rooms)]);
      if (stay.nightlyPaise) lines.push(['₹', `${rupees(stay.nightlyPaise)} ${tx.perNight}`]);
      if (stay.checkInTime) lines.push([tx.checkIn, stay.checkInTime]);
      if (stay.address) lines.push([tx.address, stay.address]);
      if (stay.notes) lines.push([tx.notes, stay.notes]);
      h1 = card(M, tx.stay, '#C2255C', lines);
    }
    if (travel) {
      const mode = MODE[travel.arrivalMode]?.[lang] ?? travel.arrivalMode;
      const lines: [string, string][] = [
        [tx.arrive, [mode, travel.from, travel.arrivalTime].filter(Boolean).join(' · ')],
      ];
      if (travel.departureTime) lines.push([tx.depart, travel.departureTime]);
      if (travel.localTransport)
        lines.push([tx.local, MODE[travel.localTransport]?.[lang] ?? travel.localTransport]);
      if (travel.details) lines.push([tx.notes, travel.details]);
      h2 = card(both ? M + w + 12 : M, tx.travel, '#1C7ED6', lines);
    }
    doc.y = y0 + Math.max(h1, h2) + 22;
  }

  if (r.trip.notes) {
    sectionTitle(tx.notes);
    doc.font(f(r.trip.notes)).fontSize(10).fillColor(C.ink).text(r.trip.notes, M, doc.y, {
      width: CW,
    });
    doc.y += 16;
  }

  // ── Day-by-day timeline ────────────────────────────────────────────────
  const time = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : '';
  for (const d of r.dayList) {
    ensure(70);
    const dateLabel = new Date(`${d.date}T00:00:00Z`).toLocaleDateString(
      lang === 'hi' ? 'hi-IN' : 'en-IN',
      { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' },
    );
    const y = doc.y;
    doc.roundedRect(M, y, CW, 30, 15).fill(C.navy);
    doc.circle(M + 15, y + 15, 15).fill(C.saffron);
    doc
      .font('brand')
      .fontSize(13)
      .fillColor(C.navy)
      .text(String(d.dayIndex + 1), M, y + 7.5, { width: 30, align: 'center' });
    doc
      .font(f(tx.day, true))
      .fontSize(9)
      .fillColor(C.saffron)
      .text(tx.day, M + 40, y + 10, { continued: false });
    doc
      .font(f(dateLabel, true))
      .fontSize(11)
      .fillColor('#FFFFFF')
      .text(dateLabel, M + 80, y + 8.5, { width: CW - 90 });
    doc.y = y + 40;
    if (d.note) {
      doc
        .font(f(d.note))
        .fontSize(9.5)
        .fillColor(C.muted)
        .text(d.note, M + 10, doc.y, { width: CW - 20 });
      doc.y += 8;
    }
    const lineX = M + 62;
    d.items.forEach((item, idx) => {
      const sub = [
        item.travelDurationMin ? tx.travelMin(item.travelDurationMin) : null,
        item.estCostPaise ? rupees(item.estCostPaise) : null,
        item.note,
      ]
        .filter(Boolean)
        .join('  ·  ');
      doc.font(f(item.title, true)).fontSize(10.5);
      const th = doc.heightOfString(item.title, { width: CW - 90 });
      doc.font(f(sub)).fontSize(8.5);
      const sh = sub ? doc.heightOfString(sub, { width: CW - 90 }) : 0;
      const h = Math.max(30, th + sh + 12);
      ensure(h + 4);
      const top = doc.y;
      const color = KIND_COLOR[item.kind] ?? C.navy;
      // time
      doc
        .font('brand-sb')
        .fontSize(10.5)
        .fillColor(C.navy)
        .text(time(item.startsAt), M, top + 2, { width: 50, align: 'right' });
      // rail
      if (idx < d.items.length - 1)
        doc
          .moveTo(lineX, top + 10)
          .lineTo(lineX, top + h + 4)
          .lineWidth(1.5)
          .strokeColor(C.line)
          .stroke();
      doc.circle(lineX, top + 8, 5.5).fill(color);
      doc.circle(lineX, top + 8, 2.2).fill('#FFFFFF');
      // content
      doc
        .font(f(item.title, true))
        .fontSize(10.5)
        .fillColor(C.ink)
        .text(item.title, lineX + 16, top, { width: CW - 90 });
      if (sub)
        doc
          .font(f(sub))
          .fontSize(8.5)
          .fillColor(C.muted)
          .text(sub, lineX + 16, doc.y + 1, { width: CW - 90 });
      doc.y = top + h + 4;
    });
    doc.y += 12;
  }

  // ── Disclaimer ─────────────────────────────────────────────────────────
  ensure(40);
  doc.roundedRect(M, doc.y, CW, 32, 8).fill(C.saffronSoft);
  doc
    .font(f(tx.disclaimer))
    .fontSize(8.5)
    .fillColor('#8A5A1F')
    .text(tx.disclaimer, M + 12, doc.y + 9, { width: CW - 24 });

  // ── Footer on every page ───────────────────────────────────────────────
  const range2 = doc.bufferedPageRange();
  for (let i = range2.start; i < range2.start + range2.count; i++) {
    doc.switchToPage(i);
    // Writing inside the bottom margin must not start a new page.
    doc.page.margins.bottom = 0;
    const fy = H - 40;
    doc
      .moveTo(M, fy - 8)
      .lineTo(W - M, fy - 8)
      .lineWidth(0.7)
      .strokeColor(C.line)
      .stroke();
    doc
      .font(f(tx.footer))
      .fontSize(8)
      .fillColor(C.muted)
      .text(tx.footer, M, fy, { width: CW / 2, lineBreak: false });
    doc
      .font('sans')
      .fontSize(8)
      .fillColor(C.muted)
      .text(`${String(i + 1)} / ${String(range2.count)}`, W / 2, fy, {
        width: CW / 2,
        align: 'right',
        lineBreak: false,
      });
  }
  doc.end();
  return done;
}
