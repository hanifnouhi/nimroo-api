import { Inject, Injectable } from '@nestjs/common';
import { TranslateService } from '../translate/translate.service';
import { SearchImageDto } from './dtos/search-image.dto';
import { SearchImageResultDto } from './dtos/search-image-result.dto';
import { normalizeText } from '../common/helpers/utilities';
import { CacheService } from '../cache/cache.service';
import { ImageProvider } from './providers/image-provider.interface';
import { LlmService } from '../llm/llm.service';
import { LlmAnalyzeResult } from 'src/llm/providers/llm-analyze-result.interface';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class ImageService {
    constructor(
        private readonly translateService: TranslateService,
        private readonly cacheService: CacheService,
        @Inject('ImageProvider') private provider: ImageProvider,
        private readonly llmService: LlmService,
        @InjectPinoLogger(ImageService.name) private readonly logger: PinoLogger
    ){}

    async search(searchImageDto: SearchImageDto): Promise<SearchImageResultDto[]> {
        this.logger.debug(`Attempting to search image for text: ${searchImageDto.text} and source language: ${searchImageDto.sourceLang}`);
        let imageSearchResult: SearchImageResultDto[] = [];
        const { text, sourceLang } = searchImageDto;
        let searchedText = normalizeText(text);
        
        if (sourceLang !== 'en') {
            try {
                const translateResult = await this.translateService.translate(searchedText, 'en', sourceLang, false);
                searchedText = normalizeText(translateResult.translated);
            } catch (error) {
                this.logger.error({ error: error.message, stack: error.stack }, `Error in translating text: ${text}`);
            }
        }
        const cacheKey = `image:${searchedText}`;
        try {
            const result = await this.cacheService.getOrSetCachedValue<SearchImageResultDto[]>(
                cacheKey,
                async () => {
                    let llmAnalyzeResult: LlmAnalyzeResult | undefined;
                    let llmServiceFailed = false;
                    try {
                        llmAnalyzeResult = await this.llmService.analyzeText({ text: searchedText });
                    } catch (error) {
                        this.logger.error({ error: error.message, stack: error.stack }, `Error in analyzing text: ${searchedText}`);
                        llmServiceFailed = true;
                    }
                    
                    if ((llmAnalyzeResult && llmAnalyzeResult.meaningful) || llmServiceFailed) {
                        let imageSearchError = false;
                        try {
                            const images = await this.provider.search(searchedText);
                            if (images && images.length > 0) {
                                for (let img of images) {
                                    imageSearchResult.push({ imageUrl: img.url, downloadUrl: img.download })
                                }
                            }
                        } catch (error) {
                            this.logger.error({ error: error.message, stack: error.stack }, `Error in searhing image: ${searchedText}`);
                            imageSearchError = true;
                        }
                        if (llmAnalyzeResult?.visualizable && (imageSearchResult.length == 0 || imageSearchError)) {
                            try {
                                const image = await this.provider.generate(searchedText);
                            } catch (error) {
                                this.logger.error({ error: error.message, stack: error.stack }, `Error in generating text: ${searchedText}`);
                                throw new Error(error);
                            }
                        }
                    }
                    this.logger.info(`Image was successfully added`);
                    return imageSearchResult;
                }
            )
            return result;
        } catch (error) {
            this.logger.error({ error: error.message, stack: error.stack }, `Error in searching image with text: ${searchedText}`);
            throw new Error(error);
        }
    }
}
