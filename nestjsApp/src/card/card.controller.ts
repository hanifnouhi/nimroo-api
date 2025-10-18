import { Body, ClassSerializerInterceptor, Controller, Post, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateCardDto } from './dtos/create-card.dto';
import { CardResponseDto } from './dtos/card-response.dto';
import { CardService } from './card.service';
import { plainToInstance } from 'class-transformer';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

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
        this.logger.debug(`Received POST request to /card with data: ${JSON.stringify(createCardDto)}`);
        const card = await this.cardService.create(createCardDto);
        return plainToInstance(CardResponseDto, card.toObject(), { excludeExtraneousValues: true });
    }
}
