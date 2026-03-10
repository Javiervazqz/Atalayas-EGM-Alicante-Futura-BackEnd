import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createContentDto: CreateContentDto) {
    // 1. Validar que el curso existe antes de añadirle contenido
    const courseExists = await this.prisma.course.findUnique({
      where: { id: createContentDto.courseId },
    });

    if (!courseExists) {
      throw new NotFoundException(
        `El curso con ID ${createContentDto.courseId} no existe.`,
      );
    }

    // 2. Crear el contenido
    return this.prisma.content.create({
      data: createContentDto,
    });
  }

  async findAll() {
    return this.prisma.content.findMany();
  }

  async findOne(id: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: { Course: true }, // Traemos la información del curso al que pertenece
    });

    if (!content) {
      throw new NotFoundException(`Contenido con ID ${id} no encontrado`);
    }
    return content;
  }

  async update(id: string, updateContentDto: UpdateContentDto) {
    await this.findOne(id); // Reutilizamos para lanzar el 404 si no existe
    return this.prisma.content.update({
      where: { id },
      data: updateContentDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Reutilizamos para lanzar el 404 si no existe
    return this.prisma.content.delete({
      where: { id },
    });
  }
}
