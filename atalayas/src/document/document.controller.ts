import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { DocumentService } from './document.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { Request } from 'express';

import { AuthGuard } from '../auth/auth.guard.js';
import { User } from '@prisma/client';

@ApiTags('Document')
@ApiBearerAuth()
@UseGuards(AuthGuard) // 🔒 Seguridad global para todo el controlador
@Controller('document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un documento con subida de archivo' })
  @ApiConsumes('multipart/form-data') // Necesario para subir archivos
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Manual de Usuario' },
        companyId: {
          type: 'string',
          example: 'uuid-de-la-empresa',
          description: 'Opcional si eres Admin',
        },
        userId: {
          type: 'string',
          example: 'uuid-del-usuario',
          description: 'Opcional',
        },
        isPublic: { type: 'boolean', default: true },
        file: {
          type: 'string',
          format: 'binary',
          description: 'El archivo físico (PDF, imagen, etc.)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createDocumentDto: CreateDocumentDto,
    @Req() req: Request & { user: User },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('El archivo físico es obligatorio');
    }
    return this.documentService.create(createDocumentDto, req.user, file);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar documentos accesibles según mi rol y empresa',
  })
  findAll(@Req() req: Request & { user: User }) {
    return this.documentService.findAll(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener el detalle de un documento específico' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: User },
  ) {
    return this.documentService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar los metadatos de un documento' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Req() req: Request & { user: User },
  ) {
    return this.documentService.update(id, updateDocumentDto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un documento (Solo Administradores)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: User },
  ) {
    return this.documentService.remove(id, req.user);
  }
}
