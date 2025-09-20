import { Controller, Body, Post, Get, UseGuards } from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserDocument } from './schemas/user.schema';
import { Public } from '../auth/public.decorator';

@ApiTags('User')
@Controller('user')
export class UserController {

    constructor(
        private readonly userService: UserService,
        @InjectPinoLogger(UserController.name) private readonly logger: PinoLogger
    ) {}

    /**
     * Route to create user 
     * @param creteUserDto Create user dto containing {string} email, {string} password, {string} name:optional
     * @returns {Promise<UserDocument>} A promise that resolves to UserDocument containing email and id of the user and the user name if provided.
     */
    @Post('create')
    @ApiOperation({ summary: 'Create new user' })
    @ApiResponse({ status: 201, description: 'User created successful' })
    @ApiBody({ type: CreateUserDto })
    async createUser(@Body() creteUserDto: CreateUserDto): Promise<UserDocument> {
        this.logger.debug(`Received POST request to /create with data: ${JSON.stringify(creteUserDto)}`);
        return await this.userService.create(creteUserDto);
    }

    /**
     * Route to users list
     * @returns {Promise<UserDocument[] | null>} A promise that resolves to array of UserDocument or null
     */
    @Get('list')
    @ApiOperation({ summary: 'Create new user' })
    @ApiResponse({ status: 200, description: 'User created successful' })
    @ApiBody({ type: CreateUserDto })
    async getUsers(): Promise<UserDocument[] | null> {
        this.logger.debug('Received Get request to /list');
        return await this.userService.findAll();
    }
}
