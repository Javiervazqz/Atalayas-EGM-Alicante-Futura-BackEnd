import { ApiProperty } from '@nestjs/swagger';

export class GenerateAiContentDto {
  @ApiProperty({
    example: 'Introducción al Poliuretano',
    description: 'Título del podcast',
  })
  title!: string;

  @ApiProperty({ example: 1, description: 'Orden en el curso' })
  order!: string;

  // 🚀 ESTO ES LO QUE OBLIGA A SWAGGER A PONER EL BOTÓN DE ARCHIVO
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'El PDF a resumir',
  })
  file: any;
}
