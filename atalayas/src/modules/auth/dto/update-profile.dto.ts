import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Juan Pérez',
    description: 'Nombre completo del usuario',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'nueva_contraseña_segura',
    description: 'Nueva contraseña (mín. 6 caracteres)',
  })
  @IsString()
  @IsOptional()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;

  // No incluimos email ni rol aquí porque NO deberían ser editables por el propio usuario
  // El campo 'file' lo maneja NestJS fuera del DTO para Swagger
}
