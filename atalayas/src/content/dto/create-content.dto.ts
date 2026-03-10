import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsUrl,
  IsInt,
} from 'class-validator';

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

  @ApiProperty({ example: 1, description: 'Orden de aparición en el curso' })
  @IsInt()
  @IsNotEmpty()
  order: number;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID del curso al que pertenece',
  })
  @IsUUID()
  @IsNotEmpty()
  courseId: string;
}
