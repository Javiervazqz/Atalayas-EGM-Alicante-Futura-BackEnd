import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { emitWarning } from 'process';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;
  private supabaseAdmin: SupabaseClient;

  constructor(private readonly prismaService: PrismaService) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error('Faltan las variables de entorno SUPABASE_URL, SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY');
    }
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  }

  async getUser (token : string) {
    const { data, error } = await this.supabase.auth.getUser(token);
    if(error) { return null }
    return data.user;
  }
  
  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new UnauthorizedException(error.message);

    const publicUser = await this.prismaService.user.findUnique({
      where: { id: data.user.id },
    });
    
    if(!publicUser) throw new UnauthorizedException('Usuario no encontrado en la base de datos');

    return {
      token: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      user:{
        id: data.user.id,
        email: data.user.email,
        role: publicUser.role,
      }
    };
  }

  async register(email: string, password: string) {
    const { data, error } = await this.supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if(error) throw new UnauthorizedException(error.message);

    return data.user;
  }

  async registerPublicUser(registerDto: RegisterDto) {
    const { data, error } = await this.supabase.auth.signUp({
      email: registerDto.email,
      password: registerDto.password,
    });

    if(error) throw new UnauthorizedException(error.message);
    try{
      const newUser = await this.prismaService.user.create({ 
        data: {
          id: data.user!.id,
          email: registerDto.email,
          name:registerDto.email.split('@')[0], // Asignamos el nombre por defecto como la parte antes del @ del email
          role: Role.PUBLIC,
          companyId: null,
        }
      });
    
    return {
      id:newUser.id,
      email: newUser.email,
      role: newUser.role,
    };
  }
  catch {
    if (data?.user?.id) {
      await this.deleteUser(data.user!.id);
      throw new InternalServerErrorException('Error al crear el usuario en la base de datos');
    }
  }
}

  async deleteUser(id: string) {
    const { error } = await this.supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw new UnauthorizedException(error.message);
  }
}
