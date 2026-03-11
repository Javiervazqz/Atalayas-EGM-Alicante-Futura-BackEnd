import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { User } from '@prisma/client';

@Injectable()
export class DocumentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDocumentDto: CreateDocumentDto, requestUser: User) {
    // 1. Los empleados rasos no suben documentos
    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException(
        'Los empleados no tienen permiso para subir documentos',
      );
    }

    // 2. Multitenancy: El ID de la empresa será el del usuario que lo crea
    // (A menos que sea el GENERAL_ADMIN, que puede elegir la empresa)
    const finalCompanyId =
      requestUser.role === 'GENERAL_ADMIN' && createDocumentDto.companyId
        ? createDocumentDto.companyId
        : requestUser.companyId;

    // 3. Validar que el usuario asociado exista (si se envía uno)
    if (createDocumentDto.userId) {
      const userExists = await this.prisma.user.findUnique({
        where: { id: createDocumentDto.userId },
      });
      if (!userExists) {
        throw new NotFoundException(
          `Usuario con ID ${createDocumentDto.userId} no encontrado`,
        );
      }
    }

    return this.prisma.document.create({
      data: {
        ...createDocumentDto,
        companyId: finalCompanyId, // Lo inyectamos forzosamente seguro
      },
    });
  }

  async findAll(requestUser: User) {
    // Si es super admin, lo ve todo
    if (requestUser.role === 'GENERAL_ADMIN') {
      return this.prisma.document.findMany({
        include: { Company: true, User: true },
      });
    }

    // Si es normal, solo ve los de su empresa
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

    // Seguridad: ¿Es de mi empresa?
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
    // findOne ya valida que exista y que sea de tu empresa
    await this.findOne(id, requestUser);

    // Los empleados no editan
    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('Los empleados no pueden editar documentos');
    }

    return this.prisma.document.update({
      where: { id },
      data: updateDocumentDto,
    });
  }

  async remove(id: string, requestUser: User) {
    // findOne ya valida que exista y que sea de tu empresa
    await this.findOne(id, requestUser);

    // Los empleados no borran
    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('Los empleados no pueden borrar documentos');
    }

    return this.prisma.document.delete({
      where: { id },
    });
  }
}
