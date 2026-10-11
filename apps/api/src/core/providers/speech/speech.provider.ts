export type SpeechLang = 'hi' | 'en';

export interface Transcript {
  text: string;
  /** Detected language of the speech. */
  lang: SpeechLang;
  confidence: number;
}

/** Speech-to-text for voice questions (Hindi and Indian English). */
export interface SpeechToTextProvider {
  transcribe(audio: Buffer, mimeType: string): Promise<Transcript>;
}

/** Text-to-speech for spoken answers; returns MP3. */
export interface TextToSpeechProvider {
  synthesize(text: string, lang: SpeechLang): Promise<Buffer>;
}

export const STT_PROVIDER = Symbol('STT_PROVIDER');
export const TTS_PROVIDER = Symbol('TTS_PROVIDER');
