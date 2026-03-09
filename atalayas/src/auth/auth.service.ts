import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor() {
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
}
