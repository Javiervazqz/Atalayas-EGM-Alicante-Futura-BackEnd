import { IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateCourseDto {
  @ApiProperty({ example: 'Nombre del curso' })
  @IsString()
  title!: string;

  @ApiProperty({ required: false, example: '' })
  @IsUUID()
  @IsOptional()
  @Transform(({ value }: { value: any }) =>
    value && value !== 'null' ? String(value) : undefined,
  )
  companyId?: string;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @Transform(({ value }: { value: any }) => value === 'true' || value === true)
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ required: false, example: 'BASICO' })
  @IsString()
  @IsOptional()
  category?: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Archivo PDF del curso',
  })
  @IsOptional()
  fileUrl?: any;
}
