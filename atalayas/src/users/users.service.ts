import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async create(createUserDto: CreateUserDto, requestUser: User) {
    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para crear usuarios');
    }

    const password = Math.random().toString(36).slice(-8);

    const authUser = await this.authService.register(
      createUserDto.email,
      password,
    );
    try {
      const newUser = await this.prismaService.user.create({
        data: {
          id: authUser.id,
          email: createUserDto.email,
          name: createUserDto.name,
          companyId: requestUser.companyId,
        },
      });

      return {
        ...newUser,
        provisionalPassword: password,
      };
    } catch {
      if (authUser?.id) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        await this.authService.deleteUser(authUser.id);
      }
      throw new InternalServerErrorException('Error al crear el usuario');
    }
  }

  async findAll(requestUser: User) {
    if (requestUser.role === 'GENERAL_ADMIN') {
      return await this.prismaService.user.findMany({
        include: { Company: true },
      });
    }
    if(requestUser.role === 'ADMIN') {
    return await this.prismaService.user.findMany({
      where: {
        companyId: requestUser.companyId,
      },
      include: { Company: true },
    });
    }
    else{
    throw new ForbiddenException('No tienes permisos para ver los usuarios');
    }
  }

  async findOne(id: string, requestUser: User) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      include: { Company: true },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    if(requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para ver este usuario');
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, requestUser: User) {
    await this.findOne(id, requestUser); // Verificamos que existe antes de actualizar

    if(requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para actualizar este usuario');
    }

    return this.prismaService.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async remove(id: string, requestUser: User) {
    await this.findOne(id, requestUser); // Verificamos que existe antes de borrar

    if(requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para eliminar este usuario');
     }
     
    return this.prismaService.user.delete({
      where: { id },
    });
  }
}
