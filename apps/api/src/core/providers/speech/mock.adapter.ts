import { Injectable } from '@nestjs/common';
import {
  type SpeechLang,
  type SpeechToTextProvider,
  type TextToSpeechProvider,
  type Transcript,
} from './speech.provider';

const DEFAULT_TRANSCRIPT = 'Banke Bihari mandir kab khulta hai?';
const MARKER = 'TRANSCRIPT:';

/**
 * Returns a fixed Hinglish question; audio whose bytes contain `TRANSCRIPT:<text>` (test
 * fixtures) transcribes to that text instead.
 */
@Injectable()
export class MockSpeechToTextAdapter implements SpeechToTextProvider {
  transcribe(audio: Buffer): Promise<Transcript> {
    const raw = audio.toString('utf8');
    const i = raw.indexOf(MARKER);
    const text =
      i >= 0
        ? raw
            .slice(i + MARKER.length)
            .split('\n')[0]
            ?.trim() || DEFAULT_TRANSCRIPT
        : DEFAULT_TRANSCRIPT;
    return Promise.resolve({ text, lang: /[ऀ-ॿ]/.test(text) ? 'hi' : 'en', confidence: 0.9 });
  }
}

/** A tiny valid MPEG frame header plus silence (players accept it). */
const SILENT_MP3 = Buffer.concat([
  Buffer.from('ID3\u0003\u0000\u0000\u0000\u0000\u0000\u0000', 'latin1'),
  Buffer.from([0xff, 0xfb, 0x90, 0x64]),
  Buffer.alloc(413, 0),
]);

@Injectable()
export class MockTextToSpeechAdapter implements TextToSpeechProvider {
  synthesize(_text: string, _lang: SpeechLang): Promise<Buffer> {
    return Promise.resolve(SILENT_MP3);
  }
}
