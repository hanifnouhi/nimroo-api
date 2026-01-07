import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { EntityRepository } from '../common/repositories/entity.repository';

@Injectable()
export class UserRepository extends EntityRepository<UserDocument> {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    super(userModel);
  }

  /**
   * Method for find a user with password selected
   * This method is used for validating user credentials on login
   *
   * @param {Record<string, unknown>} filter - The items which used to filter the result
   * @returns {Promise<UserDocument | null>} A promise resolving to the user document or null
   */
  async findOneWithPassword(
    filter: Record<string, any>,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne(filter).select('+password').exec();
  }
}
