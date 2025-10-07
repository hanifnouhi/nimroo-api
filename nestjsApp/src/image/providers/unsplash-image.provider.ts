// src/translate/providers/azure-translate.provider.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ImageSearchProvider } from './image-provider.interface';
import { ImageSearchResult } from './image-search-result.interface';

@Injectable()
export class UnsplashImageProvider implements ImageSearchProvider {
  constructor(
    private configService: ConfigService
  ) {}

  async search(text: string): Promise<ImageSearchResult[]> {
    console.log('search image for text');
    const endpoint = this.configService.get<string>('UNSPLASH_IMAGE_SEARCH_URL');
    const accessKey = this.configService.get<string>('UNSPLASH_IMAGE_SEARCH_ACCESS_KEY');
    
    try {
      const response = await axios.get(endpoint!, {
        params: { 
          client_id: accessKey, 
          query: text,
          per_page: 5
        },
        headers: {
          'Content-type': 'application/json',
        },
      });

      const imagesUrls: { url: string, download: string }[] = [];
      response.data.results.forEach((element: { [k: string]: any }) => {
        if (element?.urls?.small) {
          imagesUrls.push({
            url: element.urls.small,
            download: element?.links?.download || element?.links?.download_location || element.urls.small,
          });
        }
      });
      return imagesUrls;
    } catch (error) {
      console.error('Unsplash Image API error:', (error as any).message);
      throw error;
    }
  }
}
