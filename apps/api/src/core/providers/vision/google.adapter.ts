import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { callWithPolicy } from '../call-policy';
import { readJsonOrThrow } from '../http-error';
import { type LandmarkGuess, type VisionProvider } from './vision.provider';

interface AnnotateResponse {
  responses?: {
    landmarkAnnotations?: {
      description?: string;
      score?: number;
      locations?: { latLng?: { latitude?: number; longitude?: number } }[];
    }[];
  }[];
}

/** Google Cloud Vision v1 LANDMARK_DETECTION, API-key auth. */
@Injectable()
export class GoogleVisionAdapter implements VisionProvider {
  private readonly key: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    if (!config.ai.googleApiKey) throw new Error('GOOGLE_CLOUD_API_KEY is not configured');
    this.key = config.ai.googleApiKey;
  }

  async landmarks(image: Buffer): Promise<LandmarkGuess[]> {
    const res = await callWithPolicy('google-vision', async () =>
      readJsonOrThrow<AnnotateResponse>(
        'google-vision',
        await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.key}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                image: { content: image.toString('base64') },
                features: [{ type: 'LANDMARK_DETECTION', maxResults: 5 }],
              },
            ],
          }),
        }),
      ),
    );
    return (res.responses?.[0]?.landmarkAnnotations ?? []).map((a) => {
      const ll = a.locations?.[0]?.latLng;
      return {
        name: a.description ?? '',
        confidence: a.score ?? 0,
        lat: ll?.latitude ?? null,
        lng: ll?.longitude ?? null,
      };
    });
  }
}
