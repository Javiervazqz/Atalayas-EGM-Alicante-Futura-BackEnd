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
  create(@Body() createCourseDto: CreateCourseDto, @Req() req: Request) {
    return this.coursesService.create(createCourseDto, req['user']);
  }

  @Get()
  findAll(@Req() req: Request) {
    return this.coursesService.findAll(req['user']);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.coursesService.findOne(id, req['user']);
  }

  @Patch(':id')
  @Roles('ADMIN', 'GENERAL_ADMIN')
  update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @Req() req: Request,
  ) {
    return this.coursesService.update(id, updateCourseDto, req['user']);
  }

  @Delete(':id')
  @Roles('ADMIN', 'GENERAL_ADMIN')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.coursesService.remove(id, req['user']);
  }
}
