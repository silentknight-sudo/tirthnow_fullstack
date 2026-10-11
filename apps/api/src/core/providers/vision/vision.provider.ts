export interface LandmarkGuess {
  name: string;
  confidence: number;
  lat: number | null;
  lng: number | null;
}

/** Landmark detection on a traveller's photo. */
export interface VisionProvider {
  landmarks(image: Buffer): Promise<LandmarkGuess[]>;
}

export const VISION_PROVIDER = Symbol('VISION_PROVIDER');
