import { Document, FilterQuery, Model, UpdateQuery } from "mongoose";

export abstract class EntityRepository<T extends Document> {
    constructor(protected readonly entityModel: Model<T>) {}

    /**
     * Method to find a document in the mongodb database
     * 
     * @param {FilterQuery} entityFilterQuery - The query to execute to find the document
     * @param {Record<string, unknown>} projection - The projections items to be excluded from result
     * @returns {Promise<T | null>} A promise resolving to the document or null
     */
    async findOne(
      entityFilterQuery: FilterQuery<T>,
      projection?: Record<string, unknown>
    ): Promise<T | null> {
      let query = this.entityModel.findOne(entityFilterQuery, {
        __v: 0,
        ...projection
      });

      return query.exec();
    }

    /**
     * Method to find the array of documents in the mongodb database based on the query
     * 
     * @param {FilterQuery} entityFilterQuery - The query to execute to find the documents
     * @returns {Promise<T[] | null>} A promise resolving to the documents array or null
     */
    async find(
        entityFilterQuery: FilterQuery<T>
    ): Promise<T[] | null> {
        return this.entityModel.find(entityFilterQuery).exec();
    }

    /**
     * Method to create a document in the mongodb database
     * 
     * @param {unknown} createEntityData - The create data
     * @returns {Promise<T>} A promise resolving to the created document
     */
    async create(createEntityData: unknown): Promise<T> {
        const entity = new this.entityModel(createEntityData);
        return entity.save();
    }

    /**
     * Method to find and update a document in the mongodb database
     * 
     * @param {FilterQuery} entityFilterQuery - The query to execute to find the document
     * @param {UpdateQuery<unknown>} updateEntityData - The data to be update in the document
     * @returns {Promise<T | null>} A promise resolving to the new document or null
     */
    async findOneAndUpdate(
        entityFilterQuery: FilterQuery<T>,
        updateEntityData: UpdateQuery<unknown>
    ): Promise<T | null> {
        return this.entityModel.findOneAndUpdate(
            entityFilterQuery,
            updateEntityData,
            {
            new: true 
            }
        ).exec();
    }

    /**
     * Method to delete one or more document in the mongodb database
     * 
     * @param {FilterQuery} entityFilterQuery - The query to execute to delete one or more document
     * @returns {Promise<boolean>} A promise resolving to true if any document was deleted or to false if no docement was deleted
     */
    async deleteMany(entityFilterQuery: FilterQuery<T>): Promise<boolean> {
        const deleteResult = await this.entityModel.deleteMany(entityFilterQuery).exec();
        return deleteResult.deletedCount >= 1;
    }
}