import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsDateString, IsEnum, IsMongoId, IsString } from "class-validator";
import { MembershipPlan } from "../user.enums";

export class MembershipHistoryEntryDto {
    @ApiProperty({
        description: 'Memberhsip plan',
        example: 'free',
        type: String,
        enum: MembershipPlan,
        default: MembershipPlan.FREE
    })
    @IsEnum(MembershipPlan)
    membership: string;

    @ApiProperty({
        description: 'Start date of membership',
        example: '2025-10-22T00:00:00.000Z'
    })
    @IsDateString()
    startedAt: string;

    @ApiProperty({
        description: 'End date of membership',
        example: '2026-10-2100:00:00.000Z'
    })
    @IsDateString()
    endedAt: string;

    @ApiProperty({
        description: 'Is this trial membership?',
        example: false
    })
    @IsBoolean()
    wasTrial: boolean;

    @ApiProperty({
        description: 'Is membership autorenewd?',
        example: false
    })
    @IsBoolean()
    autoRenewd: boolean;
}