import { Test, TestingModule } from '@nestjs/testing';
import { ImageService } from '../image.service';
import { TranslateService } from '../../translate/translate.service';
import { TranslationProvider } from '../../translate/providers/translate.interface';
import { TranslateModule } from '../../translate/translate.module';
import { SpellCheckService } from '../../spell-check/spell-check.service';
import pino from 'pino';
import { LoggerModule } from 'nestjs-pino';
import { globalUseMocker, mocks } from '../../../test/mocks/use-mocker';
import { SearchImageResultDto } from '../dtos/search-image-result.dto';
import { ImageSearchProvider } from '../providers/image-search.interface';

const mockTranslateService = {
  translate: jest.fn(),
};
const mockImageSearchProvider = {
  search: jest.fn()
}
const text = 'hello';
const sourceLang = 'en';
const imageUrl = 'http://nimroo.app/img.jpg';

describe('ImageService - Unit', () => {
  let service: ImageService;
  let translateService: jest.Mocked<TranslateService>;
  let imageSearchProvider: jest.Mocked<ImageSearchProvider>;
  // const slientPinoLogger = pino({ enabled: false });
  // let spellCheckService: jest.Mocked<SpellCheckService>;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      // imports: [
      //   LoggerModule.forRoot({
      //     pinoHttp: {
      //       logger: slientPinoLogger
      //     },
      //   }),
      // ],
      providers: [
        ImageService,
        // TranslateService,
        // {
        //   provide: SpellCheckService,
        //   useValue: {
        //     correct: jest.fn()
        //   }
        // },
        {
          provide: TranslateService,
          useValue: mockTranslateService,
        },
        {
          provide: 'ImageSearchProvider',
          useValue: mockImageSearchProvider
        }
      ],
    })
    .useMocker(globalUseMocker)
    .compile();

    service = module.get<ImageService>(ImageService);
    // spellCheckService = module.get(SpellCheckService);
    translateService = module.get(TranslateService);
    imageSearchProvider = module.get('ImageSearchProvider');
    // translationProvider = module.get('TranslationProvider');

    // jest.spyOn((service as any).logger, 'debug');
    // jest.spyOn((service as any).logger, 'info');
    // jest.spyOn((service as any).logger, 'warn');
    // jest.spyOn((service as any).logger, 'error');
    // jest.spyOn((service as any).logger, 'fatal');
    // jest.spyOn((service as any).logger, 'setContext');
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

      await service.search({text, sourceLang});
      expect(mockTranslateService.translate).toHaveBeenCalledWith(text, 'en', sourceLang, false);
    });

    it('should not search for english translation if the text is in english', async () => {
      await service.search({text, sourceLang});
      expect(mockTranslateService.translate).not.toHaveBeenCalled();
    });

    it('should return image url from cache if the searched text found in the cache', async () => {
      (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockResolvedValue(imageUrl);

      const result = await service.search({ text, sourceLang });
      expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledWith(
        expect.stringContaining(`image:${text}`),
        expect.any(Function)
      );
      expect(result).toBe(imageUrl);
    });

    it('should send request to image provider if cache not found', async () => {
      (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockImplementation((key, factoryFn, ttl) => {
        return factoryFn();
      });
      imageSearchProvider.search.mockResolvedValue([{ url: 'https://nimroo.com', download: 'https://nimroo.com/downlaod' }]);

      const result = await service.search({ text, sourceLang });
      expect(imageSearchProvider.search).toHaveBeenCalledWith(text);
    });

    it('should send request to image provider even in case of error in retrieving cache result', async () => {
      (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockImplementation(async (key, factoryFn, ttl) => {
        try {
          throw new Error();
        } catch {
          return factoryFn();
        }
      });
      const result = await service.search({ text, sourceLang });

      expect(imageSearchProvider.search).toHaveBeenCalledWith(text);
    });

  });
});
