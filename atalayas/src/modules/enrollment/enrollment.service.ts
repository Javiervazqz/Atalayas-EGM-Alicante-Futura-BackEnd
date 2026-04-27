import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto.js';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { User } from '@prisma/client';

@Injectable()
export class EnrollmentService {
  constructor(private readonly prisma: PrismaService) { }

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
   /*  if (requestUser.role === 'GENERAL_ADMIN') {
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
    });*/

    const courses = await this.prisma.course.findMany({
    where: {
      OR: [
        { isPublic: true },
        { companyId: requestUser.companyId },
      ],
    },
    include: {
      Enrollment: {
        where: {
          userId: requestUser.id,
        },
      },
    },
  });

  // 👇 Aplanamos los datos
  return courses.map(course => {
    const enrollment = course.Enrollment[0];

    return {
      ...course,
      progress: enrollment ? enrollment.progress : 0,
      isCompleted: enrollment ? enrollment.progress === 100 : false,
    };
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

  // 1. MÉTODO PARA VÍDEOS (Actualización constante)
  async updateVideoProgress(
    userId: string,
    contentId: string,
    lastTime: number,
    totalDuration: number,
  ) {
    // Si ha visto más del 90%, lo marcamos como completado
    const isCompleted = lastTime >= totalDuration * 0.9;

    const progress = await this.prisma.userProgress.upsert({
      where: { userId_contentId: { userId, contentId } },
      update: {
        lastTime,
        isCompleted,
        completedAt: isCompleted ? new Date() : undefined,
      },
      create: {
        userId,
        contentId,
        lastTime,
        isCompleted,
        completedAt: isCompleted ? new Date() : undefined,
      },
    });

    // Si se completa, actualizamos la matrícula
    if (isCompleted) {
      await this.syncEnrollmentProgress(userId, contentId);
    }

    return progress;
  }

  // 2. MÉTODO PARA MANUALES (Botón de "He terminado")
  async completeManualLesson(userId: string, contentId: string) {
    await this.prisma.userProgress.upsert({
      where: { userId_contentId: { userId, contentId } },
      update: { isCompleted: true, completedAt: new Date() },
      create: { userId, contentId, isCompleted: true, completedAt: new Date() },
    });

    return await this.syncEnrollmentProgress(userId, contentId);
  }

  // 3. EL CORAZÓN: Sincronización de porcentajes
  private async syncEnrollmentProgress(userId: string, contentId: string) {
    // Buscamos el curso al que pertenece la lección
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { courseId: true },
    });

    if (!content) throw new NotFoundException('Contenido no encontrado');

    await this.ensureEnrollment(userId, content.courseId);

    // Contamos el total de lecciones del curso
    const totalLessons = await this.prisma.content.count({
      where: { courseId: content.courseId },
    });

    // Contamos cuántas ha terminado el usuario de verdad (isCompleted = true)
    const completedCount = await this.prisma.userProgress.count({
      where: {
        userId,
        isCompleted: true,
        contentId: {
          in: await this.prisma.content.findMany({
            where: { courseId: content.courseId },
            select: { id: true },
          }).then(res => res.map(c => c.id)),
        },
      },
    });

    // Aplicamos la fórmula: progress = (completadas / totales) * 100
    const percentage =
      totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    const isCompleted = percentage === 100;


    // Actualizamos el resumen en la tabla Enrollment
    return await this.prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId: content.courseId } },
      data: {
        completedContent: completedCount,
        progress: percentage,
      },
    });
  }
  private async ensureEnrollment(userId: string, courseId: string) {
    const exists = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!exists) {
      await this.prisma.enrollment.create({
        data: {
          userId,
          courseId,
          progress: 0,
          completedContent: 0,
        },
      });
    }
  }

  async markContentOnAccess(userId: string, contentId: string) {
  const content = await this.prisma.content.findUnique({
    where: { id: contentId },
  });

  if (!content) {
    throw new NotFoundException('Contenido no encontrado');
  }

  const hasQuiz = content.quiz && content.quiz !== 'null';

  // 👉 Si TIENE quiz → NO completar automáticamente
  if (hasQuiz) {
    return;
  }

  // 👉 Si NO tiene quiz → marcar como completado
  await this.prisma.userProgress.upsert({
    where: { userId_contentId: { userId, contentId } },
    update: {
      isCompleted: true,
      completedAt: new Date(),
    },
    create: {
      userId,
      contentId,
      isCompleted: true,
      completedAt: new Date(),
    },
  });

  return await this.syncEnrollmentProgress(userId, contentId);
}
}
