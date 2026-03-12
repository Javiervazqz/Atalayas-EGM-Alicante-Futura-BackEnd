import { ForbiddenException, Injectable, NotFoundException, Req } from '@nestjs/common';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createContentDto: CreateContentDto, requestUser: User, courseId: string) {
    console.log('courseId:', courseId);
  console.log('requestUser:', requestUser);
  console.log('createContentDto:', createContentDto);
    if(requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para crear contenido');
    }
    const courseExists = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!courseExists) {
      throw new NotFoundException(
        `El curso con ID ${courseId} no existe.`,
      );
    }

    if (requestUser.role === 'ADMIN' && courseExists.companyId !== requestUser.companyId) {
      throw new ForbiddenException(
        `No tienes permisos para agregar contenido a este curso.`,
      );
    }

    const lastContent = await this.prisma.content.findFirst({
      where: { courseId: courseId },
      orderBy: { order: 'desc' },
    });

    const nextOrder = lastContent ? lastContent.order + 1 : 1;

    // 2. Crear el contenido
    return this.prisma.content.create({
      data: {
        title: createContentDto.title,
        order: nextOrder,
        courseId: courseId,
      }
    });
  }

  async findAll(requestUser: User, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException(`El curso con ID ${courseId} no existe.`);
    }
    if (requestUser.role !== 'GENERAL_ADMIN' && course.companyId !== requestUser.companyId) {
      throw new ForbiddenException(`No tienes acceso al curso.`);
    }
    return this.prisma.content.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      include: { Course: true }, // Traemos la información del curso al que pertenece cada contenido
  });
  }

  async findOne(id: string, requestUser: User) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: { Course: true }, // Traemos la información del curso al que pertenece
    });

    if (!content) {
      throw new NotFoundException(`Contenido con ID ${id} no encontrado`);
    }
    if (requestUser.role !== 'GENERAL_ADMIN' && content.Course.companyId !== requestUser.companyId) {
      throw new ForbiddenException(`No tienes acceso a este contenido.`);
    }
    return content;
  }

  async update(id: string, updateContentDto: UpdateContentDto, requestUser: User) {
    const content = await this.findOne(id, requestUser);
    if(requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para actualizar contenido');
    }
    if(requestUser.role === 'ADMIN' && content.Course.companyId !== requestUser.companyId) {
      throw new ForbiddenException('No tienes permisos para actualizar contenido de este curso');
    }
    return this.prisma.content.update({
      where: { id },
      data: updateContentDto,
    });
  }

  async remove(id: string, requestUser: User) {
    const content = await this.findOne(id, requestUser);
    if(requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para eliminar contenido');
    }
    if(requestUser.role === 'ADMIN' && content.Course.companyId !== requestUser.companyId) {
      throw new ForbiddenException('No tienes permisos para eliminar contenido de este curso');
    }
    return this.prisma.content.delete({
      where: { id },
    });
  }
}
