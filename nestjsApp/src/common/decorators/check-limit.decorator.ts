import { SetMetadata } from '@nestjs/common';

export const LIMIT_KEY = 'serviceName';
export const CheckLimit = (serviceName: string) =>
  SetMetadata(LIMIT_KEY, serviceName);
