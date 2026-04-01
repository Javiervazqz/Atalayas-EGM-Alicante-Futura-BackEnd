import {
  Controller,
  Post,
  Body,
  Patch,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { GoogleOAuthDto } from './dto/google-oauth.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { AuthGuard } from './auth.guard'; // ⚠️ Ajusta esto si tu guard se llama diferente (ej: JwtAuthGuard)

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

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }

  // 🚀 NUEVO ENDPOINT PARA EDITAR PERFIL
  @Patch('profile')
  @ApiBearerAuth()
  @UseGuards(AuthGuard) // 🔒 Solo usuarios logueados con un token válido pueden entrar
  @ApiOperation({
    summary: 'Actualizar el perfil del usuario logueado (incluye avatar)',
  })
  @ApiConsumes('multipart/form-data') // Le decimos a Swagger que esto recibe archivos
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Juan Pérez' },
        password: {
          type: 'string',
          format: 'password',
          description: 'Opcional, min 6 chars',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Imagen de avatar (JPG, PNG, etc.)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file')) // 👈 'file' es la clave que manda el frontend en el FormData
  async updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @Req() req: Request & { user: any }, // Obtenemos al usuario extraído por el AuthGuard
    @UploadedFile() file?: Express.Multer.File, // Capturamos el archivo físico si lo hay
  ) {
    // Le pasamos el ID del usuario (req.user.id), los datos de texto y el archivo al servicio
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.authService.updateProfile(req.user.id, updateProfileDto, file);
  }
}
