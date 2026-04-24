import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { User } from '@prisma/client';
import { StorageService } from '../../infrastructure/storage/storage.service.js';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Crea un nuevo curso y gestiona la subida del archivo de portada/recurso.
   */
  async create(
    createCourseDto: CreateCourseDto,
    file: Express.Multer.File,
    requestUser: User,
  ) {
    if (requestUser.role === 'EMPLOYEE' || requestUser.role === 'PUBLIC') {
      throw new ForbiddenException('No tienes permisos para crear cursos');
    }

    const companyId =
      requestUser.role === 'GENERAL_ADMIN' && createCourseDto.companyId
        ? createCourseDto.companyId
        : requestUser.companyId;

    if (!companyId) {
      throw new ForbiddenException('Se requiere ID de empresa válido');
    }

    let fileUrl: string | null = null;
    if (file) {
      fileUrl = await this.storageService.uploadFile(file);
    }

    return this.prismaService.course.create({
      data: {
        title: createCourseDto.title,
        companyId,
        isPublic: createCourseDto.isPublic || false,
        category: createCourseDto.category || 'BASICO',
        fileUrl,
      },
    });
  }

  /**
   * Actualiza los datos del curso y reemplaza el archivo en storage si se sube uno nuevo.
   */
  async update(
    id: string,
    updateCourseDto: UpdateCourseDto,
    requestUser: User,
    file?: Express.Multer.File,
  ) {
    const course = await this.findOne(id, requestUser);

    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para actualizar cursos');
    }

    let fileUrl = course.fileUrl;

    if (file) {
      if (course.fileUrl) {
        try {
          await this.storageService.deleteFile(course.fileUrl);
        } catch (error) {
          console.error('Error al borrar archivo viejo:', error);
        }
      }
      fileUrl = await this.storageService.uploadFile(file);
    }

    return this.prismaService.course.update({
      where: { id: course.id },
      data: {
        title: updateCourseDto.title,
        isPublic: updateCourseDto.isPublic,
        category: updateCourseDto.category,
        fileUrl,
      },
    });
  }

  /**
   * Obtiene todos los cursos según el rol del usuario (Filtro por empresa o públicos).
   */
  async findAll(requestUser: User) {
    if (requestUser.role === 'GENERAL_ADMIN') {
      return this.prismaService.course.findMany({
        include: { Company: true },
      });
    }

    if (requestUser.role === 'PUBLIC') {
      return this.prismaService.course.findMany({
        where: { isPublic: true },
      });
    }

    return this.prismaService.course.findMany({
      where: {
        OR: [{ companyId: requestUser.companyId }, { isPublic: true }],
      },
      include: {
        Content: true,
        _count: {
          select: {
            Content: true,
          },
        },
      },
    });
  }

  /**
   * Obtiene un curso por ID con sus contenidos y progreso del usuario actual.
   */
  async findOne(id: string, requestUser: User) {
    const course = await this.prismaService.course.findUnique({
      where: { id },
      include: {
        Company: true,
        Content: {
          orderBy: { order: 'asc' },
          include: {
            userProgresses: {
              where: { userId: requestUser.id },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`El curso con ID ${id} no existe`);
    }

    // Validación de permisos de acceso
    if (
      requestUser.role !== 'GENERAL_ADMIN' &&
      course.companyId !== requestUser.companyId &&
      !course.isPublic
    ) {
      throw new ForbiddenException('No tienes permisos para ver este curso');
    }

    return course;
  }

  /**
   * Elimina un curso y su archivo asociado en el storage.
   */
  async remove(id: string, requestUser: User) {
    const course = await this.findOne(id, requestUser);

    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para eliminar cursos');
    }

    if (course.fileUrl) {
      try {
        await this.storageService.deleteFile(course.fileUrl);
      } catch (error) {
        console.error('Error al borrar archivo adjunto:', error);
      }
    }

    return this.prismaService.course.delete({
      where: { id: course.id },
    });
  }
}
