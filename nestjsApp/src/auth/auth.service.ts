import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { UserDto } from '../user/dtos/user.dto';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { TokenPayload } from './token-payload.interface';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UserDocument } from '../user/schemas/user.schema';
import { UserResponseDto } from '../user/dtos/user-response.dto';
import { EmailService } from '../email/email.service';
import { CreateUserDto } from '../user/dtos/create-user.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { UpdateRefreshTokenDto } from './dtos/update-refresh-token.dto';
import { UserProvider } from '../user/user.enums';

/**
 * Service responsible for authenticating users
 */
@Injectable()
export class AuthService {

    constructor(
        private readonly userService: UserService,
        private jwtService: JwtService,
        private readonly configService: ConfigService,
        @InjectPinoLogger(AuthService.name) private readonly logger: PinoLogger,
        private readonly emailService: EmailService
    ) {}

    /**
     * Validate user credentials.
     * 
     * @param {string} email - User email that used instead of user name
     * @param {string} pwd - User password
     * @returns {Promise<UserDto>} A promise resolving to user dto containing id, name, email and refresh token
     */
    async validateUser(email: string, pwd: string): Promise<UserResponseDto> {
        this.logger.debug(`Attempting to validate user with ${email} email`);
        try {
            const user = await this.userService.findByEmail(email);
            let isPasswordValid = false;
            // if found user, check password
            if (user) {
                isPasswordValid = await this.comparePasswords(pwd, user.password);
            }
            if (!isPasswordValid) {
                throw new UnauthorizedException();
            }
            this.logger.info(`User with ${email} was successfully validated`);
            return plainToInstance(UserResponseDto, user!.toJSON(), { excludeExtraneousValues: true });
        } catch(error) {
            this.logger.error({ error: error.message, stack: error.stack }, `Error in validating user with ${email} email`);
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new InternalServerErrorException();
        } 
    }

    /**
     * Sign up method for user
     * @param { CreateUserDto } createUserDto - Create user dto containing user email, password and optional name properties
     * @returns { Promise<UserDocument> } A promise resolving to user document
     */
    async signup(createUserDto: CreateUserDto): Promise<UserDocument> {
        this.logger.debug(`Attempting to signup a user with ${createUserDto.email} email`);
        //must hash the password just in case of local provider
        if (createUserDto.provider === UserProvider.Local) {
            if (!createUserDto.password) {
                throw new BadRequestException('Password is required for local signup');
            }
            //hash password before creating user
            createUserDto.password = await this.hashPassword(createUserDto.password);
        } 
        try {
            const user = await this.userService.create(createUserDto);
            this.verifyEmail(user.id, user.email);
            return user;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Login method for user
     * 
     * @param {UserDto} user - User dto containing user id, name, email and refresh token 
     * @param {Response} response - Express response object for add tokens cookies
     * @param {boolean} redirect - Redirect to a page or not
     */
    async login(user: UserDto, response: Response, redirect = false): Promise<any> {
        this.logger.debug(`Attempting to login user with ${user.email} email and assign access and refresh tokens`);
        //Create expiration for access token
        const expiresAccessToken = new Date();
        expiresAccessToken.setMilliseconds(
        expiresAccessToken.getTime() +
            parseInt(
            this.configService.getOrThrow<string>(
                'JWT_ACCESS_TOKEN_EXPIRATION_MS',
            ),
            ),
        );

        //Create expiration for refresh token
        const expiresRefreshToken = new Date();
        expiresRefreshToken.setMilliseconds(
        expiresRefreshToken.getTime() +
            parseInt(
            this.configService.getOrThrow<string>(
                'JWT_REFRESH_TOKEN_EXPIRATION_MS',
            ),
            ),
        );

        const tokenPayload: TokenPayload = {
            userId: user.id,
        };
        //Create jwt access token
        const accessToken = this.jwtService.sign(tokenPayload, {
            secret: this.configService.getOrThrow('JWT_ACCESS_TOKEN_SECRET'),
            expiresIn: `${this.configService.getOrThrow(
                'JWT_ACCESS_TOKEN_EXPIRATION_MS',
            )}ms`,
        });
        //Create jwt refresh token
        const refreshToken = this.jwtService.sign(tokenPayload, {
            secret: this.configService.getOrThrow('JWT_REFRESH_TOKEN_SECRET'),
            expiresIn: `${this.configService.getOrThrow(
                'JWT_REFRESH_TOKEN_EXPIRATION_MS',
            )}ms`,
        });

        try {
            this.logger.debug(`Attempting to update user refresh token with id: ${user.id}`);
            //Update user refresh token with the new one
            await this.userService.updateRefreshToken(
                user.id,
                {refreshToken: await bcrypt.hash(refreshToken, 10)},
            );

            //Set authentication and refresh tokens cookies
            response.cookie('Authentication', accessToken, {
                httpOnly: true,
                secure: this.configService.get('NODE_ENV') === 'production',
                expires: expiresAccessToken,
            });
            response.cookie('Refresh', refreshToken, {
                httpOnly: true,
                secure: this.configService.get('NODE_ENV') === 'production',
                expires: expiresRefreshToken,
            });
            this.logger.info(`User updated successfully and tokens cookies were set`);
            if (redirect) {
                const redirectUrl = this.configService.getOrThrow('AUTH_UI_REDIRECT');
                this.logger.debug(`Redirect to ${redirectUrl} after login`);
                response.redirect(redirectUrl);
            }
        } catch(error) {
            this.logger.error({ error: error.message, stack: error.stack }, `Error in updating user refresh token with id: ${user.id}`);
            throw new InternalServerErrorException();
        }
        
    }

    async googleLogin(req: any, response: Response) {
        if(!req.user) {
            throw new UnauthorizedException('No user from google');
        }

        const { email, name, picture, id: providerId } = req.user;

        let user = await this.userService.findByEmail(req.user.email);

        if (!user) {
            const createUserDto: CreateUserDto = {
                email,
                name,
                providerId,
                provider: UserProvider.Google,
                oauthProviders: { google: { id: providerId, picture } }
            }
            user = await this.userService.create(createUserDto);
        } else {
            await this.userService.update(user.id, {
                isVerified: true,
                providerId,
                provider: UserProvider.Google
            });
        }

        const userDto = plainToInstance(UserDto, user.toJSON());
        return await this.login(userDto, response, true);
    }

    /**
     * Change password method for user
     * @param { string } userId - User id 
     * @param { ChangePasswordDto } changePasswordDto - Change password dto containin new password 
     * @returns { Promise<boolean> } A promise resolving to true if change password was successfull and false if it's not successfull
     */
    async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<boolean> {
        this.logger.debug(`Attempting to change user password by user id: ${userId}`);
        changePasswordDto.password = await this.hashPassword(changePasswordDto.password);
        return await this.userService.updatePassword(userId, changePasswordDto);
    }

    /**
     * Verify user refresh token
     * 
     * @param {string} refreshToken - User refresh token
     * @param {string} userId - User id
     * @returns {Promise<UserDocument | null>} A promise resolving to user document (if refresh token is valid) or null
     */
    async veryifyUserRefreshToken(refreshToken: string, userId: string): Promise<UserDocument | null> {
        this.logger.debug(`Attempting to verify user refresh token by user id: ${userId}`);
        try {
            this.logger.debug(`Attempting to find user by id: ${userId}`);
            const user = await this.userService.findById(userId);
            // console.log('user is: ', user);
            if (!user) {
                throw new NotFoundException('User not found');
            }
            const authenticated = await bcrypt.compare(refreshToken, user?.refreshToken);
            // console.log('is authenticated: ', authenticated);
            if (!authenticated) {
                throw new UnauthorizedException('Invalid refresh token');
            }
            this.logger.info(`User with id: ${userId} refresh token verified`);
            return user;
        } catch(error) {
            this.logger.error({ error: error.message, stack: error.stack }, `Error in verifing user with id: ${userId}`);
            if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Unexpected error while verifying refresh token');
        }
    }

    /**
     * Verify user email
     * 
     * @param {string} userId - User id
     * @param {string} email - User email
     * @returns {Promise<boolean>} A promise resolving to true if the verification email sent successfully or throw an error if not
     */
    async verifyEmail(userId: string, email: string): Promise<boolean> {
        const tokenPayLoad: TokenPayload = {
            userId
        };
        //Create jwt email token
        const token = this.jwtService.sign(
            tokenPayLoad,
            { 
                secret: this.configService.getOrThrow('JWT_EMAIL_SECRET'),
                expiresIn: `${this.configService.getOrThrow(
                    'JWT_EMAIL_TOKEN_EXPIRATION_D',
                )}d`,
            }
        );
        try {
            this.logger.debug(`Attempting to send verification email to ${email}`);
            //Send verification email
            await this.emailService.sendVerificationEmail(email, token);
            //Update verification email sent at
            await this.userService.updateVerificationEmailSentAt(userId);
            this.logger.info(`Verification email sent successfully to ${email}`);
            return true;
        } catch (error) {
            this.logger.error({ error }, `Error in sending verification email to ${email}`);
            return false;
        }
        
    }

    /**
     * Resend verification email to user
     * 
     * @param {string} email - User email
     * @returns {Promise<boolean>} A promise resolving to true if the verification email sent successfully or throw an error if not
     */
    async resendVerificationEmail(email: string): Promise<boolean> {
        this.logger.debug(`Attempting to find user with email ${email}`);
        const user = await this.userService.findByEmail(email);
        //If user not found, throw NotFoundException
        if (!user) {
            throw new NotFoundException('User not found');
        }
        //If user is verified, throw BadRequestException
        if (user.isVerified) {
            throw new BadRequestException('User already verified');
        } 
        //If last verification email sent less than 24 hours ago, throw BadRequestException
        if (user.verificationEmailSentAt && Date.now() - user.verificationEmailSentAt.getTime() < 1000 * 60 * 60 * 24) {
            throw new BadRequestException('You can only resend the verification email once every 24 hours');
        }
        return await this.verifyEmail(user.id, email);
    }

    async sendPasswordResetEmail(email: string): Promise<boolean> {
        this.logger.debug(`Attempting to find user with email ${email}`);
        const user = await this.userService.findByEmail(email);
        //If user not found, throw NotFoundException
        if (!user) {
            throw new NotFoundException('User not found');
        }
        const tokenPayLoad: TokenPayload = {
            userId: user.id
        };
        //Create jwt reset password token
        const token = this.jwtService.sign(
            tokenPayLoad,
            { 
                secret: this.configService.getOrThrow('JWT_RESET_PASSWORD_SECRET'),
                expiresIn: `${this.configService.getOrThrow(
                    'JWT_RESET_PASSWORD_TOKEN_EXPIRATION_M',
                )}ms`,
            }
        );
        try {
            this.logger.debug(`Attempting to send reset password email to ${email}`);
            //Send reset password email
            await this.emailService.sendPasswordResetEmail(email, token);
            //Update passwordResetEmailSentAt
            await this.userService.updatePasswordResetEmailSentAt(user.id);
            this.logger.info(`Reset password email sent successfully to ${email}`);
            return true;
        } catch (error) {
            this.logger.error({ error }, `Error in sending reset password email to ${email}`);
            return false;
        }
    }

    /**
     * Validate verify email token for verifiyng user email
     * @param {string} token - verify email token 
     * @returns {Promise<boolean>} A promise resolving to true if the token is valid and to false if token is not valid
     */
    async validateVerifyEmailToken(token: string): Promise<boolean> {
        try {
            this.logger.debug(`Attempting to validate verify email token`);
            const payload = this.jwtService.verify(token, this.configService.getOrThrow('JWT_EMAIL_SECRET'));
            this.logger.info(`Verify email token is valid with user id: ${payload.userId}`);
            //update isVerified property in user data
            await this.userService.update(payload.userId, { isVerified: true });
            this.logger.info(`User data updated successfully`);
            return true;
        } catch (error) {
            this.logger.error({ error }, `Error in validating verify email token`);
            return false;
        }
    }

    /**
     * Validate reset password token for reseting user password
     * @param {string} token - reset password token 
     * @returns {Promise<boolean>} A promise resolving to true if the token is valid and to false if token is not valid
     */
    async validateResetPasswordToken(token: string): Promise<boolean> {
        try {
            this.logger.debug(`Attempting to validate reset password token`);
            const payload = this.jwtService.verify(token, this.configService.getOrThrow('JWT_RESET_PASSWORD_SECRET'));
            this.logger.info(`Reset password token is valid with user id: ${payload.userId}`);
            return true;
        } catch (error) {
            this.logger.error({ error }, `Error in validating reset password token`);
            return false;
        }
    }

    /**
     * Hash password when creating a user to prevent save password in db as a plain text
     * 
     * @param {string} password - Plain text password to hash
     * @returns {Promise<string>} A promise resolving to the hashed password
     */
    async hashPassword(password: string): Promise<string> {
        this.logger.debug('Attempting to hash user password');
        return await bcrypt.hash(password, 10);
    }

    /**
     * Compare user password with hashed password
     * 
     * @param {string} password - User password
     * @param {string} hashedPassword - User hashed password
     * @returns {Promise<any>} A promise resolving to any
     */
    async comparePasswords(password: string, hashedPassword: string) {
        this.logger.debug(`Attempting to compare user password with hashed password`);
        return await bcrypt.compare(password, hashedPassword);
    }
}
