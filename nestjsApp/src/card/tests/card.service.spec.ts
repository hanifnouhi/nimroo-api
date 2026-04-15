import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from '../card.service';
import { CardRepository } from '../card.repository';
import pino from 'pino';
import { LoggerModule } from 'nestjs-pino';
import mongoose from 'mongoose';

describe('CardService', () => {
  let service: CardService;
  let cardRepository: jest.Mocked<CardRepository>;
  const silentPinoLogger = pino({ enabled: false });
  const cardId = '507f1f77bcf86cd799439011';
  const userId = new mongoose.Types.ObjectId();

  const mockCard = {
    id: cardId,
    title: 'bonjour',
    meaning: 'hello',
    tags: ['conversation'],
    user: userId,
    version: 1,
  } as any;

  const mockCards = [
    mockCard,
    { id: '2', title: 'salut', meaning: 'hi', user: userId },
  ] as any[];

  beforeEach(async () => {
    const mockRepo = {
      findOneWithPassword: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
      deleteMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            logger: silentPinoLogger,
          },
        }),
      ],
      providers: [
        CardService,
        {
          provide: CardRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<CardService>(CardService);
    cardRepository = module.get(CardRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const data = {
      id: '507f1f77bcf86cd799439011',
      title: 'bonjour',
      meaning: 'hello',
      tags: ['conversation'],
      user: userId.toString(),
    };

    it('should create a flash card with valid data', async () => {
      cardRepository.create.mockResolvedValue(mockCard);
      const result = await service.create(data);
      const {id, version, ...rest} = result as any;
      expect(id).toBe(data.id);
      expect(version).toBe(1);
      expect(cardRepository.create).toHaveBeenCalledWith({
        _id: data.id,
        ...rest,
      });
    });

    it('should log and throw error if creation fails', async () => {
      const error = new Error('user is not defined');
      cardRepository.create.mockRejectedValue(error);
      await expect(service.create(data)).rejects.toThrow('user is not defined');
    });
  });

  describe('update', () => {
    const updateData = {
      id: cardId.toString(),
      image: 'http://nimroo.com/images/bonjour.jpeg',
      examples: [],
      synonyms: ['salut', 'coucou'],
      opposites: ['aurevoir', 'bonjournee'],
      version: 1,
    };

    it('should update flash card with valid data if data version is equal to card version', async () => {
      cardRepository.findOneAndUpdate.mockResolvedValue({
        ...mockCard,
        ...updateData,
      });
      const result = await service.update(updateData.id, updateData);
      expect(result).toEqual({ ...mockCard, ...updateData });
      expect(cardRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: cardId, version: updateData.version },
        {
          id: cardId.toString(),
          image: 'http://nimroo.com/images/bonjour.jpeg',
          examples: [],
          synonyms: ['salut', 'coucou'],
          opposites: ['aurevoir', 'bonjournee'],
          $inc: { version: 1 },
        },
      );
    });

    it('should throw bad request if version is missing', async () => {
      const { version, ...invalidUpdateData } = updateData;
      await expect(
        service.update(updateData.id, invalidUpdateData as any),
      ).rejects.toThrow(
        new BadRequestException('Card version is required for update'),
      );
    });

    it('should throw bad request if version is not equal to card version', async () => {
      cardRepository.findOneAndUpdate.mockResolvedValue(null);
      cardRepository.findOne.mockResolvedValue({ ...mockCard, version: 2 });
      await expect(service.update(updateData.id, updateData)).rejects.toThrow(
        new BadRequestException('Card version mismatch, please update the card with the latest version'),
      );
    });

    it('should throw not found if card does not exist', async () => {
      cardRepository.findOneAndUpdate.mockResolvedValue(null);
      cardRepository.findOne.mockResolvedValue(null);

      await expect(service.update(updateData.id, updateData)).rejects.toThrow(
        new NotFoundException(`Card with id ${cardId} not found`),
      );
    });

    it('should throw conflict if card was changed during update', async () => {
      cardRepository.findOneAndUpdate.mockResolvedValue(null);
      cardRepository.findOne.mockResolvedValue(mockCard);

      await expect(service.update(updateData.id, updateData)).rejects.toThrow(
        new ConflictException(
          'Card was changed during update. Please refresh and try again.',
        ),
      );
    });

    it('should log and throw error if update fails', async () => {
      const error = new Error('Update failed');
      cardRepository.findOneAndUpdate.mockRejectedValue(error);
      await expect(service.update(updateData.id, updateData)).rejects.toThrow(
        'Update failed',
      );
    });
  });

  describe('delete', () => {
    it('should delete flash card by id', async () => {
      cardRepository.deleteMany.mockResolvedValue(true);
      const result = await service.delete(cardId.toString());
      expect(result).toBe(true);
      expect(cardRepository.deleteMany).toHaveBeenCalledWith({ _id: cardId });
    });

    it('should log and throw error if deletion fails', async () => {
      const error = new Error('Delete failed');
      cardRepository.deleteMany.mockRejectedValue(error);
      await expect(service.delete(cardId.toString())).rejects.toThrow(
        'Delete failed',
      );
    });
  });

  describe('findOne', () => {
    it('should return flash card by id', async () => {
      cardRepository.findOne.mockResolvedValue(mockCard);

      const result = await service.findOne(cardId.toString());

      expect(result).toBe(mockCard);
      expect(cardRepository.findOne).toHaveBeenCalledWith({ _id: cardId });
    });

    it('should return null if card not found', async () => {
      cardRepository.findOne.mockResolvedValue(null);
      const result = await service.findOne(
        new mongoose.Types.ObjectId().toString(),
      );
      expect(result).toBeNull();
    });

    it('should log and throw error if find fails', async () => {
      const error = new Error('Find failed');
      cardRepository.findOne.mockRejectedValue(error);
      await expect(service.findOne(cardId.toString())).rejects.toThrow(
        'Find failed',
      );
    });
  });

  describe('findAll', () => {
    it('should return all flash cards for user', async () => {
      cardRepository.find.mockResolvedValue({
        data: mockCards,
        limit: 10,
        page: 1,
        total: 0,
      });
      const result = await service.findAll(userId.toString(), {}, {});
      expect(result).toEqual(mockCards);
      expect(cardRepository.find).toHaveBeenCalledWith({ user: userId }, {});
    });

    it('should return empty array if user has no cards', async () => {
      cardRepository.find.mockResolvedValue({
        data: [],
        limit: 10,
        page: 1,
        total: 0,
      });
      const result = await service.findAll(
        new mongoose.Types.ObjectId().toString(),
        {},
        {},
      );
      expect(result).toEqual([]);
    });

    it('should log and throw error if find fails', async () => {
      const error = new Error('Find all failed');
      cardRepository.find.mockRejectedValue(error);
      await expect(service.findAll(userId.toString(), {}, {})).rejects.toThrow(
        'Find all failed',
      );
    });
  });
});
