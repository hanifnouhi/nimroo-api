import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
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

/**
 * Service responsible for authenticating users
 */
@Injectable()
export class AuthService {

    constructor(
        private readonly userService: UserService,
        private jwtService: JwtService,
        private readonly configService: ConfigService,
        @InjectPinoLogger(AuthService.name) private readonly logger: PinoLogger
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
