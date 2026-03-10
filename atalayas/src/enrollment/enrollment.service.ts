import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEnrollmentDto: CreateEnrollmentDto) {
    const { userId, courseId } = createEnrollmentDto;

    // 1. Validar que el usuario existe
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!userExists) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado.`);
    }

    // 2. Validar que el curso existe
    const courseExists = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!courseExists) {
      throw new NotFoundException(`Curso con ID ${courseId} no encontrado.`);
    }

    // 3. Validar que no esté ya inscrito (para no duplicar matrículas)
    const existingEnrollment = await this.prisma.enrollment.findFirst({
      where: { userId: userId, courseId: courseId },
    });
    if (existingEnrollment) {
      throw new BadRequestException(
        'El usuario ya está inscrito en este curso.',
      );
    }

    // 4. Crear la inscripción
    return this.prisma.enrollment.create({
      data: createEnrollmentDto,
    });
  }

  async findAll() {
    return this.prisma.enrollment.findMany({
      include: { User: true, Course: true }, // Traemos los datos del alumno y del curso
    });
  }

  async findOne(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: { User: true, Course: true },
    });

    if (!enrollment) {
      throw new NotFoundException(`Inscripción no encontrada`);
    }
    return enrollment;
  }

  async update(id: string, updateEnrollmentDto: UpdateEnrollmentDto) {
    await this.findOne(id); // Check de existencia
    return this.prisma.enrollment.update({
      where: { id },
      data: updateEnrollmentDto, // Aquí sí podrán actualizar el 'progress' o 'completedContent'
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check de existencia
    return this.prisma.enrollment.delete({
      where: { id },
    });
  }
}
