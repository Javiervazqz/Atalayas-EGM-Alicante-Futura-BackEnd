import { CreateServiceDto } from './create-service.dto';
import { PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ default: false, required: false, example: false })
  @IsString()
  @IsOptional()
  providerName?: string;

  @ApiProperty({ default: false, required: false, example: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ default: false, required: false, example: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ default: false, required: false, example: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ default: false, required: false, example: false })
  @IsString()
  @IsOptional()
  schedule?: string;

  @ApiProperty({ default: false, required: false, example: false })
  @IsString()
  @IsOptional()
  externalUrl?: string;

  @ApiProperty({ default: false, required: false, example: false })
  @IsString()
  @IsOptional()
  price?: string;
}
