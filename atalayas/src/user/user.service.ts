import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UserService {
  private supabase: SupabaseClient<any, 'public', any>;

  constructor(private readonly prisma: PrismaService) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: true, persistSession: false } },
    );
  }

  async create(createUserDto: CreateUserDto, requestUser: User) {
    // 1. SEGURIDAD: Control de permisos
    if (requestUser.role === 'EMPLOYEE') {
      throw new ForbiddenException('No tienes permisos para crear usuarios');
    }

    // 2. SEGURIDAD: Contraseña aleatoria provisional (8 caracteres)
    const password = Math.random().toString(36).slice(-8);

    // 3. Crear el usuario en el sistema de seguridad de Supabase Auth
    const { data: authData, error: authError } =
      await this.supabase.auth.admin.createUser({
        email: createUserDto.email,
        password: password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      throw new InternalServerErrorException(
        `Error al crear usuario en Supabase: ${authError?.message || 'Error desconocido'}`,
      );
    }

    // 4. ROBUSTEZ: Intentamos guardar en tu base de datos pública con Prisma
    try {
      const newUser = await this.prisma.user.create({
        data: {
          id: authData.user.id,
          email: createUserDto.email,
          name: createUserDto.name,
          companyId: requestUser.companyId, // Forzado al ID de la empresa del creador
          role: createUserDto.role || 'EMPLOYEE',
        },
      });

      // 5. Devolvemos los datos junto con la contraseña para que se la envíen al empleado
      return {
        ...newUser,
        provisionalPassword: password,
      };
    } catch {
      // (Quitamos la variable 'error' del catch para que ESLint no avise de variable sin usar)
      // ROLLBACK: Si Prisma falla, limpiamos Supabase para no dejar "fantasmas"
      if (authData.user.id) {
        await this.supabase.auth.admin.deleteUser(authData.user.id);
      }

      throw new InternalServerErrorException(
        'Error al guardar el perfil del usuario en la base de datos. Se ha revertido la operación en Auth.',
      );
    }
  }

  async findAll() {
    return await this.prisma.user.findMany();
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { Company: true },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id); // Verificamos que existe antes de actualizar

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Verificamos que existe antes de borrar

    return this.prisma.user.delete({
      where: { id },
    });
  }
}
