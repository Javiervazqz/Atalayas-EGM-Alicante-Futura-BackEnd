import {
  Controller,
  Post,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AiService } from './ai.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js'; // 👈 Usando tu Guard

@ApiTags('IA') // Agrupa en Swagger
@ApiBearerAuth()
@Controller('ai')
@UseGuards(AuthGuard) // 👈 Protegido igual que el ChatBot
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('test-podcast')
  @HttpCode(200) // 👈 Igual que tu controlador de Chat
  @ApiOperation({ summary: 'Genera un audio podcast a partir de un PDF' })
  @ApiConsumes('multipart/form-data') // 👈 Necesario para que Swagger muestre el botón de subir archivo
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          // Este es el nombre que usaremos en el Form-Data
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async testPodcast(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Aquí podrías usar req.user.id si quisieras guardar quién generó el audio
    return this.aiService.generatePodcastFromPdf(file.buffer);
  }
}
