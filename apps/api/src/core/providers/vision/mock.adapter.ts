import { Injectable } from '@nestjs/common';
import { type LandmarkGuess, type VisionProvider } from './vision.provider';

/** Always "sees" Banke Bihari at low confidence; the AI module refines with the photo's location. */
@Injectable()
export class MockVisionAdapter implements VisionProvider {
  landmarks(): Promise<LandmarkGuess[]> {
    return Promise.resolve([
      { name: 'Banke Bihari Temple', confidence: 0.42, lat: 27.5806, lng: 77.6996 },
    ]);
  }
}
