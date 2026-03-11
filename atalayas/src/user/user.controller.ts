import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req, // <-- NUEVO: Para capturar la petición HTTP
  UseGuards, // <-- NUEVO: Para proteger la ruta
} from '@nestjs/common';
import { UserService } from './user.service.js'; // Recuerda el .js
import { CreateUserDto } from './dto/create-user.dto.js'; // Recuerda el .js
import { UpdateUserDto } from './dto/update-user.dto.js'; // Recuerda el .js
import { ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client'; // <-- NUEVO: Importamos el tipo de Prisma

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  // @UseGuards(TuAuthGuard) <-- Descomenta esto cuando tengas tu Guard de Supabase configurado
  create(
    @Body() createUserDto: CreateUserDto,
    @Req() req: any, // <-- NUEVO: Extraemos la Request de Express/Fastify
  ) {
    // El Guard de autenticación (cuando lo tengas) meterá los datos del token en req.user.
    // Lo extraemos y le decimos a TypeScript que es de tipo User:
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const requestUser = req.user as User;

    // Le pasamos el DTO y el usuario que hace la petición a tu servicio blindado:
    return this.userService.create(createUserDto, requestUser);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
