
import { Strategy, ExtractJwt } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private authService: AuthService
) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) =>  request.cookies?.Authentication
      ]),
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET')
    })
  }

  async validate(payload: any) {
    return { userId: payload.sub, username: payload.username };
  }
}
