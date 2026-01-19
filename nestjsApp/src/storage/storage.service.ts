import { Inject, Injectable } from '@nestjs/common';
import { IStorageProvider } from './providers/storage.interface';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class StorageService {
  constructor(
    @Inject('IStorageProvider')
    private readonly storageProvider: IStorageProvider,
    @InjectPinoLogger(StorageService.name) private readonly logger: PinoLogger,
  ) {}

  /**
   * Upload a file using storage provider
   * @param {string} containerName - the container name to which the file will upload
   * @param {Buffer} fileBuffer - the file in Buffer type
   * @param {string} fileName - file name
   * @param {string} mimeType - mime type
   * @returns {Promise<string>} A promise resolving to file url address as string
   */
  async uploadFile(
    containerName: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<string> {
    const missingFields: string[] = [];
    if (!containerName) missingFields.push('containerName');
    if (!fileBuffer) missingFields.push('fileBuffer');
    if (!mimeType) missingFields.push('mimeType');

    //if any of required parameters is missing, throw error
    if (missingFields.length > 0) {
      const message = `Missing required fields: ${missingFields.join(', ')}`;
      this.logger.error(message);
      throw new Error(message);
    }

    this.logger.debug({ fileName, containerName }, 'Uploading file');

    try {
      const result = await this.storageProvider.uploadFile(
        containerName,
        fileBuffer,
        fileName,
        mimeType,
      );
      this.logger.info(
        { fileName, containerName, result },
        'File uploaded successfully',
      );
      return result;
    } catch (error) {
      this.logger.error({ err: error }, 'Upload failed');
      throw error;
    }
  }

  /**
   * Delete a file using storage provider
   * @param {string} containerName - the container name to which the file will upload
   * @param {string} fileName - file name
   * @returns {Promise<boolean>} A promise resolving to true if the file was deleted or to false if the file was not deleted
   */
  async deleteFile(containerName: string, fileName: string): Promise<boolean> {
    const missingFields: string[] = [];
    if (!containerName) missingFields.push('containerName');
    if (!fileName) missingFields.push('fileName');

    //if any of required parameters is missing, throw error
    if (missingFields.length > 0) {
      const message = `Missing required fields: ${missingFields.join(', ')}`;
      this.logger.error(message);
      throw new Error(message);
    }

    this.logger.debug({ fileName, containerName }, 'Deleting file');

    try {
      const result = await this.storageProvider.deleteFile(
        containerName,
        fileName,
      );
      this.logger.info(
        { fileName, containerName, result },
        'File deleted successfully',
      );
      return result;
    } catch (error) {
      this.logger.error({ err: error }, 'Delete failed');
      throw error;
    }
  }
}
