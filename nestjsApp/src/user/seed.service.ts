import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole, UserStatus, MembershipPlan } from './user.enums';
import { UserRepository } from './user.repository';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class SeedService implements OnModuleInit {

  constructor(
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
    @InjectPinoLogger(SeedService.name) private readonly logger: PinoLogger
  ) {}

  async onModuleInit() {
    await this.seedAdmin();
  }

  /**
   * Seed method to create a admin for the first deploy
   * @returns 
   */
  private async seedAdmin() {
    const adminEmail = this.configService.get<string>('INITIAL_ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('INITIAL_ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      this.logger.warn('Initial admin credentials not found in environment variables. Skipping seed.');
      return;
    }

    // 1. Check if ANY admin already exists
    const adminExists = await this.userRepository.findOne({ role: UserRole.Admin });

    if (!adminExists) {
      this.logger.info('No admin found. Creating default admin...');

      try {
        await this.userRepository.create({
          email: adminEmail,
          password: adminPassword,
          role: UserRole.Admin, 
          status: UserStatus.Active,
          membership: MembershipPlan.FULL, // Give admin full features
          name: 'System Admin',
          isVerified: true
        });
        this.logger.info(`Default admin created: ${adminEmail}`);
      } catch (error) {
        this.logger.error('Failed to create default admin', error.stack);
      }
    }
  }
}