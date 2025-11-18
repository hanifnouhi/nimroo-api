import { Test, TestingModule } from '@nestjs/testing';
import { Document, Model } from 'mongoose';
import { EntityRepository } from '../entity.repository';

class MockEntity extends Document {
  name: string;
}

class MockEntityRepository extends EntityRepository<MockEntity> {
  constructor(protected readonly entityModel: Model<MockEntity>) {
    super(entityModel);
  }
}

describe('EntityRepository', () => {
  let repository: EntityRepository<MockEntity>;
  let mockModel: Model<MockEntity>;
  let lastCreatedInstance: any;

  beforeEach(async () => {
    
    const mockModelMethods = {
        findOne: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
        }),
        find: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([]),
        }),
        findOneAndUpdate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
        }),
        deleteMany: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
        }),
        countDocuments: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
      }),
        
    };
    const mockEntityModel = jest.fn().mockImplementation((doc) => {
        lastCreatedInstance = {
            ...doc,
            save: jest.fn().mockResolvedValue(doc),
        }
        return lastCreatedInstance;
    });
    Object.assign(mockEntityModel, mockModelMethods);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EntityRepository,
          useFactory: (model) => new MockEntityRepository(model),
          inject: ['ENTITY_MODEL'],
        },
        {
          provide: 'ENTITY_MODEL',
          useValue: mockEntityModel,
        },
      ],
    }).compile();

    repository = module.get<EntityRepository<MockEntity>>(EntityRepository);
    mockModel = module.get('ENTITY_MODEL');
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should call findOne on entity model', async () => {
    const filter = { name: 'Test' };
    const mockDocument = { name: 'Test' };
    
    (mockModel.findOne as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockDocument),
    });

    const result = await repository.findOne(filter);
    expect(mockModel.findOne).toHaveBeenCalledWith(filter, { __v: 0 });
    expect(result).toEqual(mockDocument);
  });

  it('should call find on entity model', async () => {
    const filter = { name: 'Test' };
    const mockDocuments = [{ name: 'Test' }];
    
    (mockModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockDocuments),
    });

    const result = await repository.find(filter, { page: 1, limit: 10, projection: '', sort: { name: 1} });
    expect(mockModel.find).toHaveBeenCalledWith(filter, { __v: 0, ...{} });
    expect(result.data).toHaveLength(1);
    expect(result.data).toEqual(expect.arrayContaining(mockDocuments));
  });

  it('should create and save a new entity', async () => {
    const createData = { name: 'New Entity' };

    const result = await repository.create(createData);
    
    expect(lastCreatedInstance.save).toHaveBeenCalled();
    expect(result).toEqual(createData);
  });

  it('should find and update a single entity', async () => {
    const filter = { name: 'Old' };
    const updateData = { name: 'New' };
    const updatedDocument = { name: 'New' };

    (mockModel.findOneAndUpdate as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(updatedDocument),
    });

    const result = await repository.findOneAndUpdate(filter, updateData);
    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(filter, updateData, { new: true });
    expect(result).toEqual(updatedDocument);
  });

  it('should delete multiple entities and return true if at least one is deleted', async () => {
    const filter = { name: 'Test' };
    const deleteResult = { deletedCount: 2 };

    (mockModel.deleteMany as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(deleteResult)
    });

    const result = await repository.deleteMany(filter);
    expect(mockModel.deleteMany).toHaveBeenCalledWith(filter);
    expect(result).toBe(true);
  });

  it('should delete multiple entities and return false if none are deleted', async () => {
    const filter = { name: 'NotFound' };
    const deleteResult = { deletedCount: 0 };

    (mockModel.deleteMany as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(deleteResult)
    });

    const result = await repository.deleteMany(filter);
    expect(mockModel.deleteMany).toHaveBeenCalledWith(filter);
    expect(result).toBe(false);
  });


});