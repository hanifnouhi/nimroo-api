import { Body, Controller, Post, Request, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CreateUserDto } from '../user/dtos/create-user.dto';
import { UserService } from '../user/user.service';
import { Response } from 'express';
import { RefreshJwtAuthGuard } from './guards/refresh-jwt-auth.guard';
import { Public } from './public.decorator';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UserDocument } from 'src/user/schemas/user.schema';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {

    constructor(
        private authService: AuthService,
        private readonly userService: UserService,
        @InjectPinoLogger(AuthController.name) private readonly logger: PinoLogger
    ) {

    }
    
    /**
     * User login
     * @param req - http request contains user data
     * @param response - express response to set jwt token cookie
     * @returns {Promise<any>} A promise that resolves to any
     */
    @UseGuards(LocalAuthGuard)
    @Post('login')
    @ApiOperation({ summary: 'User login' })
    @ApiResponse({ status: 201, description: 'User logged in' })
    @ApiBody({ type: Request })
    async login(@Request() req, @Res({ passthrough: true }) response: Response) {
        this.logger.debug(`Received POST request to /login with user data ${req.user}`);
        return await this.authService.login(req.user, response);
    }

    /**
     * Refresh user token for enabling user access
     * @param req - http request contains user data
     * @param response - express response to set jwt token cookie
     * @returns {Promise<any>} A promise that resolves to any
     */
    @UseGuards(RefreshJwtAuthGuard)
    @Post('refresh')
    @ApiOperation({ summary: 'Refresh user jwt token' })
    @ApiResponse({ status: 201, description: 'jwt token successfully refreshed' })
    @ApiBody({ type: Request })
    async refreshToken(
        @Request() req,
        @Res({ passthrough: true }) response: Response,
    ) {
        this.logger.debug(`Received POST request to /refresh with user data ${req.user}`);
        return await this.authService.login(req.user, response);
    }

    /**
     * User sign up
     * @param {CreateUserDto} createUserDto - create user dto contains user email (as username) and password
     * @returns {Promise<UserDocument>} A promise that resolved to user document
     */
    @Post('signup')
    @ApiOperation({ summary: 'User sign up' })
    @ApiResponse({ status: 201, description: 'user successfully created' })
    @ApiBody({ type: CreateUserDto })
    async signup(@Body() createUserDto: CreateUserDto) {
        this.logger.debug(`Received POST request to /signup with user email ${createUserDto.email}`);
        return await this.userService.create(createUserDto);
    }

}
