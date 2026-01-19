import { ImageGenerateResult } from './image-generate-result.interface';
import { ImageSearchResult } from './image-search-result.interface';

export interface ImageSearchProvider {
  search(text: string, sourceLang?: string): Promise<ImageSearchResult[]>;
}

export interface ImageGenerateProvider {
  generate(text: string): Promise<ImageGenerateResult>;
}

export interface ImageProvider
  extends ImageSearchProvider,
    ImageGenerateProvider {}
