import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EnrollmentService } from './enrollment.service.js';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto.js';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto.js';
import { Request } from 'express';

import { AuthGuard } from '../auth/auth.guard.js';
import { User } from '@prisma/client';

@ApiTags('Enrollment')
@ApiBearerAuth()
@UseGuards(AuthGuard) // 🔒 Protegemos todas las rutas
@Controller('enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @ApiOperation({
    summary: 'Matricular a un usuario en un curso (Solo Admins)',
  })
  create(
    @Body() createEnrollmentDto: CreateEnrollmentDto,
    @Req() req: Request & { user: User },
  ) {
    return this.enrollmentService.create(createEnrollmentDto, req.user);
  }

  @Get()
  @ApiOperation({
    summary: 'Ver matriculaciones (Admins ven su empresa, Empleados las suyas)',
  })
  findAll(@Req() req: Request & { user: User }) {
    return this.enrollmentService.findAll(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de una matriculación' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: User },
  ) {
    return this.enrollmentService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar progreso de matriculación' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
    @Req() req: Request & { user: User },
  ) {
    return this.enrollmentService.update(id, updateEnrollmentDto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desmatricular a un usuario (Solo Admins)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: User },
  ) {
    return this.enrollmentService.remove(id, req.user);
  }
}
