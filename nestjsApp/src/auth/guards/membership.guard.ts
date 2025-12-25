import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { UserDocument } from '../../user/schemas/user.schema'; //
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class MembershipGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private reflector: Reflector
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Check if the route is marked as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
    ]);

    if (isPublic) {
        return true;
    }

    // 2. Check the global toggle
    const isSystemDisabled = this.configService.get<string>('DISABLE_MEMBERSHIP_SYSTEM') === 'true';
    
    // If disabled, grant access to everyone
    if (isSystemDisabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: UserDocument = request.user;

    // If user not exist in request or membership is not active throw exception
    if (!user || !user.isMembershipActive) {
      throw new ForbiddenException('This feature requires an active membership plan.');
    }

    return true;
  }
}