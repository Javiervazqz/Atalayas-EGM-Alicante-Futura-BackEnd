import { IsUUID, IsInt, Min, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer'; // 🚀 Importante

export class UpdateVideoProgressDto {
  @ApiProperty({ description: 'ID de la lección (Content)' })
  @IsUUID()
  @IsNotEmpty()
  contentId: string = ''; // 👈 Inicializa con un valor por defecto

  @ApiProperty({ description: 'Segundo actual del vídeo' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lastTime: number = 0; // 👈 Inicializa con 0

  @ApiProperty({ description: 'Duración total del vídeo en segundos' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalDuration: number = 0; // 👈 Inicializa con 0
}
