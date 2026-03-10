import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDocumentDto: CreateDocumentDto) {
    const { companyId, userId } = createDocumentDto;

    // 1. Validar que la empresa exista (obligatorio)
    const companyExists = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!companyExists) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    // 2. Validar que el usuario exista (SOLO si se ha enviado el userId)
    if (userId) {
      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
    }

    // 3. Crear el documento
    return this.prisma.document.create({
      data: createDocumentDto,
    });
  }

  async findAll() {
    return this.prisma.document.findMany();
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { Company: true, User: true }, // Traemos empresa y usuario (si tiene)
    });

    if (!document) {
      throw new NotFoundException(`Document not found`);
    }
    return document;
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto) {
    await this.findOne(id); // Reutilizamos el check de existencia
    return this.prisma.document.update({
      where: { id },
      data: updateDocumentDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Reutilizamos el check de existencia
    return this.prisma.document.delete({
      where: { id },
    });
  }
}
