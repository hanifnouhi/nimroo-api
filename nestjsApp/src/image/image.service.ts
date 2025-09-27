import { Inject, Injectable } from '@nestjs/common';
import { TranslateService } from '../translate/translate.service';
import { SearchImageDto } from './dtos/search-image.dto';
import { SearchImageResultDto } from './dtos/search-image-result.dto';
import { normalizeText } from '../common/helpers/utilities';
import { CacheService } from '../cache/cache.service';
import { ImageSearchProvider } from './providers/image-search.interface';

@Injectable()
export class ImageService {
    constructor(
        private readonly translateService: TranslateService,
        private readonly cacheService: CacheService,
        @Inject('ImageSearchProvider') private provider: ImageSearchProvider,
    ){}

    async search(searchImageDto: SearchImageDto): Promise<SearchImageResultDto[]> {
        let imageSearchResult: SearchImageResultDto[] = [];
        const { text, sourceLang } = searchImageDto;
        let searchedText = normalizeText(text);
        
        if (sourceLang !== 'en') {
            try {
                const translateResult = await this.translateService.translate(searchedText, 'en', sourceLang, false);
                searchedText = normalizeText(translateResult.translated);
            } catch (error) {

            }
        }
        const cacheKey = `image:${searchedText}`;
        try {
            const result = await this.cacheService.getOrSetCachedValue<SearchImageResultDto[]>(
                cacheKey,
                async () => {
                    try {
                        const images = await this.provider.search(searchedText);
                        if (images && images.length > 0) {
                            for (let img of images) {
                                imageSearchResult.push({ imageUrl: img.url, downloadUrl: img.download })
                            }
                        }
                        return imageSearchResult;
                    } catch (error) {
                        return imageSearchResult;
                    }
                }
            )
            return result;
        } catch (error) {
            
        }
        return imageSearchResult;
    }
}
