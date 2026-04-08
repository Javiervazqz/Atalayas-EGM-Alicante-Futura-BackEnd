import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({
    example: 'Tech Solutions SL',
    description: 'El nombre de la empresa',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
