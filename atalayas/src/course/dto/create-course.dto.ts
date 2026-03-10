import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({
    example: 'Curso de NestJS',
    description: 'El nombre del curso',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'El ID de la empresa a la que pertenece',
  })
  @IsUUID()
  @IsNotEmpty()
  companyId: string;
}
