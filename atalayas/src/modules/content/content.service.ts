import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { User } from '@prisma/client';
import { AiService } from '../../infrastructure/ai/ai.service';
import { StorageService } from '../../infrastructure/storage/storage.service';

// ... (imports iguales)

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly storageService: StorageService,
  ) {}

  async create(
    createContentDto: CreateContentDto,
    requestUser: User,
    courseId: string,
    file?: Express.Multer.File,
  ) {
    if (requestUser.role === 'EMPLOYEE' || requestUser.role === 'PUBLIC') {
      throw new ForbiddenException('No tienes permisos para crear contenido');
    }

    const courseExists = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!courseExists)
      throw new NotFoundException(`El curso con ID ${courseId} no existe.`);

    let options = {
      generateSummary: false,
      generateQuiz: false,
      generatePodcast: false,
    };
    try {
      if (createContentDto.options) {
        options =
          typeof createContentDto.options === 'string'
            ? JSON.parse(createContentDto.options)
            : createContentDto.options;
      }
    } catch (e) {
      console.error('Error parsing options', e);
    }

    let finalUrl = createContentDto.url;
    let summary = '';
    let podcastData: any = null;
    let quizData: any = null;

    // --- CAMBIO CLAVE AQUÍ ---
    if (file) {
      // 1. Subir el archivo original una sola vez
      finalUrl = await this.storageService.uploadFile(file);

      if (
        options.generateSummary ||
        options.generateQuiz ||
        options.generatePodcast
      ) {
        // 2. Extraer el texto del buffer una sola vez
        const rawText = await this.aiService.extractTextFromPdf(file.buffer);

        // 3. Procesar las peticiones de IA de forma secuencial con el mismo rawText
        if (options.generateSummary) {
          summary = await this.aiService.generateSummary(rawText);
        }

        if (options.generateQuiz) {
          quizData = await this.aiService.generateQuiz(rawText);
        }

        if (options.generatePodcast) {
          const { script, audioBuffer } =
            await this.aiService.generatePodcast(rawText);
          const audioFileMock = {
            buffer: audioBuffer,
            originalname: `podcast_${Date.now()}.mp3`,
            mimetype: 'audio/mpeg',
          } as Express.Multer.File;

          const audioUrl = await this.storageService.uploadFile(audioFileMock);
          podcastData = { url: audioUrl, script };
        }
      }
    }

    const lastContent = await this.prisma.content.findFirst({
      where: { courseId },
      orderBy: { order: 'desc' },
    });
    const nextOrder = lastContent ? lastContent.order + 1 : 1;

    return this.prisma.content.create({
      data: {
        title: createContentDto.title,
        courseId,
        url: finalUrl,
        summary,
        quiz: quizData || null,
        podcast: podcastData || null,
        order: nextOrder,
      },
    });
  }

  async findAll(requestUser: User, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException(`Curso no encontrado`);

    if (
      requestUser.role !== 'GENERAL_ADMIN' &&
      course.companyId !== requestUser.companyId
    ) {
      throw new ForbiddenException(`No tienes acceso al curso.`);
    }

    return this.prisma.content.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string, requestUser: User) {
    const todos = await this.prisma.content.findMany({
      select: { id: true, title: true },
    });
    console.log('IDs que existen en la tabla Content:', todos);
    console.log('ID que estás intentando buscar:', id);
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: {
        Course: true,
      },
    });

    if (!content) throw new NotFoundException(`Contenido no encontrado en DB`);

    // Si es un administrador global, saltamos validaciones
    if (requestUser.role === 'GENERAL_ADMIN') return content;

    // IMPORTANTE: Accedemos a 'course' en minúscula si así está en el include
    const courseData = (content as any).course || (content as any).Course;

    if (!courseData) {
      throw new Error(
        'Error interno: No se pudo cargar la relación del curso.',
      );
    }

    // Validación de seguridad
    if (
      courseData.companyId !== requestUser.companyId &&
      !courseData.isPublic
    ) {
      throw new ForbiddenException(
        `No tienes permiso para ver este contenido.`,
      );
    }

    return content;
  }

  async update(
    id: string,
    updateContentDto: UpdateContentDto,
    requestUser: User,
  ) {
    const content = await this.findOne(id, requestUser);
    if (requestUser.role === 'EMPLOYEE')
      throw new ForbiddenException('Sin permisos');

    return this.prisma.content.update({
      where: { id },
      data: updateContentDto,
    });
  }

  async remove(id: string, requestUser: User) {
    const content = await this.findOne(id, requestUser);
    if (requestUser.role === 'EMPLOYEE')
      throw new ForbiddenException('Sin permisos');

    return this.prisma.content.delete({ where: { id } });
  }
}
