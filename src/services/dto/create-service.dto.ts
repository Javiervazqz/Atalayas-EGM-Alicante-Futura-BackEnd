import { IsString, IsOptional, IsUUID, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { serviceType } from "@prisma/client";

export class CreateServiceDto {
    @ApiProperty({ example: 'Nombre del servicio' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'Descripción del servicio', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 'URL del servicio', required: false })
    @IsString()
    @IsOptional()
    mediaUrl?: string;

    
    @ApiProperty({ required: false, example: '' })
    @IsUUID()
    @IsOptional()
    @Transform(({ value }) => value || undefined)
    companyId?: string;

    @ApiProperty({ example: serviceType.BOOKING, enum: serviceType })
    @IsEnum(serviceType)
    type: serviceType;

    @ApiProperty({ default: false, required: false, example: false })
    @IsBoolean()
    @IsOptional()
    isPublic?: boolean;
}
