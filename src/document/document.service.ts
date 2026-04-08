import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException, // Añadido
} from '@nestjs/common';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { User } from '@prisma/client';
import { StorageService } from '../storage/storage.service.js'; // 1. Importamos el StorageService
import 'multer';

@Injectable()
export class DocumentService {
  // 2. Inyectamos el StorageService en el constructor
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async create(
    createDocumentDto: CreateDocumentDto,
    requestUser: User,
    file: Express.Multer.File,
  ) {
    if (requestUser.role === 'EMPLOYEE' || requestUser.role === 'PUBLIC') {
      throw new ForbiddenException('No tienes permiso para subir documentos');
    }

    if (!file) {
      throw new BadRequestException('El archivo físico es obligatorio');
    }

    let finalCompanyId: string | null = null;
    let finalIsPublic: boolean = false;

    if (requestUser.role === 'GENERAL_ADMIN') {
      finalIsPublic = String(createDocumentDto.isPublic) === 'true';
      // Si es SuperAdmin y manda un UUID, lo usamos. Si lo deja vacío, es global (null)
      finalCompanyId =
        createDocumentDto.companyId && createDocumentDto.companyId !== ''
          ? createDocumentDto.companyId
          : null;
    } else {
      // Si es Admin normal, SIEMPRE se guarda en su empresa, ponga lo que ponga
      finalCompanyId = requestUser.companyId;
    }

    // 1. Gestionar el ID del Usuario (Opcional)
    let finalUserId: string | null = null;
    if (createDocumentDto.userId && createDocumentDto.userId !== '') {
      const targetUser = await this.prisma.user.findUnique({
        where: { id: createDocumentDto.userId },
      });
      if (!targetUser) throw new NotFoundException(`Usuario no encontrado`);
      if (finalCompanyId !== null && targetUser.companyId !== finalCompanyId) {
        throw new ForbiddenException(
          'Imposible, el empleado seleccionado pertenece a otra empresa.',
        );
      }
      finalUserId = createDocumentDto.userId;
    }

    // 3. Subir el archivo a Supabase
    const fileUrl = await this.storageService.uploadFile(file);

    return this.prisma.document.create({
      data: {
        title: createDocumentDto.title,
        fileUrl: fileUrl,
        isPublic: finalIsPublic,
        companyId: finalCompanyId,
        userId: finalUserId,
      },
    });
  }

  async findAll(requestUser: User) {
    if (requestUser.role === 'GENERAL_ADMIN') {
      return this.prisma.document.findMany({
        include: { Company: true, User: true },
      });
    }

    return this.prisma.document.findMany({
      where: { companyId: requestUser.companyId },
      include: { Company: true, User: true },
    });
  }

  async findOne(id: string, requestUser: User) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { Company: true, User: true },
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    if (
      requestUser.role !== 'GENERAL_ADMIN' &&
      document.companyId !== requestUser.companyId
    ) {
      throw new ForbiddenException(
        'No tienes permisos para ver este documento',
      );
    }

    return document;
  }

  async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
    requestUser: User,
  ) {
    await this.findOne(id, requestUser);

    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('Los empleados no pueden editar documentos');
    }

    return this.prisma.document.update({
      where: { id },
      data: updateDocumentDto,
    });
  }

  async remove(id: string, requestUser: User) {
    // 1. Buscamos el documento. Si no existe o no es de su empresa, findOne lanzará un error y parará aquí.
    const document = await this.findOne(id, requestUser);

    // 2. Seguridad extra: Los empleados no pueden borrar
    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('Los empleados no pueden borrar documentos');
    }

    // 3. ELIMINACIÓN FÍSICA: Borramos el archivo de Supabase usando la URL que guardamos
    if (document.fileUrl) {
      await this.storageService.deleteFile(document.fileUrl);
    }

    // 4. ELIMINACIÓN LÓGICA: Borramos la fila en la base de datos
    return this.prisma.document.delete({
      where: { id },
    });
  }
}
