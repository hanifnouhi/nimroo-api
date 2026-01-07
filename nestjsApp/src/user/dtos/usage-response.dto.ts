export class ServiceUsageDto {
  used: number;
  limit: number;
  remaining: number;
}

export class UserUsageDto {
  membership: string;
  nextResetDate: string;
  services: Record<string, ServiceUsageDto>;
}
