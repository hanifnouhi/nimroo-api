import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { ImageService } from './image.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SearchImageDto } from './dtos/search-image.dto';
import { ImageResultDto } from './dtos/image-result.dto';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckLimit } from '../common/decorators/check-limit.decorator';
import { MembershipFeature, UserRole } from '../user/user.enums';
import { UsageInterceptor } from '../common/Interceptors/usage.interceptor';
import { GenerateImageDto } from './dtos/generate-image.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('image')
@Controller('image')
export class ImageController {
  constructor(
    private readonly imageService: ImageService,
    @InjectPinoLogger(ImageController.name) private readonly logger: PinoLogger,
  ) {}

  @Post('search')
  @Roles(UserRole.User, UserRole.Admin)
  @CheckLimit(MembershipFeature.IMAGE_SEARCH)
  @UseInterceptors(UsageInterceptor)
  @ApiOperation({ summary: 'Search image for flash card' })
  @ApiResponse({ status: 201, description: 'Image searched successful' })
  @ApiBody({ type: SearchImageDto })
  async search(@Body() body: SearchImageDto): Promise<ImageResultDto[]> {
    this.logger.debug(
      `Received POST request to /search with data: ${JSON.stringify(body)}`,
    );
    return await this.imageService.search(body.text, body.sourceLang);
  }

  @Post('generate')
  @Roles(UserRole.User, UserRole.Admin)
  @CheckLimit(MembershipFeature.IMAGE_GENERATION)
  @UseInterceptors(UsageInterceptor)
  @ApiOperation({ summary: 'Generate image for flash card' })
  @ApiResponse({ status: 201, description: 'Image generate successful' })
  @ApiBody({ type: GenerateImageDto })
  async generate(@Body() body: GenerateImageDto): Promise<ImageResultDto[]> {
    this.logger.debug(
      `Received POST request to /generate with data: ${JSON.stringify(body)}`,
    );
    return await this.imageService.generate(body.text);
  }
}
