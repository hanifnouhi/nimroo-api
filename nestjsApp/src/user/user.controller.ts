import { Controller, Body, Post, Get, UseGuards, UseInterceptors, ClassSerializerInterceptor, Query, Patch, Param, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { UserService } from './user.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserDocument } from './schemas/user.schema';
import { AdminUserResponseDto } from './dtos/admin-user-response.dto';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from './dtos/user-response.dto';
import { QueryOptionsDto } from '../common/dtos/query-options.dto';
import { FilterQuery, ProjectionType } from 'mongoose';
import { QuerySanitizerService } from '../common/services/query-sanitizer.service';
import { UpdateUserDto } from './dtos/update-user.dto';

@ApiTags('User')
@Controller('user')
export class UserController {

    constructor(
        private readonly userService: UserService,
        @InjectPinoLogger(UserController.name) private readonly logger: PinoLogger,
        private readonly sanitizer: QuerySanitizerService
    ) {}

    /**
     * Route to create user 
     * @param createUserDto Create user dto containing {string} email, {string} password, {string} name:optional
     * @returns {Promise<UserResponseDto>} A promise that resolves to UserResponseDto containing email and id of the user and the user name if provided.
     */
    @UseInterceptors(ClassSerializerInterceptor)
    @Post('create')
    @ApiOperation({ summary: 'Create new user' })
    @ApiResponse({ status: 201, description: 'User created successful' })
    @ApiBody({ type: CreateUserDto })
    async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
        this.logger.debug(`Received POST request to /create with email: ${JSON.stringify(createUserDto.email)}`);
        const user = await this.userService.create(createUserDto);
        return plainToInstance(UserResponseDto, user.toObject(), { excludeExtraneousValues: true });
    }

    /**
     * Route to update user data
     * @param userId User id
     * @param updateUserDto Update user dto containing the fields to update
     * @returns {Promise<UserResponseDto>} A promise that resolves to UserResponseDto containing email and id of the user and the user name if provided.
     */
    @UseInterceptors(ClassSerializerInterceptor)
    @Patch('update/:id')
    @ApiOperation({ summary: 'Update user data' })
    @ApiResponse({ status: 200, description: 'User updated successful'})
    @ApiBody({ type: UpdateUserDto })
    async update(@Param('id') userId: string, @Body() updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
        this.logger.debug(`Received PATCH request to /update with id: ${userId}`);
        const user = await this.userService.update(userId, updateUserDto);
        return plainToInstance(UserResponseDto, user?.toObject(), { excludeExtraneousValues: true });
    }

    /**
     * Route to delete user by id, set status to deleted
     * @param userId User id
     * @returns {Promise<AdminUserResponseDto>} A promise that resolves to AdminUserResponseDto containing all fields of the user.
     */
    @Patch('delete/:id')
    @ApiOperation({ summary: 'Update user status to deleted' })
    @ApiResponse({ status: 200, description: 'User deleted successful'})
    async delete(@Param('id') userId: string): Promise<AdminUserResponseDto> {
        this.logger.debug(`Received PATCH request to /delete with id: ${userId}`);
        const user = await this.userService.delete(userId);
        return plainToInstance(AdminUserResponseDto, user?.toObject(), { excludeExtraneousValues: true });
    }

    /**
     * Route to get user by id
     * @param userId User id
     * @returns {Promise<UserResponseDto>} A promise that resolves to UserResponseDto containing all fields of the user.
     */
    @Get('get/:id')
    @ApiOperation({ summary: 'Get user by id' })
    @ApiResponse({ status: 200, description: 'User retrieved successful'})
    async getUser(@Param('id') userId: string): Promise<UserResponseDto> {
        this.logger.debug(`Received GET request to /get with id: ${userId}`);
        const user = await this.userService.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return plainToInstance(UserResponseDto, user?.toObject(), { excludeExtraneousValues: true });
    }

    /**
     * Route to get user by id
     * @param userId User id
     * @returns {Promise<AdminUserResponseDto>} A promise that resolves to AdminUserResponseDto containing all fields of the user.
     */
    @Get('get-admin/:id')
    @ApiOperation({ summary: 'Get admin user by id' })
    @ApiResponse({ status: 200, description: 'User retrieved successful'})
    async getUserAdmin(@Param('id') userId: string): Promise<AdminUserResponseDto> {
        this.logger.debug(`Received GET request to /get-admin with id: ${userId}`);
        const user = await this.userService.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return plainToInstance(AdminUserResponseDto, user?.toObject(), { excludeExtraneousValues: true });
    }

    /**
     * Route to users list
     * @returns {Promise<AdminUserResponseDto[]>} A promise that resolves to array of AdminUserResponseDto
     */
    @Get('list')
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, description: 'List of users', type: [AdminUserResponseDto] })
    async getUsers(@Query('filter') rawFilter?: Record<string, any>, @Query() rawOptions?: QueryOptionsDto) : Promise<AdminUserResponseDto[] | null> {
        //Transform raw filter to FilterQuery
        const filter: FilterQuery<UserDocument> = this.sanitizer.sanitizeFilter(rawFilter ?? {}, AdminUserResponseDto);
        //Transform raw projection to ProjectionType
        const projection: ProjectionType<UserDocument> = this.sanitizer.sanitizeProjection(rawOptions?.projection ?? '', AdminUserResponseDto);
        const options = { projection, limit: rawOptions?.limit, page: rawOptions?.page, sort: rawOptions?.sort };

        this.logger.debug('Received Get request to /list');
        const users = await this.userService.findAll(filter, options);
        return plainToInstance(AdminUserResponseDto, users ?? [], { excludeExtraneousValues: true });
    }
}
