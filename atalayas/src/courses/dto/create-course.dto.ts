import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({ example: 'Nombre del curso' })
  @IsString()
  title: string;
}
