import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDocumentDto {
  @ApiProperty({
    example: 'Manual de Empleado',
    description: 'Título del documento',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @ApiPropertyOptional({
    example: true,
    default: true,
    description: '¿Es público?',
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID de la empresa',
  })
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'ID del usuario (opcional)',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;
}
