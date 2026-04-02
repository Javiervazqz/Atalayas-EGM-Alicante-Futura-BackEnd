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
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

// 🚀 AÑADIMOS ESTAS DOS IMPORTACIONES PARA CALMAR A ESLINT
import { Request } from 'express';
import { User } from '@prisma/client';

@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles('ADMIN', 'GENERAL_ADMIN')
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @Req() req: Request & { user: User }, // 👈 Cambiamos 'any' por el tipo exacto
  ) {
    return await this.coursesService.create(createCourseDto, req.user);
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
