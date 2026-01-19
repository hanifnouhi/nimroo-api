import { Injectable } from '@nestjs/common';
import { EntityRepository } from '../common/repositories/entity.repository';
import { Card, CardDocument } from './schemas/card.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class CardRepository extends EntityRepository<CardDocument> {
  constructor(
    @InjectModel(Card.name) private readonly cardModel: Model<CardDocument>,
  ) {
    super(cardModel);
  }
}
