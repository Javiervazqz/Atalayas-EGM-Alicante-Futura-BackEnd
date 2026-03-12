import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateUserDto {
  @ApiProperty({ example: 'ejemplo@ejemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Nombre del usuario' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description:
      'ID de la empresa (Obligatorio si eres GENERAL_ADMIN. Ignorado si eres ADMIN normal)',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({
    example: 'EMPLOYEE',
    description: 'Rol del usuario (EMPLOYEE o ADMIN). Por defecto es EMPLOYEE.',
  })
  @IsOptional()
  @IsString() // Si tienes un Enum de roles en tu proyecto, podrías usar @IsEnum()
  role?: string;
}
