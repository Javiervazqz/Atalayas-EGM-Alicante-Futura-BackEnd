import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsBoolean,
  IsOptional,
  IsUrl,
} from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({
    example: 'Manual de Empleado',
    description: 'Título del documento',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'https://midominio.com/archivos/manual.pdf',
    description: 'URL del archivo',
  })
  @IsUrl() // <-- Validación extra genial para asegurar que es un enlace válido
  @IsNotEmpty()
  fileUrl: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: '¿Es público?',
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID de la empresa',
  })
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'ID del usuario (opcional)',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;
}
