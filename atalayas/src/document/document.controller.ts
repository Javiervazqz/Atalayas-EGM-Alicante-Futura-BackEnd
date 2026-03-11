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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DocumentService } from './document.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { Request } from 'express';

// Importamos la seguridad
import { AuthGuard } from '../auth/auth.guard.js';
import { User } from '@prisma/client';

@ApiTags('Document')
@ApiBearerAuth()
@UseGuards(AuthGuard) // 🔒 Protegemos todas las rutas
@Controller('document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un documento (Admin / General Admin)' })
  create(
    @Body() createDocumentDto: CreateDocumentDto,
    @Req() req: Request & { user: User },
  ) {
    return this.documentService.create(createDocumentDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Ver todos los documentos de mi empresa' })
  findAll(@Req() req: Request & { user: User }) {
    return this.documentService.findAll(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalles de un documento' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: User },
  ) {
    return this.documentService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modificar un documento (Admin / General Admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Req() req: Request & { user: User },
  ) {
    return this.documentService.update(id, updateDocumentDto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Borrar un documento (Admin / General Admin)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: User },
  ) {
    return this.documentService.remove(id, req.user);
  }
}
