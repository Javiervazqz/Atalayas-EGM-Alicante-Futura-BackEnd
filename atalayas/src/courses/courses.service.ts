import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { PrismaService } from '../prisma/prisma.service.js'; // Ajusta la ruta a tu proyecto
import { User } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createCourseDto: CreateCourseDto, requestUser: User) {
    // 1. Control de Roles: Los empleados no crean cursos
    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para crear cursos');
    }

    // 2. Multitenancy: Forzamos el ID de la empresa del usuario creador
    return await this.prismaService.course.create({
      data: {
        ...createCourseDto, // Expandimos los demás datos del DTO (title, description, etc.)
        companyId: requestUser.companyId, // Sobrescribimos/Inyectamos el ID seguro
      },
    });
  }

  async findAll(requestUser: User) {
    // 1. Si es Super Administrador, lo ve todo
    if (requestUser.role === 'GENERAL_ADMIN') {
      return await this.prismaService.course.findMany({
        include: { Company: true }, // Rescatado del método 2
      });
    }

    // 2. Si es Admin/Empleado normal, solo ve los cursos de su empresa
    return await this.prismaService.course.findMany({
      where: {
        companyId: requestUser.companyId,
      },
      include: { Company: true }, // Rescatado del método 2
    });
  }

  async findOne(id: string, requestUser: User) {
    const course = await this.prismaService.course.findUnique({
      where: { id },
      include: { Company: true }, // Rescatado del método 2
    });

    // 1. Manejo semántico de errores (Rescatado del método 2)
    if (!course) {
      throw new NotFoundException(`El curso con ID ${id} no existe`);
    }

    // 2. Seguridad: ¿Tiene permiso para ver este curso específico?
    if (
      requestUser.role !== 'GENERAL_ADMIN' &&
      course.companyId !== requestUser.companyId
    ) {
      throw new ForbiddenException('No tienes permisos para ver este curso');
    }

    return course;
  }

  async update(
    id: string,
    updateCourseDto: UpdateCourseDto,
    requestUser: User,
  ) {
    // 1. Reutilizamos findOne para que valide si existe y si tiene permisos para verlo
    const course = await this.findOne(id, requestUser);

    // 2. Control de Roles: Los empleados no editan
    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para actualizar cursos');
    }

    return this.prismaService.course.update({
      where: { id: course.id },
      data: updateCourseDto,
    });
  }

  async remove(id: string, requestUser: User) {
    // 1. Reutilizamos findOne para validación de existencia y acceso
    const course = await this.findOne(id, requestUser);

    // 2. Control de Roles: Los empleados no borran
    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para eliminar cursos');
    }

    return this.prismaService.course.delete({
      where: { id: course.id },
    });
  }
}
