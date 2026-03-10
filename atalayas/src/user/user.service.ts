import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

  async create(createUserDto: CreateUserDto) {
    const { email, password, name, companyId, role } = createUserDto;

    const companyExists = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!companyExists) {
      throw new NotFoundException(`La empresa con ID ${companyId} no existe`);
    }

    // PASO A: Crear el usuario en el sistema de seguridad de Supabase Auth
    const { data: authData, error: authError } =
      await this.supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Lo ponemos a true para que no requiera confirmar por email ahora mismo
      });

    if (authError) {
      // Si Supabase se queja (ej: contraseña muy corta, email repetido), lanzamos el error a Swagger
      throw new BadRequestException(
        `Error al crear usuario en Supabase: ${authError.message}`,
      );
    }

    // PASO B: Si ha ido bien, lo guardamos en tu tabla pública con el ID que nos ha dado Supabase
    try {
      const newUser = await this.prisma.user.create({
        data: {
          id: authData.user.id,
          email: email,
          name: name,
          companyId: companyId,
          role: role,
        },
      });
      return newUser;
    } catch {
      // Si algo falla en Prisma (ej: el companyId no existe), borramos el usuario de Auth para no dejar rastro
      if (authData?.user?.id) {
        await this.supabase.auth.admin.deleteUser(authData.user.id);
      }
      throw new InternalServerErrorException(
        'Error al guardar el perfil del usuario. Se ha revertido la operación.',
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
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.user.delete({
      where: { id },
    });
  }
}
