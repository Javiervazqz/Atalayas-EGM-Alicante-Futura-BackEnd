import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';
import { IsString, IsOptional, IsEmail } from 'class-validator';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @ApiPropertyOptional({
    example: 'Tech Solutions SL',
    description: 'El nombre de la empresa',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Calle Innovación 45, Planta 2',
    description: 'Dirección física de la empresa',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'Empresa líder en desarrollo de software...',
    description: 'Breve descripción',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://www.techsolutions.es',
    description: 'Página web corporativa',
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({
    example: 'contacto@techsolutions.es',
    description: 'Email público de contacto',
  })
  @IsOptional()
  @IsEmail({}, { message: 'El formato del email de contacto no es válido' }) // 👈 Añadimos validación de email
  contactEmail?: string;

  @ApiPropertyOptional({
    example: '+34 600 123 456',
    description: 'Teléfono público',
  })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({
    example: 'B12345678',
    description: 'CIF o identificador fiscal',
  })
  @IsOptional()
  @IsString()
  cif?: string;

  @ApiPropertyOptional({
    example: 'Desarrollo Tecnológico',
    description: 'Sector o actividad principal',
  })
  @IsOptional()
  @IsString()
  activity?: string;
}
