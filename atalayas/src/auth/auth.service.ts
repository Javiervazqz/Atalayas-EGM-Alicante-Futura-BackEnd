import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { Role } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AuthService {
  private supabase: ReturnType<typeof createClient>;
  private supabaseAdmin: ReturnType<typeof createClient>;

  constructor(private readonly prismaService: PrismaService, private readonly mailerService: MailerService) {
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

  async requestPasswordReset(email: string) {
    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const resetToken = uuidv4();
    const resetTokenExp = new Date();
    resetTokenExp.setHours(resetTokenExp.getHours() + 1); // El token expira en 1 hora

    console.log(resetToken)

    await this.prismaService.user.update({
      where: { email },
      data: { resetToken, resetTokenExp },
    });
    
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Recuperar contraseña - Atalayas',
        text: 'Haz clic aquí para resetear', // Siempre añade un 'text' por si acaso
        html: `<div style="background-color: #f5f5f7; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-size: 24px; font-weight: 600; color: #1d1d1f; margin: 0; letter-spacing: -0.02em;">Atalayas EGM</h1>
        </div>

        <div style="height: 1px; background-color: #d2d2d7; margin-bottom: 30px;"></div>

        <h2 style="font-size: 21px; font-weight: 600; color: #1d1d1f; margin-bottom: 16px; letter-spacing: -0.01em;">Restablecer contraseña</h2>
        
        <p style="font-size: 15px; line-height: 1.5; color: #424245; margin-bottom: 24px;">
          Hola, ${user.name}<br><br>
          Recibimos una solicitud para restablecer la contraseña de tu cuenta en el portal de <strong>Atalayas EGM</strong>. Si no realizaste esta solicitud, puedes ignorar este mensaje de forma segura.
        </p>

        <div style="text-align: center; margin: 35px 0;">
          <a href="http://localhost:5173/reset-password?token=${resetToken}" 
             style="background-color: #0071e3; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-size: 15px; font-weight: 500; display: inline-block; transition: background-color 0.2s;">
            Establecer nueva contraseña
          </a>
        </div>

        <p style="font-size: 13px; line-height: 1.4; color: #86868b; margin-top: 30px; text-align: center;">
          Este enlace expirará en 60 minutos por motivos de seguridad.
        </p>

        <div style="height: 1px; background-color: #d2d2d7; margin-top: 30px; margin-bottom: 20px;"></div>

        <p style="font-size: 12px; color: #86868b; text-align: center; margin: 0;">
          &copy; ${new Date().getFullYear()} Atalayas EGM. Todos los derechos reservados.
        </p>
      </div>
    </div>
  `,
      });
      console.log('Correo enviado a Mailtrap con éxito');
    } catch (error) {
      console.error('Error enviando el correo:', error);
    }

    return { message: 'Proceso iniciado' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prismaService.user.findFirst({ where: { resetToken: token, resetTokenExp: { gt: new Date() } } });
    if (!user) throw new NotFoundException('Token inválido');
    const { error } = await this.supabaseAdmin.auth.admin.updateUserById(user.id, { password: newPassword });
    if (error) throw new BadRequestException(error.message);
    await this.prismaService.user.update({
      where: { id: user.id },
      data: { resetToken: null, resetTokenExp: null },
    });
    return { message: 'Contraseña restablecida exitosamente' };
}
}
      
   
