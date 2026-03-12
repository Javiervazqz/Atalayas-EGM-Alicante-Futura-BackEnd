import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {IsString, IsNotEmpty, IsOptional, IsUrl, IsInt, IsUUID} from 'class-validator';

export class CreateContentDto {
  @ApiProperty({
    example: 'Tema 1: Introducción',
    description: 'Título del contenido',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    example: 'https://midominio.com/tema1.pdf',
    description: 'URL del PDF',
  })
  @IsUrl()
  @IsOptional()
  pdfUrl?: string;

  @ApiPropertyOptional({
    example: 'https://youtube.com/video',
    description: 'URL del vídeo',
  })
  @IsUrl()
  @IsOptional()
  videoUrl?: string;
}
