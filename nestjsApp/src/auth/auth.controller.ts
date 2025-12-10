import { Body, Controller, Param, Patch, Post, Request, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CreateUserDto } from '../user/dtos/create-user.dto';
import { UserService } from '../user/user.service';
import { Response } from 'express';
import { RefreshJwtAuthGuard } from './guards/refresh-jwt-auth.guard';
import { Public } from './public.decorator';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { UpdateRefreshTokenDto } from './dtos/update-refresh-token.dto';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from '../user/dtos/user-response.dto';
import { ResendVerificationDto } from './dtos/resend-verification.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';

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
    @Public()
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
    @Public()
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
    @Public()
    @Post('signup')
    @ApiOperation({ summary: 'User sign up' })
    @ApiResponse({ status: 201, description: 'user successfully created' })
    @ApiBody({ type: CreateUserDto })
    async signup(@Body() createUserDto: CreateUserDto) {
        this.logger.debug(`Received POST request to /signup with user email ${createUserDto.email}`);
        const user = await this.authService.signup(createUserDto);
        return plainToInstance(UserResponseDto, user.toJSON(), { excludeExtraneousValues: true });
    }

    /**
     * Route to change user password
     * @param userId User id
     * @param changePasswordDto Change password dto containing new password
     * @returns {Promise<void>} A promise that resolves to void
     */
    @Patch('change-password/:id')
    @ApiOperation({ summary: 'Change user password' })
    @ApiResponse({ status: 200, description: 'Password changed successful'})
    @ApiBody({ type: ChangePasswordDto })
    async changePassword(@Param('id') userId: string, @Body() changePasswordDto: ChangePasswordDto): Promise<boolean> {
        this.logger.debug(`Received PATCH request to /change-password with id: ${userId}`);
        return await this.authService.changePassword(userId, changePasswordDto);
    }

    /**
     * Route to update user refresh token
     * @param userId User id
     * @param updateRefreshTokenDto Update refresh token dto containing refresh token
     * @returns {Promise<void>} A promise that resolves to void
     */
    @Patch('update-refresh-token/:id')
    @ApiOperation({ summary: 'Update user refresh token' })
    @ApiResponse({ status: 200, description: 'Refresh token updated successful'})
    @ApiBody({ type: UpdateRefreshTokenDto })
    async updateRefreshToken(@Param('id') userId: string, @Body() updateRefreshTokenDto: UpdateRefreshTokenDto): Promise<void> {
        this.logger.debug(`Received PATCH request to /update-refresh-token with id: ${userId}`);
        return await this.userService.updateRefreshToken(userId, updateRefreshTokenDto);
    }

    /**
     * Route to resend verification email to user
     * @param resendVerificationDto Resend verification dto containing user email
     * @returns {Promise<boolean>} A promise that resolves to true if the verification email sent successfully or throw an error if not
     */
    @Post('resend-verification-email')
    @ApiOperation({ summary: 'Resend verification email to user' })
    @ApiResponse({ status: 200, description: 'Verification email sent successfully'})
    @ApiBody({ type: ResendVerificationDto })
    async resendVerificationEmail(@Body() resendVerificationDto: ResendVerificationDto): Promise<boolean> {
        this.logger.debug(`Received POST request to /resend-verification-email with email: ${resendVerificationDto.email}`);
        return await this.authService.resendVerificationEmail(resendVerificationDto.email);
    }

    @Post('forgot-password')
    @ApiOperation({ summary: 'Forgot password' })
    @ApiResponse({ status: 200, description: 'Password reset email sent successfully'})
    @ApiBody({ type: ForgotPasswordDto })
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<boolean> {
        this.logger.debug(`Received POST request to /forgot-password with email: ${forgotPasswordDto.email}`);
        return await this.authService.sendPasswordResetEmail(forgotPasswordDto.email);
    }
}
