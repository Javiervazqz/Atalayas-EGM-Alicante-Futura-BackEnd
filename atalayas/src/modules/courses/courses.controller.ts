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
import { ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

import { Request } from 'express';
import { User } from '@prisma/client';

// 🚀 RUTAS INTERNAS DEL MÓDULO DE CURSOS
import { CoursesService } from './courses.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';

// 🚀 RUTAS HACIA LA NUEVA CARPETA COMMON (Salimos de courses -> modules -> y entramos a common)
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles('ADMIN', 'GENERAL_ADMIN')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createCourseDto: CreateCourseDto, // 👈 Ya usamos el DTO oficial
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request & { user: User },
  ) {
    return await this.coursesService.create(createCourseDto, file, req.user);
  }

  @Get()
  async findAll(@Req() req: Request & { user: User }) {
    return await this.coursesService.findAll(req.user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request & { user: User }) {
    return await this.coursesService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles('ADMIN', 'GENERAL_ADMIN')
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @Req() req: Request & { user: User },
  ) {
    return await this.coursesService.update(id, updateCourseDto, req.user);
  }

  @Delete(':id')
  @Roles('ADMIN', 'GENERAL_ADMIN')
  async remove(@Param('id') id: string, @Req() req: Request & { user: User }) {
    return await this.coursesService.remove(id, req.user);
  }

  @Post(':id/content/ai')
  @Roles('ADMIN', 'GENERAL_ADMIN')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async generateAiContent(
    @Param('id') courseId: string,
    @Body('title') title: string,
    @Body('order') order: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request & { user: User }, // 👈 Cambiamos 'any' aquí también
  ) {
    return await this.coursesService.generateContentWithAi(
      courseId,
      title,
      Number(order),
      file,
      req.user,
    );
  }
}
