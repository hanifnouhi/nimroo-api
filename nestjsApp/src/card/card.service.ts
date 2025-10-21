import { Injectable } from '@nestjs/common';
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
        @InjectPinoLogger(CardService.name) private readonly logger: PinoLogger
    ){}

    async create(data: CreateCardDto): Promise<CardDocument> {
        try{
            this.logger.debug(`Attempting to create a flash card with title: ${data.title}`);
            return await this.cardRespository.create(data);
        } catch (error) {
            this.logger.error({ err: error }, 'Create flash card failed');
            throw error;
        }       
    }

    async update(cardId: string, data: UpdateCardDto): Promise<CardDocument | null> {
        try{
            this.logger.debug(`Attempting to update a flash card with id: ${cardId}`);
            return await this.cardRespository.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(cardId) }, data);
        } catch (error) {
            this.logger.error({ err: error }, 'Update flash card failed');
            throw error;
        }
    }

    async delete(cardId: string): Promise<boolean> {
        try{
            this.logger.debug(`Attempting to delete a flash card with id: ${cardId}`);
            return await this.cardRespository.deleteMany({ _id: new mongoose.Types.ObjectId(cardId) });
        } catch (error) {
            this.logger.error({ err: error }, 'Delete flash card failed');
            throw error;
        }
    }

    async findOne(cardId: string, projection?: ProjectionType<CardDocument>): Promise<CardDocument | null> {
        try{
            const filter: FilterQuery<CardDocument> = { _id: new mongoose.Types.ObjectId(cardId) } as unknown as FilterQuery<CardDocument>;
            this.logger.debug(`Attempting to find a flash card with id: ${cardId}`);
            return projection
                ? await this.cardRespository.findOne(filter, { projection })
                : await this.cardRespository.findOne(filter);
        } catch (error) {
            this.logger.error({ err: error }, 'Find flash card failed');
            throw error;
        }
    }

    async findAll(userId: string): Promise<CardDocument[] | null> {
        try{
            this.logger.debug(`Attempting to get all flash cards of user id: ${userId}`);
            return await this.cardRespository.find({ user: new mongoose.Types.ObjectId(userId) });
        } catch (error) {
            this.logger.error({ err: error }, 'Get flash cards failed');
            throw error;
        }
    }
}
