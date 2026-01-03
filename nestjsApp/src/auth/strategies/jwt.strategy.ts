
import { Strategy, ExtractJwt } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) =>  request.cookies?.Authentication
      ]),
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET')
    })
  }

  async validate(payload: any) {
    //Extract these field from jwt token and add them to request
    return { 
      userId: payload.userId, 
      username: payload.username, 
      role: payload.role,
      membership: payload.membership,
      isMembershipActive: payload.isMembershipActive
    };
  }
}
