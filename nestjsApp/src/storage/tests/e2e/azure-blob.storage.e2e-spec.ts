import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AzureBlobProvider } from '../../providers/azure-blob.storage.provider';
import { IFileUploader, IFileRemover } from '../../providers/storage.interface';

const E2E_CONTAINER_NAME = 'test-e2e-nestjs';

describe('AzureBlobService (E2E Test)', () => {
  let azureProvider: AzureBlobProvider;
  const uploadedFiles: string[] = [];
  const testFileName = `e2e-test-${Date.now()}.txt`;
  const testFileBuffer = Buffer.from('This is E2E test data.');
  const testMimeType = 'text/plain';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [AzureBlobProvider],
    }).compile();

    azureProvider = module.get<AzureBlobProvider>(AzureBlobProvider);
  });

  it('should successfully upload a file and return a valid URL', async () => {
    console.log(
      `\n⏳ Attempting to upload file: ${testFileName} to container: ${E2E_CONTAINER_NAME}`,
    );

    const fileUrl = await azureProvider.uploadFile(
      E2E_CONTAINER_NAME,
      testFileBuffer,
      testFileName,
      testMimeType,
    );

    expect(fileUrl).toBeDefined();
    expect(fileUrl).toContain(E2E_CONTAINER_NAME);
    expect(fileUrl).toContain(testFileName);
    uploadedFiles.push(testFileName);
    console.log(`✅ Upload successful. URL: ${fileUrl}`);
  });

  it('should successfully delete the uploaded file (deleted: true)', async () => {
    console.log(`\n⏳ Attempting to delete file: ${testFileName}`);
    await expect(
      azureProvider.deleteFile(E2E_CONTAINER_NAME, testFileName),
    ).resolves.toBe(true);

    console.log('✅ Delete successful.');
  });

  it('should resolve (no error) when attempting to delete a non-existent file', async () => {
    const nonExistentFile = `non-existent-${Date.now()}.txt`;
    console.log(
      `\n⏳ Attempting to delete non-existent file: ${nonExistentFile}`,
    );

    await expect(
      azureProvider.deleteFile(E2E_CONTAINER_NAME, nonExistentFile),
    ).resolves.toBe(false);

    console.log('✅ Delete of non-existent file succeeded (no error thrown).');
  });

  afterAll(async () => {
    const cleanupPromises = uploadedFiles.map((file) => {
      console.log(`🧹 Cleaning up file: ${file}`);
      return azureProvider
        .deleteFile(E2E_CONTAINER_NAME, file)
        .catch((e) => {});
    });
    await Promise.all(cleanupPromises);
    console.log(
      `\n✨ E2E tests finished. ${uploadedFiles.length} file(s) processed for cleanup.`,
    );
  });
});
