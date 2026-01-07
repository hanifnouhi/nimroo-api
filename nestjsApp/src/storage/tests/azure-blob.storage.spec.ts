import { Test, TestingModule } from '@nestjs/testing';
import { AzureBlobProvider } from '../providers/azure-blob.storage.provider';
import { BlobServiceClient } from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';

const mockBlockBlobClient = {
  upload: jest.fn().mockResolvedValue({ errorCode: undefined }),
  url: 'http://mock.blob.core.windows.net/test-container/test-file.png',
  deleteIfExists: jest.fn().mockResolvedValue({ succeeded: true }),
};

const mockContainerClient = {
  createIfNotExists: jest.fn().mockResolvedValue({ succeeded: true }),
  getBlockBlobClient: jest.fn().mockReturnValue(mockBlockBlobClient),
};

const mockBlobClient = {
  getContainerClient: jest.fn().mockReturnValue(mockContainerClient),
};

jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: jest.fn(() => mockBlobClient),
  },
}));

const containerName = 'test-container';
const mockBuffer = Buffer.from('test data');
const fileName = 'image.jpeg';
const mimeType = 'image/jpeg';

describe('Azure Blob Provider Unit Tests', () => {
  let azureBlobProvider: AzureBlobProvider;
  let configService: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzureBlobProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'AZURE_STORAGE_CONNECTION_STRING')
                return 'mock-connection-string';
              return null;
            }),
          },
        },
      ],
    }).compile();

    azureBlobProvider = module.get<AzureBlobProvider>(AzureBlobProvider);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('sould be defined', () => {
    expect(azureBlobProvider).toBeDefined();
    expect(BlobServiceClient.fromConnectionString).toHaveBeenCalledWith(
      'mock-connection-string',
    );
  });

  it.each([null, undefined, ''])(
    'should throw error if connection string is empty',
    async (returnedValue) => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        return returnedValue;
      });
      expect(() => {
        new AzureBlobProvider(configService);
      }).toThrow('connection string is empty!');
    },
  );

  it('should returns a string', async () => {
    const result = await azureBlobProvider.uploadFile(
      containerName,
      mockBuffer,
      fileName,
      mimeType,
    );
    expect(typeof result).toBe('string');
  });

  it('should get the container client', async () => {
    await azureBlobProvider.uploadFile(
      containerName,
      mockBuffer,
      fileName,
      mimeType,
    );
    expect(mockBlobClient.getContainerClient).toHaveBeenCalledWith(
      containerName,
    );
  });

  it('should create the blob container if not exist', async () => {
    await azureBlobProvider.uploadFile(
      containerName,
      mockBuffer,
      fileName,
      mimeType,
    );
    expect(mockBlobClient.getContainerClient).toHaveBeenCalledWith(
      containerName,
    );
    expect(mockContainerClient.createIfNotExists).toHaveBeenCalledTimes(1);
    expect(mockContainerClient.createIfNotExists).toHaveBeenCalledWith({
      access: 'blob',
    });
  });

  it('should call block blob client with file name', async () => {
    await azureBlobProvider.uploadFile(
      containerName,
      mockBuffer,
      fileName,
      mimeType,
    );
    expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledTimes(1);
    expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(
      fileName,
    );
  });

  it('should upload file with provided data', async () => {
    await azureBlobProvider.uploadFile(
      containerName,
      mockBuffer,
      fileName,
      mimeType,
    );
    expect(mockBlockBlobClient.upload).toHaveBeenCalledTimes(1);
    expect(mockBlockBlobClient.upload).toHaveBeenCalledWith(
      mockBuffer,
      mockBuffer.length,
      expect.objectContaining({
        blobHTTPHeaders: {
          blobContentType: mimeType,
          blobCacheControl: 'public, max-age=31536000',
        },
      }),
    );
  });

  it('deleteFile should be defined', async () => {
    const result = await azureBlobProvider.deleteFile(containerName, fileName);
    expect(mockBlockBlobClient.deleteIfExists).toHaveBeenCalledTimes(1);
  });

  it('should return true if the provided file be deleted', async () => {
    const result = await azureBlobProvider.deleteFile(containerName, fileName);
    expect(mockBlockBlobClient.deleteIfExists).toHaveBeenCalledWith();
    expect(result).toBe(true);
  });

  it('should return false if the provided file be not deleted', async () => {
    mockBlockBlobClient.deleteIfExists.mockReturnValue({ succeeded: false });
    const result = await azureBlobProvider.deleteFile(containerName, fileName);
    expect(mockBlockBlobClient.deleteIfExists).toHaveBeenCalledWith();
    expect(result).toBe(false);
  });
});
