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
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Request } from '@nestjs/common';

@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles('ADMIN', 'GENERAL_ADMIN')
  async create(@Body() createCourseDto: CreateCourseDto, @Req() req: Request) {
    return await this.coursesService.create(createCourseDto, req['user']);
  }

  @Get()
  async findAll(@Req() req: Request) {
    return await this.coursesService.findAll(req['user']);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    return await this.coursesService.findOne(id, req['user']);
  }

  @Patch(':id')
  @Roles('ADMIN', 'GENERAL_ADMIN')
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @Req() req: Request,
  ) {
    return await this.coursesService.update(id, updateCourseDto, req['user']);
  }

  @Delete(':id')
  @Roles('ADMIN', 'GENERAL_ADMIN')
  async remove(@Param('id') id: string, @Req() req: Request) {
    return await this.coursesService.remove(id, req['user']);
  }
}
