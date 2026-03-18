import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ApiTags } from '@nestjs/swagger'; // Ajustada la importación de ApiTags
import { GoogleOAuthDto } from './dto/google-oauth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    // 👇 Pasamos el objeto 'body' entero, no los campos por separado
    return this.authService.login(body);
  }

  @Post('register')
  async register(@Body() body: RegisterDto) {
    // Este es para el registro público (el que se asigna Role.PUBLIC)
    return this.authService.registerPublicUser(body);
  }

  @Post('oauth/google')
  async googleOAuth(@Body() body: GoogleOAuthDto) {
    return this.authService.handleOAuthLogin(body.token);
  }
}
