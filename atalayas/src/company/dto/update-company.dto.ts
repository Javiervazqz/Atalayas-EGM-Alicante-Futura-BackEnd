import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';
import { IsString, IsOptional } from 'class-validator';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
    @ApiProperty({
        example: 'Tech Solutions SL',
        description: 'El nombre de la empresa',
      })
      @IsOptional()
      @IsString()
      name?: string;
}
