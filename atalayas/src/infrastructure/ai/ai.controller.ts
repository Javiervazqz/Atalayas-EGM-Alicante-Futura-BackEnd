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
import { AuthGuard } from '../../common/guards/auth.guard.js';

@ApiTags('IA')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(AuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('test-podcast')
  @HttpCode(200)
  @ApiOperation({ summary: 'Genera un audio podcast a partir de un PDF' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
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
    // 1. Extraemos el texto del buffer del PDF usando el nuevo método del servicio
    const rawText = await this.aiService.extractTextFromPdf(file.buffer);

    // 2. Llamamos al método actualizado 'generatePodcast' pasando el texto
    return this.aiService.generatePodcast(rawText);
  }
}
