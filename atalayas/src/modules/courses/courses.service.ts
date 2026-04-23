import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { User } from '@prisma/client';
import { StorageService } from '../../infrastructure/storage/storage.service.js';
import { AiService } from '../../infrastructure/ai/ai.service.js';
import { Readable } from 'stream'; // ✅ IMPORTACIÓN NECESARIA

type QuizResult = {
  questions: {
    question: string;
    options: string[];
    correctAnswer: string;
  }[];
};

@Injectable()
export class CoursesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
    private readonly aiService: AiService,
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

  async findAll(requestUser: User) {
    if (requestUser.role === 'GENERAL_ADMIN') {
      return this.prismaService.course.findMany();
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

    if (
      requestUser.role !== 'GENERAL_ADMIN' &&
      course.companyId !== requestUser.companyId &&
      !course.isPublic
    ) {
      throw new ForbiddenException('No tienes permisos para ver este curso');
    }

    return course;
  }

  async remove(id: string, requestUser: User) {
    const course = await this.findOne(id, requestUser);

    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para eliminar cursos');
    }

    if (course.fileUrl) {
      await this.storageService.deleteFile(course.fileUrl);
    }

    return this.prismaService.course.delete({
      where: { id: course.id },
    });
  }

  async generateContentWithAi(
    courseId: string,
    title: string,
    order: number,
    pdfFile: Express.Multer.File,
    requestUser: User,
  ) {
    const course = await this.findOne(courseId, requestUser);

    if (!pdfFile || pdfFile.mimetype !== 'application/pdf') {
      throw new BadRequestException('Por favor, sube un archivo PDF válido.');
    }

    // ✅ EXTRAER TEXTO REAL DEL PDF
    const text = await this.aiService.extractTextFromPdf(pdfFile.buffer);

    const { script, audioBuffer } = await this.aiService.generatePodcast(text);

    console.log('🧠 Generando test interactivo...');
    const quizData: QuizResult = await this.aiService.generateQuiz(script);

    const fileName = `curso_${course.id}_modulo_${Date.now()}.mp3`;

    // ✅ CORRECCIÓN DEL ERROR DE TYPESCRIPT:
    // Creamos un stream real a partir del buffer y usamos un cast para Multer
    const audioFileMock: Express.Multer.File = {
      buffer: audioBuffer,
      originalname: fileName,
      mimetype: 'audio/mpeg',
      fieldname: 'file',
      encoding: '7bit',
      size: audioBuffer.length,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      stream: Readable.from(audioBuffer) as any, // 👈 Se usa 'as any' para evitar el conflicto entre ReadableStream y Readable
      destination: '',
      filename: fileName,
      path: '',
    };

    console.log('⏳ Subiendo audio...');
    const audioUrl = await this.storageService.uploadFile(audioFileMock);

    try {
      return await this.prismaService.content.create({
        data: {
          title,
          order: Number(order) || 1,
          courseId: course.id,
          summary: script,
          url: audioUrl,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          quiz: quizData as any,
        },
      });
    } catch (error) {
      console.error('🚨 ERROR AL INSERTAR:', error);
      throw new InternalServerErrorException(
        'Error al guardar el contenido generado en la base de datos.',
      );
    }
  }
}
