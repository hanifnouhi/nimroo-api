// test/mocks/setup-default-config.ts
import { mocks } from './use-mocker';

export function setupDefaultConfigMock() {
  mocks.configService?.get.mockImplementation((key: string) => {
    if (key === 'TRANSLATE_PROVIDER') return 'azure';
    if (key === 'AZURE_TRANSLATE_KEY1') return 'mock-key';
    if (key === 'AZURE_TRANSLATE_URL') return 'https://mock-url.com';
    if (key === 'AZURE_TRANSLATE_REGION') return 'France Central';
    if (key === 'SPELL_CHECK_ENABLED') return 'true';
    if (key === 'SPELL_CHECK_SERVICE_URL') return 'https://mock-url.com';
    return null;
  });
}
