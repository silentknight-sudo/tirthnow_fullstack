/**
 * Identify a file from its first bytes. Uploads are trusted only after the sniffed type
 * matches the declared one (a .jpg that is really an executable is rejected).
 */
export function sniffMimeType(head: Buffer): string | null {
  const starts = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  const ascii = (offset: number, text: string) =>
    head.subarray(offset, offset + text.length).toString('latin1') === text;

  if (starts(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return 'image/webp';
  if (ascii(0, 'RIFF') && ascii(8, 'WAVE')) return 'audio/wav';
  if (ascii(0, '%PDF-')) return 'application/pdf';
  if (ascii(0, 'OggS')) return 'audio/ogg';
  if (starts(0x1a, 0x45, 0xdf, 0xa3)) return 'audio/webm';
  if (ascii(0, 'ID3') || starts(0xff, 0xfb) || starts(0xff, 0xf3)) return 'audio/mpeg';
  if (starts(0xff, 0xf1) || starts(0xff, 0xf9)) return 'audio/aac';
  if (ascii(4, 'ftyp')) {
    const brand = head.subarray(8, 12).toString('latin1');
    if (brand === 'qt  ') return 'video/quicktime';
    if (['heic', 'heix', 'mif1', 'msf1'].includes(brand)) return 'image/heic';
    if (brand === 'M4A ') return 'audio/mp4';
    return 'video/mp4';
  }
  if (head.length > 0 && isProbablyText(head)) return 'text/plain';
  return null;
}

function isProbablyText(buf: Buffer): boolean {
  if (buf.includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buf.subarray(0, Math.max(0, buf.length - 4)));
    return true;
  } catch {
    return false;
  }
}

/** Declared vs sniffed: markdown sniffs as text; m4a audio may sniff as mp4. */
export function mimeMatches(declared: string, sniffed: string | null): boolean {
  if (sniffed === null) return false;
  if (declared === sniffed) return true;
  if (declared === 'text/markdown' && sniffed === 'text/plain') return true;
  if (declared === 'audio/mp4' && sniffed === 'video/mp4') return true;
  return false;
}
