import { Injectable } from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

@Injectable()
export class ServicesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createServiceDto: CreateServiceDto, requestUser: User) {
    if (requestUser.role === 'EMPLOYEE' || requestUser.role === 'PUBLIC') {
      throw new ForbiddenException('No tienes permisos para crear servicios');
    }

    const companyId =
      requestUser.role === 'GENERAL_ADMIN' && createServiceDto.companyId
        ? createServiceDto.companyId
        : requestUser.companyId;

    if (!companyId) {
      throw new ForbiddenException(
        'No puedes asignar un servicio a una empresa sin especificar un ID de empresa válido',
      );
    }

    // 2. Multitenancy: Forzamos el ID de la empresa del usuario creador
    return await this.prismaService.service.create({
      data: {
        title: createServiceDto.title,
        description: createServiceDto.description,
        mediaUrl: createServiceDto.mediaUrl,
        serviceType: createServiceDto.type,
        isPublic: createServiceDto.isPublic ?? false,
        companyId,
      },
    });
  }

  async findAll(requestUser: User) {
    if (requestUser.role === 'GENERAL_ADMIN') {
      return await this.prismaService.service.findMany({
        include: { Company: true },
        orderBy: { isPublic: 'desc' },
      });
    }
    if (requestUser.role === 'PUBLIC') {
      return await this.prismaService.service.findMany({
        where: {
          isPublic: true,
        },
      });
    }
    return await this.prismaService.service.findMany({
      where: {
        OR: [{ companyId: requestUser.companyId }, { isPublic: true }],
      },
      include: { Company: true },
    });
  }

  async findOne(id: string, requestUser: User) {
    const service = await this.prismaService.service.findUnique({
      where: { id },
    });
    if (!service) {
      throw new ForbiddenException('Servicio no encontrado');
    }
    if (requestUser.role === 'PUBLIC' && !service.isPublic) {
      throw new ForbiddenException('No tienes permisos para ver este servicio');
    }
    if (
      requestUser.role === 'GENERAL_ADMIN' &&
      !service.isPublic &&
      service.companyId !== requestUser.companyId
    ) {
      throw new ForbiddenException('No tienes permisos para ver este servicio');
    }
    return service;
  }

  async update(
    id: string,
    updateServiceDto: UpdateServiceDto,
    requestUser: User,
  ) {
    if (requestUser.role === 'EMPLOYEE' || requestUser.role === 'PUBLIC') {
      throw new ForbiddenException(
        'No tienes permisos para actualizar este servicio',
      );
    }
    const service = await this.findOne(id, requestUser);
    if (!service) {
      throw new ForbiddenException('Servicio no encontrado');
    }
    if (
      requestUser.role === 'ADMIN' &&
      service.companyId !== requestUser.companyId
    ) {
      throw new ForbiddenException(
        'No tienes permisos para actualizar servicios de otra empresa',
      );
    }
    return await this.prismaService.service.update({
      where: { id },
      data: {
        title: updateServiceDto.title,
        description: updateServiceDto.description,
        mediaUrl: updateServiceDto.mediaUrl,
        serviceType: updateServiceDto.type,
        isPublic: updateServiceDto.isPublic,
      },
    });
  }

  async remove(id: string, requestUser: User) {
    if (requestUser.role === 'EMPLOYEE' || requestUser.role === 'PUBLIC') {
      throw new ForbiddenException(
        'No tienes permisos para eliminar este servicio',
      );
    }
    const service = await this.findOne(id, requestUser);
    if (!service) {
      throw new ForbiddenException('Servicio no encontrado');
    }
    if (
      requestUser.role === 'ADMIN' &&
      service.companyId !== requestUser.companyId
    ) {
      throw new ForbiddenException(
        'No tienes permisos para eliminar servicios de otra empresa',
      );
    }
    return await this.prismaService.service.delete({
      where: { id },
    });
  }
}
