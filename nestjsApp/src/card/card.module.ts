import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { CardController } from './card.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Card, CardSchema } from './schemas/card.schema';
import { CardRepository } from './card.repository';
import { CommonModule } from '../common/common.module';
import { CacheModule } from '../cache/cache.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Card.name, schema: CardSchema }]),
    CommonModule,
    UserModule,
  ],
  providers: [CardService, CardRepository],
  controllers: [CardController],
})
export class CardModule {}
