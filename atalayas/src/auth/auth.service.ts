import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor(private readonly prismaService: PrismaService) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Faltan las variables de entorno SUPABASE_URL y SUPABASE_ANON_KEY');
    }
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
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
}
