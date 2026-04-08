import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StorageService } from '../../infrastructure/storage/storage.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';

@ApiTags('Storage')
@ApiBearerAuth()
@UseGuards(AuthGuard) // 🔒 Solo usuarios logueados pueden subir archivos
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Sube un archivo y devuelve su URL pública' })
  @ApiConsumes('multipart/form-data') // Le decimos a Swagger que esto es un archivo, no un JSON
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
  @UseInterceptors(FileInterceptor('file')) // Extrae el archivo de la petición
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se ha enviado ningún archivo');
    }

    const fileUrl = await this.storageService.uploadFile(file);

    return {
      message: 'Archivo subido con éxito',
      url: fileUrl,
    };
  }
}
