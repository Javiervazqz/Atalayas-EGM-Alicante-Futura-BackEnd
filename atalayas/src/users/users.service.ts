import { Injectable, UseGuards, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly authService: AuthService
  ) {}

  async create(createUserDto: CreateUserDto, requestUser: User) {
    if(requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para crear usuarios');
    }

    const password = Math.random().toString(36).slice(-8);

    const authUser = await this.authService.register(
      createUserDto.email,
      password
    );

    const newUser = await this.prismaService.user.create({
      data: {
      id: authUser.id,
      email: createUserDto.email,
      name: createUserDto.name,
      companyId : requestUser.companyId,
      }
    });

    return {
      ...newUser,
      provisionalPassword: password
    };

  }
  
  findAll() {
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
