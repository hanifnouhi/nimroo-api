import { ImageSearchResult } from "./image-search-result.interface";

export interface ImageSearchProvider {
    search(text: string, sourceLang?: string): Promise<ImageSearchResult[]>
}