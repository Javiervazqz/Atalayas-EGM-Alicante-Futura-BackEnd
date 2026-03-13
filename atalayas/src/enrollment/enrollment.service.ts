import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto.js';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { User } from '@prisma/client';

@Injectable()
export class EnrollmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEnrollmentDto: CreateEnrollmentDto, requestUser: User) {
    // 1. Los empleados no pueden crear matriculaciones
    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException(
        'Los empleados no pueden matricular usuarios',
      );
    }

    const { userId, courseId } = createEnrollmentDto;

    // 2. Validar que el usuario objetivo existe y pertenece a la empresa (si es ADMIN)
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!targetUser) throw new NotFoundException(`Usuario no encontrado.`);

    if (
      requestUser.role !== 'GENERAL_ADMIN' &&
      targetUser.companyId !== requestUser.companyId
    ) {
      throw new ForbiddenException(
        'No puedes matricular a un usuario de otra empresa',
      );
    }

    // 3. Validar que el curso existe y pertenece a la empresa (si es ADMIN)
    // Suponiendo que tu modelo Course tiene un campo companyId. Si no es así, coméntame y lo adaptamos.
    const targetCourse = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!targetCourse) throw new NotFoundException(`Curso no encontrado.`);

    if (
      requestUser.role !== 'GENERAL_ADMIN' &&
      targetCourse.companyId !== requestUser.companyId
    ) {
      throw new ForbiddenException(
        'No puedes matricular a un usuario en un curso de otra empresa',
      );
    }

    // 4. Evitar duplicados
    const existingEnrollment = await this.prisma.enrollment.findFirst({
      where: { userId: userId, courseId: courseId },
    });
    if (existingEnrollment) {
      throw new BadRequestException(
        'El usuario ya está inscrito en este curso.',
      );
    }

    return this.prisma.enrollment.create({
      data: createEnrollmentDto,
    });
  }

  async findAll(requestUser: User) {
    // GENERAL_ADMIN: Lo ve todo
    if (requestUser.role === 'GENERAL_ADMIN') {
      return this.prisma.enrollment.findMany({
        include: { User: true, Course: true },
      });
    }

    // ADMIN: Ve las matriculaciones de los empleados de SU empresa
    if (requestUser.role === 'ADMIN') {
      return this.prisma.enrollment.findMany({
        where: { User: { companyId: requestUser.companyId } }, // Magia de Prisma
        include: { User: true, Course: true },
      });
    }

    // EMPLOYEE: Solo ve SUS propias matriculaciones
    return this.prisma.enrollment.findMany({
      where: { userId: requestUser.id },
      include: { User: true, Course: true },
    });
  }

  async findOne(id: string, requestUser: User) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: { User: true, Course: true },
    });

    if (!enrollment) throw new NotFoundException(`Inscripción no encontrada`);

    // Validar visibilidad
    const isGeneralAdmin = requestUser.role === 'GENERAL_ADMIN';
    const isAdminOfCompany =
      requestUser.role === 'ADMIN' &&
      enrollment.User.companyId === requestUser.companyId;
    const isOwnEnrollment =
      requestUser.role === 'EMPLOYEE' && enrollment.userId === requestUser.id;

    if (!isGeneralAdmin && !isAdminOfCompany && !isOwnEnrollment) {
      throw new ForbiddenException(
        'No tienes permisos para ver esta matriculación',
      );
    }

    return enrollment;
  }

  async update(
    id: string,
    updateEnrollmentDto: UpdateEnrollmentDto,
    requestUser: User,
  ) {
    // findOne ya hace las validaciones de si tiene derecho a verlo
    await this.findOne(id, requestUser);

    return this.prisma.enrollment.update({
      where: { id },
      data: updateEnrollmentDto,
    });
  }

  async remove(id: string, requestUser: User) {
    await this.findOne(id, requestUser);

    // Los empleados no se pueden desmatricular solos (según tus reglas)
    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException(
        'Solo los administradores pueden borrar matriculaciones',
      );
    }

    return this.prisma.enrollment.delete({
      where: { id },
    });
  }

  async completeLesson(userId: string, contentId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });
  }
}
