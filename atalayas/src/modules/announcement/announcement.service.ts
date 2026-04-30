import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class AnnouncementService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: {
      title: string;
      body: string;
      isPublic: boolean;
      companyId?: string | null;
    },
    requestUser: User,
  ) {
    if (requestUser.role === 'EMPLOYEE' || requestUser.role === 'PUBLIC') {
      throw new ForbiddenException('No tienes permisos para crear anuncios');
    }

    const companyId =
      requestUser.role === 'GENERAL_ADMIN'
        ? dto.isPublic
          ? null
          : dto.companyId ?? null
        : requestUser.companyId;

    return this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.body,
        isPublic: dto.isPublic,
        companyId: companyId,
      },
    });
  }

  async findAll(requestUser: User) {
    if (requestUser.role === 'GENERAL_ADMIN') {
      return this.prisma.announcement.findMany({
        include: { Company: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.announcement.findMany({
      where: {
        OR: [
          { isPublic: true },
          { companyId: requestUser.companyId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPublic() {
    return this.prisma.announcement.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  async remove(id: string, requestUser: User) {
    const ann = await this.prisma.announcement.findUnique({ where: { id } });
    if (!ann) throw new NotFoundException('Anuncio no encontrado');

    if (requestUser.role === 'EMPLOYEE' || requestUser.role === 'PUBLIC') {
      throw new ForbiddenException('No tienes permisos para eliminar anuncios');
    }

    if (
      requestUser.role === 'ADMIN' &&
      ann.companyId !== requestUser.companyId
    ) {
      throw new ForbiddenException('Este anuncio no pertenece a tu empresa');
    }

    return this.prisma.announcement.delete({ where: { id } });
  }
}
