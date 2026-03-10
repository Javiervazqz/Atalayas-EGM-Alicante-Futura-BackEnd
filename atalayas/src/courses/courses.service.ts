import { Injectable, ForbiddenException } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from 'src/auth/auth.service';
import { Course } from '@prisma/client';
import { User } from '@prisma/client';
import e from 'express';
import { request } from 'http';

@Injectable()
export class CoursesService {
  constructor(private readonly prismaService: PrismaService,) {}

  async create(createCourseDto: CreateCourseDto, requestUser: User) {
    if(requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para crear cursos');
    }
    
    return await this.prismaService.course.create({
      data: {
        title: createCourseDto.title,
        companyId: requestUser.companyId,
      },
    });

  }

  async findAll(requestUser: User) {
  if(requestUser.role === 'GENERAL_ADMIN') {    
    return await this.prismaService.course.findMany();
  }

 return await this.prismaService.course.findMany({
    where: {
      companyId: requestUser.companyId,
    },
  });
}

  async findOne(id: string, requestUser: User) {
    const course = await this.prismaService.course.findUnique({
      where: { id },
    });
    if(!course) {
      throw new ForbiddenException('Curso no encontrado');
    }
    if(requestUser.role !== 'GENERAL_ADMIN' && course.companyId !== requestUser.companyId) {
      throw new ForbiddenException('No tienes permisos para ver este curso');
    }
    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto, requestUser: User) {
    const course = await this.findOne(id,requestUser);

    if(requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para actualizar cursos');
    }

    return this.prismaService.course.update({
      where: { id: course.id },
      data: updateCourseDto
    });
  }

  async remove(id: string, requestUser: User) {
    const course = await this.findOne(id, requestUser);

    if(requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para eliminar cursos');
    }

    return this.prismaService.course.delete({
      where: { id: course.id }
    });
  }
}
