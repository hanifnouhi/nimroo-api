import { Test, TestingModule } from '@nestjs/testing';
import { CardController } from '../card.controller';
import { CardService } from '../card.service';
import { CreateCardDto } from '../dtos/create-card.dto';
import { CardResponseDto } from '../dtos/card-response.dto';
import { plainToInstance } from 'class-transformer';
import mongoose from 'mongoose';
import { validate } from 'class-validator';
import pino from 'pino';
import { LoggerModule } from 'nestjs-pino';

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

  const mockCardService = {
    create: jest.fn().mockResolvedValue(mockCardDocument)
  };

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
  
});
