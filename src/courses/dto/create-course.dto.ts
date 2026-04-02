import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
export class CreateCourseDto {
  @ApiProperty({ example: 'Nombre del curso' })
  @IsString()
  title: string;

  @ApiProperty({ required: false, example: '' })
  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => value || undefined)
  companyId?: string;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({ required: false, example: 'BASICO', description: 'Categoría del curso: BASICO o ESPECIALIZADO' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false, example: 'manual.pdf', description: 'Nombre o URL del archivo' })
  @IsString()
  @IsOptional()
  fileUrl?: string;
}
