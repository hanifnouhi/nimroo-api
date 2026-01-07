export interface IFileUploader {
  uploadFile(
    containerName: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<string>;
}

export interface IFileRemover {
  deleteFile(containerName: string, fileName: string): Promise<boolean>;
}

export interface IStorageProvider extends IFileUploader, IFileRemover {}
