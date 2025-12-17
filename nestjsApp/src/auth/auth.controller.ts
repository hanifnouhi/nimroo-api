import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, Request, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CreateUserDto } from '../user/dtos/create-user.dto';
import { UserService } from '../user/user.service';
import { Response } from 'express';
import { RefreshJwtAuthGuard } from './guards/refresh-jwt-auth.guard';
import { Public } from './public.decorator';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from '../user/dtos/user-response.dto';
import { ResendVerificationDto } from './dtos/resend-verification.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ValidateTokenDto } from './dtos/validate-token.dto';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {

    constructor(
        private authService: AuthService,
        private readonly userService: UserService,
        @InjectPinoLogger(AuthController.name) private readonly logger: PinoLogger
    ) {

    }

    // Redirect user to Google's consent screen
    @Public()
    @Get('google')
    @ApiOperation({ summary: 'Google OAuth redirect' })
    @ApiResponse({ status: 302, description: 'Redirect to Google OAuth' })
    @UseGuards(GoogleOAuthGuard)
    async googleAuth() {}

    /**
     * User login with google oauth
     * @param req - http request contains user data from google
     * @param response - express response to set jwt token cookie
     * @returns {Promise<any>} A promise that resolves to any
     */
    @Public()
    @Get('google/callback')
    @ApiOperation({ summary: 'Google OAuth callback' })
    @ApiResponse({ status: 200, description: 'Google OAuth success' })
    @UseGuards(GoogleOAuthGuard)
    async googleAuthRedirect(@Req() req, @Res({ passthrough: true }) response: Response) {
        this.logger.debug(`Received GET request to /google/callback with user data ${req.user}`);
        return await this.authService.googleLogin(req, response);
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
    @HttpCode(HttpStatus.OK)
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
     * @returns {Promise<boolean>} A promise that resolves to boolean
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
     * Route to resend verification email to user
     * @param resendVerificationDto Resend verification dto containing user email
     * @returns {Promise<boolean>} A promise that resolves to true if the verification email sent successfully or throw an error if not
     */
    @Public()
    @Post('resend-verification-email')
    @ApiOperation({ summary: 'Resend verification email to user' })
    @ApiResponse({ status: 200, description: 'Verification email sent successfully'})
    @ApiBody({ type: ResendVerificationDto })
    async resendVerificationEmail(@Body() resendVerificationDto: ResendVerificationDto): Promise<boolean> {
        this.logger.debug(`Received POST request to /resend-verification-email with email: ${resendVerificationDto.email}`);
        return await this.authService.resendVerificationEmail(resendVerificationDto.email);
    }

    /**
     * Route to send password reset email to user
     * @param forgotPasswordDto Forgot password dto containing user email
     * @returns { Promise<boolean> } A promise that resolves to true if the reset password email sent successfully or false if not
     */
    @Public()
    @Post('forgot-password')
    @ApiOperation({ summary: 'Forgot password' })
    @ApiResponse({ status: 200, description: 'Password reset email sent successfully'})
    @ApiBody({ type: ForgotPasswordDto })
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<boolean> {
        this.logger.debug(`Received POST request to /forgot-password with email: ${forgotPasswordDto.email}`);
        return await this.authService.sendPasswordResetEmail(forgotPasswordDto.email);
    }

    /**
     * Route to validate verify email token
     * @param {ValidateTokenDto} validateTokenDto - Validate token dto containing token 
     * @returns {Promise<boolean>} A promise that resolved to true if the token is valid and to false if the token is not valid
     */
    @Public()
    @Post('validate-verify-email-token')
    @ApiOperation({ summary: 'Validate verify email token' })
    @ApiResponse({ status: 200, description: 'Email is verfied', type: Boolean })
    @ApiQuery({ type: ValidateTokenDto })
    async validateVerifyEmailToken(@Query() validateTokenDto: ValidateTokenDto): Promise<boolean> {
        this.logger.debug(`Received POST request to /validate-verify-email-token`);
        return await this.authService.validateVerifyEmailToken(validateTokenDto.token);
    }

    /**
     * Route to validate reset password token
     * @param {ValidateTokenDto} validateTokenDto - Validate token dto containing token 
     * @returns {Promise<boolean>} A promise that resolved to true if the token is valid and to false if the token is not valid
     */
    @Public()
    @Post('reset-password')
    @ApiOperation({ summary: 'Validate reset password token' })
    @ApiResponse({ status: 200, description: 'Reset password token is valid', type: Boolean })
    @ApiQuery({ type: ValidateTokenDto })
    async validateResetPasswordToken(@Query() validateTokenDto: ValidateTokenDto): Promise<boolean> {
        this.logger.debug(`Received POST request to /reset-password`);
        return await this.authService.validateResetPasswordToken(validateTokenDto.token);
    }
}
