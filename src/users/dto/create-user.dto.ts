import { IsEmail, IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
export class CreateUserDto {
  @ApiProperty({ example: 'ejemplo@ejemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Nombre del usuario' })
  @IsString()
  name: string;

  @ApiProperty({ required: false, example: '' })
  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => value || undefined)
  companyId?: string;

  @ApiPropertyOptional({
    example: 'EMPLOYEE',
    description: 'Rol del usuario (EMPLOYEE o ADMIN). Por defecto es EMPLOYEE.',
    enum:[Role.EMPLOYEE, Role.ADMIN, Role.GENERAL_ADMIN],
    required: false
  })
  @IsEnum([Role.EMPLOYEE, Role.ADMIN, Role.GENERAL_ADMIN])
  @IsOptional()
  role?: Role;
}
