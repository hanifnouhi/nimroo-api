import { IsNotEmpty, IsString } from "class-validator";

export class UpdateRefreshTokenDto {
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}