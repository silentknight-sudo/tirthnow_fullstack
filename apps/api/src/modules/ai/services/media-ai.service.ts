import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { type Lang } from '@tirth-now/shared-types';
import { type AuthPrincipal } from '../../../core/auth';
import { CacheService } from '../../../core/cache';
import { haversineKm } from '../../../core/geo';
import { tokens } from '../../../core/i18n';
import {
  STT_PROVIDER,
  type SpeechToTextProvider,
  TTS_PROVIDER,
  type TextToSpeechProvider,
  VISION_PROVIDER,
  type VisionProvider,
} from '../../../core/providers';
import { CatalogFacade } from '../../catalog';
import { FilesFacade } from '../../files';
import { type LandmarkDto, type SpeakDto, type TranscribeDto } from '../dto/ai.dto';
import { QuotaService } from './quota.service';

const TTS_CACHE_S = 30 * 86_400;

export interface LandmarkMatch {
  templeId: string;
  name: string;
  confidence: number;
  distanceKm: number | null;
}

/** Voice (speech in and out) and landmark recognition. */
@Injectable()
export class MediaAiService {
  constructor(
    private readonly files: FilesFacade,
    private readonly catalog: CatalogFacade,
    private readonly cache: CacheService,
    private readonly quota: QuotaService,
    @Inject(STT_PROVIDER) private readonly stt: SpeechToTextProvider,
    @Inject(TTS_PROVIDER) private readonly tts: TextToSpeechProvider,
    @Inject(VISION_PROVIDER) private readonly vision: VisionProvider,
  ) {}

  async transcribe(
    user: AuthPrincipal,
    dto: TranscribeDto,
  ): Promise<{ text: string; lang: Lang; confidence: number }> {
    const media = await this.files.requireReady(dto.mediaId, {
      ownerUserId: user.userId,
      purposes: ['voice_note'],
    });
    await this.quota.consume(user);
    const r = await this.stt.transcribe(await this.files.read(media), media.mimeType);
    return { text: r.text, lang: r.lang, confidence: r.confidence };
  }

  /** Spoken answer as an MP3 URL; identical text is synthesised once. */
  async speak(
    user: AuthPrincipal,
    dto: SpeakDto,
    reqLang: Lang,
  ): Promise<{ url: string; cached: boolean }> {
    const lang = dto.lang ?? (/[ऀ-ॿ]/.test(dto.text) ? 'hi' : reqLang);
    const key = `tts:${lang}:${createHash('sha256').update(dto.text.trim()).digest('hex')}`;
    const cachedId = await this.cache.get<string>(key);
    if (cachedId) {
      const asset = await this.files.get(cachedId);
      if (asset?.status === 'ready') return { url: await this.files.url(asset), cached: true };
    }
    await this.quota.consume(user);
    const audio = await this.tts.synthesize(dto.text.trim(), lang);
    const asset = await this.files.storeGenerated({
      ownerUserId: null,
      folder: 'tts',
      body: audio,
      mimeType: 'audio/mpeg',
      kind: 'audio',
      bucket: 'public',
    });
    await this.cache.set(key, asset.id, TTS_CACHE_S);
    return { url: await this.files.url(asset), cached: false };
  }

  /** Vision guesses + the photo's location, matched against our temples. */
  async landmark(
    user: AuthPrincipal,
    dto: LandmarkDto,
    lang: Lang,
  ): Promise<{ matches: LandmarkMatch[] }> {
    const media = await this.files.requireReady(dto.mediaId, {
      ownerUserId: user.userId,
      purposes: ['landmark_photo'],
    });
    await this.quota.consume(user);
    const guesses = await this.vision.landmarks(await this.files.read(media));
    const temples = await this.catalog.temples({}, lang);
    const here =
      dto.lat !== undefined && dto.lng !== undefined ? { lat: dto.lat, lng: dto.lng } : null;
    const scored = temples.map((t) => {
      let score = 0;
      const nameTokens = new Set(tokens(t.name));
      for (const g of guesses) {
        const overlap = tokens(g.name).filter((w) => nameTokens.has(w)).length;
        const nameScore = overlap / Math.max(1, Math.min(nameTokens.size, tokens(g.name).length));
        const near =
          g.lat !== null && g.lng !== null && haversineKm({ lat: g.lat, lng: g.lng }, t) < 0.5
            ? 0.3
            : 0;
        score = Math.max(score, g.confidence * Math.min(1, nameScore + near));
      }
      const distanceKm = here ? Math.round(haversineKm(here, t) * 100) / 100 : null;
      // A photo taken at the temple is strong evidence on its own.
      if (distanceKm !== null)
        score = Math.max(score, distanceKm < 0.15 ? 0.8 : distanceKm < 0.5 ? 0.5 : score);
      if (distanceKm !== null && distanceKm > 5) score *= 0.3;
      return {
        templeId: t.id,
        name: t.name,
        confidence: Math.round(score * 100) / 100,
        distanceKm,
      };
    });
    return {
      matches: scored
        .filter((m) => m.confidence >= 0.2)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3),
    };
  }
}
