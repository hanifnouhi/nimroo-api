import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from '../card.service';
import { CardRepository } from '../card.repository';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Card, CardSchema } from '../schemas/card.schema';
import { LoggerModule } from 'nestjs-pino';
import { CreateCardDto } from '../dtos/create-card.dto';
import { UpdateCardDto } from '../dtos/update-card.dto';
import { ConfigModule, ConfigService } from '@nestjs/config';
import mongoose, { Connection } from 'mongoose';
import { createMockConfigService } from '../../../test/mocks/use-mocker';

describe('CardService Integration (MongoDB)', () => {
  let service: CardService;
  let connection: Connection;
  let testUserId: string;

  beforeAll(async () => {
    testUserId = new mongoose.Types.ObjectId().toString();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        LoggerModule.forRoot({ pinoHttp: { enabled: false } }),
        MongooseModule.forRootAsync({
            inject: [ConfigService],
            useFactory: async (config: ConfigService) => ({
              uri: config.get<string>('DATABASE_URI'),
            }),
          }),
          MongooseModule.forFeature([{ name: Card.name, schema: CardSchema }]),
      ],
      providers: [CardService, CardRepository],
    })
    .overrideProvider(ConfigService)
    .useValue(
        createMockConfigService({
          DATABASE_URI: 'mongodb://127.0.0.1:27017/nimroo-test',
        }),
    )
    .compile();

    service = module.get<CardService>(CardService);
    connection = module.get<Connection>(getConnectionToken());
    
  });

  afterAll(async () => {
    await connection.collection('cards').deleteMany({});
    await connection.close();
  });

  let createdCardId: string;

  it('should create a card', async () => {
    const dto: CreateCardDto = {
      title: 'bonjour',
      meaning: 'hello',
      tags: ['conversation'],
      user: testUserId
    };

    const result = await service.create(dto);
    expect(result).toHaveProperty('_id');
    expect(result.title).toBe('bonjour');
    createdCardId = result.id.toString();
  });

  it('should find the created card by id', async () => {
    const result = await service.findOne(createdCardId);
    expect(result).not.toBeNull();
    expect(result?.title).toBe('bonjour');
  });

  it('should update the card', async () => {
    const updateDto: UpdateCardDto = {
      meaning: 'hi there'
    };
    const result = await service.update(createdCardId, updateDto);
    expect(result?.meaning).toBe('hi there');
  });

  it('should find all cards for the user', async () => {
    const result = await service.findAll(testUserId, {}, {});

    expect(result!.length).toBeGreaterThan(0);
    expect(result![0].user.toString()).toBe(testUserId);
  });

  it('should delete the card', async () => {
    const result = await service.delete(createdCardId);
    expect(result).toBe(true);
    const deleted = await service.findOne(createdCardId);
    expect(deleted).toBeNull();
  });
});