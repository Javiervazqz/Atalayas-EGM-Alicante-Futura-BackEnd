import { IsUUID, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVideoProgressDto {
  @ApiProperty({ description: 'ID de la lección (Content)' })
  @IsUUID()
  contentId: string;

  @ApiProperty({ description: 'Segundo actual del vídeo' })
  @IsNumber()
  @Min(0)
  lastTime: number;

  @ApiProperty({ description: 'Duración total del vídeo en segundos' })
  @IsNumber()
  @Min(1)
  totalDuration: number;
}
