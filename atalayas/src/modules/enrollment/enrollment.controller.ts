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
import { GetUser } from '../../common/decorators/get-user.decorator.js';

import { AuthGuard } from '../../common/guards/auth.guard.js';
import type { User } from '@prisma/client';
import { UpdateVideoProgressDto } from './dto/update-video-progress.dto.js';
import { CompleteManualLessonDto } from './dto/complete-manual-lesson.dto.js';

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

  // 🚀 RUTAS ESTÁTICAS PRIMERO 🚀
  // Estas rutas deben evaluarse antes para que el ':id' no se las "trague"

  @Patch('video-progress')
  @ApiOperation({ summary: 'Actualizar el segundero de un vídeo' })
  async updateVideoProgress(
    @GetUser() user: User,
    @Body() updateDto: UpdateVideoProgressDto,
  ) {
    // 3. Añadimos el await para que ESLint no se queje
    return await this.enrollmentService.updateVideoProgress(
      user.id,
      updateDto.contentId,
      updateDto.lastTime,
      updateDto.totalDuration,
    );
  }

  @Post('complete-manual')
  @ApiOperation({ summary: 'Marcar lección manual como completada' })
  async completeManual(
    @GetUser() user: User,
    @Body() completeDto: CompleteManualLessonDto,
  ) {
    // 4. Corregimos el nombre al que pusimos en el Service: completeManualLesson
    return await this.enrollmentService.completeManualLesson(
      user.id,
      completeDto.contentId,
    );
  }

  // ⬇️ RUTAS DINÁMICAS (CON :id) DESPUÉS ⬇️

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
