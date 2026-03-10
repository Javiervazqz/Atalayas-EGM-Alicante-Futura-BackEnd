import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // <-- Importa esto

export class CreateUserDto {
  @ApiProperty({
    example: 'juan@empresa.com',
    description: 'Correo electrónico',
  })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Contraseña para iniciar sesión',
  })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre completo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID de la empresa',
  })
  @IsUUID('all', { message: 'El companyId debe ser un UUID válido' })
  @IsNotEmpty()
  companyId: string;

  @ApiPropertyOptional({ enum: Role, example: Role.EMPLOYEE })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
