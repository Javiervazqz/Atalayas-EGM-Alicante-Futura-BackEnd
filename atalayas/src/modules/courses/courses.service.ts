import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { User } from '@prisma/client';
import { AiService } from '../../infrastructure/ai/ai.service.js'; // 👈 AÑADIDO
import { StorageService } from '../../infrastructure/storage/storage.service.js'; // 👈 AÑADIDO

@Injectable()
export class CoursesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiService: AiService, // 👈 AÑADIDO
    private readonly storageService: StorageService, // 👈 AÑADIDO
  ) {}

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

    if (!companyId)
      throw new ForbiddenException('Se requiere ID de empresa válido');

    if (requestUser.role !== 'GENERAL_ADMIN' && createCourseDto.isPublic) {
      throw new ForbiddenException(
        'Solo administradores generales crean cursos públicos',
      );
    }

    // 🚀 CORRECCIÓN: Le decimos a TypeScript que puede ser string o null
    let fileUrl: string | null = null;

    if (file) {
      const fileName = `curso_pdf_${Date.now()}.pdf`;
      const pdfMock = {
        buffer: file.buffer,
        originalname: fileName,
        mimetype: file.mimetype,
      } as Express.Multer.File;

      fileUrl = await this.storageService.uploadFile(pdfMock);
    }

    return await this.prismaService.course.create({
      data: {
        title: createCourseDto.title,
        companyId,
        isPublic: createCourseDto.isPublic || false,
        category: createCourseDto.category || 'BASICO',
        fileUrl: fileUrl,
      },
    });
  }

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
    });
  }

  async findOne(id: string, requestUser: User) {
    const course = await this.prismaService.course.findUnique({
      where: { id },
      include: { Company: true },
    });

    if (!course) {
      throw new NotFoundException(`El curso con ID ${id} no existe`);
    }

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
    const course = await this.findOne(id, requestUser);

    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para actualizar cursos');
    }

    return this.prismaService.course.update({
      where: { id: course.id },
      data: updateCourseDto,
    });
  }

  async remove(id: string, requestUser: User) {
    const course = await this.findOne(id, requestUser);

    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para eliminar cursos');
    }

    return this.prismaService.course.delete({
      where: { id: course.id },
    });
  }

  // 🚀 AQUÍ ESTÁ EL NUEVO MÉTODO PARA LA IA
  async generateContentWithAi(
    courseId: string,
    title: string,
    order: number,
    pdfFile: Express.Multer.File,
    requestUser: User,
  ) {
    // 1. Verificamos que el curso existe y el usuario tiene permisos (reutilizando tu excelente lógica)
    const course = await this.findOne(courseId, requestUser);

    if (!pdfFile || pdfFile.mimetype !== 'application/pdf') {
      throw new BadRequestException('Por favor, sube un archivo PDF válido.');
    }

    // 2. Pasamos el PDF a nuestro AiService para que haga la magia (DeepSeek + ElevenLabs)
    const { script, audioBase64 } = await this.aiService.generatePodcastFromPdf(
      pdfFile.buffer,
    );

    // 3. Preparamos el archivo de audio para subirlo a Supabase
    const fileName = `curso_${course.id}_modulo_${Date.now()}.mp3`;
    const audioFileMock = {
      buffer: Buffer.from(audioBase64, 'base64'),
      originalname: fileName,
      mimetype: 'audio/mpeg',
    } as Express.Multer.File;

    const audioUrl = await this.storageService.uploadFile(audioFileMock);

    // 4. Guardamos todo en la tabla Content de Prisma
    return this.prismaService.content.create({
      data: {
        title: title,
        order: Number(order) || 1,
        courseId: course.id,
        summary: script, // El guion que generó DeepSeek
        url: audioUrl, // El enlace público de Supabase
      },
    });
  }
}
