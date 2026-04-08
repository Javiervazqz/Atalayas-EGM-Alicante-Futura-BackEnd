import { CreateServiceDto} from './create-service.dto';
import { PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { serviceType } from "@prisma/client";

export class UpdateServiceDto extends PartialType(CreateServiceDto) {
     @ApiProperty({ example: 'Nombre del servicio' })
        @IsString()
        title?: string;
    
        @ApiProperty({ example: 'Descripción del servicio' })
        @IsString()
        @IsOptional()
        description?: string;
    
        @ApiProperty({ example: 'URL del servicio' })
        @IsString()
        @IsOptional()
        mediaUrl?: string;
    
        @ApiProperty({ example: serviceType.BOOKING, enum: serviceType })
        @IsEnum(serviceType)
        type?: serviceType;  
}
