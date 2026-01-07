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
  const cardId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  const mockCard = {
    id: cardId,
    title: 'bonjour',
    meaning: 'hello',
    tags: ['conversation'],
    user: userId,
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
      title: 'bonjour',
      meaning: 'hello',
      tags: ['conversation'],
      user: userId.toString(),
    };

    it('should create a flash card with valid data', async () => {
      cardRepository.create.mockResolvedValue(mockCard);
      const result = await service.create(data);
      expect(result).toBe(mockCard);
      expect(cardRepository.create).toHaveBeenCalledWith(data);
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
    };

    it('should update flash card with valid data', async () => {
      cardRepository.findOneAndUpdate.mockResolvedValue({
        ...mockCard,
        ...updateData,
      });
      const result = await service.update(updateData.id, updateData);
      expect(result).toEqual({ ...mockCard, ...updateData });
      expect(cardRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: cardId },
        updateData,
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
