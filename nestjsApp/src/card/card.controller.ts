import { Body, ClassSerializerInterceptor, Controller, Delete, Get, NotFoundException, Post, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateCardDto } from './dtos/create-card.dto';
import { CardResponseDto } from './dtos/card-response.dto';
import { CardService } from './card.service';
import { plainToInstance } from 'class-transformer';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UpdateCardDto } from './dtos/update-card.dto';

@Controller('card')
export class CardController {

    constructor(
        private readonly cardService: CardService,
        @InjectPinoLogger(CardController.name) private readonly logger: PinoLogger
    ){}

    /**
     * Create a flash card with provided data
     * @param {CreateCardDto} createCardDto Create card dto containing all required fields like title, meaning, tags, user
     * @returns {Promise<CardResponseDto>} A promise that resolves to Card Response Dto
     */
    @UseInterceptors(ClassSerializerInterceptor)
    @Post()
    @ApiOperation({ summary: 'Create a flash card' })
    @ApiResponse({ status: 200, description: 'Create card successful' })
    @ApiBody({ type: CreateCardDto })
    async create(@Body() createCardDto: CreateCardDto): Promise<CardResponseDto> {
        this.logger.debug(`Received POST request to /create with data: ${JSON.stringify(createCardDto)}`);
        const card = await this.cardService.create(createCardDto);
        return plainToInstance(CardResponseDto, card.toObject(), { excludeExtraneousValues: true });
    }

    /**
     * Update a flash card with provided data
     * @param {string} cardId Id of the card to update
     * @param {UpdateCardDto} updateCardDto Update card dto containing all fields instead user field
     * @returns {Promise<CardResponseDto>} A promise resolves to Card Response Dto or rejects if card not found
     */
    @UseInterceptors(ClassSerializerInterceptor)
    @Post()
    @ApiOperation({ summary: 'Update a flash card' })
    @ApiResponse({ status:200, description: 'Update card successful' })
    @ApiBody({ type: UpdateCardDto })
    async update(@Body() cardId: string, @Body() updateCardDto: UpdateCardDto): Promise<CardResponseDto> {
        this.logger.debug(`Received POST request to /update with id: ${cardId}`);
        const card = await this.cardService.update(cardId, updateCardDto);
        if (!card) {
            this.logger.error(`Card with ID ${cardId} not found`);
            throw new NotFoundException(`Card with ID ${cardId} not found`);
        }
        return plainToInstance(CardResponseDto, card.toObject(), { excludeExtraneousValues: true });
    }

    /**
     * Delete a flash card with card id
     * @param {string} cardId Id of the card to delete
     * @returns {Promise<boolean>} A promise resolves to true of delete is successful and false if not successful
     */
    @Delete()
    @ApiOperation({ summary: 'Delete a flash card' })
    @ApiResponse({ status:200, description: 'Delete card successful' })
    @ApiBody({ type: String })
    async delete(@Body() cardId: string): Promise<boolean> {
        this.logger.debug(`Received DELETE request to /delete with id: ${cardId}`);
        return await this.cardService.delete(cardId);
    }

    /**
     * Find a flash card with card id
     * @param {string} cardId Id of the card
     * @returns {Promise<boolean>} A promise resolves to Card Resposne Dto
     */
    @UseInterceptors(ClassSerializerInterceptor)
    @Get()
    @ApiOperation({ summary: 'Find a flash card' })
    @ApiResponse({ status:200, description: 'Find card successful' })
    @ApiBody({ type: String })
    async findById(@Body() cardId: string): Promise<CardResponseDto> {
        this.logger.debug(`Received GET request to /findById with id: ${cardId}`);
        const card = await this.cardService.findById(cardId);
        if (!card) {
            this.logger.error(`Card with ID ${cardId} not found`);
            throw new NotFoundException(`Card with ID ${cardId} not found`);
        }
        return plainToInstance(CardResponseDto, card.toObject(), { excludeExtraneousValues: true });
    }

    /**
     * Find all flash card by user
     * @param {string} userId Id of the user
     * @returns {Promise<CardResponseDto[]>} A promise resolves to Card Resposne Dto array
     */
    @UseInterceptors(ClassSerializerInterceptor)
    @Get()
    @ApiOperation({ summary: 'Find all flash card by user' })
    @ApiResponse({ status:200, description: 'Find cards successful' })
    @ApiBody({ type: String })
    async findAll(@Body() userId: string): Promise<CardResponseDto[] | null> {
        this.logger.debug(`Received GET request to /findAll with id: ${userId}`);
        const cards = await this.cardService.findAll(userId);
        if (!cards) {
            this.logger.error(`Cards with user ID ${userId} not found`);
            throw new NotFoundException(`Cards with user ID ${userId} not found`);
        }
        return plainToInstance(CardResponseDto, cards.map(card => card.toObject()), { excludeExtraneousValues: true });
    }
}
