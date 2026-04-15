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

import { CoursesService } from './courses.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';

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
    @Body() createCourseDto: CreateCourseDto,
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
}
