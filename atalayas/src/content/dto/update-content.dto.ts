import { PartialType } from '@nestjs/swagger';
import { CreateContentDto } from './create-content.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {IsString, IsNotEmpty, IsOptional, IsUrl, IsInt} from 'class-validator';

export class UpdateContentDto extends PartialType(CreateContentDto) {
    @ApiProperty({
    example: 'Tema 1: Introducción',
    description: 'Título del contenido',
  })
  @IsString()
  @IsOptional()
  title?: string;

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

  @ApiProperty({ example: 1, description: 'Orden de aparición en el curso' })
  @IsInt()
  @IsOptional()
  order?: number;
}
