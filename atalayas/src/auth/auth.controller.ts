import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ApiTags } from '@nestjs/swagger/dist/decorators/api-use-tags.decorator';
import { GoogleOAuthDto } from './dto/google-oauth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.registerPublicUser(body);
  }

  @Post('oauth/google')
  async googleOAuth(@Body() body: GoogleOAuthDto) {
    // Implementation for Google OAuth
    return this.authService.handleOAuthLogin(body.token);
  }
}
