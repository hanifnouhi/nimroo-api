import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '../storage.service';
import { IStorageProvider } from '../providers/storage.interface';
import pino from 'pino';
import { LoggerModule } from 'nestjs-pino';

const containerName = 'test-container';
const mockBuffer = Buffer.from('test data');
const fileName = 'image.jpeg';
const mimeType = 'image/jpeg';

const mockStorageProvider = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
};

describe('StorageService Unit Test', () => {
  let service: StorageService;
  let storageProvider: jest.Mocked<IStorageProvider>;
  const silentPinoLogger = pino({ enabled: false });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            logger: silentPinoLogger,
          },
        }),
      ],
      providers: [
        StorageService,
        {
          provide: 'IStorageProvider',
          useValue: mockStorageProvider,
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    storageProvider = module.get('IStorageProvider');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should return image url as string', async () => {
      const expectedUrl = 'https://example.com/image.jpeg';
      mockStorageProvider.uploadFile.mockResolvedValue(expectedUrl);

      const result = await service.uploadFile(
        containerName,
        mockBuffer,
        fileName,
        mimeType,
      );

      expect(result).toBe(expectedUrl);
      expect(mockStorageProvider.uploadFile).toHaveBeenCalledWith(
        containerName,
        mockBuffer,
        fileName,
        mimeType,
      );
    });

    it('should throw error if containerName is empty', async () => {
      await expect(
        service.uploadFile('', mockBuffer, fileName, mimeType),
      ).rejects.toThrow('Missing required fields: containerName');
    });

    it('should throw error if file buffer is missing', async () => {
      await expect(
        service.uploadFile(containerName, null as any, fileName, mimeType),
      ).rejects.toThrow('Missing required fields: fileBuffer');
    });

    it('should throw error if mime type is missing', async () => {
      await expect(
        service.uploadFile(containerName, mockBuffer, fileName, ''),
      ).rejects.toThrow('Missing required fields: mimeType');
    });

    it('should handle provider error gracefully', async () => {
      mockStorageProvider.uploadFile.mockRejectedValue(
        new Error('Azure upload failed'),
      );

      await expect(
        service.uploadFile(containerName, mockBuffer, fileName, mimeType),
      ).rejects.toThrow('Azure upload failed');
    });

    it('should log error when containerName is missing', async () => {
      const errorSpy = jest.spyOn(silentPinoLogger, 'error');

      await expect(
        service.uploadFile('', mockBuffer, fileName, mimeType),
      ).rejects.toThrow('Missing required fields: containerName');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.anything(),
        'Missing required fields: containerName',
      );
    });

    it('should log debug and info on successful upload', async () => {
      const debugSpy = jest.spyOn(silentPinoLogger, 'debug');
      const infoSpy = jest.spyOn(silentPinoLogger, 'info');

      const expectedUrl = 'https://example.com/image.jpeg';
      mockStorageProvider.uploadFile.mockResolvedValue(expectedUrl);

      const result = await service.uploadFile(
        containerName,
        mockBuffer,
        fileName,
        mimeType,
      );

      expect(result).toBe(expectedUrl);
      expect(debugSpy).toHaveBeenCalledWith(
        expect.objectContaining({ fileName, containerName }),
        'Uploading file',
      );
      expect(infoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName,
          containerName,
          result: expectedUrl,
        }),
        'File uploaded successfully',
      );
    });

    it('should log error on provider failure during upload', async () => {
      const errorSpy = jest.spyOn(silentPinoLogger, 'error');
      const error = new Error('Azure upload failed');
      mockStorageProvider.uploadFile.mockRejectedValue(error);

      await expect(
        service.uploadFile(containerName, mockBuffer, fileName, mimeType),
      ).rejects.toThrow('Azure upload failed');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ err: error }),
        'Upload failed',
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockStorageProvider.deleteFile.mockResolvedValue(true);

      const result = await service.deleteFile(containerName, fileName);

      expect(result).toBe(true);
      expect(mockStorageProvider.deleteFile).toHaveBeenCalledWith(
        containerName,
        fileName,
      );
    });

    it('should throw error if containerName is missing', async () => {
      await expect(service.deleteFile('', fileName)).rejects.toThrow(
        'Missing required fields: containerName',
      );
    });

    it('should throw error if fileName is missing', async () => {
      await expect(service.deleteFile(containerName, '')).rejects.toThrow(
        'Missing required fields: fileName',
      );
    });

    it('should propagate error from provider', async () => {
      mockStorageProvider.deleteFile.mockRejectedValue(
        new Error('Delete failed'),
      );

      await expect(service.deleteFile(containerName, fileName)).rejects.toThrow(
        'Delete failed',
      );
    });
  });
});
