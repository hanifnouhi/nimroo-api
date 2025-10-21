import { Test, TestingModule } from '@nestjs/testing';
import { CardController } from '../card.controller';
import { CardService } from '../card.service';
import { CreateCardDto } from '../dtos/create-card.dto';
import { CardResponseDto } from '../dtos/card-response.dto';
import { plainToInstance } from 'class-transformer';
import mongoose, { sanitizeFilter } from 'mongoose';
import { validate } from 'class-validator';
import pino from 'pino';
import { LoggerModule } from 'nestjs-pino';
import { UpdateCardDto } from '../dtos/update-card.dto';
import { QuerySanitizerService } from '../../common/services/query-sanitizer.service';

describe('CardController', () => {
  let controller: CardController;
  let service: CardService;
  let silentPinoLogger = pino({ enabled: false });

  const mockCardDocument = {
    id: '507f1f77bcf86cd799439011',
    title: 'bonjour',
    meaning: 'hello',
    tags: ['greeting'],
    user: '507f1f77bcf86cd799439012',
    toObject: function () {
      return { ...this };
    }
  };

  const mockUpdateCardDucument = {
    id: '507f1f77bcf86cd799439011',
    title: 'bonjour',
    meaning: 'hello',
    tags: ['greeting'],
    user: '507f1f77bcf86cd799439012',
    category: 'converstations',
    opposites: ['aureovie', 'ciao'],
    synonyms: ['salut', 'coucou'],
    toObject: function () {
      return { ...this };
    }
  }

  const mockCardService = {
    create: jest.fn().mockResolvedValue(mockCardDocument),
    update: jest.fn().mockResolvedValue(mockUpdateCardDucument),
    delete: jest.fn().mockResolvedValue(true),
    findOne: jest.fn().mockResolvedValue(mockCardDocument),
    findAll: jest.fn().mockResolvedValue([mockCardDocument])
  };

  const mockSanitizerService = {
    sanitizeFilter: jest.fn(),
    sanitizeProjection: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            logger: silentPinoLogger
          }
        })
      ],
      providers: [
        {
          provide: CardService,
          useValue: mockCardService
        },
        {
          provide: QuerySanitizerService,
          useValue: mockSanitizerService
        }
      ],
      controllers: [CardController],
    }).compile();

    controller = module.get<CardController>(CardController);
    service = module.get<CardService>(CardService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Create request', () => {
    it('should create a card and return CardResponseDto', async () => {
      const dto: CreateCardDto = {
        title: 'bonjour',
        meaning: 'hello',
        tags: ['greeting'],
        user: new mongoose.Types.ObjectId().toString()
      }
  
      const result = await controller.create(dto);
  
      const expected = plainToInstance(CardResponseDto, mockCardDocument.toObject(), {
        excludeExtraneousValues: true
      });
  
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
      expect(result).toBeInstanceOf(CardResponseDto);
      expect(result.id).toBe(mockCardDocument.id);
      expect(result.user).toBe(mockCardDocument.user);
    });

    it('should fail validation for missing title', async () => {
      const dto = new CreateCardDto();
      dto.meaning = 'hello';
      dto.tags = ['greeting'];
      dto.user = new mongoose.Types.ObjectId().toString();

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('title');
    });

    it('should throw if service throws', async () => {
      const dto: CreateCardDto = {
        title: 'bonjour',
        meaning: 'hello',
        tags: ['greeting'],
        user: new mongoose.Types.ObjectId().toString()
      };
    
      mockCardService.create.mockRejectedValue(new Error('DB error'));
    
      await expect(controller.create(dto)).rejects.toThrow('DB error');
    });
    
  });

  describe('Update request', () => {
    const cardId = '507f1f77bcf86cd799123456';
    const dto: UpdateCardDto = {
        category: 'converstations',
        opposites: ['aureovie', 'ciao'],
        synonyms: ['salut', 'coucou'],
        id: '507f1f77bcf86cd799439011'
    }
    it('should update a card and return CardResponseDto', async () => {
      const result = await controller.update(cardId, dto);
  
      const expected = plainToInstance(CardResponseDto, mockUpdateCardDucument.toObject(), {
        excludeExtraneousValues: true
      });
  
      expect(service.update).toHaveBeenCalledWith(cardId, dto);
      expect(result).toEqual(expected);
      expect(result).toBeInstanceOf(CardResponseDto);
      expect(result.id).toBe(mockCardDocument.id);
      expect(result.user).toBe(mockCardDocument.user);
    });

    it('should throw error if card not found', async () => {
      mockCardService.update.mockResolvedValue(null);

      expect(controller.update(cardId, dto)).rejects.toThrow(`Card with ID ${cardId} not found`);
      expect(service.update).toHaveBeenCalledWith(cardId, dto);

    });

    it('should throw if service throws', async () => {
      mockCardService.update.mockRejectedValue(new Error('DB error'));
    
      await expect(controller.update(cardId, dto)).rejects.toThrow('DB error');
    });
  });

  describe('Delete request', () => {
    const cardId = '507f1f77bcf86cd799439011';

    it('should delete a card and return boolean', async () => {
      const result = await controller.delete(cardId);

      expect(service.delete).toHaveBeenCalledWith(cardId);
      expect(result).toEqual(true);
    });

    it('should return false if card not deleted or not found', async () => {
      mockCardService.delete.mockResolvedValue(false);

      const result = await controller.delete(cardId);

      expect(service.delete).toHaveBeenCalledWith(cardId);
      expect(result).toBe(false);
    });

    it('should throw if service throws', async () => {
      mockCardService.delete.mockRejectedValue(new Error('DB error'));
    
      await expect(controller.delete(cardId)).rejects.toThrow('DB error');
    });
  });

  describe('Find one request', () => {
    const cardId = '507f1f77bcf86cd799439011';

    beforeEach(async () => {
      jest.clearAllMocks();
    })

    it('should find a card with card id', async () => {
      mockSanitizerService.sanitizeProjection.mockReturnValue({});

      const result = await controller.findOne(cardId);

      const expected = plainToInstance(CardResponseDto, mockCardDocument.toObject(), {
        excludeExtraneousValues: true
      });

      expect(service.findOne).toHaveBeenCalledWith(cardId, {});
      expect(result).toEqual(expected);
    });

    it('should throw error if card not found', async () => {
      mockCardService.findOne.mockResolvedValue(null);
      mockSanitizerService.sanitizeProjection.mockReturnValue({});

      await expect(controller.findOne(cardId)).rejects.toThrow(`Card with id ${cardId} not found`);
      expect(service.findOne).toHaveBeenCalledWith(cardId, {});
    });

    it('should throw if service throws', async () => {
      mockCardService.findOne.mockRejectedValue(new Error('DB error'));
      mockSanitizerService.sanitizeProjection.mockReturnValue({});
    
      await expect(controller.findOne(cardId)).rejects.toThrow('DB error');
    });
  });

  describe('Find all cards by user id request', () => {
    const userId = '507f1f77bcf86cd799439012';

    it('should find all cards with user id', async () => {
      const result = await controller.findAll(userId);

      const expected = plainToInstance(CardResponseDto, [mockCardDocument].map(card => card.toObject()), {
        excludeExtraneousValues: true
      });

      expect(service.findAll).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expected);
    });

    it('should throw error if user not found', async () => {
      mockCardService.findAll.mockResolvedValue(null);

      expect(service.findAll).toHaveBeenCalledWith(userId);
      expect(controller.findAll(userId)).rejects.toThrow(`Cards with user ID ${userId} not found`);
    });

    it('should throw if service throws', async () => {
      mockCardService.findAll.mockRejectedValue(new Error('DB error'));
    
      await expect(controller.findAll(userId)).rejects.toThrow('DB error');
    });
  });
  
});
