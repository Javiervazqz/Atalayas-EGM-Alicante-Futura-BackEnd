import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
// Importamos Role (el Enum de Prisma) y User
import { User, Role } from '@prisma/client';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async create(createUserDto: CreateUserDto, requestUser: User) {
    // 1. Empleados fuera
    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para crear usuarios');
    }

    // 2. Multitenancy estricto: ¿A qué empresa va este nuevo usuario?
    let finalCompanyId: string;

    if (requestUser.role === 'GENERAL_ADMIN') {
      // El General Admin DEBE proporcionar una empresa a la que asignar el usuario
      if (!createUserDto.companyId || createUserDto.companyId === '') {
        throw new ForbiddenException(
          'Un GENERAL_ADMIN debe especificar el companyId al crear un usuario',
        );
      }
      finalCompanyId = createUserDto.companyId;
    } else {
      // Un ADMIN normal SIEMPRE crea usuarios para su propia empresa (ignorando el DTO)
      finalCompanyId = requestUser.companyId;
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
          companyId: finalCompanyId,
          // ✅ Corrección de tipo: Casteamos el string a Role para Prisma
          role: (createUserDto.role as Role) || Role.EMPLOYEE,
        },
      });

      return {
        ...newUser,
        provisionalPassword: password,
      };
    } catch {
      if (authUser?.id) {
        await this.authService.deleteUser(authUser.id);
      }
      throw new InternalServerErrorException(
        'Error al crear el usuario en la base de datos',
      );
    }
  }

  async findAll(requestUser: User) {
    if (requestUser.role === 'GENERAL_ADMIN') {
      return await this.prismaService.user.findMany({
        include: { Company: true },
      });
    }

    if (requestUser.role === 'ADMIN') {
      return await this.prismaService.user.findMany({
        where: {
          companyId: requestUser.companyId,
        },
        include: { Company: true },
      });
    }

    throw new ForbiddenException('No tienes permisos para ver los usuarios');
  }

  async findOne(id: string, requestUser: User) {
    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException(
        'Los empleados no pueden buscar otros usuarios',
      );
    }

    const user = await this.prismaService.user.findUnique({
      where: { id },
      include: { Company: true },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // 🔒 NUEVO ESCUDO: Un Admin normal no puede cotillear usuarios de otras empresas
    if (
      requestUser.role !== 'GENERAL_ADMIN' &&
      user.companyId !== requestUser.companyId
    ) {
      throw new ForbiddenException('Este usuario pertenece a otra empresa.');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, requestUser: User) {
    // findOne ya hace las validaciones de si existe, si soy empleado y si es de mi empresa
    await this.findOne(id, requestUser);

    // Creamos una copia de los datos para poder manipularlos sin errores de tipado
    const updateData = { ...updateUserDto };

    // Evitamos que un Admin normal se cambie de empresa haciendo trampas en el update
    if (requestUser.role !== 'GENERAL_ADMIN' && updateData.companyId) {
      delete updateData.companyId; // Borramos el intento de hackeo silenciosamente
    }

    return this.prismaService.user.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: updateData as any,
    });
  }

  async remove(id: string, requestUser: User) {
    // findOne hace todo el trabajo de seguridad por nosotros
    await this.findOne(id, requestUser);

    // No permitimos que un Admin se borre a sí mismo por error
    if (id === requestUser.id) {
      throw new ForbiddenException(
        'No puedes eliminar tu propio usuario administrador',
      );
    }

    return this.prismaService.user.delete({
      where: { id },
    });
  }
}
