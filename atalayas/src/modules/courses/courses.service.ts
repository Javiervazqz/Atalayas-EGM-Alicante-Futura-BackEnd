import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
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
   * CREAR CURSO
   * Sube la imagen a Supabase y guarda la URL completa en la DB.
   */
  async create(
    createCourseDto: CreateCourseDto,
    file: Express.Multer.File,
    requestUser: User,
  ) {
    // 1. Validación de permisos
    if (requestUser.role === 'EMPLOYEE' || requestUser.role === 'PUBLIC') {
      throw new ForbiddenException('No tienes permisos para crear cursos');
    }

    // 2. Determinar el companyId (Admin General puede asignar, Admin de empresa usa la suya)
    const companyId =
      requestUser.role === 'GENERAL_ADMIN' && createCourseDto.companyId
        ? createCourseDto.companyId
        : requestUser.companyId;

    if (!companyId) {
      throw new ForbiddenException('Se requiere ID de empresa válido');
    }

    // 3. Subida de archivo a Supabase (Drag & Drop desde PC)
    let fileUrl: string | null = null;
    if (file) {
      // Tu StorageService ya retorna publicUrlData.publicUrl
      fileUrl = await this.storageService.uploadFile(file);
    }

    // 4. Persistencia en base de datos
    return await this.prismaService.course.create({
      data: {
        title: createCourseDto.title,
        companyId,
        isPublic: createCourseDto.isPublic || false,
        category: createCourseDto.category || 'BASICO',
        fileUrl: fileUrl, // Aquí se guarda el https://...
      },
    });
  }

  /**
   * ACTUALIZAR CURSO
   * Si viene un archivo nuevo, borra el anterior y guarda la nueva URL.
   */
  async update(
    id: string,
    updateCourseDto: UpdateCourseDto,
    requestUser: User,
    file?: Express.Multer.File,
  ) {
    // 1. Verificar que el curso existe y el usuario tiene acceso
    const course = await this.findOne(id, requestUser);

    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para actualizar cursos');
    }

    let fileUrl = course.fileUrl;

    // 2. Gestionar nueva imagen si se sube desde el PC
    if (file) {
      // Opcional: Borrar el archivo viejo de Supabase para no acumular basura
      if (course.fileUrl) {
        try {
          await this.storageService.deleteFile(course.fileUrl);
        } catch (error) {
          console.error('Error al borrar archivo viejo:', error);
          // Continuamos aunque falle el borrado para no bloquear la actualización
        }
      }

      // Subir el nuevo archivo y obtener URL completa
      fileUrl = await this.storageService.uploadFile(file);
    }

    // 3. Actualizar en base de datos
    return this.prismaService.course.update({
      where: { id: course.id },
      data: {
        title: updateCourseDto.title,
        isPublic: updateCourseDto.isPublic,
        category: updateCourseDto.category,
        fileUrl: fileUrl, // Se actualiza la URL o se mantiene la anterior
      },
    });
  }

  /**
   * LISTAR CURSOS
   */
  async findAll(requestUser: User) {
    if (requestUser.role === 'GENERAL_ADMIN') {
      return await this.prismaService.course.findMany();
    }
    if (requestUser.role === 'PUBLIC') {
      return await this.prismaService.course.findMany({
        where: { isPublic: true },
      });
    }
    return await this.prismaService.course.findMany({
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
  async findOne(id: string, requestUser: User) {
    const course = await this.prismaService.course.findUnique({
      where: { id },
      include: {
        Company: true,
        Content: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`El curso con ID ${id} no existe`);
    }

    // Validación de acceso por empresa
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
   * ELIMINAR CURSO
   */
  async remove(id: string, requestUser: User) {
    const course = await this.findOne(id, requestUser);

    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para eliminar cursos');
    }

    // Borrar archivo de Supabase si existe
    if (course.fileUrl) {
      await this.storageService.deleteFile(course.fileUrl);
    }

    return this.prismaService.course.delete({
      where: { id: course.id },
    });
  }
}
