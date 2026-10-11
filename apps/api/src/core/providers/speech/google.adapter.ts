import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { callWithPolicy } from '../call-policy';
import { readJsonOrThrow } from '../http-error';
import {
  type SpeechLang,
  type SpeechToTextProvider,
  type TextToSpeechProvider,
  type Transcript,
} from './speech.provider';

const ENCODINGS: Record<string, string> = {
  'audio/ogg': 'OGG_OPUS',
  'audio/webm': 'WEBM_OPUS',
  'audio/mpeg': 'MP3',
  'audio/wav': 'LINEAR16',
};

/** Google Cloud Speech-to-Text v1 (hi-IN primary, en-IN alternative), API-key auth. */
@Injectable()
export class GoogleSpeechToTextAdapter implements SpeechToTextProvider {
  private readonly key: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    if (!config.ai.googleApiKey) throw new Error('GOOGLE_CLOUD_API_KEY is not configured');
    this.key = config.ai.googleApiKey;
  }

  async transcribe(audio: Buffer, mimeType: string): Promise<Transcript> {
    const encoding = ENCODINGS[mimeType];
    const res = await callWithPolicy('google-stt', async () =>
      readJsonOrThrow<{
        results?: {
          alternatives?: { transcript?: string; confidence?: number }[];
          languageCode?: string;
        }[];
      }>(
        'google-stt',
        await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${this.key}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            config: {
              ...(encoding ? { encoding } : {}),
              languageCode: 'hi-IN',
              alternativeLanguageCodes: ['en-IN'],
              enableAutomaticPunctuation: true,
              model: 'latest_short',
            },
            audio: { content: audio.toString('base64') },
          }),
        }),
      ),
    );
    const best = res.results?.[0];
    const alt = best?.alternatives?.[0];
    return {
      text:
        res.results
          ?.map((r) => r.alternatives?.[0]?.transcript ?? '')
          .join(' ')
          .trim() ?? '',
      lang: best?.languageCode?.startsWith('en') ? 'en' : 'hi',
      confidence: alt?.confidence ?? 0,
    };
  }
}

/** Google Cloud Text-to-Speech v1, MP3 output, Indian voices. */
@Injectable()
export class GoogleTextToSpeechAdapter implements TextToSpeechProvider {
  private readonly key: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    if (!config.ai.googleApiKey) throw new Error('GOOGLE_CLOUD_API_KEY is not configured');
    this.key = config.ai.googleApiKey;
  }

  async synthesize(text: string, lang: SpeechLang): Promise<Buffer> {
    const res = await callWithPolicy('google-tts', async () =>
      readJsonOrThrow<{ audioContent: string }>(
        'google-tts',
        await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.key}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            input: { text },
            voice: { languageCode: lang === 'hi' ? 'hi-IN' : 'en-IN' },
            audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 },
          }),
        }),
      ),
    );
    return Buffer.from(res.audioContent, 'base64');
  }
}
