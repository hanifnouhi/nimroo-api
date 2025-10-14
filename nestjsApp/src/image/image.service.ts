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
import { StorageService } from '../storage/storage.service';
import { ConfigService } from '@nestjs/config';
import { uuid } from 'uuidv4';

@Injectable()
export class ImageService {
    private containerName: string | undefined;
    constructor(
        private readonly translateService: TranslateService,
        private readonly cacheService: CacheService,
        @Inject('ImageProvider') private provider: ImageProvider,
        private readonly llmService: LlmService,
        @InjectPinoLogger(ImageService.name) private readonly logger: PinoLogger,
        private readonly storageService: StorageService,
        private readonly configService: ConfigService
    ){
        this.containerName = this.configService.get<string>('AZURE_STORAGE_IMAGE_CONTAINER_NAME');
    }

    /**
     * Search image for flash cards
     * @param { SearchImageDto } searchImageDto - An object containing searched text and source lang
     * @returns { Promise<SearchImageResultDto[]> } Resolving to an array of object containing image url and download url
     */
    async search(searchImageDto: SearchImageDto): Promise<SearchImageResultDto[]> {
        this.logger.debug(`Attempting to search image for text: ${searchImageDto.text} and source language: ${searchImageDto.sourceLang}`);
        let imageSearchResult: SearchImageResultDto[] = [];
        const { text, sourceLang } = searchImageDto;
        let searchedText = normalizeText(text);
        
        //if the text is not in english, send request to translate the text to english
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
            //search in the cache
            const result = await this.cacheService.getOrSetCachedValue<SearchImageResultDto[]>(
                cacheKey,
                async () => {
                    //if not found in the cache, search for image
                    let llmAnalyzeResult: LlmAnalyzeResult | undefined;
                    let llmServiceFailed = false;
                    try {
                        //analyze text to find if the text is meaningful and visualizable
                        llmAnalyzeResult = await this.llmService.analyzeText({ text: searchedText });
                    } catch (error) {
                        this.logger.error({ error: error.message, stack: error.stack }, `Error in analyzing text: ${searchedText}`);
                        llmServiceFailed = true;
                    }
                    
                    //search image just if the text is meaningful or if the analyze text failed
                    if ((llmAnalyzeResult && llmAnalyzeResult.meaningful) || llmServiceFailed) {
                        let imageSearchError = false;
                        try {
                            //search image in the image provider service(unsplash)
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

                        //if search is not successfull or encountered an error, try to generate image with ai service provider
                        if (llmAnalyzeResult?.visualizable && (imageSearchResult.length == 0 || imageSearchError)) {
                            try {
                                const image = await this.provider.generate(searchedText);

                                //if image was generated, upload it to the storage service
                                if(image.imageBuffer && this.containerName) {
                                    const fileName = `${searchedText}-${uuid()}.jpeg`;
                                    const imageUrl = await this.storageService.uploadFile(this.containerName!, Buffer.from(image.imageBuffer), fileName, 'image/jpeg');
                                    if(imageUrl) {
                                        imageSearchResult.push({ imageUrl: imageUrl, downloadUrl: imageUrl });
                                    } else {
                                        this.logger.warn(this.containerName, 'Upload generated image failed');
                                    }
                                } else {
                                    this.logger.warn({ searchedText }, 'Image buffer or container name are undefined');
                                }
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
