import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { LlmService } from './llm.service';
import { LlmTextDataDto } from './dtos/llm-text-data.dto';
import { LlmTextDataResultDto } from './dtos/llm-text-data-result.dto';
import { MembershipFeature, UserRole } from '../user/user.enums';
import { Roles } from '../common/decorators/roles.decorator';
import { CheckLimit } from '../common/decorators/check-limit.decorator';
import { UsageInterceptor } from '../common/Interceptors/usage.interceptor';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Controller('llm')
export class LlmController {
  constructor(
    private readonly llmService: LlmService,
    @InjectPinoLogger(LlmController.name) private readonly logger: PinoLogger,
  ) {}

  @Post('textData')
  @Roles(UserRole.Admin, UserRole.User)
  @CheckLimit(MembershipFeature.LLM_TEXTDATA)
  @UseInterceptors(UsageInterceptor)
  @ApiOperation({ summary: 'Request data about text' })
  @ApiResponse({ status: 200, description: 'Text data received successful' })
  @ApiBody({ type: LlmTextDataDto })
  async textData(
    @Body() textDto: LlmTextDataDto,
  ): Promise<LlmTextDataResultDto> {
    this.logger.debug(
      `Received POST request to /textData with data: ${JSON.stringify(textDto)}`,
    );
    return await this.llmService.textData(
      textDto.text,
      textDto.sourceLang,
      textDto.targetLang,
    );
  }
}
