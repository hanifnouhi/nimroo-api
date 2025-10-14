import { Injectable } from "@nestjs/common";
import { IFileUploader } from "./storage.interface";
import { ConfigService } from "@nestjs/config";
import { BlobServiceClient } from "@azure/storage-blob";
import { getBlobHTTPHeaders } from "../../common/helpers/utilities";

@Injectable()
export class AzureBlobProvider implements IFileUploader {
    private blobServiceClient: BlobServiceClient;

    constructor(private configService: ConfigService) {
        //Get connection string from environment file
        const connectionString = this.configService.get<string>('AZURE_STORAGE_CONNECTION_STRING');

        //If connection string is not defined or empty, throw un error
        if (!connectionString || connectionString === '') {
            throw new Error('connection string is empty!');
        }

        //Create blob service client for using in methods
        this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

    }

    /**
     * Upload a file to azure blob storage
     * @param {string} containerName - the container name to which the file will upload
     * @param {Buffer} fileBuffer - the file in Buffer type
     * @param {string} fileName - file name
     * @param {string} mimeType - mime type
     * @returns {Promise<string>} A promise resolving to file url address as string
     */
    async uploadFile(containerName: string, fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
        const containerClient = this.blobServiceClient.getContainerClient(containerName);

        //If container is not exist, let's create it
        await containerClient.createIfNotExists({ access: 'blob' });

        const blockBlobClient = containerClient.getBlockBlobClient(fileName);

        await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
            blobHTTPHeaders: getBlobHTTPHeaders(mimeType)
        });
        return blockBlobClient.url;
    }

    /**
     * Delete a file in azure blob storage
     * @param {string} containerName - the container name to which the file will upload
     * @param {string} fileName - file name
     * @returns {Promise<boolean>} A promise resolving to true if the file was deleted or to false if the file was not deleted
     */
    async deleteFile(containerName: string, fileName: string): Promise<boolean> {
        const containerClient = this.blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);

        const response = await blockBlobClient.deleteIfExists();
        return response.succeeded;
    }
}