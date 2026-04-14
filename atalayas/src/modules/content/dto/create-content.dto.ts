import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsInt,
  IsUUID,
} from 'class-validator';

export class CreateContentDto {
  @ApiProperty({
    example: 'Tema 1: Introducción',
    description: 'Título del contenido',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  options?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({ example: 'URL del servicio', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
