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
    async googleOAuth(@Body() body: GoogleOAuthDto){
        return this.authService.handleOAuthLogin(body.token);
    }

    @Post('forgot-password')
    async forgotPassword(@Body('email')  email: string ) {
        return this.authService.requestPasswordReset(email);
    }

    @Post('reset-password')
    async resetPassword(@Body('token')  token: string, @Body('newPassword') newPassword: string ) {
        return this.authService.resetPassword(token, newPassword);
    }
}
