import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private supabase: ReturnType<typeof createClient>;
  private supabaseAdmin: ReturnType<typeof createClient>;

  constructor(private readonly prismaService: PrismaService) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error(
        'Faltan las variables de entorno SUPABASE_URL, SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY',
      );
    }
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  }

  async getUser(token: string) {
    const { data, error } = await this.supabase.auth.getUser(token);
    if (error) {
      return null;
    }
    return data.user;
  }

  async login(dto: RegisterDto) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) throw new UnauthorizedException(error.message);

    const publicUser = await this.prismaService.user.findUnique({
      where: { id: data.user.id },
    });

    if (!publicUser)
      throw new UnauthorizedException(
        'Usuario no encontrado en la base de datos',
      );

    return {
      token: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: publicUser.role,
        name: publicUser.name, // 👈 Añade el nombre
        companyId: publicUser.companyId, // 👈 ¡ESTO ES CRUCIAL!
      },
    };
  }

  async register(dto: RegisterDto) {
    // 1. Creamos en Supabase (Auth)
    const { data, error } = await this.supabaseAdmin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        name: dto.name,
        role: dto.role, // Importante para el JWT
        companyId: dto.companyId,
      },
    });

    if (error) throw new UnauthorizedException(error.message);

    try {
      // 2. Creamos en Prisma (Public)
      // Usamos el ID exacto que nos ha devuelto Supabase
      return await this.prismaService.user.create({
        data: {
          id: data.user.id, // 👈 Este ID es sagrado (FK)
          email: dto.email,
          name: dto.name || 'Usuario',
          // Validamos el rol para que coincida con tu Enum de Prisma
          role: (dto.role as Role) || Role.EMPLOYEE,
          companyId: dto.companyId || null,
        },
      });
    } catch (err) {
      // Si falla Prisma, borramos el de Supabase para no romper la integridad
      await this.supabaseAdmin.auth.admin.deleteUser(data.user.id);
      console.error('Error Prisma:', err);
      throw new InternalServerErrorException('Error al sincronizar con Prisma');
    }
  }

  async registerPublicUser(registerDto: RegisterDto) {
    const { data, error } = await this.supabase.auth.signUp({
      email: registerDto.email,
      password: registerDto.password,
    });

    if (error) throw new UnauthorizedException(error.message);
    try {
      const newUser = await this.prismaService.user.create({
        data: {
          id: data.user!.id,
          email: registerDto.email,
          name: registerDto.email.split('@')[0], // Asignamos el nombre por defecto como la parte antes del @ del email
          role: Role.PUBLIC,
          companyId: null,
        },
      });

      return {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
      };
    } catch {
      if (data?.user?.id) {
        await this.deleteUser(data.user.id);
        throw new InternalServerErrorException(
          'Error al crear el usuario en la base de datos',
        );
      }
    }
  }

  async deleteUser(id: string) {
    const { error } = await this.supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw new UnauthorizedException(error.message);
  }

  async handleOAuthLogin(token: string) {
    const { data, error } = await this.supabase.auth.getUser(token);
    if (error) throw new UnauthorizedException('Token inválido');
    const authUser = data.user;
    if (!authUser) throw new UnauthorizedException('Usuario no encontrado');

    let publicUser = await this.prismaService.user.findUnique({
      where: { id: authUser.id },
    });

    if (!publicUser) {
      publicUser = await this.prismaService.user.create({
        data: {
          id: authUser.id,
          email: authUser.email!,
          name: authUser.email!.split('@')[0],
          role: Role.PUBLIC,
          companyId: null,
        },
      });
    }
    return {
      user: {
        id: publicUser.id,
        email: publicUser.email,
        role: publicUser.role,
      },
      token: token,
    };
  }
}
