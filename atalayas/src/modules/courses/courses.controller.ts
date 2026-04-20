import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Request } from 'express';
import { User } from '@prisma/client';

import { CoursesService } from './courses.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';

import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiTags('Courses')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles('ADMIN', 'GENERAL_ADMIN')
  @ApiOperation({ summary: 'Crear un nuevo curso con imagen' })
  @ApiConsumes('multipart/form-data') // Necesario para procesar archivos
  @UseInterceptors(FileInterceptor('file')) // El nombre 'file' debe coincidir con el campo del Frontend
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request & { user: User },
  ) {
    return await this.coursesService.create(createCourseDto, file, req.user);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los cursos según el rol del usuario',
  })
  async findAll(@Req() req: Request & { user: User }) {
    return await this.coursesService.findAll(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener los detalles de un curso por ID' })
  async findOne(@Param('id') id: string, @Req() req: Request & { user: User }) {
    return await this.coursesService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles('ADMIN', 'GENERAL_ADMIN') // Protegemos el acceso solo a administradores
  @ApiOperation({ summary: 'Actualizar un curso (soporta cambio de imagen)' })
  @ApiConsumes('multipart/form-data') // IMPORTANTE: Para que Swagger permita subir archivo en el Patch
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @Req() req: Request & { user: User },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Pasamos el archivo como cuarto argumento al Service
    return await this.coursesService.update(
      id,
      updateCourseDto,
      req.user,
      file,
    );
  }

  @Delete(':id')
  @Roles('ADMIN', 'GENERAL_ADMIN')
  @ApiOperation({ summary: 'Eliminar un curso y su imagen asociada' })
  async remove(@Param('id') id: string, @Req() req: Request & { user: User }) {
    return await this.coursesService.remove(id, req.user);
  }
}
