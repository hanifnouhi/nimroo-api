import { Inject, Injectable } from '@nestjs/common';
import { TranslateService } from '../translate/translate.service';
import { ImageResultDto } from './dtos/image-result.dto';
import { normalizeText } from '../common/helpers/utilities';
import { CacheService } from '../cache/cache.service';
import { ImageGenerateProvider, ImageSearchProvider } from './providers/image-provider.interface';
import { LlmService } from '../llm/llm.service';
import { LlmAnalyzeResult } from '../llm/providers/llm-analyze-result.interface';
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
        @Inject('ImageSearchProvider') private searchProvider: ImageSearchProvider,
        @Inject('ImageGenerateProvider') private generateProvider: ImageGenerateProvider,
        private readonly llmService: LlmService,
        @InjectPinoLogger(ImageService.name) private readonly logger: PinoLogger,
        private readonly storageService: StorageService,
        private readonly configService: ConfigService 
    ){
        this.containerName = this.configService.get<string>('AZURE_STORAGE_IMAGE_CONTAINER_NAME');
    }

    /**
     * Search image for flash cards
     * 
     * @param { string } text - text to search image
     * @param { string } sourceLang - source language of text
     * @returns { Promise<ImageResultDto[]> } Resolving to an array of object containing image url and download url
     */
    async search(text: string, sourceLang: string): Promise<ImageResultDto[]> {
        this.logger.debug(`Attempting to search image for text: ${text} and source language: ${sourceLang}`);
        let imageSearchResult: ImageResultDto[] = [];
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
        const cacheKey = `image:search:${searchedText}`;
        try {
            //search in the cache
            const result = await this.cacheService.getOrSetCachedValue<ImageResultDto[]>(
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
                        try {
                            //search image in the image provider service(unsplash)
                            const images = await this.searchProvider.search(searchedText);
                            if (images && images.length > 0) {
                                for (let img of images) {
                                    imageSearchResult.push({ imageUrl: img.url, downloadUrl: img.download })
                                }
                            }
                        } catch (error) {
                            this.logger.error({ error: error.message, stack: error.stack }, `Error in searhing image: ${searchedText}`);
                            throw error;
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

    /**
     * Generate image for flash cards
     * 
     * @param { string } text - text to generate image
     * @returns { Promise<ImageResultDto[]> } Resolving to an array of object containing image url and download url
     */
    async generate(text: string): Promise<ImageResultDto[]> {
        this.logger.debug(`Attempting to generate image for text: ${text}`);
        let imageGenerateResult: ImageResultDto[] = [];
        const cacheKey = `image:generate:${text}`;
        try {
            const result = await this.cacheService.getOrSetCachedValue<ImageResultDto[]>(
                cacheKey,
                async () => {
                    try {
                        const image = await this.generateProvider.generate(text);

                        //if image was generated, upload it to the storage service
                        if(image.imageBuffer && this.containerName) {
                            const fileName = `${text}-${uuid()}.jpeg`;
                            try {
                                const imageUrl = await this.storageService.uploadFile(this.containerName!, Buffer.from(image.imageBuffer), fileName, 'image/jpeg');
                                if(imageUrl) {
                                    imageGenerateResult.push({ imageUrl: imageUrl, downloadUrl: imageUrl });
                                } else {
                                    this.logger.warn(this.containerName, 'Upload generated image failed');
                                    throw new Error('Upload generated image failed');
                                }
                            } catch (error) {
                                this.logger.error({error}, `Error in uploading photo`);
                                throw error;
                            }
                        } else {
                            this.logger.warn({ text }, 'Image buffer or container name are undefined');
                            throw new Error('Image buffer or container name are undefined');
                        }
                        return imageGenerateResult;
                    } catch (error) {
                        this.logger.error({ error }, `Error in generating image with text: ${text}`);
                        throw error;
                    }
                }
            )
            return result;
        } catch (error) {
            this.logger.error({ error: error.message, stack: error.stack }, `Error in generating text: ${text}`);
            throw error;
        }
    }
}
