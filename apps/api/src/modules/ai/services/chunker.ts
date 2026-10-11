/** Heading-aware chunking for RAG: ~500 tokens per chunk, ~80 tokens overlap (ARCHITECTURE.md §7). */

export interface Chunk {
  index: number;
  content: string;
  tokenCount: number;
  heading: string | null;
}

/** Rough token estimate good enough for sizing (≈4 chars per token, Devanagari ≈2). */
export function estimateTokens(text: string): number {
  const devanagari = (text.match(/[ऀ-ॿ]/g) ?? []).length;
  return Math.ceil((text.length - devanagari) / 4 + devanagari / 2);
}

interface Section {
  heading: string | null;
  paragraphs: string[];
}

function sections(text: string): Section[] {
  const out: Section[] = [{ heading: null, paragraphs: [] }];
  const trail: string[] = [];
  for (const block of text.replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const h = /^(#{1,6})\s+(.+)$/.exec(trimmed.split('\n')[0] ?? '');
    if (h) {
      const level = (h[1] ?? '#').length;
      trail.length = level - 1;
      trail[level - 1] = (h[2] ?? '').trim();
      out.push({ heading: trail.filter(Boolean).join(' › '), paragraphs: [] });
      const rest = trimmed.split('\n').slice(1).join('\n').trim();
      if (rest) out.at(-1)?.paragraphs.push(rest);
      continue;
    }
    out.at(-1)?.paragraphs.push(trimmed);
  }
  return out.filter((s) => s.paragraphs.length > 0);
}

/** Split long paragraphs on sentence boundaries so no piece exceeds the target. */
function pieces(paragraph: string, target: number): string[] {
  if (estimateTokens(paragraph) <= target) return [paragraph];
  const sentences = paragraph.match(/[^.!?।]+[.!?।]+["')\]]*\s*|[^.!?।]+$/g) ?? [paragraph];
  const out: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && estimateTokens(cur + s) > target) {
      out.push(cur.trim());
      cur = '';
    }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function tail(text: string, tokens: number): string {
  const chars = tokens * 4;
  if (text.length <= chars) return text;
  const cut = text.slice(text.length - chars);
  const space = cut.indexOf(' ');
  return space > 0 ? cut.slice(space + 1) : cut;
}

export function chunkText(text: string, opts: { target?: number; overlap?: number } = {}): Chunk[] {
  const target = opts.target ?? 500;
  const overlap = opts.overlap ?? 80;
  const chunks: Chunk[] = [];
  for (const section of sections(text)) {
    const prefix = section.heading ? `${section.heading}\n\n` : '';
    let body = '';
    let carried = '';
    const flush = () => {
      if (!body.trim()) return;
      const content = `${prefix}${carried ? `${carried} ` : ''}${body.trim()}`;
      chunks.push({
        index: chunks.length,
        content,
        tokenCount: estimateTokens(content),
        heading: section.heading,
      });
      carried = tail(body.trim(), overlap);
      body = '';
    };
    for (const p of section.paragraphs.flatMap((para) => pieces(para, target))) {
      if (body && estimateTokens(body + p) > target) flush();
      body += `${p}\n\n`;
    }
    flush();
  }
  return chunks;
}
