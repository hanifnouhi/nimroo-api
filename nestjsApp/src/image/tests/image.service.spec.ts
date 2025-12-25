import { Test, TestingModule } from '@nestjs/testing';
import { ImageService } from '../image.service';
import { TranslateService } from '../../translate/translate.service';
import pino from 'pino';
import { LoggerModule } from 'nestjs-pino';
import { globalUseMocker, mocks } from '../../../test/mocks/use-mocker';
import { ImageSearchProvider, ImageGenerateProvider } from '../providers/image-provider.interface';
import { LlmService } from '../../llm/llm.service';
import { LlmAnalyzeTextDto } from '../../llm/dtos/llm-analyze-text.dto';
import { LlmAnalyzeResult } from '../../llm/providers/llm-analyze-result.interface';
import { StorageService } from '../../storage/storage.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

const mockTranslateService = {
  translate: jest.fn(),
};
const mockImageProvider = {
  search: jest.fn(),
  generate: jest.fn()
}
const mockLlmService = {
  analyzeText: jest.fn()
}
const mockStorageService = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn()
}
const text = 'hello';
const sourceLang = 'en';
const imageUrl = 'http://nimroo.app/img.jpg';
const meaningfulText: LlmAnalyzeTextDto = { text: 'banana' };
const llmAnalyzeProviderCorrectResult: LlmAnalyzeResult = { meaningful: true, visualizable: true };

describe('ImageService - Unit', () => {
  let service: ImageService;
  let translateService: jest.Mocked<TranslateService>;
  let imageProvider: jest.Mocked<ImageSearchProvider & ImageGenerateProvider>;
  let llmService: jest.Mocked<LlmService>;
  const slientPinoLogger = pino({ enabled: false });
  let storageService: jest.Mocked<StorageService>;
  let configService: ConfigService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        LoggerModule.forRoot({
          pinoHttp: {
            logger: slientPinoLogger
          },
        }),
      ],
      providers: [
        ImageService,
        {
          provide: TranslateService,
          useValue: mockTranslateService,
        },
        {
          provide: LlmService,
          useValue: mockLlmService,
        },
        {
          provide: 'ImageProvider',
          useValue: mockImageProvider
        },
        {
          provide: StorageService,
          useValue: mockStorageService
        }
      ],
    })
    .useMocker(globalUseMocker)
    .compile();

    service = module.get<ImageService>(ImageService);
    translateService = module.get(TranslateService);
    imageProvider = module.get('ImageProvider');
    llmService = module.get(LlmService);
    storageService = module.get(StorageService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Search', () => {
    it('should search for english translation if the text is not in english', async () => {
      const text = 'bonjour';
      const sourceLang = 'fr';
      mockTranslateService.translate.mockResolvedValueOnce({
        translated: 'hello',
        detectedLanguage: 'fr'
      });

      await service.search(text, sourceLang);
      expect(mockTranslateService.translate).toHaveBeenCalledWith(text, 'en', sourceLang, false);
    });

    it('should not search for english translation if the text is in english', async () => {
      await service.search(text, sourceLang);
      expect(mockTranslateService.translate).not.toHaveBeenCalled();
    });

    it('should search cache for image if translation fails', async () => {
      mockTranslateService.translate.mockRejectedValue(new Error('Translation failed'));
      await service.search(text, sourceLang);
      expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalled();
    });

    it('should return image url from cache if the searched text found in the cache', async () => {
      (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockResolvedValue(imageUrl);

      const result = await service.search(text, sourceLang);
      expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledWith(
        expect.stringContaining(`image:search:${text}`),
        expect.any(Function)
      );
      expect(result).toBe(imageUrl);
    });

    it('should send request to image provider if cache not found', async () => {
      (llmService!.analyzeText as jest.Mock).mockResolvedValue(llmAnalyzeProviderCorrectResult);
      (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockImplementation((key, factoryFn, ttl) => {
        return factoryFn();
      });
      imageProvider.search.mockResolvedValue([{ url: 'https://nimroo.com', download: 'https://nimroo.com/downlaod' }]);

      const result = await service.search(text, sourceLang);
      expect(imageProvider.search).toHaveBeenCalledWith(text);
      expect(result).toEqual([{ imageUrl: 'https://nimroo.com', downloadUrl: 'https://nimroo.com/downlaod' }]);
    });

    it('should send request to image provider even in case of error in retrieving cache result', async () => {
      (llmService!.analyzeText as jest.Mock).mockResolvedValue(llmAnalyzeProviderCorrectResult);
      (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockImplementation(async (key, factoryFn, ttl) => {
        try {
          throw new Error();
        } catch {
          return factoryFn();
        }
      });
      imageProvider.search.mockResolvedValue([{ url: 'https://nimroo.com', download: 'https://nimroo.com/downlaod' }]);
      
      const result = await service.search(text, sourceLang);

      expect(imageProvider.search).toHaveBeenCalledWith(text);
      expect(result).toEqual([{ imageUrl: 'https://nimroo.com', downloadUrl: 'https://nimroo.com/downlaod' }]);
    });

    it('should check the text to finding if it is meaningful or visualizable before searching for image', async () => {
      (llmService!.analyzeText as jest.Mock).mockResolvedValue(llmAnalyzeProviderCorrectResult);
      (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockImplementation((key, factoryFn, ttl) => {
        return factoryFn();
      });
      imageProvider!.search.mockResolvedValue([{ url: 'https://nimroo.com', download: 'https://nimroo.com/downlaod' }]);

      const result = await service.search(meaningfulText.text, sourceLang);
      expect(llmService!.analyzeText).toHaveBeenCalledWith(
        meaningfulText
      );
      expect(imageProvider.search).toHaveBeenCalledWith(meaningfulText.text);
      expect(result).toEqual([{ imageUrl: 'https://nimroo.com', downloadUrl: 'https://nimroo.com/downlaod' }]);
    });

    it('should search for image if the llm service returned error', async () => {
      (llmService!.analyzeText as jest.Mock).mockRejectedValue(new Error('Failed to analyze text'));
      (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockImplementation((key, factoryFn, ttl) => {
        return factoryFn();
      });
      imageProvider!.search.mockResolvedValue([{ url: 'https://nimroo.com', download: 'https://nimroo.com/downlaod' }]);

      const result = await service.search(meaningfulText.text, sourceLang);
      expect(llmService!.analyzeText).toHaveBeenCalledWith(meaningfulText);
      expect(imageProvider.search).toHaveBeenCalledWith(meaningfulText.text);
      expect(result).toEqual([{ imageUrl: 'https://nimroo.com', downloadUrl: 'https://nimroo.com/downlaod' }]);
    });

    it('should not search for image if the llm service returned undefied', async () => {
      (llmService!.analyzeText as jest.Mock).mockResolvedValue(undefined);
      (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockImplementation((key, factoryFn, ttl) => {
        return factoryFn();
      });
      imageProvider!.search.mockResolvedValue([{ url: 'https://nimroo.com', download: 'https://nimroo.com/downlaod' }]);

      const result = await service.search(meaningfulText.text, sourceLang);
      expect(llmService!.analyzeText).toHaveBeenCalledWith(meaningfulText);
      expect(imageProvider.search).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should not search for image if the llm service returned meaningful is false', async () => {
      (llmService!.analyzeText as jest.Mock).mockResolvedValue({ meaningful: false, visualizable: true });
      (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockImplementation((key, factoryFn, ttl) => {
        return factoryFn();
      });
      imageProvider!.search.mockResolvedValue([{ url: 'https://nimroo.com', download: 'https://nimroo.com/downlaod' }]);

      const result = await service.search(meaningfulText.text, sourceLang);
      expect(llmService!.analyzeText).toHaveBeenCalledWith(meaningfulText);
      expect(imageProvider.search).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should not generate image if the image search returned error and visualizable is false', async () => {
      (llmService!.analyzeText as jest.Mock).mockResolvedValue({ meaningfulText: false, visualizable: false });
      (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockImplementation((key, factoryFn, ttl) => {
        return factoryFn();
      });
      imageProvider!.search.mockRejectedValue(new Error('search failed'));

      await service.search(meaningfulText.text, sourceLang);
      expect(imageProvider.generate).not.toHaveBeenCalled();
    });

    it('should not generate image if the image search returned no images and visualizable is false', async () => {
      (llmService!.analyzeText as jest.Mock).mockResolvedValue({ meaningfulText: false, visualizable: false });
      (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockImplementation((key, factoryFn, ttl) => {
        return factoryFn();
      });
      imageProvider!.search.mockResolvedValue([]);

      await service.search(meaningfulText.text, sourceLang);
      expect(imageProvider.generate).not.toHaveBeenCalled();
    });

  });

  describe('Generate', () => {
    it('should generate image', async () => {
      (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockImplementation((key, factoryFn, ttl) => {
        return factoryFn();
      });
      imageProvider.generate.mockResolvedValue({ imageBuffer: 'test3445fdasdf' });
      mockStorageService.uploadFile.mockResolvedValue({ imageUrl: 'https://nimroo.com' });

      await service.generate('apple');
      expect(imageProvider.generate).toHaveBeenCalledWith('apple');
    });

    it('should return error if generate image fails', async () => {
      (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockImplementation((key, factoryFn, ttl) => {
        return factoryFn();
      });
      imageProvider!.generate.mockRejectedValue(new Error('bad request'));

      await expect(service.generate('apple')).rejects.toThrow('bad request');
      expect(imageProvider.generate).toHaveBeenCalledWith('apple');
    });

    it('should upload generated image to cloud storage', async() => {
      (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockImplementation((key, factoryFn, ttl) => {
        return factoryFn();
      });
      imageProvider.generate.mockResolvedValue({ imageBuffer: 'test3445fdasdf' });
      mockStorageService.uploadFile.mockResolvedValue('https://nimroo.com');

      await service.generate('apple');
      expect(imageProvider.generate).toHaveBeenCalledWith('apple');
      expect(mockStorageService.uploadFile).toHaveBeenCalled();
    });

    it('should not upload image to cloud storage if the image or container name are undefined', async() => {
      const warnLog = jest.spyOn(slientPinoLogger, 'warn');
      (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockImplementation((key, factoryFn, ttl) => {
        return factoryFn();
      });
      imageProvider.generate.mockResolvedValue({ imageBuffer: '' });

      await expect(service.generate('apple')).rejects.toThrow('Image buffer or container name are undefined');
      expect(warnLog).toHaveBeenCalledWith(expect.objectContaining({ text: 'apple' }), 'Image buffer or container name are undefined');
      expect(imageProvider.generate).toHaveBeenCalledWith('apple');
      expect(mockStorageService.uploadFile).not.toHaveBeenCalled();
    });

    it('should add url of uploaded image to the image search result after generate', async() => {
      (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockImplementation((key, factoryFn, ttl) => {
        return factoryFn();
      });
      imageProvider.generate.mockResolvedValue({ imageBuffer: 'testasdf1234lksdfalk3234234asdfasdf' });
      mockStorageService.uploadFile.mockResolvedValue('https://nimroo.com');

      const result = await service.generate('apple');
      expect(imageProvider.generate).toHaveBeenCalledWith('apple');
      expect(mockStorageService.uploadFile).toHaveBeenCalled();
      expect(result).toEqual([{ imageUrl: 'https://nimroo.com', downloadUrl: 'https://nimroo.com' }]);
    });
  });
});
