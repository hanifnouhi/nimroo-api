import { IsNotEmpty, IsString } from "class-validator";

export class VerifyEmailTokenDto {
    @IsString()
    @IsNotEmpty()
    token: string;
}