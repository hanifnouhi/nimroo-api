import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateCardDto } from './dtos/create-card.dto';
import { CardResponseDto } from './dtos/card-response.dto';
import { CardService } from './card.service';
import { plainToInstance } from 'class-transformer';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UpdateCardDto } from './dtos/update-card.dto';
import { FilterQuery, ProjectionType } from 'mongoose';
import { CardDocument, CardSchema } from './schemas/card.schema';
import { QuerySanitizerService } from '../common/services/query-sanitizer.service';
import { QueryOptionsDto } from '../common/dtos/query-options.dto';
import { MembershipFeature, UserRole } from '../user/user.enums';
import { Roles } from '../common/decorators/roles.decorator';
import { UsageInterceptor } from '../common/Interceptors/usage.interceptor';
import { CheckLimit } from '../common/decorators/check-limit.decorator';

@Controller('card')
export class CardController {
  constructor(
    private readonly cardService: CardService,
    @InjectPinoLogger(CardController.name) private readonly logger: PinoLogger,
    private readonly sanitizer: QuerySanitizerService,
  ) {}

  /**
   * Create a flash card with provided data
   * @param {CreateCardDto} createCardDto Create card dto containing all required fields like title, meaning, tags, user
   * @returns {Promise<CardResponseDto>} A promise that resolves to Card Response Dto
   */
  @Post('create')
  @Roles(UserRole.Admin, UserRole.User)
  @CheckLimit(MembershipFeature.CARD_CREATE)
  @UseInterceptors(ClassSerializerInterceptor, UsageInterceptor)
  @ApiOperation({ summary: 'Create a flash card' })
  @ApiResponse({ status: 200, description: 'Create card successful' })
  @ApiBody({ type: CreateCardDto })
  async create(@Body() createCardDto: CreateCardDto): Promise<CardResponseDto> {
    this.logger.debug(
      `Received POST request to /create with data: ${JSON.stringify(createCardDto)}`,
    );
    const card = await this.cardService.create(createCardDto);
    return plainToInstance(CardResponseDto, card.toObject(), {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update a flash card with provided data
   * @param {string} cardId Id of the card to update
   * @param {UpdateCardDto} updateCardDto Update card dto containing all fields instead user field
   * @returns {Promise<CardResponseDto>} A promise resolves to Card Response Dto or rejects if card not found
   */
  @Patch('update/:id')
  @Roles(UserRole.Admin, UserRole.User)
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOperation({ summary: 'Update a flash card' })
  @ApiResponse({ status: 200, description: 'Update card successful' })
  @ApiBody({ type: UpdateCardDto })
  @ApiParam({ name: 'id', type: String, description: 'Flash card ID' })
  async update(
    @Param('id') cardId: string,
    @Body() updateCardDto: UpdateCardDto,
  ): Promise<CardResponseDto> {
    this.logger.debug(`Received POST request to /update with id: ${cardId}`);
    const card = await this.cardService.update(cardId, updateCardDto);
    if (!card) {
      this.logger.error(`Card with ID ${cardId} not found`);
      throw new NotFoundException(`Card with ID ${cardId} not found`);
    }
    return plainToInstance(CardResponseDto, card.toObject(), {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete a flash card with card id
   * @param {string} cardId Id of the card to delete
   * @returns {Promise<boolean>} A promise resolves to true of delete is successful and false if not successful
   */
  @Delete('delete/:id')
  @Roles(UserRole.Admin, UserRole.User)
  @ApiOperation({ summary: 'Delete a flash card' })
  @ApiResponse({ status: 200, description: 'Delete card successful' })
  @ApiBody({ type: String })
  async delete(@Param('id') cardId: string): Promise<boolean> {
    this.logger.debug(`Received DELETE request to /delete with id: ${cardId}`);
    return await this.cardService.delete(cardId);
  }

  /**
   * Find a flash card with card id
   * @param {string} id Id of the card
   * @returns {Promise<boolean>} A promise resolves to Card Resposne Dto
   */
  @Get(':id')
  @Roles(UserRole.Admin, UserRole.User)
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOperation({ summary: 'Find a flash card' })
  @ApiResponse({ status: 200, description: 'Find card successful' })
  @ApiQuery({ name: 'projection', type: String, required: false })
  @ApiParam({ name: 'id', type: String, description: 'Flash card ID' })
  async findOne(
    @Param('id') cardId: string,
    @Query('projection') rawProjection?: string,
  ): Promise<CardResponseDto> {
    //Transform raw projection to ProjectionType
    const projection: ProjectionType<CardDocument> =
      this.sanitizer.sanitizeProjection(rawProjection, CardResponseDto);
    this.logger.debug(`Received GET request to /findOne with id: ${cardId}`);

    const card = await this.cardService.findOne(cardId, projection);
    if (!card) {
      this.logger.error(`Card with id ${cardId} not found`);
      throw new NotFoundException(`Card with id ${cardId} not found`);
    }
    return plainToInstance(CardResponseDto, card.toObject(), {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Find all flash card by user
   * @param {string} userId Id of the user
   * @returns {Promise<CardResponseDto[]>} A promise resolves to Card Resposne Dto array
   */
  @Get('list/:id')
  @Roles(UserRole.Admin, UserRole.User)
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOperation({ summary: 'Find all flash card by user' })
  @ApiResponse({ status: 200, description: 'Find cards successful' })
  async findAll(
    @Param('id') userId: string,
    @Query('filter') rawFilter?: Record<string, any>,
    @Query() rawOptions?: QueryOptionsDto,
  ): Promise<CardResponseDto[] | null> {
    //Transform raw filter to FilterQuery
    const filter: FilterQuery<CardDocument> = this.sanitizer.sanitizeFilter(
      rawFilter ?? {},
      CardResponseDto,
    );
    //Transform raw projection to ProjectionType
    const projection: ProjectionType<CardDocument> =
      this.sanitizer.sanitizeProjection(
        rawOptions?.projection ?? '',
        CardResponseDto,
      );
    const options = {
      projection,
      limit: rawOptions?.limit,
      page: rawOptions?.page,
      sort: rawOptions?.sort,
    };

    this.logger.debug(`Received GET request to /findAll with id: ${userId}`);
    const cards = await this.cardService.findAll(userId, filter, options);
    if (!cards) {
      this.logger.error(`Cards with user ID ${userId} not found`);
      throw new NotFoundException(`Cards with user ID ${userId} not found`);
    }
    return plainToInstance(
      CardResponseDto,
      cards.map((card) => card.toObject()),
      { excludeExtraneousValues: true },
    );
  }
}
