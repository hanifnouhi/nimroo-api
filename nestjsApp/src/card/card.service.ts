import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CardRepository } from './card.repository';
import { CreateCardDto } from './dtos/create-card.dto';
import { CardDocument } from './schemas/card.schema';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UpdateCardDto } from './dtos/update-card.dto';
import mongoose, { FilterQuery, ProjectionType } from 'mongoose';

@Injectable()
export class CardService {
  constructor(
    private readonly cardRespository: CardRepository,
    @InjectPinoLogger(CardService.name) private readonly logger: PinoLogger,
  ) {}

  async create(data: CreateCardDto): Promise<CardDocument> {
    try {
      this.logger.debug(
        `Attempting to create a flash card with title: ${data.title}`,
      );
      const { id, user, ...rest } = data as unknown as {
        id?: string;
        user?: string;
      } & Record<string, any>;

      const createPayload: Record<string, any> = {
        ...(id ? { _id: id } : {}),
        ...rest,
      };

      if (user) {
        createPayload.user = new mongoose.Types.ObjectId(user);
      }

      return await this.cardRespository.create(createPayload as any);
    } catch (error) {
      this.logger.error({ err: error }, 'Create flash card failed');
      throw error;
    }
  }

  async update(
    cardId: string,
    data: UpdateCardDto,
  ): Promise<CardDocument | null> {
    try {
      this.logger.debug(`Attempting to update a flash card with id: ${cardId}`);
      if (data.version === undefined) {
        this.logger.error('Card version is required for update');
        throw new BadRequestException('Card version is required for update');
      }

      const { version, ...updateData } = data;
      const updatedCard = await this.cardRespository.findOneAndUpdate(
        { _id: cardId, version },
        {
          ...updateData,
          $inc: { version: 1 },
        },
      );

      if (updatedCard) {
        return updatedCard;
      }

      const existingCard = await this.cardRespository.findOne({ _id: cardId });
      if (!existingCard) {
        this.logger.error(`Card with id ${cardId} not found`);
        throw new NotFoundException(`Card with id ${cardId} not found`);
      } else if (existingCard.version !== version) {
        this.logger.warn(`Card version mismatch for card with id: ${cardId} and version: ${version}`);
        throw new BadRequestException('Card version mismatch, please update the card with the latest version');
      }

      this.logger.error(
        {
          err: new Error(
            `Conflict while updating card with id: ${cardId} and version: ${version}`,
          ),
        },
        'Card update conflict',
      );
      throw new ConflictException(
        'Card was changed during update. Please refresh and try again.',
      );
    } catch (error) {
      this.logger.error({ err: error }, 'Update flash card failed');
      throw error;
    }
  }

  async delete(cardId: string): Promise<boolean> {
    try {
      this.logger.debug(`Attempting to delete a flash card with id: ${cardId}`);
      return await this.cardRespository.deleteMany({
        _id: cardId,
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Delete flash card failed');
      throw error;
    }
  }

  async findOne(
    cardId: string,
    projection?: ProjectionType<CardDocument>,
  ): Promise<CardDocument | null> {
    try {
      const filter: FilterQuery<CardDocument> = {
        _id: cardId,
      } as unknown as FilterQuery<CardDocument>;
      this.logger.debug(`Attempting to find a flash card with id: ${cardId}`);
      return projection
        ? await this.cardRespository.findOne(filter, { projection })
        : await this.cardRespository.findOne(filter);
    } catch (error) {
      this.logger.error({ err: error }, 'Find flash card failed');
      throw error;
    }
  }

  async findAll(
    userId: string,
    filterQuery: FilterQuery<CardDocument>,
    options: Record<string, any>,
  ): Promise<CardDocument[] | null> {
    try {
      const filter: FilterQuery<CardDocument> = {
        user: new mongoose.Types.ObjectId(userId),
        ...filterQuery,
      } as unknown as FilterQuery<CardDocument>;
      this.logger.debug(
        `Attempting to get all flash cards of user id: ${userId}`,
      );
      const cards = await this.cardRespository.find(filter, options);
      return cards.data;
    } catch (error) {
      this.logger.error({ err: error }, 'Get flash cards failed');
      throw error;
    }
  }
}
